"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AdminDictionary } from "@/i18n/admin";
import { Icon } from "@/components/ui/icon";

type Counts = { unreadBookings: number; unreadCallbacks: number; failed: number; latestBooking: number | null; latestCallback: string | null };

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  } catch {
    // Browser blocked audio before any interaction: the visual alert is enough.
  }
}

/** Polls every 20 s while the panel is open. New booking -> banner, sound, title badge, data refresh. */
export function LiveAlert({ initial, t }: { initial: Counts; t: AdminDictionary["alerts"] }) {
  const router = useRouter();
  const last = useRef(initial);
  const [alert, setAlert] = useState<{ text: string; href: string } | null>(null);
  const baseTitle = useRef<string>("");

  useEffect(() => {
    baseTitle.current = document.title.replace(/^\(\d+\)\s*/, "");
    const setTitle = (n: number) => (document.title = n > 0 ? `(${n}) ${baseTitle.current}` : baseTitle.current);
    setTitle(initial.unreadBookings + initial.unreadCallbacks);

    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/admin/pulse", { cache: "no-store" });
        if (!res.ok) return;
        const c: Counts = await res.json();
        const prev = last.current;
        if (c.latestBooking && c.latestBooking !== prev.latestBooking) {
          setAlert({ text: t.newBooking.replace("{n}", String(c.latestBooking)), href: "/admin/bookings?status=new" });
          beep();
          router.refresh();
        } else if (c.latestCallback && c.latestCallback !== prev.latestCallback) {
          setAlert({ text: t.newCallback, href: "/admin/callbacks" });
          beep();
          router.refresh();
        } else if (c.unreadBookings !== prev.unreadBookings || c.failed !== prev.failed || c.unreadCallbacks !== prev.unreadCallbacks) {
          router.refresh();
        }
        setTitle(c.unreadBookings + c.unreadCallbacks);
        last.current = c;
      } catch {
        // offline: try again next tick
      }
    };
    const id = setInterval(tick, 20_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [initial, router, t]);

  if (!alert) return null;
  return (
    <div role="alert" className="fixed inset-x-3 top-3 z-50 flex animate-rise items-center gap-3 rounded-md border border-accent bg-panel p-4 shadow-2xl shadow-black/50 lg:left-auto lg:right-6 lg:w-96">
      <span className="grid size-10 shrink-0 animate-pulse-ring place-items-center rounded-full bg-accent text-on-accent">
        <Icon name="bell" />
      </span>
      <p className="flex-1 font-semibold">{alert.text}</p>
      <Link href={alert.href} className="btn btn-primary btn-sm" onClick={() => setAlert(null)}>
        {t.view}
      </Link>
      <button type="button" aria-label="×" className="btn btn-ghost btn-sm size-10 px-0" onClick={() => setAlert(null)}>
        <Icon name="x" size={18} />
      </button>
    </div>
  );
}
