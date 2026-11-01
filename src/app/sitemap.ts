import type { MetadataRoute } from "next";
import { locales, localeTags } from "@/i18n";
import { siteUrl } from "@/lib/site";

const paths = ["", "/services", "/booking", "/about", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  // Content changes ship with a deploy, so the build time is the last change.
  const lastModified = new Date();
  return paths.flatMap((p) =>
    locales.map((l) => ({
      url: `${base}/${l}${p}`,
      lastModified,
      changeFrequency: p === "/booking" ? ("daily" as const) : ("monthly" as const),
      priority: p === "" ? 1 : p === "/booking" || p === "/services" ? 0.8 : 0.5,
      alternates: {
        languages: {
          ...Object.fromEntries(locales.map((x) => [localeTags[x], `${base}/${x}${p}`])),
          "x-default": `${base}/et${p}`,
        },
      },
    })),
  );
}
