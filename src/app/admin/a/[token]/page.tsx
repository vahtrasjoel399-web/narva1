import { Suspense } from "react";
import Link from "next/link";
import { Car, Clock, Phone } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getAdminDictionary } from "@/i18n/admin";
import { t } from "@/i18n/config";
import { formatDateLong, formatDuration } from "@/lib/format";
import { getNotifySettings, sha256 } from "@/lib/notify";
import { fallbackServices } from "@/lib/services";
import { createServiceClient } from "@/lib/supabase/server";
import { hhmm } from "@/lib/time";
import type { BookingRow } from "@/lib/types";
import { LogoMark } from "@/components/icons";
import { TokenActionForm } from "./TokenActionForm";

export const metadata = { title: "Booking action", robots: { index: false, follow: false } };

export default function TokenActionPage({ params }: PageProps<"/admin/a/[token]">) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
      <p className="mb-6 flex items-center gap-2.5 font-display text-lg font-extrabold text-white">
        <LogoMark /> {siteConfig.name}
      </p>
      <Suspense fallback={<div className="skeleton h-80" />}>
        <TokenAction params={params} />
      </Suspense>
    </div>
  );
}

async function TokenAction({ params }: Pick<PageProps<"/admin/a/[token]">, "params">) {
  const { token } = await params;
  const { lang } = await getNotifySettings();
  const d = getAdminDictionary(lang);

  let info: { ok: boolean; action?: "confirm" | "decline"; used?: boolean; expired?: boolean; booking?: BookingRow } = { ok: false };
  if (/^[a-f0-9]{48}$/.test(token)) {
    const { data } = await createServiceClient().rpc("get_action_token", { p_token_hash: sha256(token) });
    info = (data as typeof info) ?? { ok: false };
  }

  if (!info.ok || !info.booking || !info.action) {
    return <p className="card p-6 text-lg text-ink-200">{d.action.invalid}</p>;
  }

  const b = info.booking;
  const names = fallbackServices();
  const { data: rows } = await createServiceClient().from("services").select("id, name").in("id", b.service_ids);
  const serviceName = (id: string) =>
    (rows as Array<{ id: string; name: Record<string, string> }> | null)?.find((r) => r.id === id)?.name[lang] ??
    names.find((s) => s.id === id)?.name[lang] ??
    id;

  const blocked = info.used ? d.action.used : info.expired ? d.action.expired : null;
  const notApplicable =
    !blocked && ((info.action === "confirm" && b.status !== "new") || (info.action === "decline" && !["new", "confirmed"].includes(b.status)))
      ? t(d.action.notApplicable, { status: d.bookings.status[b.status] })
      : null;

  return (
    <div className="card p-6 animate-fade-up">
      <h1 className="text-2xl font-extrabold text-white">{t(d.action.title, { number: b.number })}</h1>
      <p className="mt-1 text-sm font-semibold text-ink-400">{d.bookings.status[b.status]}</p>

      <div className="mt-5 flex flex-col gap-3 text-ink-100">
        <p className="flex items-center gap-2 text-lg font-bold first-letter:uppercase">
          <Clock size={18} className="text-accent-400" aria-hidden="true" />
          {formatDateLong(b.date, lang)}, {hhmm(b.start_time)}–{hhmm(b.end_time)}
        </p>
        <p className="font-semibold">{b.customer_name}</p>
        <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 font-semibold text-accent-300">
          <Phone size={16} aria-hidden="true" /> {b.phone}
        </a>
        <p className="flex items-center gap-2 text-ink-300">
          <Car size={16} aria-hidden="true" /> {[b.car_make, b.car_model, b.car_year].filter(Boolean).join(" ")} {b.plate && `· ${b.plate}`}
        </p>
        <p className="text-ink-300">
          {b.service_ids.map(serviceName).join(", ")} · ~{formatDuration(b.duration_min, lang)}
        </p>
        {b.comment && <p className="whitespace-pre-wrap rounded-xl border-l-4 border-accent-500 bg-accent-500/[0.07] p-3">{b.comment}</p>}
      </div>

      <div className="mt-6">
        {blocked || notApplicable ? (
          <p className="rounded-xl border border-ink-700 bg-ink-850 p-4 font-semibold text-ink-200">{blocked ?? notApplicable}</p>
        ) : (
          <TokenActionForm
            token={token}
            action={info.action}
            labels={{
              question: info.action === "confirm" ? d.action.confirmQuestion : d.action.declineQuestion,
              button: info.action === "confirm" ? d.action.confirmButton : d.action.declineButton,
              confirmed: d.action.confirmed,
              declined: d.action.declined,
              used: d.action.used,
              expired: d.action.expired,
              invalid: d.action.invalid,
              error: d.common.error,
              notApplicable: d.action.notApplicable,
              statuses: d.bookings.status,
            }}
          />
        )}
        <Link href={`/admin/bookings?id=${b.id}`} className="btn btn-ghost mt-3 w-full">
          {d.action.openAdmin}
        </Link>
      </div>
    </div>
  );
}
