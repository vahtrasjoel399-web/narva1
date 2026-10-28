#!/usr/bin/env node
/**
 * TEST ONLY — never deploy.
 *
 * 1) A small PostgREST + GoTrue look-alike on top of a local Postgres, so the
 *    real app (supabase-js, RLS, RPC functions) can run end-to-end without
 *    Docker or a cloud project. Supports the subset of the PostgREST API the
 *    app uses: select / filters / order / limit / offset / insert / upsert /
 *    update / delete / rpc / count, plus email+password auth.
 *    Roles and RLS are real: each request runs as anon / authenticated /
 *    service_role with request.jwt.claims set, exactly like PostgREST.
 *
 * 2) A fake Resend API that stores sent emails (GET /emails to read them,
 *    POST /fail {"on":true} to simulate an outage).
 *
 *   node scripts/test/mock-services.mjs
 * Env: TEST_DATABASE_URL, MOCK_SUPABASE_PORT (54321), MOCK_RESEND_PORT (54400), MOCK_JWT_SECRET
 */
import http from "node:http";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import pg from "pg";

const DATABASE_URL = process.env.TEST_DATABASE_URL || "postgres://postgres@127.0.0.1:54329/autoshop";
const SUPABASE_PORT = Number(process.env.MOCK_SUPABASE_PORT || 54321);
const RESEND_PORT = Number(process.env.MOCK_RESEND_PORT || 54400);
export const JWT_SECRET = process.env.MOCK_JWT_SECRET || "mock-jwt-secret-for-tests-only";

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 30 });

// ─── JWT (HS256) ─────────────────────────────────────────────────────────────
const b64url = (buf) => Buffer.from(buf).toString("base64url");
export function signJwt(payload, secret = JWT_SECRET) {
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
function verifyJwt(token) {
  const [head, body, sig] = String(token || "").split(".");
  if (!head || !body || !sig) return null;
  const expected = createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const claims = JSON.parse(Buffer.from(body, "base64url").toString());
  if (claims.exp && claims.exp * 1000 < Date.now()) return null;
  return claims;
}
export const ANON_KEY = signJwt({ role: "anon", iss: "mock" });
export const SERVICE_KEY = signJwt({ role: "service_role", iss: "mock" });

// ─── helpers ─────────────────────────────────────────────────────────────────
const ident = (name) => {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw httpError(400, "PGRST100", `bad identifier ${name}`);
  return `"${name}"`;
};
function httpError(status, code, message) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS,HEAD",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "Content-Range, Content-Location",
};
function send(res, status, body, headers = {}) {
  const h = { ...cors, ...headers };
  if (body === undefined || body === null) {
    res.writeHead(status, h);
    return res.end();
  }
  const text = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...h });
  res.end(text);
}
async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString();
  return raw ? JSON.parse(raw) : null;
}

function claimsFromRequest(req) {
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, "") || req.headers.apikey;
  const claims = verifyJwt(auth);
  if (!claims) throw httpError(401, "PGRST301", "JWT invalid");
  return claims;
}

async function withRole(claims, fn) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('role', $1, true), set_config('request.jwt.claims', $2, true)", [
      claims.role,
      JSON.stringify(claims),
    ]);
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// ─── PostgREST filter parsing ────────────────────────────────────────────────
const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
const OPS = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "like", ilike: "ilike" };

function splitTopLevel(s) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) parts.push(cur);
  return parts;
}

