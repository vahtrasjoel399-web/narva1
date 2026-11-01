import Link from "next/link";
import { siteConfig, type Locale } from "@/config/site";
import type { Dictionary } from "@/i18n";
import { fullAddress, href, openingHoursRows, telHref } from "@/lib/site";
import { CookieSettingsLink } from "./cookie-consent";

export function Footer({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const hasTracking = Boolean(process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID);
  return (
    <footer className="mt-24 border-t border-line bg-panel pb-28 lg:pb-0">
      <div className="container-x grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="text-lg font-bold">{siteConfig.name}</p>
          <p className="mt-2 text-muted">{fullAddress()}</p>
          <p className="mt-4">
            <a href={telHref()} className="link font-mono text-lg">
              {siteConfig.phone.display}
            </a>
          </p>
          <p className="mt-1">
            <a href={`mailto:${siteConfig.email}`} className="link text-muted">
              {siteConfig.email}
            </a>
          </p>
        </div>
        <div className="md:col-span-3">
          <h2 className="eyebrow mb-3">{dict.footer.hours}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-sm">
            {openingHoursRows(dict).map((r) => (
              <div key={r.days} className="contents">
                <dt className="text-muted">{r.days}</dt>
                <dd>{r.hours}</dd>
              </div>
            ))}
          </dl>
        </div>
        <nav className="md:col-span-2" aria-label={dict.footer.contact}>
          <ul className="space-y-1">
            {[
              ["/services", dict.nav.services],
              ["/about", dict.nav.about],
              ["/contact", dict.nav.contact],
              ["/booking", dict.nav.book],
            ].map(([p, label]) => (
              <li key={p}>
                <Link href={href(lang, p)} className="inline-flex min-h-9 items-center text-muted hover:text-fg">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="text-sm text-muted md:col-span-3">
          <h2 className="eyebrow mb-3">{dict.footer.company}</h2>
          <p>{siteConfig.legalName}</p>
          <p>
            {dict.footer.registry} {siteConfig.registryCode}
          </p>
          {siteConfig.vatNumber && (
            <p>
              {dict.footer.vat} {siteConfig.vatNumber}
            </p>
          )}
          <ul className="mt-4 space-y-1">
            <li>
              <Link href={href(lang, "/privacy")} className="link">
                {dict.footer.privacy}
              </Link>
            </li>
            <li>
              <Link href={href(lang, "/terms")} className="link">
                {dict.footer.terms}
              </Link>
            </li>
            {hasTracking && (
              <li>
                <CookieSettingsLink label={dict.footer.cookies} />
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="container-x py-5 font-mono text-xs text-faint">
          © {new Date().getFullYear()} {siteConfig.legalName}
        </p>
      </div>
    </footer>
  );
}
