import type { Metadata } from "next";
import { siteConfig, type Lang } from "@/config/site";
import { getDictionary } from "@/i18n";
import { localeTags, locales, ogLocales, t } from "@/i18n/config";
import { siteUrl } from "@/lib/env";
import { fullAddress } from "@/lib/format";
import type { Service } from "@/lib/types";

export type PageKey = "home" | "services" | "about" | "contact" | "booking" | "manage" | "privacy";

export const pagePaths: Record<Exclude<PageKey, "manage">, string> = {
  home: "",
  services: "/services",
  about: "/about",
  contact: "/contact",
  booking: "/booking",
  privacy: "/privacy",
};

function vars(lang: Lang) {
  return {
    name: siteConfig.name,
    city: siteConfig.address.city,
    cityIn: siteConfig.address.cityIn[lang],
    year: siteConfig.foundedYear,
    address: fullAddress(),
  };
}

export function pageMetadata(lang: Lang, page: PageKey, opts: { noindex?: boolean } = {}): Metadata {
  const dict = getDictionary(lang);
  const meta = dict.meta[page];
  const v = vars(lang);
  const title = t(meta.title, v);
  const description = t(meta.description, v);
  const path = page === "manage" ? null : pagePaths[page];

  const languages: Record<string, string> = {};
  if (path !== null) {
    for (const l of locales) languages[localeTags[l]] = `/${l}${path}`;
    languages["x-default"] = `/et${path}`;
  }

  return {
    metadataBase: new URL(siteUrl()),
    title: page === "home" ? { absolute: title } : title,
    description,
    alternates: path !== null ? { canonical: `/${lang}${path}`, languages } : undefined,
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: page === "home" ? title : `${title} | ${siteConfig.name}`,
      description,
      locale: ogLocales[lang],
      alternateLocale: locales.filter((l) => l !== lang).map((l) => ogLocales[l]),
      url: path !== null ? `/${lang}${path}` : undefined,
    },
    twitter: { card: "summary_large_image" },
    robots: opts.noindex ? { index: false, follow: false } : undefined,
  };
}

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** LocalBusiness + AutoRepair structured data. */
export function businessJsonLd(lang: Lang, services: Service[]) {
  const url = siteUrl();
  const c = siteConfig;
  const social = Object.values(c.social).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": ["AutoRepair", "LocalBusiness"],
    "@id": `${url}/#business`,
    name: c.name,
    legalName: c.legalName,
    url: `${url}/${lang}`,
    image: `${url}/${lang}/opengraph-image`,
    logo: `${url}/icon.svg`,
    telephone: c.contact.phone,
    email: c.contact.email,
    priceRange: "€€",
    currenciesAccepted: c.currency,
    foundingDate: String(c.foundedYear),
    address: {
      "@type": "PostalAddress",
      streetAddress: c.address.street,
      addressLocality: c.address.city,
      postalCode: c.address.postalCode,
      addressRegion: c.address.region,
      addressCountry: c.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: c.address.geo.lat, longitude: c.address.geo.lng },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${c.address.geo.lat},${c.address.geo.lng}`,
    openingHoursSpecification: c.hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days.map((d) => `https://schema.org/${dayNames[d - 1]}`),
      opens: h.open,
      closes: h.close,
    })),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: c.trust.rating,
      reviewCount: c.trust.reviewCount,
      bestRating: 5,
    },
    areaServed: c.address.city,
    inLanguage: localeTags[lang],
    ...(social.length ? { sameAs: social } : {}),
    makesOffer: services.map((s) => ({
      "@type": "Offer",
      priceCurrency: c.currency,
      priceSpecification: { "@type": "PriceSpecification", minPrice: s.priceFrom, priceCurrency: c.currency },
      itemOffered: { "@type": "Service", name: s.name[lang], description: s.description[lang] },
    })),
  };
}
