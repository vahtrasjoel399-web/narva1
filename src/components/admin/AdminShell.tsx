"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellRing,
  CalendarDays,
  ExternalLink,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  PhoneIncoming,
  Settings,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { siteConfig, type Lang } from "@/config/site";
import { localeShort, locales } from "@/i18n/config";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { LogoMark } from "@/components/icons";
import { getAdminSession, getBadges, type Badges } from "@/app/admin/actions";
import { useAdmin } from "./AdminI18n";
import { Sheet, useToast } from "./ui";

const BadgesContext = createContext<{ badges: Badges | null; refresh: () => void }>({ badges: null, refresh: () => {} });
export const useBadges = () => useContext(BadgesContext);

const POLL_MS = 20_000;

/** Short two-tone chime via WebAudio (no audio file needed). */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.32);
    });
  } catch {
    // audio not allowed until user interaction — ignore
  }
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { d, lang, setLang, t } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<"loading" | "ok" | "forbidden">("loading");
  const [email, setEmail] = useState("");
  const [badges, setBadges] = useState<Badges | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastNumber = useRef<number | null>(null);
  const baseTitle = useRef<string>("");

  const refresh = useCallback(async () => {
    const r = await getBadges();
    if (!r.ok) return;
    setBadges(r.data);
    if (lastNumber.current !== null && r.data.latestNumber > lastNumber.current) {
      chime();
      toast({
        kind: "info",
        text: d.alert.newBooking,
        action: { label: d.alert.open, onClick: () => router.push("/admin/bookings") },
      });
    }
    lastNumber.current = r.data.latestNumber;
  }, [d, router, toast]);

  useEffect(() => {
    let cancelled = false;
    getAdminSession().then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setEmail(r.data.email);
        setState("ok");
      } else if (r.error === "unauthorized") {
        router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
      } else {
        setState("forbidden");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  useEffect(() => {
    if (state !== "ok") return;
    // First poll right away, then on an interval and whenever the tab becomes visible.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const id = setInterval(refresh, POLL_MS);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [state, refresh]);

  // Unread count in the tab title, so a backgrounded tab still shows activity.
  useEffect(() => {
    if (!baseTitle.current) baseTitle.current = document.title.replace(/^\(\d+\)\s*/, "");
    const n = badges?.unseen ?? 0;
    document.title = n > 0 ? `(${n}) ${baseTitle.current}` : baseTitle.current;
  }, [badges, pathname]);

  const logout = async () => {
    await createBrowserSupabase().auth.signOut();
    router.replace("/admin/login");
  };

  const nav = [
    { href: "/admin", label: d.nav.dashboard, icon: LayoutDashboard, badge: 0 },
    { href: "/admin/calendar", label: d.nav.calendar, icon: CalendarDays, badge: 0 },
    { href: "/admin/bookings", label: d.nav.bookings, icon: ListChecks, badge: badges?.unseen ?? 0 },
    { href: "/admin/callbacks", label: d.nav.callbacks, icon: PhoneIncoming, badge: badges?.newCallbacks ?? 0 },
    { href: "/admin/services", label: d.nav.services, icon: Wrench, badge: 0 },
    { href: "/admin/settings", label: d.nav.settings, icon: Settings, badge: badges?.failedNotifications ?? 0, red: true },
  ];
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  if (state === "forbidden") {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <p className="text-lg text-ink-200">{d.login.notAdmin}</p>
        <button type="button" className="btn btn-secondary mt-6" onClick={logout}>
          <LogOut size={18} aria-hidden="true" /> {d.login.logout}
        </button>
      </div>
    );
  }

  const LangSwitch = (
    <div className="flex rounded-xl border border-ink-700 bg-ink-900 p-0.5" role="group" aria-label="Language">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l as Lang)}
          aria-pressed={l === lang}
          className={`rounded-[10px] px-2.5 py-1.5 text-xs font-bold ${l === lang ? "bg-ink-700 text-white" : "text-ink-400"}`}
        >
          {localeShort[l]}
        </button>
      ))}
    </div>
  );

  return (
    <BadgesContext value={{ badges, refresh }}>
      <div className="md:flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-ink-800 bg-ink-900 p-4 md:flex">
          <Link href="/admin" className="flex items-center gap-2.5 px-2 py-2 font-display text-lg font-extrabold text-white">
            <LogoMark /> {siteConfig.name}
          </Link>
          <nav className="mt-6 flex flex-col gap-1" aria-label="Admin">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition-colors ${
                  isActive(item.href) ? "bg-ink-750 text-white" : "text-ink-300 hover:bg-ink-800 hover:text-white"
                }`}
              >
                <item.icon size={19} aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className={`chip ${item.red ? "bg-bad-500 text-white" : "bg-accent-500 text-ink-950"}`}>{item.badge}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            {LangSwitch}
            <Link href={`/${lang}`} target="_blank" className="btn btn-ghost btn-sm justify-start">
              <ExternalLink size={16} aria-hidden="true" /> {d.nav.site}
            </Link>
            <p className="truncate px-1 text-xs text-ink-500">{email}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
              <LogOut size={16} aria-hidden="true" /> {d.login.logout}
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-800 bg-ink-950/90 px-4 backdrop-blur md:hidden">
            <Link href="/admin" className="flex items-center gap-2 font-display font-extrabold text-white">
              <LogoMark size={26} /> {siteConfig.name}
            </Link>
            {(badges?.unseen ?? 0) > 0 && (
              <Link href="/admin/bookings" className="ml-auto flex items-center gap-1.5 rounded-full bg-accent-500 px-3 py-1 text-sm font-bold text-ink-950">
                <BellRing size={15} aria-hidden="true" /> {badges?.unseen}
              </Link>
            )}
          </header>

          {(badges?.failedNotifications ?? 0) > 0 && (
            <Link
              href="/admin/settings#log"
              className="flex items-center gap-3 border-b border-bad-500/40 bg-[#2a1416] px-4 py-3 text-sm font-semibold text-bad-400 md:px-8"
              role="alert"
            >
              <TriangleAlert size={18} aria-hidden="true" />
              <span className="flex-1">
                <strong>{d.alert.notifyFailed}.</strong> {t(d.alert.notifyFailedText, { n: badges?.failedNotifications ?? 0 })}
              </span>
              <span className="underline">{d.alert.viewLog}</span>
            </Link>
          )}

          <main className="px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">{children}</main>
        </div>
      </div>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Admin"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink-800 bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {nav.slice(0, 4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[0.6875rem] font-semibold ${
              isActive(item.href) ? "text-accent-400" : "text-ink-400"
            }`}
          >
            <item.icon size={22} aria-hidden="true" />
            {item.label}
            {item.badge > 0 && (
              <span className="absolute right-[22%] top-1.5 min-w-5 rounded-full bg-accent-500 px-1 text-center text-[0.6875rem] font-bold leading-5 text-ink-950">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="relative flex flex-col items-center gap-0.5 py-2.5 text-[0.6875rem] font-semibold text-ink-400"
        >
          <Menu size={22} aria-hidden="true" />
          {d.nav.settings}
          {(badges?.failedNotifications ?? 0) > 0 && <span className="absolute right-[30%] top-2 size-2.5 rounded-full bg-bad-500" />}
        </button>
      </nav>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={siteConfig.name}>
        <div className="flex flex-col gap-2">
          {nav.slice(4).map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="btn btn-secondary justify-start">
              <item.icon size={19} aria-hidden="true" /> {item.label}
              {item.badge > 0 && <span className="chip ml-auto bg-bad-500 text-white">{item.badge}</span>}
            </Link>
          ))}
          <Link href={`/${lang}`} target="_blank" className="btn btn-ghost justify-start">
            <ExternalLink size={18} aria-hidden="true" /> {d.nav.site}
          </Link>
          <div className="mt-2 flex items-center justify-between gap-3">
            {LangSwitch}
            <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
              <LogOut size={16} aria-hidden="true" /> {d.login.logout}
            </button>
          </div>
          <p className="truncate text-xs text-ink-500">{email}</p>
        </div>
      </Sheet>
    </BadgesContext>
  );
}
