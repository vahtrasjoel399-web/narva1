import { fromMinutes, toMinutes } from "./time";

export type FreeSlot = { date: string; start_time: string; end_time: string; bay: number };

/**
 * For each date, the start times where a chain of consecutive free slots
 * (same bay, each one starting where the previous ends) covers `minutes`.
 * The database re-checks this when booking, this is only for display.
 */
export function computeStartTimes(slots: FreeSlot[], minutes: number): Record<string, string[]> {
  const groups = new Map<string, { start: number; end: number }[]>();
  for (const s of slots) {
    const key = `${s.date}|${s.bay}`;
    const list = groups.get(key) ?? [];
    list.push({ start: toMinutes(s.start_time), end: toMinutes(s.end_time) });
    groups.set(key, list);
  }

  const result: Record<string, Set<string>> = {};
  for (const [key, list] of groups) {
    const date = key.split("|")[0];
    list.sort((a, b) => a.start - b.start);
    const byStart = new Map(list.map((s) => [s.start, s]));
    for (const first of list) {
      let end = first.end;
      while (end - first.start < minutes) {
        const next = byStart.get(end);
        if (!next) break;
        end = next.end;
      }
      if (end - first.start >= minutes) {
        (result[date] ??= new Set()).add(fromMinutes(first.start));
      }
    }
  }

  return Object.fromEntries(
    Object.entries(result)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, set]) => [date, [...set].sort()]),
  );
}
