/**
 * Pure availability logic (no I/O) — shared by the API and tests.
 * A start time is offered only when a chain of consecutive free slots in one
 * bay starts there and is long enough for the requested duration.
 * The database function `_lock_slot_chain` applies the same rule atomically.
 */
import { toMinutes, hhmm, type ISODate, type HHMM } from "./time";

export type FreeSlot = { date: ISODate; start_time: string; end_time: string; bay: number };

export type Availability = Record<ISODate, HHMM[]>;

export function computeStartTimes(
  slots: FreeSlot[],
  durationMin: number,
  opts: { today: ISODate; nowMinutes: number; minLeadMinutes: number },
): Availability {
  const byDayBay = new Map<string, FreeSlot[]>();
  for (const s of slots) {
    const key = `${s.date}|${s.bay}`;
    const list = byDayBay.get(key);
    if (list) list.push(s);
    else byDayBay.set(key, [s]);
  }

  const result = new Map<ISODate, Set<HHMM>>();
  const earliestToday = opts.nowMinutes + opts.minLeadMinutes;

  for (const list of byDayBay.values()) {
    list.sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
    for (let i = 0; i < list.length; i++) {
      const first = list[i];
      if (first.date < opts.today) continue;
      if (first.date === opts.today && toMinutes(first.start_time) < earliestToday) continue;

      let total = 0;
      let cursor = toMinutes(first.start_time);
      for (let j = i; j < list.length; j++) {
        const s = list[j];
        if (toMinutes(s.start_time) !== cursor) break;
        total += toMinutes(s.end_time) - toMinutes(s.start_time);
        cursor = toMinutes(s.end_time);
        if (total >= durationMin) break;
      }
      if (total >= durationMin) {
        const set = result.get(first.date) ?? new Set<HHMM>();
        set.add(hhmm(first.start_time));
        result.set(first.date, set);
      }
    }
  }

  const out: Availability = {};
  for (const date of [...result.keys()].sort()) {
    out[date] = [...result.get(date)!].sort();
  }
  return out;
}
