/**
 * Date/time helpers. Slot dates are plain "YYYY-MM-DD" strings and times are
 * "HH:MM" strings in the shop's local timezone — no Date objects cross the
 * wire, which avoids every UTC/DST pitfall on serverless hosts.
 */
import { siteConfig } from "@/config/site";

export type ISODate = string; // YYYY-MM-DD
export type HHMM = string; // HH:MM

const pad = (n: number) => String(n).padStart(2, "0");

/** Current date and minutes-since-midnight in the shop timezone. */
export function shopNow(now: Date = new Date(), timeZone: string = siteConfig.timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return { date, minutes };
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function fromMinutes(total: number): HHMM {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${pad(h)}:${pad(m)}`;
}

/** "09:00:00" → "09:00" */
export function hhmm(time: string): HHMM {
  return time.slice(0, 5);
}

function parseDate(date: ISODate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDate(d: Date): ISODate {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = parseDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
}

/** ISO weekday: 1 = Monday … 7 = Sunday */
export function isoWeekday(date: ISODate): number {
  const day = parseDate(date).getUTCDay();
  return day === 0 ? 7 : day;
}

export function startOfWeek(date: ISODate): ISODate {
  return addDays(date, 1 - isoWeekday(date));
}

export function startOfMonth(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

export function addMonths(date: ISODate, months: number): ISODate {
  const d = parseDate(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + months);
  return formatDate(d);
}

export function daysInMonth(date: ISODate): number {
  const d = parseDate(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.getUTCDate();
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);
}

export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** 6×7 grid of dates for a month calendar, starting on Monday. */
export function monthGrid(month: ISODate): ISODate[] {
  const first = startOfMonth(month);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return formatDate(parseDate(value)) === value;
}

/** A Date for Intl formatting of a shop-local date (noon UTC avoids day shifts). */
export function dateForFormat(date: ISODate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}
