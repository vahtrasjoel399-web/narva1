/** Pure helpers for creating and copying availability slots (used by admin). */
import { addDays, eachDay, fromMinutes, isoWeekday, toMinutes, type ISODate } from "./time";

export type NewSlot = { date: ISODate; start_time: string; end_time: string; bay: number };

export type SlotPattern = {
  start: string; // "09:00"
  end: string; // "17:00"
  lengthMin: number; // 30 | 60 | 90 …
  parallel: number; // bays 1..N
  lunchFrom?: string;
  lunchTo?: string;
};

/** Slots for one day: back-to-back from start until end, skipping the lunch break. */
export function slotsForDay(date: ISODate, p: SlotPattern): NewSlot[] {
  const start = toMinutes(p.start);
  const end = toMinutes(p.end);
  const len = p.lengthMin;
  if (!(len > 0) || end <= start) return [];
  const lunchFrom = p.lunchFrom ? toMinutes(p.lunchFrom) : null;
  const lunchTo = p.lunchTo ? toMinutes(p.lunchTo) : null;
  const hasLunch = lunchFrom !== null && lunchTo !== null && lunchTo > lunchFrom;

  const times: Array<[number, number]> = [];
  let t = start;
  while (t + len <= end) {
    if (hasLunch && t < lunchTo! && t + len > lunchFrom!) {
      // Overlaps lunch → continue right after lunch.
      t = Math.max(t, lunchTo!);
      continue;
    }
    times.push([t, t + len]);
    t += len;
  }

  const bays = Math.max(1, Math.min(20, Math.floor(p.parallel)));
  const out: NewSlot[] = [];
  for (const [s, e] of times) {
    for (let bay = 1; bay <= bays; bay++) {
      out.push({ date, start_time: fromMinutes(s), end_time: fromMinutes(e), bay });
    }
  }
  return out;
}

export function slotsForDates(dates: ISODate[], p: SlotPattern): NewSlot[] {
  return [...new Set(dates)].sort().flatMap((d) => slotsForDay(d, p));
}

/** Dates for "every Mon–Fri for N weeks starting from X". */
export function weeklyDates(from: ISODate, weeks: number, weekdays: number[]): ISODate[] {
  const days = eachDay(from, addDays(from, Math.max(1, weeks) * 7 - 1));
  return days.filter((d) => weekdays.includes(isoWeekday(d)));
}

type SourceSlot = { date: ISODate; start_time: string; end_time: string; bay: number };

/** Copy one day's slot layout to other dates. */
export function copyDay(source: SourceSlot[], targets: ISODate[]): NewSlot[] {
  return targets.flatMap((date) =>
    source.map((s) => ({ date, start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5), bay: s.bay })),
  );
}

/** Copy a week (Mon–Sun starting at weekStart) to the following N weeks. */
export function copyWeek(source: SourceSlot[], weekStart: ISODate, times: number): NewSlot[] {
  const out: NewSlot[] = [];
  for (let w = 1; w <= times; w++) {
    for (const s of source) {
      const offset = Math.round((Date.parse(s.date) - Date.parse(weekStart)) / 86_400_000);
      if (offset < 0 || offset > 6) continue;
      out.push({
        date: addDays(weekStart, w * 7 + offset),
        start_time: s.start_time.slice(0, 5),
        end_time: s.end_time.slice(0, 5),
        bay: s.bay,
      });
    }
  }
  return out;
}
