import type { Locale } from "@/config/site";
import et, { type Dictionary } from "./dictionaries/et";
import ru from "./dictionaries/ru";
import en from "./dictionaries/en";

export const locales: Locale[] = ["et", "ru", "en"];
export const defaultLocale: Locale = "et";

export const localeNames: Record<Locale, string> = { et: "Eesti", ru: "Русский", en: "English" };
export const localeShort: Record<Locale, string> = { et: "ET", ru: "RU", en: "EN" };
// BCP 47 tags for Intl formatting and hreflang.
export const localeTags: Record<Locale, string> = { et: "et-EE", ru: "ru-RU", en: "en-GB" };

const dictionaries: Record<Locale, Dictionary> = { et, ru, en };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Replace {name} placeholders. */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export type { Dictionary };