function condition(column, expr, params) {
  let negate = false;
  if (expr.startsWith("not.")) {
    negate = true;
    expr = expr.slice(4);
  }
  const dot = expr.indexOf(".");
  const op = expr.slice(0, dot);
  const value = expr.slice(dot + 1);
  let sql;
  if (op === "is") {
    const v = value.toLowerCase();
    if (!["null", "true", "false"].includes(v)) throw httpError(400, "PGRST100", "bad is value");
    sql = `${ident(column)} is ${v}`;
  } else if (op === "in") {
    const list = splitTopLevel(value.replace(/^\(|\)$/g, "")).map((v) => v.replace(/^"|"$/g, ""));
    params.push(list);
    sql = `${ident(column)} = any($${params.length})`;
  } else if (op === "cs") {
    params.push(value.replace(/^\{|\}$/g, "").split(",").filter(Boolean));
    sql = `${ident(column)} @> $${params.length}`;
  } else if (OPS[op]) {
    params.push(op === "like" || op === "ilike" ? value.replace(/\*/g, "%") : value);
    sql = `${ident(column)} ${OPS[op]} $${params.length}`;
  } else {
    throw httpError(400, "PGRST100", `unsupported operator ${op}`);
  }
  return negate ? `not (${sql})` : sql;
}

function whereClause(searchParams, params) {
  const conds = [];
  for (const [key, value] of searchParams) {
    if (RESERVED.has(key)) continue;
    if (key === "or" || key === "and") {
      const inner = splitTopLevel(value.replace(/^\(|\)$/g, "")).map((part) => {
        const firstDot = part.indexOf(".");
        return condition(part.slice(0, firstDot), part.slice(firstDot + 1), params);
      });
      conds.push(`(${inner.join(key === "or" ? " or " : " and ")})`);
      continue;
    }
    conds.push(condition(key, value, params));
  }
  return conds.length ? `where ${conds.join(" and ")}` : "";
}

function selectList(searchParams) {
  const sel = searchParams.get("select");
  if (!sel || sel === "*") return "*";
  return sel
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      if (c.includes("(")) throw httpError(400, "PGRST100", "embedded resources are not supported by the mock");
      const [col, alias] = c.split(":").reverse();
      return alias ? `${ident(col)} as ${ident(alias)}` : ident(col);
    })
    .join(", ");
}

function orderClause(searchParams) {
  const order = searchParams.get("order");
  if (!order) return "";
  return (
    "order by " +
    order
      .split(",")
      .map((part) => {
        const [col, ...mods] = part.split(".");
        const dir = mods.includes("desc") ? "desc" : "asc";
        const nulls = mods.includes("nullsfirst") ? " nulls first" : mods.includes("nullslast") ? " nulls last" : "";
        return `${ident(col)} ${dir}${nulls}`;
      })
      .join(", ")
  );
}

function prefer(req) {
  const h = String(req.headers.prefer || "");
  return {
    representation: h.includes("return=representation"),
    count: h.includes("count=exact"),
    merge: h.includes("resolution=merge-duplicates"),
    ignore: h.includes("resolution=ignore-duplicates"),
  };
}

function wantsObject(req) {
  return String(req.headers.accept || "").includes("application/vnd.pgrst.object+json");
}

function respondRows(req, res, rows, extraHeaders = {}) {
  if (wantsObject(req)) {
    if (rows.length !== 1) {
      return send(res, 406, {
        code: "PGRST116",
        message: "JSON object requested, multiple (or no) rows returned",
        details: `The result contains ${rows.length} rows`,
        hint: null,
      });
    }
    return send(res, 200, rows[0], extraHeaders);
  }
  return send(res, 200, rows, extraHeaders);
}

