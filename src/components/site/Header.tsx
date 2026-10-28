import { Suspense } from "react";
import Link from "next/link";
import { Phone } from "lucide-react";
import { siteConfig, type Lang } from "@/config/site";
import type { Dictionary } from "@/i18n";
import { LogoMark } from "@/components/icons";
import { LanguageSwitcher, LanguageSwitcherFallback } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { NavLinks, StaticNavLinks, type NavItem } from "./NavLinks";

export function navItems(lang: Lang, dict: Dictionary): NavItem[] {
  return [
    { href: `/${lang}`, label: dict.nav.home },
    { href: `/${lang}/services`, label: dict.nav.services },
    { href: `/${lang}/about`, label: dict.nav.about },
    { href: `/${lang}/contact`, label: dict.nav.contact },
  ];
}

export function Header({ lang, dict }: { lang: Lang; dict: Dictionary }) {
  const items = navItems(lang, dict);
  const linkClass = "rounded-lg px-3 py-2 text-[0.9375rem] font-semibold text-ink-300 transition-colors hover:text-white";
  const phoneHref = `tel:${siteConfig.contact.phoneHref}`;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur-md">
      <div className="container-x flex h-16 items-center gap-3">
        <Link href={`/${lang}`} className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight text-white">
          <LogoMark />
          <span>{siteConfig.name}</span>
        </Link>

        <nav aria-label={dict.nav.mainNav} className="ml-6 hidden md:block">
          <Suspense fallback={<StaticNavLinks items={items} className="flex items-center gap-1" linkClassName={linkClass} />}>
            <NavLinks items={items} className="flex items-center gap-1" linkClassName={linkClass} />
          </Suspense>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={phoneHref}
            className="hidden items-center gap-2 rounded-lg px-3 py-2 text-[0.9375rem] font-semibold text-ink-200 hover:text-white lg:flex"
          >
            <Phone size={17} aria-hidden="true" className="text-accent-400" />
            {siteConfig.contact.phone}
          </a>
          <Suspense fallback={<LanguageSwitcherFallback lang={lang} label={dict.nav.language} />}>
            <LanguageSwitcher lang={lang} label={dict.nav.language} />
          </Suspense>
          <Link href={`/${lang}/booking`} className="btn btn-primary btn-sm hidden md:inline-flex">
            {dict.nav.bookNow}
          </Link>
          <MobileMenu
            items={items}
            phone={siteConfig.contact.phone}
            phoneHref={phoneHref}
            bookHref={`/${lang}/booking`}
            labels={{
              menu: dict.nav.menu,
              close: dict.nav.closeMenu,
              call: dict.nav.call,
              book: dict.nav.bookNow,
              nav: dict.nav.mainNav,
            }}
          />
        </div>
      </div>
    </header>
  );
}
