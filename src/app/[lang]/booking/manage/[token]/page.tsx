import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Car, Clock, MessageSquare, Phone, Wrench } from "lucide-react";
import { siteConfig, type Lang } from "@/config/site";
import { getDictionary } from "@/i18n";
import { t } from "@/i18n/config";
import { getBookingByToken } from "@/lib/bookings";
import { formatDateLong, formatDuration } from "@/lib/format";
import { getServices } from "@/lib/services";
import { pageMetadata } from "@/lib/seo";
import { hhmm, shopNow, toMinutes, diffDays } from "@/lib/time";
import { CancelBooking } from "@/components/booking/CancelBooking";

export async function generateMetadata({ params }: PageProps<"/[lang]/booking/manage/[token]">): Promise<Metadata> {
  return pageMetadata((await params).lang as Lang, "manage", { noindex: true });
}

export default async function ManagePage({ params }: PageProps<"/[lang]/booking/manage/[token]">) {
  return (
    <div className="container-x max-w-2xl py-10 md:py-16">
      <Suspense fallback={<div className="skeleton h-96" aria-busy="true" />}>
        <ManageBooking params={params} />
      </Suspense>
    </div>
  );
}

const statusColors = {
  new: "bg-accent-500/15 text-accent-300 border-accent-500/40",
  confirmed: "bg-ok-500/15 text-ok-400 border-ok-500/40",
  done: "bg-info-500/15 text-info-400 border-info-500/40",
  cancelled: "bg-ink-700 text-ink-300 border-ink-600",
  no_show: "bg-bad-500/15 text-bad-400 border-bad-500/40",
} as const;

async function ManageBooking({ params }: Pick<PageProps<"/[lang]/booking/manage/[token]">, "params">) {
  const { lang: rawLang, token } = await params;
  const lang = rawLang as Lang;
  const dict = getDictionary(lang);
  const m = dict.manage;
  await connection();
  const booking = await getBookingByToken(token).catch(() => null);

  if (!booking) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-2xl font-extrabold text-white">{m.notFoundTitle}</h1>
        <p className="mt-2 text-ink-400">{m.notFoundText}</p>
        <a href={`tel:${siteConfig.contact.phoneHref}`} className="btn btn-secondary mt-6">
          <Phone size={18} aria-hidden="true" /> {siteConfig.contact.phone}
        </a>
      </div>
    );
  }

  const services = await getServices();
  const names = booking.service_ids.map((id) => services.find((s) => s.id === id)?.name[lang] ?? id).join(", ");
  const now = shopNow();
  const minutesUntil = diffDays(now.date, booking.date) * 1440 + toMinutes(booking.start_time) - now.minutes;
  const cancellable = ["new", "confirmed"].includes(booking.status);
  const tooLate = cancellable && minutesUntil < siteConfig.booking.cancelHoursBefore * 60;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-ink-800 p-6">
        <span className={`chip border ${statusColors[booking.status]}`}>{m.status[booking.status]}</span>
        <h1 className="mt-3 text-3xl font-extrabold text-white">{t(m.title, { number: booking.number })}</h1>
        <p className="mt-2 text-ink-300">{m.statusText[booking.status]}</p>
      </div>
      <dl className="flex flex-col gap-4 p-6">
        <div className="flex gap-3">
          <Clock size={20} className="mt-0.5 shrink-0 text-accent-400" aria-hidden="true" />
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">{m.when}</dt>
            <dd className="text-lg font-bold text-white">
              {formatDateLong(booking.date, lang)}, {hhmm(booking.start_time)}
            </dd>
          </div>
        </div>
        <div className="flex gap-3">
          <Wrench size={20} className="mt-0.5 shrink-0 text-accent-400" aria-hidden="true" />
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">{m.services}</dt>
            <dd className="font-semibold text-ink-100">
              {names} · ~{formatDuration(booking.duration_min, lang)}
            </dd>
          </div>
        </div>
        <div className="flex gap-3">
          <Car size={20} className="mt-0.5 shrink-0 text-accent-400" aria-hidden="true" />
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">{m.car}</dt>
            <dd className="font-semibold text-ink-100">
              {[booking.car_make, booking.car_model, booking.car_year].filter(Boolean).join(" ")}
              {booking.plate && ` · ${booking.plate}`}
            </dd>
          </div>
        </div>
        {booking.comment && (
          <div className="flex gap-3">
            <MessageSquare size={20} className="mt-0.5 shrink-0 text-accent-400" aria-hidden="true" />
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink-500">{m.message}</dt>
              <dd className="whitespace-pre-wrap text-ink-200">{booking.comment}</dd>
            </div>
          </div>
        )}
      </dl>
      <div className="flex flex-col gap-3 border-t border-ink-800 p-6">
        {cancellable && !tooLate && (
          <CancelBooking
            token={token}
            labels={{ cancel: m.cancel, confirm: m.cancelConfirm, yes: m.cancelYes, no: m.cancelNo, cancelling: m.cancelling, done: m.cancelledOk, tooLate: t(m.tooLate, { hours: siteConfig.booking.cancelHoursBefore }), error: dict.booking.errors.generic }}
          />
        )}
        {tooLate && <p className="rounded-xl border border-warn-400/40 bg-warn-400/10 p-4 font-semibold text-warn-400">{t(m.tooLate, { hours: siteConfig.booking.cancelHoursBefore })}</p>}
        {!cancellable && (
          <Link href={`/${lang}/booking`} className="btn btn-primary">
            {m.bookAgain}
          </Link>
        )}
        <a href={`tel:${siteConfig.contact.phoneHref}`} className="btn btn-secondary">
          <Phone size={18} aria-hidden="true" /> {m.callUs} · {siteConfig.contact.phone}
        </a>
      </div>
    </div>
  );
}