async function handleRest(req, res, url) {
  const claims = claimsFromRequest(req);
  const path = url.pathname.replace(/^\/rest\/v1\/?/, "");

  if (path.startsWith("rpc/")) {
    const fn = ident(path.slice(4));
    const args = (await readBody(req)) || {};
    const params = [];
    const named = Object.entries(args).map(([k, v]) => {
      params.push(v !== null && typeof v === "object" && !Array.isArray(v) ? JSON.stringify(v) : v);
      return `${ident(k)} => $${params.length}`;
    });
    const rows = await withRole(claims, (c) =>
      c.query(`select to_json(public.${fn}(${named.join(", ")})) as data`, params),
    );
    return send(res, 200, JSON.stringify(rows.rows[0]?.data ?? null));
  }

  const table = `public.${ident(path)}`;
  const sp = url.searchParams;
  const pref = prefer(req);
  const params = [];

  if (req.method === "GET" || req.method === "HEAD") {
    const where = whereClause(sp, params);
    const limit = sp.get("limit") ? `limit ${Number(sp.get("limit"))}` : "";
    const offset = sp.get("offset") ? `offset ${Number(sp.get("offset"))}` : "";
    const { rows, total } = await withRole(claims, async (c) => {
      const r = await c.query(
        `select coalesce(json_agg(_r), '[]'::json) as data from (select ${selectList(sp)} from ${table} ${where} ${orderClause(sp)} ${limit} ${offset}) _r`,
        params,
      );
      let total = null;
      if (pref.count) total = (await c.query(`select count(*)::int as n from ${table} ${where}`, params)).rows[0].n;
      return { rows: r.rows[0].data, total };
    });
    const start = Number(sp.get("offset") || 0);
    const range = `${rows.length ? `${start}-${start + rows.length - 1}` : "*"}/${total ?? "*"}`;
    if (req.method === "HEAD") return send(res, 200, null, { "Content-Range": range });
    return respondRows(req, res, rows, { "Content-Range": range });
  }

  if (req.method === "POST") {
    const body = await readBody(req);
    const list = Array.isArray(body) ? body : [body];
    const cols = [...new Set(list.flatMap((o) => Object.keys(o)))].map(ident);
    params.push(JSON.stringify(list));
    let conflict = "";
    if (pref.merge || pref.ignore) {
      const target = (sp.get("on_conflict") || "id").split(",").map(ident).join(", ");
      conflict = pref.ignore
        ? `on conflict (${target}) do nothing`
        : `on conflict (${target}) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(", ")}`;
    }
    const returning = pref.representation ? `returning ${selectList(sp)}` : "returning 1";
    const rows = await withRole(claims, async (c) => {
      const r = await c.query(
        `with _ins as (insert into ${table} (${cols.join(", ")}) select ${cols.join(", ")} from jsonb_populate_recordset(null::${table}, $1::jsonb) ${conflict} ${returning}) select coalesce(json_agg(_ins), '[]'::json) as data from _ins`,
        params,
      );
      return r.rows[0].data;
    });
    if (!pref.representation) return send(res, 201, null);
    if (wantsObject(req)) return respondRows(req, res, rows);
    return send(res, 201, rows);
  }

  if (req.method === "PATCH") {
    const body = (await readBody(req)) || {};
    const cols = Object.keys(body).map(ident);
    params.push(JSON.stringify(body));
    const where = whereClause(sp, params);
    const returning = pref.representation ? `returning ${selectList(sp)}` : "returning 1";
    const rows = await withRole(claims, async (c) => {
      const r = await c.query(
        `with _upd as (update ${table} set (${cols.join(", ")}) = (select ${cols.join(", ")} from jsonb_populate_record(null::${table}, $1::jsonb)) ${where} ${returning}) select coalesce(json_agg(_upd), '[]'::json) as data from _upd`,
        params,
      );
      return r.rows[0].data;
    });
    if (!pref.representation) return send(res, 204, null);
    return respondRows(req, res, rows);
  }

  if (req.method === "DELETE") {
    const where = whereClause(sp, params);
    const returning = pref.representation ? `returning ${selectList(sp)}` : "returning 1";
    const rows = await withRole(claims, async (c) => {
      const r = await c.query(
        `with _del as (delete from ${table} ${where} ${returning}) select coalesce(json_agg(_del), '[]'::json) as data from _del`,
        params,
      );
      return r.rows[0].data;
    });
    if (!pref.representation) return send(res, 204, null);
    return respondRows(req, res, rows);
  }

  throw httpError(405, "PGRST000", "method not allowed");
}

// ─── GoTrue (auth) subset ────────────────────────────────────────────────────
const refreshTokens = new Map();

