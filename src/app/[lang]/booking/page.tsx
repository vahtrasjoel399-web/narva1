import type { Metadata } from "next";
import { Suspense } from "react";
import { Phone } from "lucide-react";
import { siteConfig, type Lang } from "@/config/site";
import { getDictionary } from "@/i18n";
import { getServices } from "@/lib/services";
import { pageMetadata } from "@/lib/seo";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { OpeningHours } from "@/components/site/OpeningHours";

export async function generateMetadata({ params }: PageProps<"/[lang]/booking">): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, "booking");
}

export default async function BookingPage({ params }: PageProps<"/[lang]/booking">) {
  const lang = (await params).lang as Lang;
  const dict = getDictionary(lang);
  const services = await getServices();

  return (
    <div className="container-x py-8 md:py-14">
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold text-white md:text-4xl">{dict.booking.title}</h1>
          <p className="mt-2 text-lg text-ink-400">{dict.booking.subtitle}</p>
          <div className="mt-8">
            <Suspense fallback={<div className="skeleton h-96" aria-busy="true" />}>
              <BookingWizard
                lang={lang}
                services={services}
                b={dict.booking}
                common={dict.common}
                phone={{ display: siteConfig.contact.phone, href: `tel:${siteConfig.contact.phoneHref}` }}
                privacyHref={`/${lang}/privacy`}
              />
            </Suspense>
          </div>
        </div>
        <aside className="hidden lg:block">
          <div className="card sticky top-24 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-400">{dict.common.openingHours}</h2>
            <OpeningHours dict={dict} className="mt-2" />
            <a href={`tel:${siteConfig.contact.phoneHref}`} className="btn btn-secondary mt-5 w-full">
              <Phone size={18} aria-hidden="true" /> {siteConfig.contact.phone}
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
