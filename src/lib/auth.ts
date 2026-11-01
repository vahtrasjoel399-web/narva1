import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { siteConfig, type Locale } from "@/config/site";
import { isLocale } from "@/i18n";
import { adminDictionaries } from "@/i18n/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** The logged-in user if they are listed in admin_users, else null. */
export const getAdmin = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: row } = await supabaseAdmin().from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return row ? data.user : null;
});

export async function requireAdmin() {
  const user = await getAdmin();
  if (!user) redirect("/admin/login");
  return user;
}

export async function adminLang(): Promise<Locale> {
  const v = (await cookies()).get("admin_lang")?.value;
  return isLocale(v) ? v : siteConfig.notificationLanguage;
}

export async function adminDict() {
  const lang = await adminLang();
  return { lang, t: adminDictionaries[lang] };
}
