import type { Metadata } from "next";
import { getDictionary, isLocale } from "@/i18n";
import { getServices } from "@/lib/services";
import { pageMeta } from "@/lib/seo";
import { ServiceList } from "@/components/site/service-list";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/[lang]/services">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang);
  return pageMeta(lang, "/services", d.meta.servicesTitle, d.meta.servicesDescription);
}

export default async function ServicesPage({ params }: PageProps<"/[lang]/services">) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;
  const dict = getDictionary(lang);
  const services = await getServices();
  return (
    <div className="container-x py-12 md:py-20">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold md:text-5xl">{dict.services.title}</h1>
        <p className="mt-4 text-lg text-muted">{dict.services.intro}</p>
      </header>
      <div className="mt-10">
        <ServiceList services={services} lang={lang} dict={dict} detailed />
      </div>
      <p className="mt-8 max-w-2xl text-muted">{dict.services.notListed}</p>
    </div>
  );
}
