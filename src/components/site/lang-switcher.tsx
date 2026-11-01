"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/config/site";

const short: Record<Locale, string> = { et: "ET", ru: "RU", en: "EN" };
const names: Record<Locale, string> = { et: "Eesti", ru: "Русский", en: "English" };

export function LangSwitcher({ current, label }: { current: Locale; label: string }) {
  const pathname = usePathname() || `/${current}`;
  const rest = pathname.split("/").slice(2).join("/");
  return (
    <nav aria-label={label} className="flex items-center">
      {(Object.keys(short) as Locale[]).map((l) => (
        <Link
          key={l}
          href={`/${l}${rest ? `/${rest}` : ""}`}
          hrefLang={l}
          lang={l}
          title={names[l]}
          aria-current={l === current ? "true" : undefined}
          onClick={() => {
            document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
          }}
          className={`inline-flex min-h-11 min-w-11 items-center justify-center font-mono text-sm transition-colors ${
            l === current ? "text-fg underline decoration-accent decoration-2 underline-offset-[6px]" : "text-faint hover:text-fg"
          }`}
        >
          {short[l]}
        </Link>
      ))}
    </nav>
  );
}
