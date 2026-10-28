import type { MetadataRoute } from "next";
import { locales, localeTags } from "@/i18n/config";
import { siteUrl } from "@/lib/env";
import { pagePaths } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const priority: Record<string, number> = { home: 1, booking: 0.9, services: 0.9, contact: 0.8, about: 0.6, privacy: 0.2 };
  return Object.entries(pagePaths).flatMap(([key, path]) =>
    locales.map((lang) => ({
      url: `${base}/${lang}${path}`,
      changeFrequency: key === "home" || key === "services" ? ("weekly" as const) : ("monthly" as const),
      priority: priority[key] ?? 0.5,
      alternates: {
        languages: Object.fromEntries([
          ...locales.map((l) => [localeTags[l], `${base}/${l}${path}`]),
          ["x-default", `${base}/et${path}`],
        ]),
      },
    })),
  );
}
