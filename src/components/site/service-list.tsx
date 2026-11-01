import Link from "next/link";
import type { Locale } from "@/config/site";
import { fmt, localeTags, type Dictionary } from "@/i18n";
import type { Service } from "@/lib/services";
import { serviceIcon } from "@/lib/services";
import { href } from "@/lib/site";
import { formatDuration, formatPrice } from "@/lib/time";
import { Icon } from "@/components/ui/icon";

/** The signature element: a price list set like a workshop job card. */
export function ServiceList({ services, lang, dict, detailed = false }: { services: Service[]; lang: Locale; dict: Dictionary; detailed?: boolean }) {
  return (
    <div className="border-t border-line-strong">
      <div className="hidden grid-cols-[3rem_1fr_7rem_7rem_auto] gap-6 border-b border-line py-3 md:grid">
        <span className="eyebrow">#</span>
        <span className="eyebrow">{dict.services.colService}</span>
        <span className="eyebrow text-right">{dict.services.colDuration}</span>
        <span className="eyebrow text-right">{dict.services.colPrice}</span>
        <span className="w-12" />
      </div>
      <ol>
        {services.map((s, i) => {
          const book = href(lang, `/booking?service=${s.id}`);
          return (
            <li key={s.id} id={s.id} className="group border-b border-line">
              <div className="grid grid-cols-[2.25rem_1fr_auto] items-start gap-x-4 gap-y-2 py-5 md:grid-cols-[3rem_1fr_7rem_7rem_auto] md:items-center md:gap-6">
                <span className="pt-0.5 font-mono text-sm text-faint md:pt-0">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2.5 text-lg font-semibold">
                    <Icon name={serviceIcon(s.id)} size={20} className="shrink-0 text-accent" />
                    {s.name[lang]}
                  </h3>
                  {detailed && s.description[lang] && <p className="mt-1.5 max-w-[60ch] text-muted">{s.description[lang]}</p>}
                  <p className="mt-1 font-mono text-sm text-muted md:hidden">
                    {fmt(dict.common.durationApprox, { d: formatDuration(s.duration_min, dict.common) })}
                    {s.price_from != null && <> · {fmt(dict.common.priceFrom, { p: formatPrice(s.price_from, localeTags[lang]) })}</>}
                  </p>
                  {detailed && (
                    <Link href={book} className="btn btn-secondary btn-sm mt-4 md:hidden">
                      {dict.common.bookThis}
                    </Link>
                  )}
                </div>
                <span className="hidden text-right font-mono text-muted md:block">{formatDuration(s.duration_min, dict.common)}</span>
                <span className="hidden text-right font-mono md:block">
                  {s.price_from != null && (
                    <>
                      <span className="text-sm text-faint">{dict.common.from} </span>
                      {formatPrice(s.price_from, localeTags[lang])}
                    </>
                  )}
                </span>
                <Link
                  href={book}
                  aria-label={`${dict.common.bookThis}: ${s.name[lang]}`}
                  className={`${detailed ? "hidden md:inline-flex" : "inline-flex"} btn btn-ghost btn-sm size-11 px-0 text-muted group-hover:text-accent md:size-auto md:px-3`}
                >
                  <span className="hidden md:inline">{detailed ? dict.common.bookThis : ""}</span>
                  <Icon name="chevronRight" className={detailed ? "md:hidden" : ""} />
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
