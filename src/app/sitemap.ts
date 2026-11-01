import type { MetadataRoute } from "next";
import { locales, localeTags } from "@/i18n";
import { siteUrl } from "@/lib/site";

const paths = ["", "/services", "/booking", "/about", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return paths.flatMap((p) =>
    locales.map((l) => ({
      url: `${base}/${l}${p}`,
      changeFrequency: p === "/booking" ? ("daily" as const) : ("monthly" as const),
      priority: p === "" ? 1 : p === "/booking" || p === "/services" ? 0.8 : 0.5,
      alternates: { languages: Object.fromEntries(locales.map((x) => [localeTags[x], `${base}/${x}${p}`])) },
    })),
  );
}
