import { test } from "node:test";
import assert from "node:assert/strict";

test("email templates escape user input and include every client field", async () => {
  // templates.ts imports "server-only"; stub it for the test runner.
  const Module = await import("node:module");
  const req = Module.createRequire(import.meta.url);
  req.cache[req.resolve("server-only")] = { exports: {} } as never;
  const { adminBookingEmail } = await import("../../src/lib/notify/templates");
  const b = {
    id: "x", number: 1042, date: "2026-10-29", start_time: "10:00:00", end_time: "11:30:00", status: "new",
    customer_name: "Ivan <script>alert(1)</script> Petrov", phone: "+372 5123 4567", email: "ivan@example.com",
    car_make: "Toyota", car_model: "Corolla", car_year: 2014, plate: "123ABC", comment: "Скрип при торможении & стук",
    lang: "ru" as const, manage_token: "t", serviceNames: { et: ["Pidurid"], ru: ["Тормоза"], en: ["Brakes"] }, durationMin: 90,
  };
  const e = adminBookingEmail(b, "en", "new", { confirm: "https://x/admin/action/C", decline: "https://x/admin/action/D", admin: "https://x/admin/bookings/x", linkHours: 72 });
  assert.match(e.subject, /^New booking #1042 – Thu 29 Oct 10:00 – Ivan/);
  assert.ok(!e.html.includes("<script>"), "script tag must be escaped");
  assert.ok(e.html.includes("&lt;script&gt;"));
  for (const part of ['href="tel:+37251234567"', "ivan@example.com", "Toyota Corolla 2014", "123ABC", "Brakes", "1 h 30 min", "Скрип при торможении &amp; стук", "Russian", "https://x/admin/action/C", "https://x/admin/action/D", "https://x/admin/bookings/x"]) {
    assert.ok(e.html.includes(part), `html should include ${part}`);
  }
});
