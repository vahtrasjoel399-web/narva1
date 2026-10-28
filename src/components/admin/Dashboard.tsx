"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck, CalendarDays, Inbox, PhoneIncoming } from "lucide-react";
import { formatDateShort } from "@/lib/format";
import { hhmm } from "@/lib/time";
import type { BookingRow } from "@/lib/types";
import { getDashboard, type Dashboard as DashboardData } from "@/app/admin/actions";
import { useAdmin } from "./AdminI18n";
import { useBadges } from "./AdminShell";
import { useServiceNames } from "./BookingsManager";
import { Empty, LoadingBlock, NewBadge, PageTitle, StatusChip } from "./ui";

export function Dashboard() {
  const { d, lang } = useAdmin();
  const { badges } = useBadges();
  const { name } = useServiceNames();
  const [data, setData] = useState<DashboardData | null>(null);

  const latest = badges?.latestNumber;
  useEffect(() => {
    getDashboard().then((r) => r.ok && setData(r.data));
  }, [latest]);

  if (!data) return <LoadingBlock label={d.common.loading} />;

  const tiles = [
    { label: d.dashboard.bookingsThisWeek, value: data.bookingsThisWeek, icon: CalendarCheck, href: "/admin/bookings" },
    { label: d.dashboard.unseen, value: data.unseen, icon: Inbox, href: "/admin/bookings", hot: data.unseen > 0 },
    { label: d.dashboard.callbacks, value: data.newCallbacks, icon: PhoneIncoming, href: "/admin/callbacks", hot: data.newCallbacks > 0 },
    { label: d.dashboard.freeSlots, value: data.freeSlots7d, icon: CalendarDays, href: "/admin/calendar" },
  ];
  const maxPopular = Math.max(1, ...data.popular.map((p) => p.count));

  const row = (b: BookingRow) => (
    <li key={b.id}>
      <Link
        href={`/admin/bookings?id=${b.id}`}
        className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors hover:bg-ink-800 ${
          b.seen_by_admin ? "border-ink-800" : "border-accent-500/60 bg-accent-500/[0.06]"
        }`}
      >
        <span className="w-24 shrink-0">
          <span className="block text-xs font-semibold text-ink-400 first-letter:uppercase">{formatDateShort(b.date, lang)}</span>
          <span className="block font-extrabold tabular-nums text-white">{hhmm(b.start_time)}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            {!b.seen_by_admin && <NewBadge label={d.bookings.newBadge} />}
            <span className="truncate font-bold text-ink-100">{b.customer_name}</span>
          </span>
          <span className="block truncate text-sm text-ink-400">
            {b.service_ids.map((id) => name(id, lang)).join(", ")} · {b.car_make} {b.car_model}
          </span>
        </span>
        <StatusChip status={b.status} label={d.bookings.status[b.status]} />
      </Link>
    </li>
  );

  return (
    <div>
      <PageTitle>{d.dashboard.title}</PageTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className={`card card-hover p-4 ${tile.hot ? "border-accent-500/60" : ""}`}>
            <tile.icon size={20} className={tile.hot ? "text-accent-400" : "text-ink-400"} aria-hidden="true" />
            <p className="mt-3 font-display text-3xl font-extrabold tabular-nums text-white">{tile.value}</p>
            <p className="text-sm text-ink-400">{tile.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="card p-4">
            <h2 className="mb-3 text-lg font-bold text-white">{d.dashboard.today}</h2>
            {data.todayBookings.length ? <ul className="flex flex-col gap-2">{data.todayBookings.map(row)}</ul> : <Empty>{d.dashboard.noBookingsToday}</Empty>}
          </section>
          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{d.dashboard.upcoming}</h2>
              <Link href="/admin/bookings" className="btn btn-ghost btn-sm">
                <ArrowRight size={17} aria-label={d.nav.bookings} />
              </Link>
            </div>
            {data.upcoming.length ? <ul className="flex flex-col gap-2">{data.upcoming.map(row)}</ul> : <Empty>{d.dashboard.noUpcoming}</Empty>}
          </section>
        </div>
        <section className="card min-w-0 self-start p-4">
          <h2 className="mb-4 text-lg font-bold text-white">{d.dashboard.popular}</h2>
          {data.popular.length === 0 ? (
            <p className="text-sm text-ink-400">{d.dashboard.noData}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.popular.map((p) => (
                <li key={p.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-ink-100">{name(p.id, lang)}</span>
                    <span className="font-bold tabular-nums text-ink-300">{p.count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-ink-800">
                    <div className="h-full rounded-full bg-accent-500" style={{ width: `${(p.count / maxPopular) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
