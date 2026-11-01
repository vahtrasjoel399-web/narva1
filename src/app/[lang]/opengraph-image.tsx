import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Latin-only text so the default OG font renders it in every language.
export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#1d1b19", color: "#f2eee8", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 56, height: 56, background: "#ee8a2e", borderRadius: 4 }} />
          <div style={{ fontSize: 40, fontWeight: 700 }}>{siteConfig.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>Autoteenindus · Car service</div>
          <div style={{ fontSize: 36, color: "#bdb5aa", marginTop: 20 }}>{`${siteConfig.address.city} · ${siteConfig.phone.display}`}</div>
        </div>
        <div style={{ height: 10, width: 240, background: "#ee8a2e" }} />
      </div>
    ),
    size,
  );
}
