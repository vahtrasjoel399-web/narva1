import type { Metadata } from "next";
import Image from "next/image";
import { BadgeCheck, Eye, ReceiptText, ShieldCheck } from "lucide-react";
import { siteConfig, type Lang } from "@/config/site";
import { getDictionary } from "@/i18n";
import { t } from "@/i18n/config";
import { pageMetadata } from "@/lib/seo";
import { CtaBanner, PageHeader, SectionHeading } from "@/components/site/blocks";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, "about");
}

export default async function AboutPage({ params }: PageProps<"/[lang]/about">) {
  const lang = (await params).lang as Lang;
  const dict = getDictionary(lang);
  const a = dict.about;
  const c = siteConfig;
  const valueIcons = [ReceiptText, ShieldCheck, Eye];

  return (
    <>
      <PageHeader title={a.title} subtitle={a.subtitle} />

      <section className="container-x mt-12 grid items-center gap-10 lg:grid-cols-2">
        <div>
          <SectionHeading title={a.storyTitle} />
          {a.story.map((p) => (
            <p key={p} className="mt-4 text-lg leading-relaxed text-ink-300">
              {t(p, { year: c.foundedYear })}
            </p>
          ))}
        </div>
        <div className="relative aspect-[3/2] overflow-hidden rounded-[1.75rem] border border-ink-700">
          <Image src={c.images.about} alt="" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" unoptimized={c.images.about.endsWith(".svg")} />
        </div>
      </section>

      <section aria-labelledby="values" className="container-x mt-20">
        <SectionHeading id="values" title={a.valuesTitle} />
        <ul className="mt-8 grid gap-3 md:grid-cols-3">
          {a.values.map((v, i) => {
            const Icon = valueIcons[i] ?? BadgeCheck;
            return (
              <li key={v.title} className="card p-6">
                <Icon size={26} className="text-accent-400" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-bold text-white">{v.title}</h3>
                <p className="mt-1 text-ink-400">{t(v.text, { n: c.trust.warrantyMonths })}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="team" className="container-x mt-20">
        <SectionHeading id="team" title={a.teamTitle} />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {c.team.map((m) => (
            <li key={m.name} className="card flex items-center gap-4 p-5">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-ink-700 to-ink-800 font-display text-xl font-extrabold text-accent-400" aria-hidden="true">
                {m.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")}
              </span>
              <div>
                <p className="text-lg font-bold text-white">{m.name}</p>
                <p className="text-ink-300">{m.role[lang]}</p>
                <p className="text-sm text-ink-500">{t(a.yearsExp, { n: m.years })}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="equipment" className="container-x mt-20 grid items-center gap-10 lg:grid-cols-2">
        <div className="relative order-last aspect-[3/2] overflow-hidden rounded-[1.75rem] border border-ink-700 lg:order-first">
          <Image src={c.images.equipment} alt="" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" unoptimized={c.images.equipment.endsWith(".svg")} />
        </div>
        <div>
          <SectionHeading id="equipment" title={a.equipmentTitle} />
          <ul className="mt-6 flex flex-col gap-3">
            {a.equipment.map((e) => (
              <li key={e} className="flex items-center gap-3 text-lg text-ink-200">
                <BadgeCheck size={22} className="shrink-0 text-accent-400" aria-hidden="true" /> {e}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBanner lang={lang} dict={dict} />
    </>
  );
}
