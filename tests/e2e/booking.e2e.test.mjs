/**
 * End-to-end tests against the running app (scripts/test/run-e2e.sh starts everything):
 * Next.js → supabase-js → mock PostgREST → real Postgres (RLS + booking functions),
 * emails captured by the mock Resend API.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import pg from "pg";

const APP = process.env.APP_URL || "http://localhost:3100";
const MAIL = process.env.MOCK_RESEND || "http://127.0.0.1:54400";
const DB = process.env.TEST_DATABASE_URL || "postgres://postgres@127.0.0.1:54329/autoshop";
const pool = new pg.Pool({ connectionString: DB });

const require = createRequire(import.meta.url);
function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    return require(`${execSync("npm root -g").toString().trim()}/playwright`);
  }
}

const q = async (sql, params = []) => (await pool.query(sql, params)).rows;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function emails() {
  return (await fetch(`${MAIL}/emails`)).json();
}
async function waitForEmails(predicate, count = 1, timeout = 15000) {
  const start = Date.now();
  for (;;) {
    const found = (await emails()).filter(predicate);
    if (found.length >= count) return found;
    if (Date.now() - start > timeout) throw new Error(`timed out waiting for ${count} email(s)`);
    await sleep(250);
  }
}
const linksIn = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));

let ip = 0;
async function post(path, body) {
  const res = await fetch(`${APP}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": `10.0.0.${++ip % 250}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function availability(services) {
  const res = await fetch(`${APP}/api/availability?services=${services}`);
  assert.equal(res.status, 200);
  return res.json();
}

function bookingBody(overrides = {}) {
  return {
    serviceIds: ["oil-change"],
    lang: "ru",
    carMake: "Toyota",
    carModel: "Corolla",
    carYear: "2015",
    plate: "123abc",
    comment: "Стучит спереди <script>alert(1)</script> при торможении",
    name: "Ivan Petrov",
    phone: "+372 5555 1234",
    email: "ivan@example.com",
    consent: true,
    website: "",
    ...overrides,
  };
}

before(async () => {
  await fetch(`${MAIL}/emails`, { method: "DELETE" });
  await fetch(`${MAIL}/fail`, { method: "POST", body: JSON.stringify({ on: false }) });
});
after(async () => {
  await fetch(`${MAIL}/fail`, { method: "POST", body: JSON.stringify({ on: false }) });
  await pool.end();
});

test("availability only offers start times with enough consecutive free slots", async () => {
  const short = await availability("oil-change");
  const long = await availability("brakes");
  assert.equal(short.durationMin, 45);
  assert.equal(long.durationMin, 120);
  const weekday = Object.keys(long.days).find((d) => short.days[d]?.length >= 7);
  assert.ok(weekday, "a seeded weekday exists");
  // 11:00 + 120 min would cross the 12:00–13:00 lunch gap; 16:00 would run past 17:00.
  assert.ok(short.days[weekday].includes("11:00"));
  assert.ok(!long.days[weekday].includes("11:00"));
  assert.ok(!long.days[weekday].includes("16:00"));
});

test("booking flow: atomic create, admin email with every field + links, client email", async () => {
  const avail = await availability("oil-change,brakes");
  const date = Object.keys(avail.days)[2];
  const time = avail.days[date][0];
  const res = await post("/api/bookings", bookingBody({ serviceIds: ["oil-change", "brakes"], date, time }));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const { number, manageToken } = res.body;

  const [row] = await q("select * from bookings where number = $1", [number]);
  assert.equal(row.status, "new");
  assert.equal(row.duration_min, 165);
  assert.equal(row.slot_ids.length, 3);
  const slots = await q("select status, booking_id from slots where id = any($1)", [row.slot_ids]);
  assert.ok(slots.every((s) => s.status === "booked" && s.booking_id === row.id));

  // The booked time is gone from the public availability.
  const after = await availability("oil-change,brakes");
  assert.ok(!(after.days[date] ?? []).includes(time));

  const [admin] = await waitForEmails((m) => m.subject.startsWith(`Новая запись #${number}`));
  assert.deepEqual(admin.to, ["owner@example.ee", "manager@example.ee"]);
  assert.match(admin.subject, new RegExp(`^Новая запись #${number} – .+ ${time} – Ivan Petrov$`));
  for (const expected of [
    "Ivan Petrov",
    'href="tel:+37255551234"',
    "mailto:ivan@example.com",
    "Toyota Corolla 2015",
    "123ABC",
    "Замена масла, Тормоза",
    "2 ч 45 мин",
    "Стучит спереди &lt;script&gt;alert(1)&lt;/script&gt; при торможении",
    "русский",
    time,
  ]) {
    assert.ok(admin.html.includes(expected), `admin email contains ${expected}`);
  }
  assert.ok(!admin.html.includes("<script>alert"), "client text is escaped");
  const actionLinks = linksIn(admin.html).filter((l) => l.includes("/admin/a/"));
  assert.equal(actionLinks.length, 2, "confirm + decline links");
  assert.ok(linksIn(admin.html).some((l) => l.includes(`/admin/bookings?id=${row.id}`)), "open in admin link");

  const [client] = await waitForEmails((m) => m.to.includes("ivan@example.com") && m.subject.includes(`${number}`));
  assert.match(client.subject, /^Запись № \d+ — /);
  assert.ok(linksIn(client.html).some((l) => l.endsWith(`/ru/booking/manage/${manageToken}`)), "manage link in client email");

  // Log entries
  const log = await q("select event, status from notification_log where booking_id = $1 order by id", [row.id]);
  assert.deepEqual(log.map((l) => `${l.event}:${l.status}`).sort(), ["booking_created:sent", "client_created:sent"]);
});

test("simultaneous double booking over HTTP: exactly one wins, others get slot_taken", async () => {
  const [{ d }] = await q("select ((now() at time zone 'Europe/Tallinn')::date + 20)::text as d");
  await q("insert into slots (date, start_time, end_time, bay) values ($1, '06:00', '07:00', 9) on conflict do nothing", [d]);
  const results = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      post("/api/bookings", bookingBody({ date: d, time: "06:00", name: `Racer ${i}`, email: "" })),
    ),
  );
  const created = results.filter((r) => r.status === 201);
  const taken = results.filter((r) => r.status === 409);
  assert.equal(created.length, 1, JSON.stringify(results.map((r) => r.status)));
  assert.equal(taken.length, 11);
  assert.ok(taken.every((r) => r.body.error === "slot_taken"));
  const rows = await q("select count(*)::int as n from bookings where date = $1 and start_time = '06:00'", [d]);
  assert.equal(rows[0].n, 1);
});

test("admin email links: Confirm works once, the pair dies, client is emailed", async () => {
  const avail = await availability("diagnostics");
  const date = Object.keys(avail.days)[3];
  const res = await post("/api/bookings", bookingBody({ serviceIds: ["diagnostics"], date, time: avail.days[date][0], name: "Confirm Me", email: "confirm@example.com" }));
  assert.equal(res.status, 201);
  const number = res.body.number;
  const [admin] = await waitForEmails((m) => m.subject.includes(`#${number} `) && m.subject.startsWith("Новая"));
  const [confirmUrl, declineUrl] = linksIn(admin.html).filter((l) => l.includes("/admin/a/"));

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(confirmUrl); // no login needed
    await page.waitForSelector("text=Подтвердить эту запись?");
    assert.ok(await page.isVisible("text=Confirm Me"));
    await page.click("button:has-text('Подтвердить запись')");
    await page.waitForSelector("text=Запись подтверждена");
    const [row] = await q("select status from bookings where number = $1", [number]);
    assert.equal(row.status, "confirmed");

    await page.goto(confirmUrl);
    await page.waitForSelector("text=Эта ссылка уже использована");
    await page.goto(declineUrl);
    await page.waitForSelector("text=Эта ссылка уже использована");
    const [still] = await q("select status from bookings where number = $1", [number]);
    assert.equal(still.status, "confirmed", "used decline link did nothing");
  } finally {
    await browser.close();
  }
  await waitForEmails((m) => m.to.includes("confirm@example.com") && m.subject === `Запись № ${number} подтверждена`);
});

test("admin email links: Decline frees the slot and asks the client to rebook", async () => {
  const avail = await availability("electrical");
  const date = Object.keys(avail.days)[4];
  const time = avail.days[date][1];
  const res = await post("/api/bookings", bookingBody({ serviceIds: ["electrical"], date, time, name: "Decline Me", email: "decline@example.com", lang: "et" }));
  assert.equal(res.status, 201);
  const number = res.body.number;
  const [admin] = await waitForEmails((m) => m.subject.includes(`#${number} `) && m.subject.startsWith("Новая"));
  const declineUrl = linksIn(admin.html).filter((l) => l.includes("/admin/a/"))[1];

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(declineUrl);
    await page.click("button:has-text('Отклонить и освободить время')");
    await page.waitForSelector("text=Запись отклонена");
  } finally {
    await browser.close();
  }
  const [row] = await q("select status, cancelled_by, slot_ids from bookings where number = $1", [number]);
  assert.equal(row.status, "cancelled");
  assert.equal(row.cancelled_by, "admin");
  const slots = await q("select status from slots where id = any($1)", [row.slot_ids]);
  assert.ok(slots.every((s) => s.status === "free"));
  const [mail] = await waitForEmails((m) => m.to.includes("decline@example.com") && m.subject.includes("palun vali uus aeg"));
  assert.ok(linksIn(mail.html).some((l) => l.endsWith("/et/booking")), "link to pick a new time, in the client's language");
});

test("customer cancellation frees the slot and emails admin + client", async () => {
  const avail = await availability("tyres-alignment");
  const date = Object.keys(avail.days)[5];
  const time = avail.days[date][0];
  const res = await post("/api/bookings", bookingBody({ serviceIds: ["tyres-alignment"], date, time, name: "Cancel Me", email: "cancel@example.com", lang: "en" }));
  assert.equal(res.status, 201);
  const { number, manageToken } = res.body;

  const cancel = await post("/api/bookings/cancel", { token: manageToken });
  assert.equal(cancel.status, 200);
  const [row] = await q("select status, cancelled_by, slot_ids from bookings where number = $1", [number]);
  assert.equal(row.status, "cancelled");
  assert.equal(row.cancelled_by, "client");
  const slots = await q("select status, booking_id from slots where id = any($1)", [row.slot_ids]);
  assert.ok(slots.every((s) => s.status === "free" && s.booking_id === null));
  const again = await availability("tyres-alignment");
  assert.ok(again.days[date].includes(time), "the time is bookable again");

  const [admin] = await waitForEmails((m) => m.subject.startsWith(`Отмена записи #${number}`));
  assert.ok(admin.html.includes("Запись отменена клиентом"));
  assert.ok(admin.html.includes("Освобождено время"));
  assert.ok(admin.html.includes("Cancel Me") && admin.html.includes("tel:+37255551234"));
  await waitForEmails((m) => m.to.includes("cancel@example.com") && m.subject === `Booking no. ${number} is cancelled`);

  const twice = await post("/api/bookings/cancel", { token: manageToken });
  assert.equal(twice.status, 409);
});

test("cancellation is refused inside the cancel window", async () => {
  const [{ d, t, h }] = await q(
    `select (x)::date::text as d, to_char(date_trunc('hour', x), 'HH24:MI') as t, extract(hour from x)::int as h
     from (select (now() at time zone 'Europe/Tallinn') + interval '2 hours' as x) s`,
  );
  if (h >= 23) return; // the slot would cross midnight — nothing to test at this hour
  await q("insert into slots (date, start_time, end_time, bay) values ($1, $2::time, $2::time + interval '45 min', 11) on conflict do nothing", [d, t]);
  const token = randomBytes(24).toString("hex");
  const [{ r }] = await q(
    `select public.create_booking(jsonb_build_object('date', $1::text, 'start_time', $2::text, 'service_ids', jsonb_build_array('oil-change'),
       'customer_name', 'Late', 'phone', '+3725555', 'car_make', 'VW', 'car_model', 'Golf', 'lang', 'en',
       'manage_token', $3::text, 'allow_past', true)) as r`,
    [d, t, token],
  );
  assert.equal(r.ok, true, JSON.stringify(r));
  const res = await post("/api/bookings/cancel", { token });
  assert.equal(res.status, 409);
  assert.equal(res.body.error, "too_late");
  const [row] = await q("select status from bookings where manage_token = $1", [token]);
  assert.equal(row.status, "new");
});

test("callback request is stored and the admin gets a tap-to-call email", async () => {
  const res = await post("/api/callback", { name: "Olga", phone: "+372 5000 1111", comment: "Нет свободного времени, позвоните", lang: "ru", website: "" });
  assert.equal(res.status, 201);
  const [row] = await q("select * from callback_requests where name = 'Olga'");
  assert.equal(row.status, "new");
  const [mail] = await waitForEmails((m) => m.subject.startsWith("Просят перезвонить – Olga"));
  assert.ok(mail.html.includes('href="tel:+37250001111"'));
  assert.ok(mail.html.includes("Нет свободного времени, позвоните"));
});

test("spam and invalid input are rejected (honeypot + zod)", async () => {
  const avail = await availability("oil-change");
  const date = Object.keys(avail.days)[6];
  const spam = await post("/api/bookings", bookingBody({ date, time: avail.days[date][0], website: "http://spam" }));
  assert.equal(spam.status, 400);
  const invalid = await post("/api/bookings", bookingBody({ date, time: avail.days[date][0], phone: "abc", consent: false, carMake: "" }));
  assert.equal(invalid.status, 422);
  assert.deepEqual(
    { phone: invalid.body.fields.phone, consent: invalid.body.fields.consent, carMake: invalid.body.fields.carMake },
    { phone: "phone", consent: "consent", carMake: "required" },
  );
  const cb = await post("/api/callback", { name: "", phone: "1", lang: "et" });
  assert.equal(cb.status, 422);
});

test("an email outage never breaks the booking; failure is logged for the admin badge", async () => {
  await fetch(`${MAIL}/fail`, { method: "POST", body: JSON.stringify({ on: true }) });
  try {
    const avail = await availability("pre-inspection");
    const date = Object.keys(avail.days)[7];
    const res = await post("/api/bookings", bookingBody({ serviceIds: ["pre-inspection"], date, time: avail.days[date][0], name: "Outage" }));
    assert.equal(res.status, 201, "booking saved even though email is down");
    const [row] = await q("select id from bookings where number = $1", [res.body.number]);
    const start = Date.now();
    let log = [];
    while (Date.now() - start < 20000) {
      log = await q("select event, status, attempts, error from notification_log where booking_id = $1", [row.id]);
      if (log.length >= 2) break;
      await sleep(300);
    }
    assert.ok(log.length >= 2, "both notifications logged");
    assert.ok(log.every((l) => l.status === "failed" && l.attempts === 3 && /503/.test(l.error)), JSON.stringify(log));
  } finally {
    await fetch(`${MAIL}/fail`, { method: "POST", body: JSON.stringify({ on: false }) });
  }
});
