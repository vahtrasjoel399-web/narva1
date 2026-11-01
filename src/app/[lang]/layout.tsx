import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Golos_Text, IBM_Plex_Mono } from "next/font/google";
import "../globals.css";
import { siteConfig } from "@/config/site";
import { getDictionary, isLocale, locales } from "@/i18n";
import { href, siteUrl, telHref } from "@/lib/site";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { MobileCta } from "@/components/site/mobile-cta";
import { CookieConsent } from "@/components/site/cookie-consent";

const golos = Golos_Text({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["400", "600", "700"], variable: "--font-golos", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = { themeColor: "#1d1b19", colorScheme: "dark" };

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${dict.meta.homeTitle} · ${siteConfig.name}`, template: `%s · ${siteConfig.name}` },
    description: dict.meta.homeDescription,
    applicationName: siteConfig.name,
    formatDetection: { telephone: true },
    // Search engine ownership codes (Google Search Console, Yandex Webmaster, Bing). Set in Vercel env vars.
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      yandex: process.env.YANDEX_VERIFICATION || undefined,
      other: process.env.BING_VERIFICATION ? { "msvalidate.01": process.env.BING_VERIFICATION } : undefined,
    },
  };
}

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const accentVars = { "--accent": siteConfig.theme.accent, "--accent-strong": siteConfig.theme.accentStrong } as React.CSSProperties;

  return (
    <html lang={lang} className={`${golos.variable} ${plexMono.variable}`} style={accentVars}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only z-[60] focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:rounded-sm focus:bg-accent focus:px-4 focus:py-3 focus:text-on-accent">
          {dict.nav.skipToContent}
        </a>
        <Header lang={lang} dict={dict} />
        <main id="main">{children}</main>
        <Footer lang={lang} dict={dict} />
        <MobileCta bookHref={href(lang, "/booking")} telHref={telHref()} labels={{ book: dict.nav.book, call: dict.nav.call }} />
        <CookieConsent t={dict.cookie} />
      </body>
    </html>
  );
}
