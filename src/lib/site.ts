import { siteConfig, type Locale } from "@/config/site";
import type { Dictionary } from "@/i18n";

export const telHref = (tel = siteConfig.phone.tel) => `tel:${tel}`;

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url).replace(/\/$/, "");

export const href = (lang: Locale, path = "") => `/${lang}${path}`;

/** Groups opening hours into display rows, e.g. "E–R 09:00–18:00", "P suletud". */
export function openingHoursRows(dict: Dictionary): { days: string; hours: string }[] {
  const byDay = new Map<number, string>();
  for (const block of siteConfig.openingHours) for (const d of block.days) byDay.set(d, `${block.open}–${block.close}`);
  const rows: { from: number; to: number; hours: string }[] = [];
  for (let d = 1; d <= 7; d++) {
    const hours = byDay.get(d) ?? dict.common.closed;
    const last = rows[rows.length - 1];
    if (last && last.hours === hours && last.to === d - 1) last.to = d;
    else rows.push({ from: d, to: d, hours });
  }
  return rows.map((r) => ({
    days: r.from === r.to ? dict.days.short[r.from - 1] : `${dict.days.short[r.from - 1]}–${dict.days.short[r.to - 1]}`,
    hours: r.hours,
  }));
}

export const fullAddress = () => `${siteConfig.address.street}, ${siteConfig.address.postalCode} ${siteConfig.address.city}`;
