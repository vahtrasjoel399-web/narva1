import Link from "next/link";
import { siteConfig, type Locale } from "@/config/site";
import type { Dictionary } from "@/i18n";
import { href, telHref } from "@/lib/site";
import { Icon } from "@/components/ui/icon";
import { LangSwitcher } from "./lang-switcher";
import { MobileMenu } from "./mobile-menu";

export function Header({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const items = [
    { href: href(lang, "/services"), label: dict.nav.services },
    { href: href(lang, "/about"), label: dict.nav.about },
    { href: href(lang, "/contact"), label: dict.nav.contact },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/90 backdrop-blur-md supports-[backdrop-filter]:bg-ink/75">
      <div className="container-x flex h-16 items-center gap-4">
        <Link href={href(lang)} className="mr-auto flex min-h-11 items-center gap-2.5 font-bold tracking-tight lg:mr-6">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-sm bg-accent text-on-accent">
            <Icon name="wrench" size={18} strokeWidth={2} />
          </span>
          <span className="max-w-[11rem] truncate text-[1.0625rem] sm:max-w-none">{siteConfig.name}</span>
        </Link>

        <nav aria-label={dict.nav.menu} className="hidden lg:mr-auto lg:flex lg:gap-1">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className="rounded-sm px-3 py-2 text-muted transition-colors hover:text-fg">
              {i.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <a href={telHref()} className="font-mono text-sm text-muted transition-colors hover:text-fg">
            {siteConfig.phone.display}
          </a>
          <LangSwitcher current={lang} label={dict.nav.language} />
          <Link href={href(lang, "/booking")} className="btn btn-primary btn-sm">
            {dict.nav.book}
          </Link>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <LangSwitcher current={lang} label={dict.nav.language} />
          <MobileMenu
            items={[{ href: href(lang), label: dict.nav.home }, ...items, { href: href(lang, "/booking"), label: dict.nav.book }]}
            labels={{ menu: dict.nav.menu, close: dict.nav.close }}
            phone={{ display: siteConfig.phone.display, href: telHref() }}
          />
        </div>
      </div>
    </header>
  );
}
