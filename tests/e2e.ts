/**
 * End-to-end test against a running server + local Supabase.
 *   npm run build && npx next start -p 3000      (EMAIL_DEV_OUTBOX=1 in .env.local)
 *   npm run test:e2e
 * Uses dates 3–4 weeks ahead so it never touches real bookings.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const db = createClient(SB_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const anon = createClient(SB_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const OUTBOX = path.join(process.cwd(), ".outbox");

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`, detail ?? "");
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ip = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

function tallinnToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Tallinn" }).format(new Date());
}
function addDays(d: string, n: number) {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${url}`, { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": ip(), ...headers }, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

const customer = (over: Record<string, unknown> = {}) => ({
  name: "Ivan Petrov",
  phone: "+372 5123 4567",
  email: "ivan@example.com",
  car_make: "Toyota",
  car_model: "Corolla",
  car_year: "2014",
  plate: "123ABC",
  comment: "Скрип при торможении спереди, горит лампа ABS",
  consent: true,
  lang: "ru",
  ...over,
});

async function waitForEmail(match: (meta: { subject: string; event: string; audience: string; to: string[] }, html: string) => boolean, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const files = (await readdir(OUTBOX).catch(() => [] as string[])).filter((f) => f.endsWith(".json")).sort().reverse();
    for (const f of files) {
      const meta = JSON.parse(await readFile(path.join(OUTBOX, f), "utf8"));
      const html = await readFile(path.join(OUTBOX, f.replace(/\.json$/, ".html")), "utf8");
      if (match(meta, html)) return { meta, html };
    }
    await sleep(300);
  }
  return null;
}

async function slotStatuses(date: string) {
  const { data } = await db.from("slots").select("start_time, status, booking_id").eq("date", date).order("start_time");
  return (data ?? []).map((s) => `${s.start_time.slice(0, 5)}:${s.status}`);
}

/** Call a Next.js server action the same way the browser does. */
let actionIds: Record<string, string> | null = null;
async function actionId(name: string) {
  if (!actionIds) {
    const m = JSON.parse(await readFile(".next/server/server-reference-manifest.json", "utf8"));
    actionIds = Object.fromEntries(Object.entries(m.node as Record<string, { exportedName: string }>).map(([id, v]) => [v.exportedName, id]));
  }
  return actionIds[name];
}
async function callAction(pagePath: string, name: string, args: unknown[], cookie = "") {
  const res = await fetch(`${BASE}${pagePath}`, {
    method: "POST",
    headers: { "Next-Action": await actionId(name), "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(args),
    redirect: "manual",
  });
  return { status: res.status, text: await res.text() };
}

async function adminCookie(email: string, password: string) {
  const jar = new Map<string, string>();
  const sb = createServerClient(SB_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (list) => list.forEach((c) => jar.set(c.name, c.value)) },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function main() {
  const today = tallinnToday();
  const D = addDays(today, 22);
  const D2 = addDays(today, 23);

  console.log(`\nSetup: clean test dates ${D}, ${D2}`);
  for (const d of [D, D2]) {
    const { data: bs } = await db.from("bookings").select("id").eq("date", d);
    const ids = (bs ?? []).map((b) => b.id);
    if (ids.length) {
      await db.from("slots").update({ status: "free", booking_id: null }).in("booking_id", ids);
      await db.from("notification_log").delete().in("booking_id", ids);
      await db.from("email_actions").delete().in("booking_id", ids);
      await db.from("bookings").delete().in("id", ids);
    }
    await db.from("slots").delete().eq("date", d);
  }
  // D: six 30-minute slots 09:00–12:00. D2: two parallel bays 10:00–11:00.
  const mk = (date: string, a: string, b: string, bay = 1) => ({ date, start_time: a, end_time: b, bay });
  await db.rpc("admin_add_slots", {
    p_slots: [mk(D, "09:00", "09:30"), mk(D, "09:30", "10:00"), mk(D, "10:00", "10:30"), mk(D, "10:30", "11:00"), mk(D, "11:00", "11:30"), mk(D, "11:30", "12:00"), mk(D2, "10:00", "11:00", 1), mk(D2, "10:00", "11:00", 2)],
  });

  // -------------------------------------------------------------- 1. availability
  console.log("\n1. Availability");
  let av = await (await fetch(`${BASE}/api/availability?services=brakes`)).json();
  check("brakes (90 min) start times on D = 09:00..10:30", JSON.stringify(av.starts[D]) === JSON.stringify(["09:00", "09:30", "10:00", "10:30"]), av.starts[D]);
  av = await (await fetch(`${BASE}/api/availability?services=engine-repair`)).json();
  check("engine repair (180 min) only 09:00 on D", JSON.stringify(av.starts[D]) === JSON.stringify(["09:00"]), av.starts[D]);
  av = await (await fetch(`${BASE}/api/availability?services=suspension,engine-repair`)).json();
  check("300 min combined does not fit on D", !av.starts[D], av.starts[D]);

  // -------------------------------------------------------------- 2. booking flow
  console.log("\n2. Booking flow");
  const b1 = await post("/api/booking", { services: ["brakes"], date: D, time: "09:00", ...customer() });
  check("POST /api/booking -> 200 with number + token", b1.status === 200 && b1.data.number > 1000 && /^[a-f0-9]{48}$/.test(b1.data.token), b1);
  check("ends at 10:30 (3 consecutive slots)", b1.data.end === "10:30", b1.data);
  let st = await slotStatuses(D);
  check("09:00, 09:30, 10:00 booked; rest free", st.join() === "09:00:booked,09:30:booked,10:00:booked,10:30:free,11:00:free,11:30:free", st);
  av = await (await fetch(`${BASE}/api/availability?services=oil-change`)).json();
  check("booked times disappear from public availability", JSON.stringify(av.starts[D]) === JSON.stringify(["10:30", "11:00", "11:30"]), av.starts[D]);
  const manage = await fetch(`${BASE}/ru/booking/${b1.data.token}`);
  const manageHtml = await manage.text();
  check("manage page shows booking number and status", manage.status === 200 && manageHtml.includes(String(b1.data.number)) && manageHtml.includes("Ожидает подтверждения"));

  const bad = await post("/api/booking", { services: ["brakes"], date: D, time: "10:30", ...customer({ phone: "abc", consent: false }) });
  check("server-side zod validation rejects bad phone + missing consent", bad.status === 400 && bad.data.fields?.phone === "phone" && bad.data.fields?.consent === "consent", bad);
  const hp = await post("/api/booking", { services: ["oil-change"], date: D, time: "11:30", ...customer({ website: "http://spam" }) });
  st = await slotStatuses(D);
  check("honeypot: fake success, nothing stored", hp.status === 200 && st.includes("11:30:free"), { hp, st });

  // -------------------------------------------------------------- 3. double booking
  console.log("\n3. Simultaneous double booking");
  const race = await Promise.all(Array.from({ length: 8 }, (_, i) => post("/api/booking", { services: ["oil-change"], date: D, time: "11:00", ...customer({ name: `Racer ${i}`, email: "" }) })));
  const codes = race.map((r) => r.status).sort();
  check("8 parallel requests for one slot: exactly one 200, seven 409", codes.filter((c) => c === 200).length === 1 && codes.filter((c) => c === 409).length === 7, codes);
  check("losers get error 'slot_taken'", race.filter((r) => r.status === 409).every((r) => r.data.error === "slot_taken"));
  const { count: at11 } = await db.from("bookings").select("id", { count: "exact", head: true }).eq("date", D).eq("start_time", "11:00").neq("status", "cancelled");
  check("database holds exactly one booking at 11:00", at11 === 1, at11);

  const overlap = await Promise.all([
    post("/api/booking", { services: ["brakes"], date: D, time: "10:30", ...customer({ name: "Overlap A", email: "" }) }),
    post("/api/booking", { services: ["oil-change"], date: D, time: "11:30", ...customer({ name: "Overlap B", email: "" }) }),
  ]);
  check("90-min booking at 10:30 fails because 11:00 is taken", overlap[0].status === 409, overlap[0]);
  check("30-min booking at 11:30 succeeds", overlap[1].status === 200, overlap[1]);

  const bays = await Promise.all([1, 2, 3].map((i) => post("/api/booking", { services: ["diagnostics"], date: D2, time: "10:00", ...customer({ name: `Bay ${i}`, email: "" }) })));
  check("two parallel bays: 2 of 3 simultaneous bookings succeed", bays.filter((r) => r.status === 200).length === 2 && bays.filter((r) => r.status === 409).length === 1, bays.map((b) => b.status));

  // -------------------------------------------------------------- 4. admin email for new booking
  console.log("\n4. Admin email: new booking");
  const newMail = await waitForEmail((m) => m.event === "booking_created" && m.audience === "admin" && m.subject.includes(`#${b1.data.number}`));
  check("admin email written for new booking", !!newMail);
  if (newMail) {
    const { html, meta } = newMail;
    console.log(`    subject: ${meta.subject}`);
    check("subject format 'Uus broneering #N – <day> <time> – <name>'", /^Uus broneering #\d+ – .+ 09:00 – Ivan Petrov$/.test(meta.subject), meta.subject);
    check("sent to every NOTIFY_EMAILS recipient", meta.to.length === 2, meta.to);
    for (const [label, part] of [
      ["name", "Ivan Petrov"],
      ["tap-to-call link", 'href="tel:+37251234567"'],
      ["email", "ivan@example.com"],
      ["car make/model/year", "Toyota Corolla 2014"],
      ["plate", "123ABC"],
      ["service", "Pidurid"],
      ["duration", "1 h 30 min"],
      ["client message", "Скрип при торможении спереди, горит лампа ABS"],
      ["time range", "09:00–10:30"],
      ["booking language", "vene"],
      ["Confirm link", "/admin/action/"],
      ["Open in admin link", `/admin/bookings/`],
    ] as const) {
      check(`  contains ${label}`, html.includes(part));
    }
    check("customer confirmation email sent in Russian", !!(await waitForEmail((m) => m.audience === "customer" && m.subject.startsWith(`Запись #${b1.data.number}`))));
  }

  // -------------------------------------------------------------- 5. one-time Confirm link
  console.log("\n5. Confirm / Decline links");
  const links = [...(newMail?.html ?? "").matchAll(/href="([^"]*\/admin\/action\/([^"]+))"/g)].map((m) => ({ url: m[1], token: m[2] }));
  check("email has 2 one-time links (confirm + decline)", links.length === 2, links.length);
  if (links.length === 2) {
    const [confirm, decline] = links;
    const page = await fetch(`${BASE}/admin/action/${confirm.token}`);
    const pageHtml = await page.text();
    check("opening the link needs no login and only shows a button (no state change)", page.status === 200 && pageHtml.includes("Jah, kinnita"));
    let { data: row } = await db.from("bookings").select("status").eq("number", b1.data.number).single();
    check("booking still 'new' after just opening the link", row?.status === "new", row);
    await callAction(`/admin/action/${confirm.token}`, "runEmailAction", [confirm.token]);
    ({ data: row } = await db.from("bookings").select("status").eq("number", b1.data.number).single());
    check("pressing Confirm sets status 'confirmed'", row?.status === "confirmed", row);
    check("client gets 'confirmed' email", !!(await waitForEmail((m) => m.audience === "customer" && m.subject.includes("подтверждена") && m.subject.includes(`#${b1.data.number}`))));
    const again = await fetch(`${BASE}/admin/action/${confirm.token}`);
    check("confirm link works only once", (await again.text()).includes("juba kasutatud"));
    const dec = await fetch(`${BASE}/admin/action/${decline.token}`);
    check("decline link of the same email is void after confirm", (await dec.text()).includes("juba kasutatud"));
  }

  // decline path on a fresh booking
  const b2 = await post("/api/booking", { services: ["oil-change"], date: D, time: "10:30", ...customer({ name: "Decline Test", email: "decline@example.com", lang: "et" }) });
  const declMail = await waitForEmail((m) => m.event === "booking_created" && m.audience === "admin" && m.subject.includes(`#${b2.data.number}`));
  const declTok = [...(declMail?.html ?? "").matchAll(/\/admin\/action\/([^"]+)"/g)].map((m) => m[1])[1];
  if (declTok) {
    await callAction(`/admin/action/${declTok}`, "runEmailAction", [declTok]);
    const { data: row } = await db.from("bookings").select("status").eq("number", b2.data.number).single();
    st = await slotStatuses(D);
    check("Decline cancels the booking and frees the slot", row?.status === "cancelled" && st.includes("10:30:free"), { row, st });
    check("client gets 'pick another time' email", !!(await waitForEmail((m) => m.audience === "customer" && m.subject.includes("palun vali uus aeg"))));
  } else check("decline token found", false);

  // -------------------------------------------------------------- 6. cancellation
  console.log("\n6. Customer cancellation");
  const cancel = await post("/api/booking/cancel", { token: b1.data.token });
  check("cancel via secret link -> 200", cancel.status === 200, cancel);
  st = await slotStatuses(D);
  check("its 3 slots are free again", st.slice(0, 3).join() === "09:00:free,09:30:free,10:00:free", st);
  av = await (await fetch(`${BASE}/api/availability?services=brakes`)).json();
  check("freed time is bookable again in public view", av.starts[D]?.includes("09:00"), av.starts[D]);
  const cancel2 = await post("/api/booking/cancel", { token: b1.data.token });
  check("second cancel -> 409 not_cancellable", cancel2.status === 409 && cancel2.data.error === "not_cancellable", cancel2);
  const cMail = await waitForEmail((m) => m.event === "booking_cancelled" && m.audience === "admin" && m.subject.includes(`#${b1.data.number}`));
  check("admin email for cancellation", !!cMail);
  if (cMail) {
    console.log(`    subject: ${cMail.meta.subject}`);
    check("  marked 'Klient tühistas broneeringu'", cMail.html.includes("Klient tühistas broneeringu"));
    check("  shows which slot was freed", cMail.html.includes("on jälle vaba") && cMail.html.includes("09:00–10:30"));
    check("  has all client fields", ["Ivan Petrov", 'tel:+37251234567', "Toyota Corolla 2014", "123ABC", "Скрип при торможении"].every((p) => cMail.html.includes(p)));
  }

  // too late: a booking starting in ~1 hour cannot be cancelled online
  const now = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Tallinn", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const [h, m] = now.split(":").map(Number);
  const startMin = Math.ceil((h * 60 + m + 60) / 30) * 30;
  if (startMin + 30 < 24 * 60) {
    const s = `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`;
    const e = `${String(Math.floor((startMin + 30) / 60)).padStart(2, "0")}:${String((startMin + 30) % 60).padStart(2, "0")}`;
    await db.from("slots").delete().eq("date", today).eq("start_time", s).eq("bay", 9);
    await db.rpc("admin_add_slots", { p_slots: [{ date: today, start_time: s, end_time: e, bay: 9 }] });
    const soon = await post("/api/booking", { services: ["oil-change"], date: today, time: s, ...customer({ email: "" }) });
    const late = await post("/api/booking/cancel", { token: soon.data.token });
    check(`cancelling less than 3 h before the visit -> 409 too_late`, late.status === 409 && late.data.error === "too_late", { soon, late });
    const { data: sb } = await db.from("bookings").select("id").eq("manage_token", soon.data.token).single();
    if (sb) await db.rpc("admin_cancel_booking", { p_booking_id: sb.id });
    await db.from("slots").delete().eq("date", today).eq("bay", 9);
  }

  // -------------------------------------------------------------- 7. callback request
  console.log("\n7. Callback request");
  const cb = await post("/api/callback", { name: "Marina K.", phone: "+372 5555 1234", comment: "Нужен развал-схождение на этой неделе", lang: "ru" });
  check("POST /api/callback -> 200", cb.status === 200, cb);
  const cbMail = await waitForEmail((m) => m.event === "callback_created" && m.subject.includes("Marina K."));
  check("admin email for callback", !!cbMail);
  if (cbMail) {
    console.log(`    subject: ${cbMail.meta.subject}`);
    check("  name, tap-to-call and comment present", ["Marina K.", 'href="tel:+37255551234"', "Нужен развал-схождение на этой неделе"].every((p) => cbMail.html.includes(p)));
  }

  // -------------------------------------------------------------- 8. security
  console.log("\n8. Security");
  const { data: anonSlots } = await anon.from("slots").select("*").limit(5);
  check("anon cannot read the slots table", (anonSlots ?? []).length === 0, anonSlots);
  const { data: anonBookings } = await anon.from("bookings").select("*").limit(5);
  check("anon cannot read bookings", (anonBookings ?? []).length === 0);
  const { error: rpcErr } = await anon.rpc("create_booking", { p_date: D, p_start: "11:30", p_service_ids: ["oil-change"], p_customer: {} });
  check("anon cannot call create_booking directly", !!rpcErr && /permission denied/.test(rpcErr.message), rpcErr?.message);
  const { data: free } = await anon.rpc("get_free_slots", { p_from: D, p_to: D });
  check("anon can read free slots (date/time/bay only)", Array.isArray(free) && free.length > 0 && Object.keys(free[0]).join() === "date,start_time,end_time,bay", free?.[0]);
  const { error: signupErr } = await anon.auth.signUp({ email: `intruder${Date.now()}@example.com`, password: "intruder-password-1" });
  check("public signup is disabled (only invited admins)", !!signupErr, signupErr?.message);
  const adminNoAuth = await fetch(`${BASE}/admin/bookings`, { redirect: "manual" });
  check("/admin redirects to login without a session", adminNoAuth.status === 307 && (adminNoAuth.headers.get("location") ?? "").includes("/admin/login"));
  const unauthAction = await callAction("/admin/calendar", "addSlots", [{ mode: "days", dates: [D], start: "13:00", end: "14:00", length: 60, parallel: 1 }]);
  st = await slotStatuses(D);
  check("admin server action without session does nothing", !st.some((x) => x.startsWith("13:00")), { status: unauthAction.status, st });
  const sameIp = ip(); // fresh IP per run so earlier runs do not count
  const limited = [];
  for (let i = 0; i < 7; i++) limited.push((await post("/api/booking", { services: ["oil-change"], date: D, time: "11:00", ...customer() }, { "x-forwarded-for": sameIp })).status);
  check("rate limit: 7th booking attempt from one IP in 10 min -> 429", limited[6] === 429 && limited.slice(0, 6).every((s) => s === 409), limited);

  // -------------------------------------------------------------- 9. admin panel (logged in)
  console.log("\n9. Admin panel");
  const cookie = await adminCookie("owner@example.ee", "test-password-123");
  for (const p of ["/admin", "/admin/calendar?view=week&d=" + D, "/admin/bookings", "/admin/callbacks", "/admin/services", "/admin/settings", "/admin/bookings/new"]) {
    const r = await fetch(`${BASE}${p}`, { headers: { Cookie: cookie } });
    check(`GET ${p} -> 200`, r.status === 200, r.status);
  }
  const add = await callAction("/admin/calendar", "addSlots", [{ mode: "days", dates: [D], start: "13:00", end: "15:00", length: 60, parallel: 1 }], cookie);
  st = await slotStatuses(D);
  check("admin adds slots for a day (13:00, 14:00)", st.includes("13:00:free") && st.includes("14:00:free"), { status: add.status, st });
  const { data: s13 } = await db.from("slots").select("id").eq("date", D).eq("start_time", "13:00").single();
  await callAction("/admin/calendar", "updateSlots", [[s13!.id], "block"], cookie);
  st = await slotStatuses(D);
  check("admin blocks a slot", st.includes("13:00:blocked"), st);
  await callAction("/admin/calendar", "setDayClosed", [D, true], cookie);
  st = await slotStatuses(D);
  check("close whole day: every free slot blocked, booked untouched", !st.some((x) => x.endsWith(":free")) && st.some((x) => x.endsWith(":booked")), st);
  await callAction("/admin/calendar", "copyDay", [D, [addDays(D, 7)]], cookie);
  const copied = await slotStatuses(addDays(D, 7));
  check("copy day to another date creates free slots", copied.length >= 8 && copied.every((x) => x.endsWith(":free")), copied);
  await db.from("slots").delete().eq("date", addDays(D, 7));
  const { data: bookedSlot } = await db.from("slots").select("id").eq("date", D).eq("status", "booked").limit(1).single();
  await callAction("/admin/calendar", "updateSlots", [[bookedSlot!.id], "delete"], cookie);
  const { data: still } = await db.from("slots").select("id").eq("id", bookedSlot!.id).maybeSingle();
  check("booked slots cannot be deleted from the calendar", !!still);
  await callAction("/admin/calendar", "setDayClosed", [D, false], cookie);

  // cleanup test data
  for (const d of [D, D2]) {
    const { data: bs } = await db.from("bookings").select("id").eq("date", d);
    const ids = (bs ?? []).map((b) => b.id);
    if (ids.length) {
      await db.from("slots").update({ status: "free", booking_id: null }).in("booking_id", ids);
      await db.from("notification_log").delete().in("booking_id", ids);
      await db.from("email_actions").delete().in("booking_id", ids);
      await db.from("bookings").delete().in("id", ids);
    }
    await db.from("slots").delete().eq("date", d);
  }
  await db.from("notification_log").delete().not("callback_id", "is", null);
  await db.from("callback_requests").delete().eq("name", "Marina K.");

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
