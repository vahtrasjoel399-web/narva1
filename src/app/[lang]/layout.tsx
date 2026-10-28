import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
import "../globals.css";
import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n";
import { isLocale, locales, localeTags } from "@/i18n/config";
import { siteUrl } from "@/lib/env";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { StickyBookBar } from "@/components/site/StickyBookBar";
import { CookieConsent } from "@/components/site/CookieConsent";

const body = Inter({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-body", display: "swap" });

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  applicationName: siteConfig.name,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
  colorScheme: "dark",
};

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <html lang={localeTags[lang]} className={body.variable} data-scroll-behavior="smooth">
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#main"
          className="sr-only z-[60] rounded-lg bg-accent-500 px-4 py-2 font-bold text-ink-950 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          {dict.nav.skipToContent}
        </a>
        <Header lang={lang} dict={dict} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer lang={lang} dict={dict} />
        <Suspense fallback={null}>
          <StickyBookBar
            lang={lang}
            phoneHref={`tel:${siteConfig.contact.phoneHref}`}
            labels={{ call: dict.nav.call, book: dict.nav.bookNow }}
          />
        </Suspense>
        <CookieConsent
          labels={dict.cookies}
          privacyHref={`/${lang}/privacy`}
          gaId={process.env.NEXT_PUBLIC_GA_ID || undefined}
          pixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID || undefined}
        />
      </body>
    </html>
  );
}
