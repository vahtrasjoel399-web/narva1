"use client";
import Script from "next/script";
import { useEffect, useState } from "react";
import type { Dictionary } from "@/i18n";

type Consent = { analytics: boolean; marketing: boolean; at: number };
const KEY = "cookie-consent";
const MAX_AGE_MS = 180 * 86_400_000; // ask again after ~6 months

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

function readConsent(): Consent | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null") as Consent | null;
    return c && Date.now() - c.at < MAX_AGE_MS ? c : null;
  } catch {
    return null;
  }
}

export function CookieSettingsLink({ label }: { label: string }) {
  return (
    <button type="button" className="link text-left" onClick={() => window.dispatchEvent(new Event("open-cookie-settings"))}>
      {label}
    </button>
  );
}

/**
 * Cookie banner + optional GA4 / Meta Pixel. Renders nothing unless an
 * analytics ID is configured. Nothing non-essential loads before consent.
 */
export function CookieConsent({ t }: { t: Dictionary["cookie"] }) {
  const enabled = Boolean(GA_ID || PIXEL_ID);
  const [consent, setConsent] = useState<Consent | null>(null);
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [draft, setDraft] = useState({ analytics: false, marketing: false });

  useEffect(() => {
    if (!enabled) return;
    const c = readConsent();
    setConsent(c);
    setOpen(!c);
    const reopen = () => {
      const cur = readConsent();
      setDraft({ analytics: !!cur?.analytics, marketing: !!cur?.marketing });
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener("open-cookie-settings", reopen);
    return () => window.removeEventListener("open-cookie-settings", reopen);
  }, [enabled]);

  if (!enabled) return null;

  const save = (analytics: boolean, marketing: boolean) => {
    const c = { analytics, marketing, at: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(c));
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.("consent", "update", {
      analytics_storage: analytics ? "granted" : "denied",
      ad_storage: marketing ? "granted" : "denied",
      ad_user_data: marketing ? "granted" : "denied",
      ad_personalization: marketing ? "granted" : "denied",
    });
    setConsent(c);
    setOpen(false);
  };

  return (
    <>
      {GA_ID && consent?.analytics && (
        <>
          <Script id="ga-consent" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: '${consent.marketing ? "granted" : "denied"}', ad_user_data: '${consent.marketing ? "granted" : "denied"}', ad_personalization: '${consent.marketing ? "granted" : "denied"}' });
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { anonymize_ip: true });
          `}</Script>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        </>
      )}
      {PIXEL_ID && consent?.marketing && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}'); fbq('track', 'PageView');
        `}</Script>
      )}

      {open && (
        <section
          role="dialog"
          aria-labelledby="cookie-title"
          className="fixed inset-x-3 bottom-24 z-50 animate-rise rounded-md border border-line-strong bg-panel p-5 shadow-2xl shadow-black/40 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md lg:bottom-6"
        >
          <h2 id="cookie-title" className="font-semibold">
            {t.title}
          </h2>
          <p className="mt-1 text-sm text-muted">{t.text}</p>
          {details && (
            <div className="mt-4 space-y-3 text-sm">
              <label className="flex gap-3">
                <input type="checkbox" checked disabled className="mt-1 size-4 accent-[var(--accent)]" />
                <span>
                  <strong>{t.necessary}</strong>
                  <span className="block text-muted">{t.necessaryText}</span>
                </span>
              </label>
              {GA_ID && (
                <label className="flex gap-3">
                  <input type="checkbox" checked={draft.analytics} onChange={(e) => setDraft({ ...draft, analytics: e.target.checked })} className="mt-1 size-4 accent-[var(--accent)]" />
                  <span>
                    <strong>{t.analytics}</strong>
                    <span className="block text-muted">{t.analyticsText}</span>
                  </span>
                </label>
              )}
              {PIXEL_ID && (
                <label className="flex gap-3">
                  <input type="checkbox" checked={draft.marketing} onChange={(e) => setDraft({ ...draft, marketing: e.target.checked })} className="mt-1 size-4 accent-[var(--accent)]" />
                  <span>
                    <strong>{t.marketing}</strong>
                    <span className="block text-muted">{t.marketingText}</span>
                  </span>
                </label>
              )}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => save(false, false)}>
              {t.reject}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => save(true, true)}>
              {t.accept}
            </button>
            {details ? (
              <button type="button" className="btn btn-primary btn-sm col-span-2" onClick={() => save(draft.analytics, draft.marketing)}>
                {t.save}
              </button>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm col-span-2" onClick={() => setDetails(true)}>
                {t.settings}
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
