"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";

const COOKIE = "cookie_consent";
type Consent = "all" | "necessary";

function readConsent(): Consent | null {
  const match = document.cookie.match(/(?:^|; )cookie_consent=(all|necessary)/);
  return (match?.[1] as Consent | undefined) ?? null;
}

/**
 * GDPR cookie notice. Analytics (GA4 / Meta Pixel) are only injected after the
 * visitor accepts, and only when their env IDs are set.
 */
export function CookieConsent({ labels, privacyHref, gaId, pixelId }: {
  labels: { text: string; accept: string; decline: string; more: string; label: string };
  privacyHref: string;
  gaId?: string;
  pixelId?: string;
}) {
  const [consent, setConsent] = useState<Consent | null | "unknown">("unknown");

  useEffect(() => {
    // Reading a browser-only value after mount; no SSR equivalent exists.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(readConsent());
  }, []);

  const choose = (value: Consent) => {
    document.cookie = `${COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    setConsent(value);
  };

  return (
    <>
      {consent === "all" && gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {consent === "all" && pixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
        </Script>
      )}

      {consent === null && (
        <div
          role="region"
          aria-label={labels.label}
          className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-xl rounded-2xl border border-ink-700 bg-ink-850/97 p-4 shadow-2xl backdrop-blur animate-fade-up md:bottom-5"
        >
          <p className="text-sm leading-relaxed text-ink-200">
            {labels.text}{" "}
            <Link href={privacyHref} className="font-semibold text-accent-400 underline underline-offset-2">
              {labels.more}
            </Link>
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-secondary btn-sm flex-1" onClick={() => choose("necessary")}>
              {labels.decline}
            </button>
            <button type="button" className="btn btn-primary btn-sm flex-1" onClick={() => choose("all")}>
              {labels.accept}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
