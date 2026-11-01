import Link from "next/link";
import { siteConfig } from "@/config/site";
import { fmt, localeTags } from "@/i18n";
import { adminDict } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getServices, serviceName } from "@/lib/services";
import { addDays, formatDate, hhmm, startOfWeek, todayInTz } from "@/lib/time";
import { getAdminCounts } from "@/lib/admin-data";
import { Icon } from "@/components/ui/icon";
import { NewBadge, StatusBadge, telHref } from "@/components/admin/ui";

export const metadata = { title: "Overview" };

export default async function Dashboard() {
  const { t, lang } = await adminDict();
  const db = supabaseAdmin();
  const today = todayInTz(siteConfig.booking.timezone);
  const weekStart = startOfWeek(today);
  const monthAgo = addDays(today, -30);

  const [counts, week, upcoming, recent, free, services] = await Promise.all([
    getAdminCounts(),
    db.from("bookings").select("id", { count: "exact", head: true }).gte("date", weekStart).lte("date", addDays(weekStart, 6)).neq("status", "cancelled"),
    db.from("bookings").select("id, number, date, start_time, end_time, customer_name, phone, car_make, car_model, status, seen_by_admin, service_ids").in("status", ["new", "confirmed"]).gte("date", today).lte("date", addDays(today, 1)).order("date").order("start_time"),
    db.from("bookings").select("service_ids").gte("created_at", monthAgo).neq("status", "cancelled"),
    db.from("slots").select("id", { count: "exact", head: true }).eq("status", "free").gte("date", today).lte("date", addDays(today, 7)),
    getServices({ includeInactive: true }),
  ]);

  const popularity = new Map<string, number>();
  for (const b of recent.data ?? []) for (const id of b.service_ids as string[]) popularity.set(id, (popularity.get(id) ?? 0) + 1);
  const popular = [...popularity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = popular[0]?.[1] ?? 1;

  const stats = [
    { label: t.dashboard.unread, value: counts.unreadBookings, href: "/admin/bookings?status=new", hot: counts.unreadBookings > 0 },
    { label: t.dashboard.thisWeek, value: week.count ?? 0, href: "/admin/bookings" },
    { label: t.dashboard.callbacks, value: counts.unreadCallbacks, href: "/admin/callbacks", hot: counts.unreadCallbacks > 0 },
    { label: t.dashboard.freeSlots, value: free.count ?? 0, href: "/admin/calendar" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold md:text-3xl">{t.nav.dashboard}</h1>

      {counts.failed > 0 && (
        <Link href="/admin/settings#log" className="flex items-center gap-3 rounded-md border border-danger bg-danger/10 p-4">
          <Icon name="alert" className="shrink-0 text-danger" />
          <span>
            <strong className="text-danger">{t.dashboard.failed}</strong>
            <span className="block text-sm text-muted">{fmt(t.dashboard.failedText, { n: counts.failed })}</span>
          </span>
        </Link>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`panel flex flex-col p-4 transition-colors hover:border-line-strong ${s.hot ? "border-accent" : ""}`}>
            <dt className="order-2 text-sm text-muted">{s.label}</dt>
            <dd className={`font-mono text-3xl ${s.hot ? "text-accent" : ""}`}>{s.value}</dd>
          </Link>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="panel p-4 md:p-5">
          <h2 className="font-semibold">{t.dashboard.upcoming}</h2>
          {upcoming.data?.length ? (
            <ul className="mt-3 divide-y divide-line">
              {upcoming.data.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-3">
                  <Link href={`/admin/bookings/${b.id}`} className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-muted">
                      {b.date === today ? t.common.today : formatDate(b.date, localeTags[lang])} {hhmm(b.start_time)}–{hhmm(b.end_time)}
                    </p>
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {b.customer_name} {!b.seen_by_admin && <NewBadge label={t.common.new} />}
                    </p>
                    <p className="truncate text-sm text-muted">
                      {b.car_make} {b.car_model} · {(b.service_ids as string[]).map((id) => serviceName(services.find((s) => s.id === id), lang)).join(", ")}
                    </p>
                  </Link>
                  <StatusBadge status={b.status} t={t} />
                  <a href={telHref(b.phone)} className="btn btn-secondary btn-sm size-11 px-0" aria-label={`${t.common.call} ${b.phone}`}>
                    <Icon name="phone" size={18} />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted">{t.dashboard.noUpcoming}</p>
          )}
        </section>

        <section className="panel p-4 md:p-5">
          <h2 className="font-semibold">{t.dashboard.popular}</h2>
          {popular.length ? (
            <ul className="mt-4 space-y-3">
              {popular.map(([id, n]) => (
                <li key={id}>
                  <div className="flex justify-between text-sm">
                    <span>{serviceName(services.find((s) => s.id === id), lang) || id}</span>
                    <span className="font-mono text-muted">{n}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-panel-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted">{t.common.none}</p>
          )}
        </section>
      </div>
    </div>
  );
}
