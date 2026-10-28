import type { Lang } from "@/config/site";

export const locales = ["et", "ru", "en"] as const satisfies readonly Lang[];
export const defaultLocale: Lang = "et";

export const localeNames: Record<Lang, string> = {
  et: "Eesti",
  ru: "Русский",
  en: "English",
};

export const localeShort: Record<Lang, string> = { et: "ET", ru: "RU", en: "EN" };

/** BCP-47 tags used for Intl formatting and hreflang. */
export const localeTags: Record<Lang, string> = {
  et: "et-EE",
  ru: "ru-EE",
  en: "en-GB",
};

export const ogLocales: Record<Lang, string> = { et: "et_EE", ru: "ru_RU", en: "en_GB" };

export function isLocale(value: unknown): value is Lang {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** Replace {name} placeholders in a translation string. */
export function t(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}
