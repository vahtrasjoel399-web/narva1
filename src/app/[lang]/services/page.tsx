import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Phone } from "lucide-react";
import { siteConfig, type Lang } from "@/config/site";
import { getDictionary } from "@/i18n";
import { t } from "@/i18n/config";
import { formatDuration, formatPrice } from "@/lib/format";
import { getServices } from "@/lib/services";
import { businessJsonLd, pageMetadata } from "@/lib/seo";
import { ServiceIcon } from "@/components/icons";
import { CtaBanner, PageHeader } from "@/components/site/blocks";
import { JsonLd } from "@/components/site/JsonLd";

export async function generateMetadata({ params }: PageProps<"/[lang]/services">): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, "services");
}

export default async function ServicesPage({ params }: PageProps<"/[lang]/services">) {
  const lang = (await params).lang as Lang;
  const dict = getDictionary(lang);
  const s = dict.services;
  const services = await getServices();

  return (
    <>
      <JsonLd data={businessJsonLd(lang, services)} />
      <PageHeader title={s.title} subtitle={s.subtitle} />
      <section className="container-x mt-10">
        <ul className="grid gap-3 md:grid-cols-2">
          {services.map((svc) => (
            <li key={svc.id} id={svc.id} className="card flex scroll-mt-24 flex-col p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-500/12 text-accent-400">
                  <ServiceIcon name={svc.icon} size={28} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white">{svc.name[lang]}</h2>
                  <p className="mt-2 leading-relaxed text-ink-300">{svc.description[lang]}</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-ink-800 pt-5">
                <p className="flex items-center gap-2 text-ink-300">
                  <Clock size={17} aria-hidden="true" className="text-ink-500" />
                  <span className="sr-only">{s.durationLabel}:</span>~{formatDuration(svc.durationMin, lang)}
                </p>
                <p className="font-display text-lg font-extrabold text-white">
                  <span className="sr-only">{s.priceLabel}:</span>
                  {t(dict.common.priceFrom, { price: formatPrice(svc.priceFrom, lang) })}
                </p>
                <Link href={`/${lang}/booking?service=${svc.id}`} className="btn btn-primary btn-sm ml-auto">
                  {s.bookThis} <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
        <div className="card mt-6 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{s.notListedTitle}</h2>
            <p className="mt-1 text-ink-400">{s.notListedText}</p>
          </div>
          <a href={`tel:${siteConfig.contact.phoneHref}`} className="btn btn-secondary">
            <Phone size={18} aria-hidden="true" /> {siteConfig.contact.phone}
          </a>
        </div>
      </section>
      <CtaBanner lang={lang} dict={dict} />
    </>
  );
}
