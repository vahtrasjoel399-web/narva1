import { siteConfig } from "@/config/site";
import { adminDict, requireAdmin } from "@/lib/auth";
import { getAdminCounts } from "@/lib/admin-data";
import { AdminNav } from "@/components/admin/admin-nav";
import { LiveAlert } from "@/components/admin/live-alert";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const { t, lang } = await adminDict();
  const counts = await getAdminCounts();
  return (
    <div className="min-h-dvh pb-24 lg:pb-0 lg:pl-60">
      <AdminNav t={t} counts={counts} lang={lang} shopName={siteConfig.name} />
      <LiveAlert initial={counts} t={t.alerts} />
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
    </div>
  );
}
