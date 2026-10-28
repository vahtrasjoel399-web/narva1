import type { Lang } from "@/config/site";
import ru, { type AdminDictionary } from "./ru";
import et from "./et";
import en from "./en";

export type { AdminDictionary };

const dictionaries: Record<Lang, AdminDictionary> = { ru, et, en };

export function getAdminDictionary(lang: Lang): AdminDictionary {
  return dictionaries[lang] ?? ru;
}
