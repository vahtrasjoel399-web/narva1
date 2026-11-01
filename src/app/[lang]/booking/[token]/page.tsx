import Link from "next/link";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { fmt, getDictionary, isLocale, localeTags } from "@/i18n";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getServices, serviceName } from "@/lib/services";
import { href, telHref } from "@/lib/site";
import { formatDate, hhmm } from "@/lib/time";
import { CancelBooking } from "@/components/booking/cancel-booking";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]/booking/[token]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  // Private page: keep it out of search engines.
  return { title: getDictionary(lang).meta.manageTitle, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function ManageBooking({ params }: PageProps<"/[lang]/booking/[token]">) {
  const { lang, token } = await params;
  if (!isLocale(lang)) return null;
  const dict = getDictionary(lang);
  const t = dict.manage;

  const { data: b } = /^[a-f0-9]{48}$/.test(token)
    ? await supabaseAdmin()
        .from("bookings")
        .select("number, date, start_time, end_time, status, service_ids, car_make, car_model, car_year, plate, comment, customer_name")
        .eq("manage_token", token)
        .maybeSingle()
    : { data: null };

  if (!b) {
    return (
      <div className="container-x py-20">
        <h1 className="text-3xl font-bold">{dict.meta.manageTitle}</h1>
        <p className="mt-4 text-muted">{t.notFound}</p>
        <Link href={href(lang, "/booking")} className="btn btn-primary mt-8">
          {t.bookAgain}
        </Link>
      </div>
    );
  }

  const services = await getServices({ includeInactive: true });
  const names = (b.service_ids as string[]).map((id) => serviceName(services.find((s) => s.id === id), lang) || id);
  const when = `${formatDate(b.date, localeTags[lang], { weekday: "long", day: "numeric", month: "long" })} · ${hhmm(b.start_time)}–${hhmm(b.end_time)}`;
  const active = b.status === "new" || b.status === "confirmed";
  const statusColor = { new: "text-info", confirmed: "text-ok", done: "text-muted", cancelled: "text-danger", no_show: "text-danger" }[b.status as string] ?? "text-muted";

  return (
    <div className="container-x py-10 md:py-16">
      <div className="max-w-2xl">
        <p className="eyebrow">{dict.meta.manageTitle}</p>
        <h1 className="mt-2 font-mono text-3xl md:text-4xl">{fmt(t.title, { n: b.number })}</h1>

        <dl className="mt-8 divide-y divide-line border-y border-line">
          <Row label={t.status}>
            <span className={`font-semibold ${statusColor}`}>{t.statuses[b.status as keyof typeof t.statuses]}</span>
          </Row>
          <Row label={t.when}>
            <span className="font-mono capitalize">{when}</span>
          </Row>
          <Row label={t.services}>{names.join(", ")}</Row>
          <Row label={t.car}>
            {[b.car_make, b.car_model, b.car_year].filter(Boolean).join(" ")}
            {b.plate && <span className="ml-2 font-mono text-muted">{b.plate}</span>}
          </Row>
          {b.comment && (
            <Row label={t.yourNote}>
              <span className="whitespace-pre-wrap text-muted">{b.comment}</span>
            </Row>
          )}
        </dl>

        <div className="mt-8">
          {active ? (
            <CancelBooking
              token={token}
              t={{ ...t, tooLate: fmt(t.tooLate, { h: siteConfig.booking.cancelCutoffHours, phone: siteConfig.phone.display }) }}
              bookHref={href(lang, "/booking")}
            />
          ) : (
            <Link href={href(lang, "/booking")} className="btn btn-primary">
              {t.bookAgain}
            </Link>
          )}
        </div>
        <p className="mt-8 text-sm text-muted">
          <a href={telHref()} className="link font-mono">
            {siteConfig.phone.display}
          </a>
        </p>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
      <dt className="text-sm text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
