import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStartTimes } from "../../src/lib/availability";
import { datesForWeekdays, generateSlots } from "../../src/lib/slots";
import { bookingSchema, callbackSchema } from "../../src/lib/validation";

const s = (date: string, start: string, end: string, bay = 1) => ({ date, start_time: `${start}:00`, end_time: `${end}:00`, bay });

test("start times only where enough consecutive free slots exist", () => {
  const slots = [s("2026-11-02", "09:00", "09:30"), s("2026-11-02", "09:30", "10:00"), s("2026-11-02", "10:00", "10:30"), s("2026-11-02", "11:00", "11:30")];
  assert.deepEqual(computeStartTimes(slots, 30), { "2026-11-02": ["09:00", "09:30", "10:00", "11:00"] });
  assert.deepEqual(computeStartTimes(slots, 60), { "2026-11-02": ["09:00", "09:30"] });
  assert.deepEqual(computeStartTimes(slots, 90), { "2026-11-02": ["09:00"] });
  assert.deepEqual(computeStartTimes(slots, 120), {});
});

test("chains never jump between bays", () => {
  const slots = [s("2026-11-02", "09:00", "10:00", 1), s("2026-11-02", "10:00", "11:00", 2)];
  assert.deepEqual(computeStartTimes(slots, 120), {});
  assert.deepEqual(computeStartTimes(slots, 60), { "2026-11-02": ["09:00", "10:00"] });
});

test("parallel bays collapse into one start time", () => {
  const slots = [s("2026-11-02", "09:00", "10:00", 1), s("2026-11-02", "09:00", "10:00", 2)];
  assert.deepEqual(computeStartTimes(slots, 60), { "2026-11-02": ["09:00"] });
});

test("slot generator respects lunch break, length and bays", () => {
  const out = generateSlots({ dates: ["2026-11-02"], start: "09:00", end: "14:00", length: 60, parallel: 2, lunchStart: "12:00", lunchEnd: "13:00" });
  const times = [...new Set(out.map((x) => x.start_time))];
  assert.deepEqual(times, ["09:00", "10:00", "11:00", "13:00"]);
  assert.equal(out.length, 8);
  const ninety = generateSlots({ dates: ["2026-11-02"], start: "09:00", end: "13:00", length: 90, parallel: 1, lunchStart: "12:00", lunchEnd: "12:30" });
  // 10:30–12:00 ends exactly at lunch; 12:30–14:00 would pass the 13:00 end.
  assert.deepEqual(ninety.map((x) => `${x.start_time}-${x.end_time}`), ["09:00-10:30", "10:30-12:00"]);
});

test("weekday dates for N weeks", () => {
  // 2026-11-02 is a Monday
  const d = datesForWeekdays("2026-11-02", 2, [1, 3]);
  assert.deepEqual(d, ["2026-11-02", "2026-11-04", "2026-11-09", "2026-11-11"]);
});

test("booking validation", () => {
  const base = { services: ["brakes"], date: "2026-11-02", time: "09:00", car_make: "VW", car_model: "Golf", name: "Ivan Petrov", phone: "+372 5123 4567", consent: true, lang: "ru" };
  assert.ok(bookingSchema.safeParse(base).success);
  const bad = bookingSchema.safeParse({ ...base, phone: "abc", email: "nope", consent: false, car_year: "1800" });
  assert.equal(bad.success, false);
  const keys = bad.error!.issues.map((i) => `${String(i.path[0])}:${i.message}`);
  assert.ok(keys.includes("phone:phone"));
  assert.ok(keys.includes("email:email"));
  assert.ok(keys.includes("consent:consent"));
  assert.ok(keys.some((k) => k.startsWith("car_year:")));
  assert.equal(bookingSchema.safeParse({ ...base, services: [] }).success, false);
  assert.equal(callbackSchema.safeParse({ name: "A", phone: "+3725", lang: "et" }).success, false);
});
