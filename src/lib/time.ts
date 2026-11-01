/**
 * Date/time helpers. Slot dates and times are shop-local wall-clock values
 * ("2026-10-30", "10:00"), so most maths here is plain calendar arithmetic.
 */

export function todayInTz(tz: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function nowMinutesInTz(tz: string, now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function toUtcDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(date: string, days: number): string {
  const d = toUtcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 1 = Monday ... 7 = Sunday */
export function isoWeekday(date: string): number {
  const wd = toUtcDate(date).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function startOfWeek(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / 86_400_000);
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "10:00:00" -> "10:00" */
export function hhmm(time: string): string {
  return time.slice(0, 5);
}

export function formatDate(date: string, localeTag: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat(localeTag, { ...opts, timeZone: "UTC" }).format(toUtcDate(date));
}

export function monthLabel(year: number, month0: number, localeTag: string): string {
  return new Intl.DateTimeFormat(localeTag, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month0, 1)));
}

export function formatDuration(minutes: number, units: { hour: string; min: string }): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} ${units.hour} ${m} ${units.min}`;
  if (h) return `${h} ${units.hour}`;
  return `${m} ${units.min}`;
}

export function formatPrice(value: number | null | undefined, localeTag: string): string {
  if (value == null) return "";
  return new Intl.NumberFormat(localeTag, { style: "currency", currency: "EUR", maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
}
