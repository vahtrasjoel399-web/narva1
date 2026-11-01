import type { Metadata } from "next";
import { siteConfig, type Locale } from "@/config/site";
import { localeTags, locales } from "@/i18n";
import { siteUrl } from "@/lib/site";
import type { Service } from "@/lib/services";

/** Canonical + hreflang alternates + OpenGraph for a page that exists in every language. */
export function pageMeta(lang: Locale, path: string, title: string, description: string): Metadata {
  const base = siteUrl();
  const languages = Object.fromEntries(locales.map((l) => [localeTags[l], `${base}/${l}${path}`]));
  return {
    title,
    description,
    alternates: {
      canonical: `${base}/${lang}${path}`,
      languages: { ...languages, "x-default": `${base}/et${path}` },
    },
    openGraph: {
      type: "website",
      url: `${base}/${lang}${path}`,
      siteName: siteConfig.name,
      title,
      description,
      locale: localeTags[lang].replace("-", "_"),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function localBusinessJsonLd(lang: Locale, services: Service[]) {
  const base = siteUrl();
  const a = siteConfig.address;
  return {
    "@context": "https://schema.org",
    "@type": ["AutoRepair", "LocalBusiness"],
    "@id": `${base}/#business`,
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: `${base}/${lang}`,
    telephone: siteConfig.phone.tel,
    email: siteConfig.email,
    image: `${base}/et/opengraph-image`,
    priceRange: "€€",
    address: { "@type": "PostalAddress", streetAddress: a.street, addressLocality: a.city, postalCode: a.postalCode, addressRegion: a.region, addressCountry: a.country },
    geo: { "@type": "GeoCoordinates", latitude: a.geo.lat, longitude: a.geo.lng },
    openingHoursSpecification: siteConfig.openingHours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days.map((d) => `https://schema.org/${dayNames[d - 1]}`),
      opens: h.open,
      closes: h.close,
    })),
    sameAs: [siteConfig.social.facebook, siteConfig.social.instagram, siteConfig.googleReviewsUrl].filter(Boolean),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.name[lang] },
        ...(s.price_from != null ? { priceSpecification: { "@type": "PriceSpecification", minPrice: s.price_from, priceCurrency: "EUR" } } : {}),
      })),
    },
  };
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
