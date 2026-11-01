import { siteConfig, type Locale } from "@/config/site";
import { fmt, getDictionary, localeTags } from "@/i18n";
import { fullAddress } from "@/lib/site";
import { formatDate } from "@/lib/time";
import { LEGAL_UPDATED } from "@/content/legal";

type Doc = { title: string; intro: string; sections: { h: string; p?: string[]; ul?: string[] }[] };

export function LegalPage({ doc, lang }: { doc: Doc; lang: Locale }) {
  const vars = {
    company: siteConfig.legalName,
    registry: siteConfig.registryCode,
    address: fullAddress(),
    email: siteConfig.email,
    phone: siteConfig.phone.display,
    cutoff: siteConfig.booking.cancelCutoffHours,
  };
  const dict = getDictionary(lang);
  return (
    <article className="container-x prose-legal py-12 md:py-20">
      <h1 className="text-4xl font-bold">{doc.title}</h1>
      <p className="mt-4 text-lg">{doc.intro}</p>
      {doc.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.p?.map((p, i) => <p key={i}>{fmt(p, vars)}</p>)}
          {s.ul && (
            <ul>
              {s.ul.map((li, i) => (
                <li key={i}>{fmt(li, vars)}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <p className="mt-10 font-mono text-sm">{fmt(dict.legal.updated, { date: formatDate(LEGAL_UPDATED, localeTags[lang], { day: "numeric", month: "long", year: "numeric" }) })}</p>
    </article>
  );
}
