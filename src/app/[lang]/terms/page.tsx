import type { Metadata } from "next";
import { getDictionary, isLocale } from "@/i18n";
import { pageMeta } from "@/lib/seo";
import { terms } from "@/content/legal";
import { LegalPage } from "@/components/site/legal-page";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang);
  return pageMeta(lang, "/terms", d.meta.termsTitle, terms[lang].intro);
}

export default async function TermsPage({ params }: PageProps<"/[lang]/terms">) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;
  return <LegalPage doc={terms[lang]} lang={lang} />;
}
