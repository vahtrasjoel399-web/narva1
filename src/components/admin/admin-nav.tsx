"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/config/site";
import type { AdminDictionary } from "@/i18n/admin";
import { Icon } from "@/components/ui/icon";
import { signOut, setAdminLang } from "@/app/admin/actions";

type Counts = { unreadBookings: number; unreadCallbacks: number; failed: number };

export function AdminNav({ t, counts, lang, shopName }: { t: AdminDictionary; counts: Counts; lang: Locale; shopName: string }) {
  const pathname = usePathname() ?? "";
  const [more, setMore] = useState(false);
  const items = [
    { href: "/admin", icon: "chart", label: t.nav.dashboard, badge: 0 },
    { href: "/admin/calendar", icon: "calendar", label: t.nav.calendar, badge: 0 },
    { href: "/admin/bookings", icon: "list", label: t.nav.bookings, badge: counts.unreadBookings },
    { href: "/admin/callbacks", icon: "phone", label: t.nav.callbacks, badge: counts.unreadCallbacks },
    { href: "/admin/services", icon: "wrench", label: t.nav.services, badge: 0 },
    { href: "/admin/settings", icon: "settings", label: t.nav.settings, badge: counts.failed, danger: true },
  ];
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const Badge = ({ n, danger }: { n: number; danger?: boolean }) =>
    n > 0 ? (
      <span className={`ml-auto inline-grid min-w-5 place-items-center rounded-full px-1.5 font-mono text-xs leading-5 ${danger ? "bg-danger text-ink" : "bg-accent text-on-accent"}`}>{n}</span>
    ) : null;

  const LangRow = () => (
    <div className="flex gap-1">
      {(["et", "ru", "en"] as Locale[]).map((l) => (
        <button key={l} type="button" onClick={() => setAdminLang(l)} className={`btn btn-sm min-h-9 px-2.5 font-mono ${l === lang ? "btn-secondary" : "btn-ghost text-faint"}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-panel lg:flex">
        <div className="border-b border-line px-5 py-5">
          <p className="truncate font-bold">{shopName}</p>
          <p className="eyebrow mt-0.5">{t.title}</p>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {items.map((i) => (
            <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined} className="flex min-h-11 items-center gap-3 rounded-sm px-3 text-muted transition-colors hover:bg-panel-2 hover:text-fg aria-[current=page]:bg-panel-2 aria-[current=page]:text-fg">
              <Icon name={i.icon} size={18} />
              {i.label}
              <Badge n={i.badge} danger={i.danger} />
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t border-line p-3">
          <LangRow />
          <a href="/" target="_blank" className="flex min-h-10 items-center gap-3 rounded-sm px-3 text-sm text-muted hover:text-fg">
            <Icon name="external" size={16} /> {t.nav.site}
          </a>
          <form action={signOut}>
            <button type="submit" className="flex min-h-10 w-full items-center gap-3 rounded-sm px-3 text-sm text-muted hover:text-fg">
              <Icon name="logout" size={16} /> {t.nav.logout}
            </button>
          </form>
        </div>
      </aside>

      {/* Phone: bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden">
        {items.slice(0, 4).map((i) => (
          <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined} className="relative flex min-h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] text-faint aria-[current=page]:text-accent">
            <Icon name={i.icon} size={22} />
            <span className="max-w-full truncate px-1">{i.label}</span>
            {i.badge > 0 && <span className="absolute top-2 left-1/2 ml-2 grid min-w-4.5 place-items-center rounded-full bg-accent px-1 font-mono text-[0.625rem] leading-4.5 text-on-accent">{i.badge}</span>}
          </Link>
        ))}
        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="relative flex min-h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] text-faint">
          <Icon name="menu" size={22} />
          {t.nav.more}
          {counts.failed > 0 && <span className="absolute top-2.5 left-1/2 ml-2 size-2.5 rounded-full bg-danger" />}
        </button>
      </nav>
      {more && (
        <div className="fixed inset-x-0 bottom-16 z-40 animate-rise border-t border-line bg-panel p-3 shadow-2xl shadow-black/50 lg:hidden" onClick={() => setMore(false)}>
          {items.slice(4).map((i) => (
            <Link key={i.href} href={i.href} className="flex min-h-12 items-center gap-3 px-2">
              <Icon name={i.icon} size={18} /> {i.label}
              <Badge n={i.badge} danger={i.danger} />
            </Link>
          ))}
          <a href="/" target="_blank" className="flex min-h-12 items-center gap-3 px-2 text-muted">
            <Icon name="external" size={18} /> {t.nav.site}
          </a>
          <div className="flex items-center justify-between gap-3 px-2 pt-2" onClick={(e) => e.stopPropagation()}>
            <LangRow />
            <form action={signOut}>
              <button type="submit" className="btn btn-ghost btn-sm text-muted">
                <Icon name="logout" size={16} /> {t.nav.logout}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
