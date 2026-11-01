import Link from "next/link";
import { notFound } from "next/navigation";
import { fmt, localeTags } from "@/i18n";
import { emailDictionaries } from "@/i18n/email";
import { adminDict } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getServices, serviceName } from "@/lib/services";
import { formatDate, formatDuration, hhmm } from "@/lib/time";
import { getDictionary } from "@/i18n";
import { Icon } from "@/components/ui/icon";
import { StatusBadge, telHref } from "@/components/admin/ui";
import { BookingActions } from "@/components/admin/booking-actions";

export const metadata = { title: "Booking" };

export default async function BookingDetail({ params }: PageProps<"/admin/bookings/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { t, lang } = await adminDict();
  const db = supabaseAdmin();
  const { data: b } = await db.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!b) notFound();
  // Opening the booking marks it as seen.
  if (!b.seen_by_admin) await db.from("bookings").update({ seen_by_admin: true }).eq("id", id);

  const [services, { data: logs }] = await Promise.all([
    getServices({ includeInactive: true }),
    db.from("notification_log").select("id, event, audience, status, error, created_at").eq("booking_id", id).order("created_at"),
  ]);
  const picked = (b.service_ids as string[]).map((sid) => services.find((s) => s.id === sid));
  const total = picked.reduce((a, s) => a + (s?.duration_min ?? 0), 0);
  const tb = t.bookings;
  const common = getDictionary(lang).common;

  const rows: [string, React.ReactNode][] = [
    [tb.when, <span key="w" className="font-mono capitalize">{`${formatDate(b.date, localeTags[lang], { weekday: "long", day: "numeric", month: "long" })} · ${hhmm(b.start_time)}–${hhmm(b.end_time)}`}</span>],
    [tb.services, `${picked.map((s, i) => serviceName(s, lang) || b.service_ids[i]).join(", ")} (${formatDuration(total, common)})`],
    [tb.car, <span key="c">{[b.car_make, b.car_model, b.car_year].filter(Boolean).join(" ")} {b.plate && <span className="ml-1 font-mono">{b.plate}</span>}</span>],
    [t.settings.recipient, b.email ? <a key="e" href={`mailto:${b.email}`} className="link">{b.email}</a> : <span key="e" className="text-faint">{tb.noEmail}</span>],
    [tb.lang, emailDictionaries[lang].langNames[b.lang as "et" | "ru" | "en"]],
    [tb.source, b.source === "phone" ? tb.sourcePhone : tb.sourceWeb],
    [tb.bay, String(b.bay)],
    [tb.created, new Date(b.created_at).toLocaleString(localeTags[lang], { timeZone: "Europe/Tallinn" })],
  ];
  if (b.status === "cancelled" && b.cancelled_by) rows.push([t.status.cancelled, fmt(tb.cancelledBy, { who: b.cancelled_by === "client" ? tb.byClient : tb.byAdmin })]);

  return (
    <div className="max-w-3xl">
      <Link href="/admin/bookings" className="inline-flex min-h-10 items-center gap-1 text-sm text-muted hover:text-fg">
        <Icon name="chevronLeft" size={16} /> {tb.title}
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl md:text-3xl">#{b.number}</h1>
        <StatusBadge status={b.status} t={t} />
      </div>
      <p className="mt-3 text-2xl font-bold">{b.customer_name}</p>
      <a href={telHref(b.phone)} className="btn btn-primary mt-3 font-mono">
        <Icon name="phone" size={18} /> {b.phone}
      </a>

      <dl className="mt-6 divide-y divide-line border-y border-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
            <dt className="text-sm text-muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-6">
        <h2 className="eyebrow">{tb.clientWrote}</h2>
        <p className="mt-2 whitespace-pre-wrap rounded-md border border-line bg-panel p-4">{b.comment || <span className="text-faint">—</span>}</p>
      </section>

      <BookingActions id={b.id} status={b.status} notes={b.admin_notes ?? ""} t={t} />

      {logs && logs.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow">{tb.notifications}</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className={`font-semibold ${l.status === "failed" ? "text-danger" : l.status === "sent" ? "text-ok" : "text-muted"}`}>{t.settings[l.status as "sent" | "failed" | "pending"]}</span>
                <span>{t.settings.events[l.event as keyof typeof t.settings.events] ?? l.event}</span>
                <span className="text-muted">→ {t.settings.audience[l.audience as "admin" | "customer"]}</span>
                {l.error && <span className="w-full text-xs text-danger">{l.error}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
