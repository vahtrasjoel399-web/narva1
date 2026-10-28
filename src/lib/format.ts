import type { Lang } from "@/config/site";
import { siteConfig } from "@/config/site";
import { localeTags, t } from "@/i18n/config";
import { dateForFormat, type ISODate } from "./time";

type DurationStrings = { hours: string; minutes: string; hoursMinutes: string };

const durationStrings: Record<Lang, DurationStrings> = {
  et: { hours: "{h} h", minutes: "{m} min", hoursMinutes: "{h} h {m} min" },
  ru: { hours: "{h} ч", minutes: "{m} мин", hoursMinutes: "{h} ч {m} мин" },
  en: { hours: "{h} h", minutes: "{m} min", hoursMinutes: "{h} h {m} min" },
};

export function formatDuration(totalMin: number, lang: Lang): string {
  const s = durationStrings[lang];
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return t(s.minutes, { m });
  if (m === 0) return t(s.hours, { h });
  return t(s.hoursMinutes, { h, m });
}

export function formatPrice(amount: number, lang: Lang): string {
  return new Intl.NumberFormat(localeTags[lang], {
    style: "currency",
    currency: siteConfig.currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export const capFirst = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/** "Thu 30 Oct" style. */
export function formatDateShort(date: ISODate, lang: Lang): string {
  return capFirst(new Intl.DateTimeFormat(localeTags[lang], {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(dateForFormat(date)));
}

/** "Thursday, 30 October 2026" style. */
export function formatDateLong(date: ISODate, lang: Lang): string {
  return capFirst(new Intl.DateTimeFormat(localeTags[lang], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateForFormat(date)));
}

export function formatMonth(date: ISODate, lang: Lang): string {
  return capFirst(new Intl.DateTimeFormat(localeTags[lang], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateForFormat(date)));
}

export function formatPhoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function fullAddress(): string {
  const a = siteConfig.address;
  return `${a.street}, ${a.postalCode} ${a.city}`;
}
