import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig, type Lang } from "@/config/site";
import { getDictionary } from "@/i18n";
import { isLocale, t } from "@/i18n/config";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang: Lang = isLocale(raw) ? raw : "et";
  const d = getDictionary(lang);
  const [bold, medium] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Inter-ExtraBold.otf")),
    readFile(join(process.cwd(), "assets/fonts/Inter-Medium.otf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #16191f 0%, #0b0d10 60%, #2a1406 100%)",
          color: "#eceef2",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "#ff6a1a", display: "flex" }} />
          <div style={{ fontSize: 40, fontWeight: 800 }}>{siteConfig.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 30, color: "#ff8a4c", fontWeight: 800, textTransform: "uppercase", letterSpacing: 3 }}>
            {t(d.home.eyebrow, { cityIn: siteConfig.address.cityIn[lang] })}
          </div>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 1000 }}>{d.home.title}</div>
        </div>
        <div style={{ display: "flex", gap: 40, fontSize: 30, fontWeight: 500, color: "#b3bbc7" }}>
          <span>{siteConfig.contact.phone}</span>
          <span>★ {siteConfig.trust.rating}/5</span>
          <span style={{ color: "#ff6a1a" }}>{d.nav.bookNow} →</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: bold, weight: 800, style: "normal" },
        { name: "Inter", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
