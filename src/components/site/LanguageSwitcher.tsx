"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lang } from "@/config/site";
import { localeNames, localeShort, locales } from "@/i18n/config";

function rememberLocale(lang: Lang) {
  document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageSwitcher({ lang, label }: { lang: Lang; label: string }) {
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(et|ru|en)(?=\/|$)/, "");
  return <Switcher lang={lang} label={label} rest={rest} />;
}

/** Static fallback (no pathname yet) — links to each language's home. */
export function LanguageSwitcherFallback({ lang, label }: { lang: Lang; label: string }) {
  return <Switcher lang={lang} label={label} rest="" />;
}

function Switcher({ lang, label, rest }: { lang: Lang; label: string; rest: string }) {
  return (
    <nav aria-label={label} className="flex items-center rounded-xl border border-ink-700 bg-ink-900 p-0.5">
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest}`}
          hrefLang={l}
          lang={l}
          onClick={() => rememberLocale(l)}
          aria-current={l === lang ? "true" : undefined}
          title={localeNames[l]}
          className={`rounded-[10px] px-2.5 py-1.5 text-xs font-bold tracking-wide transition-colors ${
            l === lang ? "bg-ink-700 text-white" : "text-ink-400 hover:text-ink-100"
          }`}
        >
          <span aria-hidden="true">{localeShort[l]}</span>
          <span className="sr-only">{localeNames[l]}</span>
        </Link>
      ))}
    </nav>
  );
}
