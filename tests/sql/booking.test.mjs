/**
 * Database-level tests for the booking functions and RLS.
 * Needs the local test database: `scripts/test/local-db.sh start`
 *   node --test tests/sql/
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import pg from "pg";

const DATABASE_URL = process.env.TEST_DATABASE_URL || "postgres://postgres@127.0.0.1:54329/autoshop";
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 40 });

const token = () => randomBytes(24).toString("hex");
const sha = (s) => createHash("sha256").update(s).digest("hex");

// A far-future test day so "too soon" checks never interfere.
const DAY = "2031-03-04"; // Tuesday

async function q(sql, params = []) {
  return (await pool.query(sql, params)).rows;
}

async function asRole(role, claims, fn) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    return await fn(client);
  } finally {
    await client.query("rollback").catch(() => {});
    client.release();
  }
}

function bookingPayload(overrides = {}) {
  return {
    date: DAY,
    start_time: "09:00",
    service_ids: ["oil-change"],
    customer_name: "Ivan Petrov",
    phone: "+372 5555 1234",
    email: "ivan@example.com",
    car_make: "Toyota",
    car_model: "Corolla",
    car_year: 2015,
    plate: "123abc",
    comment: "Knocking noise",
    lang: "ru",
    manage_token: token(),
    timezone: "Europe/Tallinn",
    min_lead_minutes: 60,
    ...overrides,
  };
}

async function createBooking(overrides, client = pool) {
  const { rows } = await client.query("select public.create_booking($1::jsonb) as r", [
    JSON.stringify(bookingPayload(overrides)),
  ]);
  return rows[0].r;
}

before(async () => {
  await q("delete from public.slots where date >= '2031-01-01' and status <> 'booked'");
  // Day layout: bay 1 and 2, 09–12 and 13–17 (lunch gap), 60 min each.
  await q(
    `insert into public.slots (date, start_time, end_time, bay)
     select $1::date, t, t + interval '60 min', b
     from unnest(array['09:00','10:00','11:00','13:00','14:00','15:00','16:00']::time[]) t,
          generate_series(1, 2) b`,
    [DAY],
  );
  // A single-bay day for the strict double-booking race.
  await q(
    `insert into public.slots (date, start_time, end_time, bay) values
       ('2031-03-05', '10:00', '11:00', 1)`,
  );
});

after(async () => {
  await pool.end();
});

test("anon can read free slots (date/time only) but nothing private", async () => {
  await asRole("anon", { role: "anon" }, async (c) => {
    const free = await c.query("select date, start_time, end_time, bay, status from public.slots where date = $1", [DAY]);
    assert.ok(free.rows.length > 0);
    assert.ok(free.rows.every((r) => r.status === "free"));
    await assert.rejects(c.query("select booking_id from public.slots limit 1"), /permission denied/);
  });
  for (const table of ["bookings", "callback_requests", "notification_log", "settings", "action_tokens"]) {
    await asRole("anon", { role: "anon" }, async (c) => {
      await assert.rejects(c.query(`select * from public.${table} limit 1`), /permission denied/, table);
    });
  }
  await asRole("anon", { role: "anon" }, async (c) => {
    await assert.rejects(
      c.query("select public.create_booking($1::jsonb)", [JSON.stringify(bookingPayload())]),
      /permission denied/,
    );
  });
});

test("authenticated non-admin sees no bookings; admin does", async () => {
  await q("insert into public.admins (email) values ('owner@example.ee') on conflict do nothing");
  const created = await createBooking({ start_time: "16:00" });
  assert.equal(created.ok, true);
  await asRole("authenticated", { role: "authenticated", email: "stranger@example.com" }, async (c) => {
    const r = await c.query("select id from public.bookings");
    assert.equal(r.rows.length, 0);
  });
  await asRole("authenticated", { role: "authenticated", email: "owner@example.ee" }, async (c) => {
    const r = await c.query("select id from public.bookings where id = $1", [created.booking.id]);
    assert.equal(r.rows.length, 1);
  });
});

test("short service takes one slot; long service takes consecutive slots in one bay", async () => {
  const short = await createBooking({ start_time: "09:00", service_ids: ["oil-change"] });
  assert.equal(short.ok, true);
  assert.equal(short.booking.slot_ids.length, 1);
  assert.equal(short.booking.end_time, "10:00:00");

  const long = await createBooking({ start_time: "13:00", service_ids: ["brakes"] }); // 120 min
  assert.equal(long.ok, true);
  assert.equal(long.booking.slot_ids.length, 2);
  assert.equal(long.booking.end_time, "15:00:00");
  const bays = await q("select distinct bay from public.slots where id = any($1::uuid[])", [long.booking.slot_ids]);
  assert.equal(bays.length, 1);
  const statuses = await q("select status, booking_id from public.slots where id = any($1::uuid[])", [long.booking.slot_ids]);
  assert.ok(statuses.every((s) => s.status === "booked" && s.booking_id === long.booking.id));

  // Multiple services add up: oil (45) + diagnostics (60) = 105 min → 2 slots
  const multi = await createBooking({ start_time: "14:00", service_ids: ["oil-change", "diagnostics"] });
  assert.equal(multi.ok, true);
  assert.equal(multi.booking.duration_min, 105);
  assert.equal(multi.booking.slot_ids.length, 2);
});

test("a chain cannot jump over the lunch gap", async () => {
  const r = await createBooking({ start_time: "11:00", service_ids: ["brakes"] });
  assert.deepEqual(r, { ok: false, error: "slot_taken" });
  // and nothing was left booked
  const left = await q("select count(*)::int as n from public.slots where date = $1 and start_time = '11:00' and status = 'free'", [DAY]);
  assert.equal(left[0].n, 2);
});

test("simultaneous double booking: exactly one wins per bay", async () => {
  // Single bay, 20 parallel attempts on the same slot from separate connections.
  const attempts = await Promise.all(
    Array.from({ length: 20 }, async () => {
      const client = await pool.connect();
      try {
        return await createBooking({ date: "2031-03-05", start_time: "10:00" }, client);
      } finally {
        client.release();
      }
    }),
  );
  const ok = attempts.filter((a) => a.ok);
  const taken = attempts.filter((a) => !a.ok);
  assert.equal(ok.length, 1, "exactly one booking succeeds");
  assert.ok(taken.every((a) => a.error === "slot_taken"));
  const bookings = await q("select count(*)::int as n from public.bookings where date = '2031-03-05' and status <> 'cancelled'");
  assert.equal(bookings[0].n, 1);

  // Two bays at 10:00 on DAY: 10 parallel attempts → exactly 2 succeed, in different bays.
  const two = await Promise.all(Array.from({ length: 10 }, () => createBooking({ start_time: "10:00" })));
  const winners = two.filter((a) => a.ok);
  assert.equal(winners.length, 2);
  const bays = await q("select bay from public.slots where id = any($1::uuid[]) order by bay", [
    winners.flatMap((w) => w.booking.slot_ids),
  ]);
  assert.deepEqual(bays.map((b) => b.bay), [1, 2]);
});

test("too soon / unknown service are rejected", async () => {
  const past = await createBooking({ date: "2020-01-01" });
  assert.equal(past.error, "too_soon");
  const bad = await createBooking({ service_ids: ["does-not-exist"] });
  assert.equal(bad.error, "invalid_service");
});

test("customer cancellation frees the slots; too late is refused", async () => {
  const b = await createBooking({ start_time: "15:00", service_ids: ["diagnostics"] });
  assert.equal(b.ok, true);
  const r = (await q("select public.cancel_booking_by_token($1, 3, 'Europe/Tallinn') as r", [b.booking.manage_token]))[0].r;
  assert.equal(r.ok, true);
  assert.equal(r.booking.status, "cancelled");
  assert.equal(r.booking.cancelled_by, "client");
  const slots = await q("select status, booking_id from public.slots where id = any($1::uuid[])", [b.booking.slot_ids]);
  assert.ok(slots.every((s) => s.status === "free" && s.booking_id === null));

  // Cancelling twice is refused
  const again = (await q("select public.cancel_booking_by_token($1, 3, 'Europe/Tallinn') as r", [b.booking.manage_token]))[0].r;
  assert.equal(again.error, "not_cancellable");

  // The freed slot can be booked again
  const rebook = await createBooking({ start_time: "15:00", service_ids: ["diagnostics"] });
  assert.equal(rebook.ok, true);

  // Too late: a visit within the cancel window
  const soon = await q(
    `with s as (insert into public.slots (date, start_time, end_time, bay)
       values ((now() at time zone 'Europe/Tallinn')::date + 1, '06:00', '07:00', 9) returning *)
     select date::text, start_time from s`,
  );
  const tooLate = await createBooking({ date: soon[0].date, start_time: "06:00", min_lead_minutes: 0 });
  assert.equal(tooLate.ok, true);
  const refused = (await q("select public.cancel_booking_by_token($1, 48, 'Europe/Tallinn') as r", [tooLate.booking.manage_token]))[0].r;
  assert.equal(refused.error, "too_late");
  const unknown = (await q("select public.cancel_booking_by_token($1, 3, 'Europe/Tallinn') as r", [token()]))[0].r;
  assert.equal(unknown.error, "not_found");
});

test("admin action tokens: one-time confirm, decline frees slots, expiry", async () => {
  const b = await createBooking({ start_time: "16:00", service_ids: ["electrical"] });
  assert.equal(b.ok, true, JSON.stringify(b));
  const [c1, d1] = [token(), token()];
  await q("select public.create_action_tokens($1, $2, $3, 72)", [b.booking.id, sha(c1), sha(d1)]);

  const peek = (await q("select public.get_action_token($1) as r", [sha(c1)]))[0].r;
  assert.equal(peek.ok, true);
  assert.equal(peek.action, "confirm");
  assert.equal(peek.used, false);

  const confirm = (await q("select public.use_action_token($1) as r", [sha(c1)]))[0].r;
  assert.equal(confirm.ok, true);
  assert.equal(confirm.booking.status, "confirmed");
  const reuse = (await q("select public.use_action_token($1) as r", [sha(c1)]))[0].r;
  assert.equal(reuse.error, "used");
  const pairUsed = (await q("select public.use_action_token($1) as r", [sha(d1)]))[0].r;
  assert.equal(pairUsed.error, "used", "the decline link dies with the confirm link");

  // Decline flow on another booking
  const b2 = await createBooking({ start_time: "13:00", service_ids: ["electrical"] });
  assert.equal(b2.ok, true, JSON.stringify(b2));
  const [c2, d2] = [token(), token()];
  await q("select public.create_action_tokens($1, $2, $3, 72)", [b2.booking.id, sha(c2), sha(d2)]);
  const decline = (await q("select public.use_action_token($1) as r", [sha(d2)]))[0].r;
  assert.equal(decline.ok, true);
  assert.equal(decline.booking.status, "cancelled");
  assert.equal(decline.booking.cancelled_by, "admin");
  const freed = await q("select status from public.slots where id = any($1::uuid[])", [b2.booking.slot_ids]);
  assert.ok(freed.every((s) => s.status === "free"));

  // Expired token
  const b3 = await createBooking({ start_time: "13:00", service_ids: ["electrical"] });
  const c3 = token();
  await q("select public.create_action_tokens($1, $2, $3, 72)", [b3.booking.id, sha(c3), sha(token())]);
  await q("update public.action_tokens set expires_at = now() - interval '1 minute' where token_hash = $1", [sha(c3)]);
  const expired = (await q("select public.use_action_token($1) as r", [sha(c3)]))[0].r;
  assert.equal(expired.error, "expired");
  const invalid = (await q("select public.use_action_token($1) as r", [sha(token())]))[0].r;
  assert.equal(invalid.error, "invalid");
});

test("admin status change: cancel frees slots, cancelled is terminal", async () => {
  const b = await createBooking({ start_time: "11:00", service_ids: ["electrical"] });
  assert.equal(b.ok, true, JSON.stringify(b));
  const r = (await q("select public.admin_set_booking_status($1, 'cancelled') as r", [b.booking.id]))[0].r;
  assert.equal(r.ok, true);
  const freed = await q("select status from public.slots where id = any($1::uuid[])", [b.booking.slot_ids]);
  assert.ok(freed.every((s) => s.status === "free"));
  const back = (await q("select public.admin_set_booking_status($1, 'new') as r", [b.booking.id]))[0].r;
  assert.equal(back.error, "already_cancelled");
});

test("overlapping slots in the same bay are rejected by the database", async () => {
  await assert.rejects(
    q("insert into public.slots (date, start_time, end_time, bay) values ($1, '09:30', '10:30', 1)", [DAY]),
    /slots_no_overlap/,
  );
  // Same time in another bay is fine
  await q("insert into public.slots (date, start_time, end_time, bay) values ($1, '09:30', '10:30', 5)", [DAY]);
});

test("rate limiter allows N calls per window", async () => {
  const key = `test:${token()}`;
  const results = [];
  for (let i = 0; i < 4; i++) {
    results.push((await q("select public.hit_rate_limit($1, 3, 3600) as ok", [key]))[0].ok);
  }
  assert.deepEqual(results, [true, true, true, false]);
});
