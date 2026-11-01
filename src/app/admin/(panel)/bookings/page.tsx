import Link from "next/link";
import { siteConfig } from "@/config/site";
import { localeTags } from "@/i18n";
import { adminDict } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getServices, serviceName } from "@/lib/services";
import { formatDate, hhmm, todayInTz } from "@/lib/time";
import { Icon } from "@/components/ui/icon";
import { NewBadge, StatusBadge, telHref } from "@/components/admin/ui";

export const metadata = { title: "Bookings" };

const STATUSES = ["new", "confirmed", "done", "cancelled", "no_show"] as const;

export default async function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const { t, lang } = await adminDict();
  const sp = await searchParams;
  const status = typeof sp.status === "string" && (STATUSES as readonly string[]).includes(sp.status) ? sp.status : "";
  const when = sp.when === "past" || sp.when === "all" ? sp.when : "upcoming";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const from = typeof sp.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : "";
  const to = typeof sp.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : "";
  const today = todayInTz(siteConfig.booking.timezone);

  let query = supabaseAdmin().from("bookings").select("id, number, date, start_time, end_time, status, customer_name, phone, car_make, car_model, plate, service_ids, seen_by_admin, source").limit(200);
  if (status) query = query.eq("status", status);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  if (!from && !to && when === "upcoming") query = query.gte("date", today);
  if (!from && !to && when === "past") query = query.lt("date", today);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ");
    const n = Number(safe.replace(/^#/, ""));
    query = query.or([`customer_name.ilike.%${safe}%`, `phone.ilike.%${safe}%`, `plate.ilike.%${safe}%`, ...(Number.isInteger(n) && n > 0 ? [`number.eq.${n}`] : [])].join(","));
  }
  query = when === "past" ? query.order("date", { ascending: false }).order("start_time", { ascending: false }) : query.order("date").order("start_time");
  const [{ data: rows }, services] = await Promise.all([query, getServices({ includeInactive: true })]);

  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(status && { status }), when, ...(q && { q }), ...(from && { from }), ...(to && { to }), ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/admin/bookings?${p}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold md:text-3xl">{t.bookings.title}</h1>
        <Link href="/admin/bookings/new" className="btn btn-primary btn-sm">
          <Icon name="plus" size={18} /> {t.bookings.newBooking}
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {(["upcoming", "past", "all"] as const).map((w) => (
            <Link key={w} href={link({ when: w, from: "", to: "" })} aria-current={when === w && !from && !to ? "true" : undefined} className="btn btn-sm btn-ghost shrink-0 border border-line aria-[current=true]:border-fg">
              {t.bookings[w]}
            </Link>
          ))}
          <span className="mx-1 w-px shrink-0 bg-line" />
          <Link href={link({ status: "" })} aria-current={!status ? "true" : undefined} className="btn btn-sm btn-ghost shrink-0 border border-line aria-[current=true]:border-fg">
            {t.common.all}
          </Link>
          {STATUSES.map((s) => (
            <Link key={s} href={link({ status: s })} aria-current={status === s ? "true" : undefined} className="btn btn-sm btn-ghost shrink-0 border border-line aria-[current=true]:border-fg">
              {t.status[s]}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap gap-2" action="/admin/bookings">
          {status && <input type="hidden" name="status" value={status} />}
          <input type="hidden" name="when" value={when} />
          <input name="q" defaultValue={q} placeholder={t.bookings.searchPh} className="field min-w-0 flex-1 basis-48" />
          <input type="date" name="from" defaultValue={from} aria-label={t.common.from} className="field w-auto font-mono" />
          <input type="date" name="to" defaultValue={to} aria-label={t.common.to} className="field w-auto font-mono" />
          <button type="submit" className="btn btn-secondary">
            {t.common.search}
          </button>
        </form>
      </div>

      {!rows?.length ? (
        <p className="mt-8 text-muted">{t.bookings.empty}</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {rows.map((b) => (
            <li key={b.id} className={`flex items-center gap-3 py-3 ${!b.seen_by_admin ? "-mx-3 border-l-2 border-accent bg-accent/[0.06] px-3" : ""}`}>
              <Link href={`/admin/bookings/${b.id}`} className="grid min-w-0 flex-1 gap-x-4 gap-y-0.5 md:grid-cols-[5rem_10rem_1fr_auto] md:items-center">
                <span className="font-mono text-sm text-faint">#{b.number}</span>
                <span className="font-mono text-sm">
                  {formatDate(b.date, localeTags[lang])} {hhmm(b.start_time)}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 font-semibold">
                    {b.customer_name}
                    {!b.seen_by_admin && <NewBadge label={t.common.new} />}
                    {b.source === "phone" && <Icon name="phone" size={14} className="text-faint" />}
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {b.car_make} {b.car_model} {b.plate && <span className="font-mono">· {b.plate}</span>} · {(b.service_ids as string[]).map((id) => serviceName(services.find((s) => s.id === id), lang)).join(", ")}
                  </span>
                </span>
                <span className="mt-1 md:mt-0">
                  <StatusBadge status={b.status} t={t} />
                </span>
              </Link>
              <a href={telHref(b.phone)} className="btn btn-secondary btn-sm size-11 shrink-0 px-0" aria-label={`${t.common.call} ${b.phone}`}>
                <Icon name="phone" size={18} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
