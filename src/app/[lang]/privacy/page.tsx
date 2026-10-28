import type { Metadata } from "next";
import { siteConfig, type Lang } from "@/config/site";
import { getDictionary } from "@/i18n";
import { t } from "@/i18n/config";
import { formatDateLong, fullAddress } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/site/blocks";

/** Update when the policy text changes. */
const UPDATED = "2026-10-28";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, "privacy");
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const lang = (await params).lang as Lang;
  const p = getDictionary(lang).privacy;
  const c = siteConfig;
  const vars = { legalName: c.legalName, registryCode: c.registryCode, address: fullAddress(), email: c.contact.email };

  return (
    <>
      <PageHeader title={p.title} subtitle={t(p.updated, { date: formatDateLong(UPDATED, lang) })} />
      <article className="container-x mt-10 max-w-3xl">
        <p className="text-lg leading-relaxed text-ink-200">{t(p.intro, vars)}</p>
        {p.sections.map((s) => (
          <section key={s.title} className="mt-10">
            <h2 className="text-2xl font-bold text-white">{s.title}</h2>
            <p className="mt-3 leading-relaxed text-ink-300">{t(s.body, vars)}</p>
          </section>
        ))}
      </article>
    </>
  );
}
