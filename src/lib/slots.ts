import { addDays, fromMinutes, isoWeekday, toMinutes } from "./time";

export type NewSlot = { date: string; start_time: string; end_time: string; bay: number };

/** Slots of `length` minutes between start and end, skipping a lunch break, for each bay. */
export function generateSlots(opts: { dates: string[]; start: string; end: string; length: number; parallel: number; lunchStart?: string; lunchEnd?: string }): NewSlot[] {
  const out: NewSlot[] = [];
  const s = toMinutes(opts.start);
  const e = toMinutes(opts.end);
  const ls = opts.lunchStart ? toMinutes(opts.lunchStart) : null;
  const le = opts.lunchEnd ? toMinutes(opts.lunchEnd) : null;
  for (const date of opts.dates) {
    let t = s;
    while (t + opts.length <= e) {
      if (ls != null && le != null && le > ls && t < le && t + opts.length > ls) {
        t = le;
        continue;
      }
      for (let bay = 1; bay <= opts.parallel; bay++) {
        out.push({ date, start_time: fromMinutes(t), end_time: fromMinutes(t + opts.length), bay });
      }
      t += opts.length;
    }
  }
  return out;
}

/** Dates from `from` for `weeks` weeks that fall on the given ISO weekdays (1 = Mon). */
export function datesForWeekdays(from: string, weeks: number, weekdays: number[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(from, i);
    if (weekdays.includes(isoWeekday(d))) out.push(d);
  }
  return out;
}
