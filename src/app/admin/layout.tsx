import type { Metadata, Viewport } from "next";
import { Golos_Text, IBM_Plex_Mono } from "next/font/google";
import "../globals.css";
import { siteConfig } from "@/config/site";
import { adminLang } from "@/lib/auth";

const golos = Golos_Text({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["400", "600", "700"], variable: "--font-golos", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: `Admin · ${siteConfig.name}`, template: `%s · Admin` },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const viewport: Viewport = { themeColor: "#1d1b19", colorScheme: "dark" };

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const lang = await adminLang();
  const accentVars = { "--accent": siteConfig.theme.accent, "--accent-strong": siteConfig.theme.accentStrong } as React.CSSProperties;
  return (
    <html lang={lang} className={`${golos.variable} ${plexMono.variable}`} style={accentVars}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
