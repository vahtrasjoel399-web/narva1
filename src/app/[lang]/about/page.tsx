import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { getDictionary, isLocale } from "@/i18n";
import { href } from "@/lib/site";
import { pageMeta } from "@/lib/seo";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang);
  return pageMeta(lang, "/about", d.meta.aboutTitle, d.meta.aboutDescription);
}

export default async function AboutPage({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;
  const dict = getDictionary(lang);
  const t = dict.about;
  return (
    <div className="container-x py-12 md:py-20">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h1 className="text-4xl font-bold md:text-5xl">{t.title}</h1>
          <p className="mt-6 text-xl">{t.lead}</p>
          <p className="mt-4 max-w-[62ch] text-muted">{t.story}</p>
          <Link href={href(lang, "/booking")} className="btn btn-primary mt-8">
            {dict.common.bookNow}
          </Link>
        </div>
        <div className="lg:col-span-5">
          {siteConfig.images.about ? (
            <Image src={siteConfig.images.about} alt={t.photoCaption} width={800} height={600} className="h-auto w-full rounded-md border border-line" />
          ) : (
            <PhotoPlaceholder caption={t.photoCaption} />
          )}
        </div>
      </div>

      <section className="mt-20" aria-labelledby="team-title">
        <h2 id="team-title" className="text-3xl font-bold">
          {t.teamTitle}
        </h2>
        <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {siteConfig.team.map((m) => (
            <li key={m.name}>
              {m.photo ? (
                <Image src={m.photo} alt={m.name} width={400} height={500} className="aspect-[4/5] w-full rounded-md border border-line object-cover" />
              ) : (
                <PhotoPlaceholder caption={`${dict.common.placeholderPhoto}: ${m.name}`} ratio="4 / 5" />
              )}
              <p className="mt-3 font-semibold">{m.name}</p>
              <p className="text-sm text-muted">{m.role[lang]}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20 border-t border-line pt-10" aria-labelledby="eq-title">
        <h2 id="eq-title" className="text-3xl font-bold">
          {t.equipmentTitle}
        </h2>
        <ul className="mt-6 max-w-3xl">
          {siteConfig.equipment.map((e, i) => (
            <li key={i} className="grid grid-cols-[2.5rem_1fr] border-b border-line py-4">
              <span className="font-mono text-sm text-faint">{String(i + 1).padStart(2, "0")}</span>
              <span>{e[lang]}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
