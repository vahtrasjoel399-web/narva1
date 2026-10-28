import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { siteConfig, type Lang } from "@/config/site";
import { getDictionary } from "@/i18n";
import { t } from "@/i18n/config";
import { fullAddress } from "@/lib/format";
import { getServices } from "@/lib/services";
import { businessJsonLd, pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/site/blocks";
import { JsonLd } from "@/components/site/JsonLd";
import { MapEmbed } from "@/components/site/MapEmbed";
import { OpeningHours } from "@/components/site/OpeningHours";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, "contact");
}

export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const lang = (await params).lang as Lang;
  const dict = getDictionary(lang);
  const ct = dict.contact;
  const c = siteConfig;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${c.name}, ${fullAddress()}`)}`;

  return (
    <>
      <JsonLd data={businessJsonLd(lang, await getServices())} />
      <PageHeader title={ct.title} subtitle={ct.subtitle} />
      <section className="container-x mt-10 grid gap-3 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-3">
          <a href={`tel:${c.contact.phoneHref}`} className="card card-hover flex items-center gap-4 p-5">
            <span className="grid size-12 place-items-center rounded-xl bg-accent-500 text-ink-950">
              <Phone size={22} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm text-ink-400">{ct.callNow}</span>
              <span className="block font-display text-xl font-extrabold text-white">{c.contact.phone}</span>
            </span>
          </a>
          <a href={`mailto:${c.contact.email}`} className="card card-hover flex items-center gap-4 p-5">
            <span className="grid size-12 place-items-center rounded-xl bg-ink-750 text-accent-400">
              <Mail size={22} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm text-ink-400">{ct.writeEmail}</span>
              <span className="block text-lg font-bold text-white">{c.contact.email}</span>
            </span>
          </a>
          <div className="card flex items-start gap-4 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-ink-750 text-accent-400">
              <MapPin size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm text-ink-400">{dict.common.address}</h2>
              <address className="text-lg font-bold not-italic text-white">{fullAddress()}</address>
              <a href={directions} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 font-semibold text-accent-400 hover:underline">
                <Navigation size={15} aria-hidden="true" /> {ct.directions}
              </a>
            </div>
          </div>
          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-400">{dict.common.openingHours}</h2>
            <OpeningHours dict={dict} className="mt-2 text-lg" />
          </div>
          <Link href={`/${lang}/booking`} className="btn btn-primary btn-lg">
            <CalendarDays size={19} aria-hidden="true" /> {dict.nav.bookNow}
          </Link>
        </div>
        <MapEmbed
          className="min-h-96"
          query={`${c.name}, ${fullAddress()}`}
          title={t(ct.mapTitle, { name: c.name })}
          labels={{ show: ct.showMap, note: ct.mapPlaceholder, directions: ct.directions }}
        />
      </section>
    </>
  );
}
