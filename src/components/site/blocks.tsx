import Link from "next/link";
import { ArrowRight, Clock, Phone, Star } from "lucide-react";
import { siteConfig, type Lang } from "@/config/site";
import type { Dictionary } from "@/i18n";
import { t } from "@/i18n/config";
import { formatDuration, formatPrice } from "@/lib/format";
import type { Service } from "@/lib/types";
import { ServiceIcon } from "@/components/icons";

export function SectionHeading({ eyebrow, title, subtitle, id, align = "left" }: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  id?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 id={id} className="mt-2 text-3xl font-extrabold text-white md:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-lg text-ink-400">{subtitle}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="relative overflow-hidden border-b border-ink-800">
      <div className="grid-bg absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
      <div className="container-x relative py-14 md:py-20">
        <h1 className="max-w-3xl text-4xl font-extrabold text-white md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-lg text-ink-300">{subtitle}</p>}
      </div>
    </div>
  );
}

export function ServiceCard({ service, lang, dict, href }: { service: Service; lang: Lang; dict: Dictionary; href: string }) {
  return (
    <Link href={href} className="card card-hover group flex flex-col p-5">
      <span className="grid size-12 place-items-center rounded-xl bg-ink-750 text-accent-400 transition-colors group-hover:bg-accent-500 group-hover:text-ink-950">
        <ServiceIcon name={service.icon} size={26} />
      </span>
      <h3 className="mt-4 text-lg font-bold text-white">{service.name[lang]}</h3>
      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-sm">
        <span className="flex items-center gap-1.5 text-ink-400">
          <Clock size={15} aria-hidden="true" /> ~{formatDuration(service.durationMin, lang)}
        </span>
        <span className="font-bold text-ink-100">{t(dict.common.priceFrom, { price: formatPrice(service.priceFrom, lang) })}</span>
      </div>
    </Link>
  );
}

export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="flex gap-0.5 text-accent-400" aria-label={`${rating}/5`} role="img">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} aria-hidden="true" fill={i < Math.round(rating) ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

export function CtaBanner({ lang, dict }: { lang: Lang; dict: Dictionary }) {
  return (
    <section aria-labelledby="cta-title" className="container-x mt-24">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-accent-600/40 bg-gradient-to-br from-accent-600/25 via-ink-850 to-ink-850 p-8 md:p-12">
        <div className="grid-bg absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 id="cta-title" className="text-3xl font-extrabold text-white md:text-4xl">
              {dict.home.ctaTitle}
            </h2>
            <p className="mt-3 text-lg text-ink-300">{dict.home.ctaText}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={`/${lang}/booking`} className="btn btn-primary btn-lg">
              {dict.home.ctaPrimary} <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a href={`tel:${siteConfig.contact.phoneHref}`} className="btn btn-secondary btn-lg">
              <Phone size={18} aria-hidden="true" /> {siteConfig.contact.phone}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
