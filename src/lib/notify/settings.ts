import "server-only";
import { siteConfig, type Locale } from "@/config/site";
import { serverEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isLocale } from "@/i18n";

export type NotifySettings = { emails: string[]; lang: Locale; source: { emails: "settings" | "env" } };

/** Admin settings override env NOTIFY_EMAILS and the config language. */
export async function getNotifySettings(): Promise<NotifySettings> {
  let emails: string[] = [];
  let lang: Locale = siteConfig.notificationLanguage;
  try {
    const { data } = await supabaseAdmin().from("settings").select("key, value").in("key", ["notify_emails", "notify_lang"]);
    for (const row of data ?? []) {
      if (row.key === "notify_emails" && Array.isArray(row.value)) emails = row.value.filter((e: unknown) => typeof e === "string" && e);
      if (row.key === "notify_lang" && isLocale(row.value)) lang = row.value;
    }
  } catch (e) {
    console.error("[notify] settings read failed", e);
  }
  if (emails.length) return { emails, lang, source: { emails: "settings" } };
  return { emails: serverEnv.notifyEmails, lang, source: { emails: "env" } };
}
