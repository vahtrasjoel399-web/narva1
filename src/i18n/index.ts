import type { Lang } from "@/config/site";
import et, { type Dictionary } from "./dictionaries/et";
import ru from "./dictionaries/ru";
import en from "./dictionaries/en";

export type { Dictionary };

const dictionaries: Record<Lang, Dictionary> = { et, ru, en };

/** Dictionaries are small, so they are bundled statically (works on server and in emails). */
export function getDictionary(lang: Lang): Dictionary {
  return dictionaries[lang] ?? et;
}
