"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { AdminDictionary } from "@/i18n/admin";
import { dismissNotification, retryNotification } from "@/app/admin/actions";

type Log = { id: string; event: string; audience: string; recipient: string | null; subject: string | null; status: string; attempts: number; error: string | null; created_at: string; dismissed: boolean; booking_id: string | null };

export function NotificationLog({ t, logs }: { t: AdminDictionary; logs: Log[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const ts = t.settings;
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });
  return (
    <section id="log">
      <h2 className="text-xl font-semibold">{ts.log}</h2>
      {!logs.length ? (
        <p className="mt-3 text-muted">{t.common.none}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line border-y border-line text-sm">
          {logs.map((l) => {
            const failed = l.status === "failed" && !l.dismissed;
            return (
              <li key={l.id} className={`py-3 ${failed ? "-mx-3 border-l-2 border-danger bg-danger/10 px-3" : ""}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={`rounded-sm px-1.5 py-0.5 text-xs font-bold ${l.status === "sent" ? "bg-ok/15 text-ok" : l.status === "failed" ? "bg-danger text-ink" : "bg-panel-2 text-muted"}`}>
                    {ts[l.status as "sent" | "failed" | "pending"]}
                  </span>
                  <span className="font-semibold">{ts.events[l.event as keyof typeof ts.events] ?? l.event}</span>
                  <span className="text-muted">→ {ts.audience[l.audience as "admin" | "customer"]}</span>
                  <span className="ml-auto font-mono text-xs text-faint">{new Date(l.created_at).toLocaleString("et-EE", { timeZone: "Europe/Tallinn", dateStyle: "short", timeStyle: "short" })}</span>
                </div>
                <p className="mt-1 truncate text-muted">{l.subject}</p>
                <p className="truncate font-mono text-xs text-faint">{l.recipient}</p>
                {l.error && <p className="mt-1 text-xs text-danger">{l.error}</p>}
                {failed && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => retryNotification(l.id))}>
                      {ts.retry}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => dismissNotification(l.id))}>
                      {ts.dismiss}
                    </button>
                    {l.booking_id && (
                      <Link href={`/admin/bookings/${l.booking_id}`} className="btn btn-ghost btn-sm">
                        {t.common.open}
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
