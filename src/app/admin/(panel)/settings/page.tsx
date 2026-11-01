import { serverEnv } from "@/lib/env";
import { adminDict } from "@/lib/auth";
import { getNotifySettings } from "@/lib/notify/settings";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SettingsForm } from "@/components/admin/settings-form";
import { NotificationLog } from "@/components/admin/notification-log";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { t } = await adminDict();
  const settings = await getNotifySettings();
  const { data: logs } = await supabaseAdmin()
    .from("notification_log")
    .select("id, event, audience, recipient, subject, status, attempts, error, created_at, dismissed, booking_id")
    .order("created_at", { ascending: false })
    .limit(50);
  return (
    <div className="max-w-3xl space-y-10">
      <h1 className="text-2xl font-bold md:text-3xl">{t.settings.title}</h1>
      <SettingsForm t={t} emails={settings.source.emails === "settings" ? settings.emails.join("\n") : ""} envEmails={serverEnv.notifyEmails.join(", ") || "—"} lang={settings.lang} />
      <NotificationLog t={t} logs={logs ?? []} />
    </div>
  );
}
