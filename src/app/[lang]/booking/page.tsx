import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { getDictionary, isLocale, localeTags } from "@/i18n";
import { getServices } from "@/lib/services";
import { href, telHref } from "@/lib/site";
import { pageMeta } from "@/lib/seo";
import { BookingFlow } from "@/components/booking/booking-flow";

export async function generateMetadata({ params }: PageProps<"/[lang]/booking">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang);
  return pageMeta(lang, "/booking", d.meta.bookingTitle, d.meta.bookingDescription);
}

export default async function BookingPage({ params, searchParams }: PageProps<"/[lang]/booking">) {
  const { lang } = await params;
  if (!isLocale(lang)) return null;
  const sp = await searchParams;
  const dict = getDictionary(lang);
  const services = await getServices();
  const pre = typeof sp.service === "string" ? sp.service.split(",") : [];
  const preselected = services.filter((s) => pre.includes(s.id)).map((s) => s.id);

  return (
    <div className="container-x py-8 md:py-14">
      <h1 className="text-3xl font-bold md:text-4xl">{dict.booking.title}</h1>
      <BookingFlow
        lang={lang}
        localeTag={localeTags[lang]}
        services={services.map((s) => ({ id: s.id, name: s.name[lang], description: s.description[lang], duration: s.duration_min, price: s.price_from }))}
        preselected={preselected}
        t={dict.booking}
        common={dict.common}
        days={dict.days.short}
        v={dict.validation}
        phone={{ display: siteConfig.phone.display, href: telHref() }}
        cancelHours={siteConfig.booking.cancelCutoffHours}
        privacyHref={href(lang, "/privacy")}
      />
    </div>
  );
}