function sessionFor(user) {
  const now = Math.floor(Date.now() / 1000);
  const access_token = signJwt({
    sub: user.id,
    email: user.email,
    role: "authenticated",
    aud: "authenticated",
    iat: now,
    exp: now + 3600,
    session_id: randomBytes(8).toString("hex"),
  });
  const refresh_token = randomBytes(16).toString("hex");
  refreshTokens.set(refresh_token, user);
  return {
    access_token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token,
    user: userJson(user),
  };
}

function userJson(user) {
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    email_confirmed_at: user.created_at,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: user.created_at,
    updated_at: user.created_at,
  };
}

async function handleAuth(req, res, url) {
  const path = url.pathname.replace(/^\/auth\/v1\/?/, "");
  if (path === "token" && req.method === "POST") {
    const body = (await readBody(req)) || {};
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const { rows } = await pool.query(
        "select id, email, created_at from auth.users where lower(email) = lower($1) and encrypted_password = extensions.crypt($2, encrypted_password)",
        [body.email ?? "", body.password ?? ""],
      );
      if (!rows[0]) return send(res, 400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
      return send(res, 200, sessionFor(rows[0]));
    }
    if (grant === "refresh_token") {
      const user = refreshTokens.get(body.refresh_token);
      if (!user) return send(res, 400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
      refreshTokens.delete(body.refresh_token);
      return send(res, 200, sessionFor(user));
    }
    return send(res, 400, { code: 400, msg: "unsupported grant_type" });
  }
  if (path === "user" && req.method === "GET") {
    const claims = verifyJwt(req.headers.authorization?.replace(/^Bearer\s+/i, ""));
    if (!claims?.sub) return send(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
    const { rows } = await pool.query("select id, email, created_at from auth.users where id = $1", [claims.sub]);
    if (!rows[0]) return send(res, 404, { code: 404, error_code: "user_not_found", msg: "User not found" });
    return send(res, 200, userJson(rows[0]));
  }
  if (path === "logout") return send(res, 204, null);
  return send(res, 404, { code: 404, msg: `mock: ${path} not implemented` });
}

// ─── servers ─────────────────────────────────────────────────────────────────
const supabase = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS") return send(res, 204, null);
  try {
    if (url.pathname.startsWith("/rest/v1")) return await handleRest(req, res, url);
    if (url.pathname.startsWith("/auth/v1")) return await handleAuth(req, res, url);
    return send(res, 404, { message: "not found" });
  } catch (err) {
    const pgPermission = err.code === "42501";
    const status = err.status || (pgPermission ? (req.headers.authorization ? 403 : 401) : err.code === "23505" ? 409 : 400);
    if (process.env.MOCK_VERBOSE) console.error("[mock-supabase]", req.method, req.url, err.message);
    return send(res, status, { code: err.code || "PGRST000", message: err.message, details: err.detail ?? null, hint: null });
  }
});

const emails = [];
let failMode = false;
const resend = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/emails" && req.method === "POST") {
    const body = await readBody(req);
    if (failMode) return send(res, 503, { message: "simulated outage" });
    if (!req.headers.authorization?.startsWith("Bearer ")) return send(res, 401, { message: "missing key" });
    const id = randomBytes(8).toString("hex");
    emails.push({ id, at: new Date().toISOString(), ...body });
    return send(res, 200, { id });
  }
  if (url.pathname === "/emails" && req.method === "GET") return send(res, 200, emails);
  if (url.pathname === "/emails" && req.method === "DELETE") {
    emails.length = 0;
    return send(res, 204, null);
  }
  if (url.pathname === "/fail" && req.method === "POST") {
    failMode = Boolean((await readBody(req))?.on);
    return send(res, 200, { failMode });
  }
  return send(res, 404, { message: "not found" });
});

supabase.listen(SUPABASE_PORT, "127.0.0.1", () => {
  resend.listen(RESEND_PORT, "127.0.0.1", () => {
    console.log(
      JSON.stringify({
        supabaseUrl: `http://127.0.0.1:${SUPABASE_PORT}`,
        resendUrl: `http://127.0.0.1:${RESEND_PORT}/emails`,
        anonKey: ANON_KEY,
        serviceKey: SERVICE_KEY,
      }),
    );
  });
});
