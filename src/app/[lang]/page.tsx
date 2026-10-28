import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, CalendarCheck, Car, ListChecks, MapPin, Phone, ShieldCheck, Star, Timer } from "lucide-react";
import { siteConfig, type Lang } from "@/config/site";
import { getDictionary } from "@/i18n";
import { t } from "@/i18n/config";
import { fullAddress } from "@/lib/format";
import { getServices } from "@/lib/services";
import { businessJsonLd, pageMetadata } from "@/lib/seo";
import { CtaBanner, SectionHeading, ServiceCard, Stars } from "@/components/site/blocks";
import { JsonLd } from "@/components/site/JsonLd";
import { MapEmbed } from "@/components/site/MapEmbed";
import { OpeningHours } from "@/components/site/OpeningHours";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, "home");
}

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const lang = (await params).lang as Lang;
  const dict = getDictionary(lang);
  const h = dict.home;
  const c = siteConfig;
  const services = await getServices();

  const trust = [
    { icon: Award, ...h.trust.experience, value: t(h.trust.experience.value, { n: c.trust.yearsExperience }) },
    { icon: ShieldCheck, ...h.trust.warranty, value: t(h.trust.warranty.value, { n: c.trust.warrantyMonths }) },
    { icon: Timer, ...h.trust.diagnostics, value: t(h.trust.diagnostics.value, { n: c.trust.diagnosticsMinutes }) },
    {
      icon: Star,
      value: t(h.trust.rating.value, { rating: c.trust.rating }),
      label: t(h.trust.rating.label, { count: c.trust.reviewCount }),
    },
  ];
  const stepIcons = [ListChecks, CalendarCheck, Car];

  return (
    <>
      <JsonLd data={businessJsonLd(lang, services)} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black_20%,transparent_70%)]" aria-hidden="true" />
        <div
          className="absolute -right-40 -top-40 size-[36rem] rounded-full bg-accent-500/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="container-x relative grid items-center gap-10 py-12 md:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div>
            <p className="eyebrow animate-fade-up">
              <MapPin size={15} aria-hidden="true" /> {t(h.eyebrow, { cityIn: c.address.cityIn[lang] })}
            </p>
            <h1 className="mt-4 text-[2.6rem] font-extrabold leading-[1.05] text-white animate-fade-up [animation-delay:60ms] sm:text-6xl">
              {h.title}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-300 animate-fade-up [animation-delay:120ms] md:text-xl">
              {h.subtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 animate-fade-up [animation-delay:180ms] sm:flex-row">
              <Link href={`/${lang}/booking`} className="btn btn-primary btn-lg">
                {h.ctaPrimary} <ArrowRight size={19} aria-hidden="true" />
              </Link>
              <a href={`tel:${c.contact.phoneHref}`} className="btn btn-secondary btn-lg">
                <Phone size={19} aria-hidden="true" /> {h.ctaSecondary} · {c.contact.phone}
              </a>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-ink-300 animate-fade-up [animation-delay:240ms]">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok-400 opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-ok-500" />
              </span>
              {h.heroBadge}
            </p>
          </div>

          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-ink-700 bg-ink-850 shadow-2xl">
              <Image
                src={c.images.hero}
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover"
                unoptimized={c.images.hero.endsWith(".svg")}
              />
            </div>
            <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-ink-700 bg-ink-900/95 px-4 py-3 shadow-xl backdrop-blur sm:left-6">
              <Stars rating={c.trust.rating} />
              <span className="text-sm font-bold text-white">{c.trust.rating}/5</span>
              <span className="text-xs text-ink-400">{t(h.trust.rating.label, { count: c.trust.reviewCount })}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust points */}
      <section className="container-x mt-10">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {trust.map(({ icon: Icon, value, label }) => (
            <li key={label} className="card flex flex-col gap-3 p-5 md:flex-row md:items-center">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-500/12 text-accent-400">
                <Icon size={22} aria-hidden="true" />
              </span>
              <span>
                <span className="block font-display text-xl font-extrabold text-white">{value}</span>
                <span className="block text-sm text-ink-400">{label}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Services */}
      <section aria-labelledby="services-title" className="container-x mt-24">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeading id="services-title" title={h.servicesTitle} subtitle={h.servicesSubtitle} />
          <Link href={`/${lang}/services`} className="btn btn-ghost self-start md:self-auto">
            {h.allServices} <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} lang={lang} dict={dict} href={`/${lang}/booking?service=${s.id}`} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-title" className="container-x mt-24">
        <SectionHeading id="how-title" title={h.howTitle} subtitle={h.howSubtitle} />
        <ol className="mt-8 grid gap-3 md:grid-cols-3">
          {h.steps.map((step, i) => {
            const Icon = stepIcons[i];
            return (
              <li key={step.title} className="card relative overflow-hidden p-6">
                <span className="absolute -right-2 -top-6 font-display text-[7rem] font-extrabold leading-none text-ink-800" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="relative grid size-12 place-items-center rounded-xl bg-accent-500 text-ink-950">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <h3 className="relative mt-5 text-xl font-bold text-white">
                  <span className="sr-only">{i + 1}. </span>
                  {step.title}
                </h3>
                <p className="relative mt-2 text-ink-400">{step.text}</p>
              </li>
            );
          })}
        </ol>
        <div className="mt-6">
          <Link href={`/${lang}/booking`} className="btn btn-primary">
            {h.ctaPrimary} <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Reviews */}
      <section aria-labelledby="reviews-title" className="container-x mt-24">
        <SectionHeading
          id="reviews-title"
          title={h.reviewsTitle}
          subtitle={t(h.reviewsSubtitle, { rating: c.trust.rating, count: c.trust.reviewCount })}
        />
        <ul className="mt-8 grid gap-3 md:grid-cols-3">
          {c.reviews.map((r) => (
            <li key={r.author} className="card flex flex-col p-6">
              <Stars rating={r.rating} />
              <blockquote className="mt-4 flex-1 text-lg leading-relaxed text-ink-100">“{r.text[lang]}”</blockquote>
              <p className="mt-4 text-sm font-semibold text-ink-400">— {r.author}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Map + contacts */}
      <section aria-labelledby="map-title" className="container-x mt-24">
        <SectionHeading id="map-title" title={h.mapTitle} />
        <div className="mt-8 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <MapEmbed
            query={`${c.name}, ${fullAddress()}`}
            title={t(dict.contact.mapTitle, { name: c.name })}
            labels={{ show: dict.contact.showMap, note: dict.contact.mapPlaceholder, directions: dict.contact.directions }}
          />
          <div className="card flex flex-col gap-6 p-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">{dict.common.address}</h3>
              <address className="mt-2 text-lg font-semibold not-italic text-white">{fullAddress()}</address>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink-400">{dict.common.openingHours}</h3>
              <OpeningHours dict={dict} className="mt-1" />
            </div>
            <a href={`tel:${c.contact.phoneHref}`} className="btn btn-secondary mt-auto">
              <Phone size={18} aria-hidden="true" /> {c.contact.phone}
            </a>
          </div>
        </div>
      </section>

      <CtaBanner lang={lang} dict={dict} />
    </>
  );
}
