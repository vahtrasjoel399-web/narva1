import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { getDictionary, isLocale } from "@/i18n";
import { fullAddress, href, openingHoursRows, telHref } from "@/lib/site";
import { mapsEmbedUrl } from "@/lib/maps";
import { pageMeta } from "@/lib/seo";
import { MapEmbed } from "@/components/site/map-embed";
import { Icon } from "@/components/ui/icon";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang);
  return pageMeta(lang, "/contact", d.meta.contactTitle, d.meta.contactDescription);
}

export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;
  const dict = getDictionary(lang);
  const t = dict.contact;
  return (
    <div className="container-x py-12 md:py-20">
      <h1 className="text-4xl font-bold md:text-5xl">{t.title}</h1>
      <div className="mt-10 grid gap-12 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-5">
          <div>
            <h2 className="eyebrow">{t.phone}</h2>
            <a href={telHref()} className="mt-2 inline-flex min-h-12 items-center gap-3 font-mono text-2xl">
              <Icon name="phone" className="text-accent" />
              {siteConfig.phone.display}
            </a>
          </div>
          <div>
            <h2 className="eyebrow">{t.address}</h2>
            <p className="mt-2 text-lg">{fullAddress()}</p>
            <a href={siteConfig.googleMapsLink} target="_blank" rel="noopener noreferrer" className="link mt-1 inline-block text-muted">
              {t.directions}
            </a>
          </div>
          <div>
            <h2 className="eyebrow">{t.email}</h2>
            <a href={`mailto:${siteConfig.email}`} className="link mt-2 inline-block text-lg">
              {siteConfig.email}
            </a>
          </div>
          <div>
            <h2 className="eyebrow">{t.hours}</h2>
            <dl className="mt-3 grid max-w-xs grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 font-mono">
              {openingHoursRows(dict).map((r) => (
                <div key={r.days} className="contents">
                  <dt className="text-muted">{r.days}</dt>
                  <dd>{r.hours}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="text-sm text-muted">
            <h2 className="eyebrow">{t.company}</h2>
            <p className="mt-2">{siteConfig.legalName}</p>
            <p>
              {t.registry}: {siteConfig.registryCode}
            </p>
          </div>
          <Link href={href(lang, "/booking")} className="btn btn-primary">
            {dict.common.bookNow}
          </Link>
        </div>
        <div className="lg:col-span-7">
          <MapEmbed src={mapsEmbedUrl()} title={t.title} link={siteConfig.googleMapsLink} labels={{ show: t.mapButton, notice: t.mapNotice, directions: t.directions }} />
        </div>
      </div>
    </div>
  );
}
