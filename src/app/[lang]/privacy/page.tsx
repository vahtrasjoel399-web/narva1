import type { Metadata } from "next";
import { getDictionary, isLocale } from "@/i18n";
import { pageMeta } from "@/lib/seo";
import { privacy } from "@/content/legal";
import { LegalPage } from "@/components/site/legal-page";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang);
  return pageMeta(lang, "/privacy", d.meta.privacyTitle, privacy[lang].intro);
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;
  return <LegalPage doc={privacy[lang]} lang={lang} />;
}
