import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { fmt, getDictionary, isLocale } from "@/i18n";
import { getServices } from "@/lib/services";
import { fullAddress, href, openingHoursRows, telHref } from "@/lib/site";
import { JsonLd, localBusinessJsonLd, pageMeta } from "@/lib/seo";
import { mapsEmbedUrl } from "@/lib/maps";
import { ServiceList } from "@/components/site/service-list";
import { MapEmbed } from "@/components/site/map-embed";
import { Icon } from "@/components/ui/icon";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang);
  return pageMeta(lang, "", `${d.meta.homeTitle}`, d.meta.homeDescription);
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;
  const dict = getDictionary(lang);
  const t = dict.home;
  const services = await getServices();
  const years = new Date().getFullYear() - siteConfig.trust.foundedYear;
  const realReviews = siteConfig.reviews;

  const trust = [
    { value: years, label: t.trustYears, text: fmt(t.trustYearsText, { city: siteConfig.address.city, year: siteConfig.trust.foundedYear }) },
    { value: siteConfig.trust.warrantyMonths, label: t.trustWarranty, text: t.trustWarrantyText },
    { value: siteConfig.trust.diagnosticsMinutes, label: t.trustDiag, text: t.trustDiagText },
    { value: siteConfig.trust.bays, label: t.trustBays, text: t.trustBaysText },
  ];
  const steps = [
    { title: t.how1Title, text: t.how1Text },
    { title: t.how2Title, text: t.how2Text },
    { title: t.how3Title, text: t.how3Text },
  ];

  return (
    <>
      <JsonLd data={localBusinessJsonLd(lang, services)} />

      {/* Hero */}
      <section className="border-b border-line">
        <div className="container-x grid items-center gap-10 py-10 md:py-16 lg:grid-cols-12 lg:gap-12 lg:py-20">
          <div className="animate-rise lg:col-span-6">
            <p className="eyebrow">{fmt(t.eyebrow, { city: siteConfig.address.city })}</p>
            <h1 className="mt-4 text-[2.375rem] font-bold sm:text-5xl lg:text-[3.5rem]">{t.heroTitle}</h1>
            <p className="mt-5 max-w-[46ch] text-lg text-muted">{t.heroText}</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href={href(lang, "/booking")} className="btn btn-primary px-7 text-lg">
                {t.heroCta}
              </Link>
              <a href={telHref()} className="inline-flex min-h-11 items-center gap-2 text-muted hover:text-fg">
                <Icon name="phone" size={18} />
                <span>{fmt(t.heroCall, { phone: "" })}</span>
                <span className="font-mono text-fg">{siteConfig.phone.display}</span>
              </a>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-[auto_1fr] gap-x-5 gap-y-1 border-t border-line pt-5 font-mono text-sm">
              {openingHoursRows(dict).map((r) => (
                <div key={r.days} className="contents">
                  <dt className="text-faint">{r.days}</dt>
                  <dd className="text-muted">{r.hours}</dd>
                </div>
              ))}
            </dl>
          </div>
          <figure className="lg:col-span-6">
            <div className="overflow-hidden rounded-md border border-line bg-panel">
              <Image src={siteConfig.images.hero} alt={t.heroCaption} width={800} height={600} priority className="h-auto w-full" />
            </div>
            <figcaption className="mt-2 font-mono text-xs text-faint">{t.heroCaption}</figcaption>
          </figure>
        </div>
      </section>

      {/* Trust: spec strip, not cards */}
      <section aria-labelledby="trust-title" className="border-b border-line bg-panel">
        <h2 id="trust-title" className="sr-only">
          {t.trustTitle}
        </h2>
        <dl className="container-x grid grid-cols-2 lg:grid-cols-4">
          {trust.map((item, i) => (
            <div key={item.label} className={`flex flex-col py-8 pr-4 ${i % 2 ? "pl-5 border-l border-line" : ""} ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} ${i === 2 ? "lg:border-l lg:pl-5" : ""}`}>
              <dt className="order-2 mt-1 font-semibold">{item.label}</dt>
              <dd className="order-1 font-mono text-4xl font-medium text-accent lg:text-5xl">{item.value}</dd>
              <dd className="order-3 mt-2 text-sm text-muted">{item.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Services */}
      <section className="container-x py-16 md:py-24" aria-labelledby="services-title">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 id="services-title" className="text-3xl font-bold md:text-4xl">
            {t.servicesTitle}
          </h2>
          <Link href={href(lang, "/services")} className="link text-muted">
            {t.servicesLink}
          </Link>
        </div>
        <ServiceList services={services} lang={lang} dict={dict} />
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-panel" aria-labelledby="how-title">
        <div className="container-x py-16 md:py-20">
          <h2 id="how-title" className="text-3xl font-bold md:text-4xl">
            {t.howTitle}
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-0">
            {steps.map((s, i) => (
              <li key={s.title} className={`border-t-2 pt-5 md:pr-8 ${i === 0 ? "border-accent" : "border-line-strong"}`}>
                <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 max-w-[34ch] text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
          <Link href={href(lang, "/booking")} className="btn btn-primary mt-10">
            {dict.common.bookNow}
          </Link>
        </div>
      </section>

      {/* Reviews: real ones only. Placeholders are visibly marked. */}
      <section className="container-x py-16 md:py-24" aria-labelledby="reviews-title">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 id="reviews-title" className="text-3xl font-bold md:text-4xl">
            {t.reviewsTitle}
          </h2>
          {siteConfig.googleReviewsUrl && (
            <a href={siteConfig.googleReviewsUrl} target="_blank" rel="noopener noreferrer" className="link text-muted">
              {t.reviewsGoogle}
            </a>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {realReviews.map((r, i) => (
            <figure key={i} className={`border-l-2 pl-5 ${r.placeholder ? "border-dashed border-line-strong" : "border-accent"}`}>
              <blockquote className={`text-lg ${r.placeholder ? "font-mono text-sm text-faint" : ""}`}>{r.text}</blockquote>
              <figcaption className="mt-3 text-sm text-muted">
                {r.author}
                {r.car && <> · {r.car}</>} · {r.source}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Map + contact */}
      <section className="border-t border-line" aria-labelledby="map-title">
        <div className="container-x grid gap-10 py-16 md:py-24 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <MapEmbed
              src={mapsEmbedUrl()}
              title={t.mapTitle}
              link={siteConfig.googleMapsLink}
              labels={{ show: dict.contact.mapButton, notice: dict.contact.mapNotice, directions: dict.contact.directions }}
            />
          </div>
          <div className="lg:col-span-5">
            <h2 id="map-title" className="text-3xl font-bold">
              {t.mapTitle}
            </h2>
            <p className="mt-4 text-lg">{fullAddress()}</p>
            <a href={telHref()} className="mt-6 inline-flex min-h-11 items-center gap-2 font-mono text-xl">
              <Icon name="phone" />
              {siteConfig.phone.display}
            </a>
            <div className="mt-10 border-t border-line pt-8">
              <h3 className="text-xl font-semibold">{t.ctaTitle}</h3>
              <p className="mt-2 text-muted">{t.ctaText}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={telHref()} className="btn btn-secondary">
                  <Icon name="phone" size={18} />
                  {dict.common.callUs}
                </a>
                <Link href={href(lang, "/booking")} className="btn btn-primary">
                  {dict.common.bookNow}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
