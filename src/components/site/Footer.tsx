import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { siteConfig, type Lang } from "@/config/site";
import type { Dictionary } from "@/i18n";
import { t } from "@/i18n/config";
import { fullAddress } from "@/lib/format";
import { LogoMark } from "@/components/icons";
import { navItems } from "./Header";
import { OpeningHours } from "./OpeningHours";

export function Footer({ lang, dict }: { lang: Lang; dict: Dictionary }) {
  const c = siteConfig;
  return (
    <footer className="mt-24 border-t border-ink-800 bg-ink-900 pb-28 pt-14 md:pb-14">
      <div className="container-x grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <Link href={`/${lang}`} className="flex items-center gap-2.5 font-display text-lg font-extrabold text-white">
            <LogoMark /> {c.name}
          </Link>
          <p className="mt-3 text-sm text-ink-400">{t(dict.footer.tagline, { cityIn: c.address.cityIn[lang] })}</p>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-400">{dict.footer.navTitle}</h2>
          <ul className="mt-3 space-y-2 text-[0.9375rem]">
            {[...navItems(lang, dict), { href: `/${lang}/booking`, label: dict.nav.bookNow }].map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="text-ink-200 hover:text-white">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-400">{dict.footer.contactTitle}</h2>
          <ul className="mt-3 space-y-2.5 text-[0.9375rem]">
            <li>
              <a href={`tel:${c.contact.phoneHref}`} className="flex items-center gap-2 text-ink-200 hover:text-white">
                <Phone size={16} aria-hidden="true" className="text-accent-400" /> {c.contact.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${c.contact.email}`} className="flex items-center gap-2 text-ink-200 hover:text-white">
                <Mail size={16} aria-hidden="true" className="text-accent-400" /> {c.contact.email}
              </a>
            </li>
            <li className="flex items-start gap-2 text-ink-200">
              <MapPin size={16} aria-hidden="true" className="mt-1 shrink-0 text-accent-400" />
              <address className="not-italic">{fullAddress()}</address>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-400">{dict.common.openingHours}</h2>
          <OpeningHours dict={dict} className="mt-2 text-[0.9375rem]" />
        </div>
      </div>

      <div className="container-x mt-12 flex flex-col gap-3 border-t border-ink-800 pt-6 text-xs text-ink-500 md:flex-row md:items-center md:justify-between">
        <p>
          © {c.legalName}. {dict.footer.rights} {dict.footer.registry} {c.registryCode} · {dict.footer.vat} {c.vatNumber}
        </p>
        <Link href={`/${lang}/privacy`} className="hover:text-ink-200">
          {dict.footer.privacy}
        </Link>
      </div>
    </footer>
  );
}
