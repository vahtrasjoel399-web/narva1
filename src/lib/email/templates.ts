/**
 * Pure email builders (no I/O). Admin emails use the admin language,
 * client emails use the language the client booked in.
 */
import { siteConfig, type Lang } from "@/config/site";
import { getDictionary } from "@/i18n";
import { getAdminDictionary } from "@/i18n/admin";
import { t } from "@/i18n/config";
import { formatDateLong, formatDateShort, formatDuration, formatPhoneHref, fullAddress } from "@/lib/format";
import { hhmm } from "@/lib/time";
import type { BookingRow, CallbackRow } from "@/lib/types";
import type { EmailMessage } from "./send";
import { button, esc, escMultiline, layout, quote, rows } from "./layout";

export type ServiceNameLookup = (id: string, lang: Lang) => string;

export type AdminLinks = { confirm?: string; decline?: string; open: string };

function carLine(b: BookingRow): string {
  return [b.car_make, b.car_model, b.car_year].filter(Boolean).join(" ");
}

function telLink(phone: string): string {
  return `<a href="${esc(formatPhoneHref(phone))}" style="color:#111827;">${esc(phone)}</a>`;
}

function serviceList(b: BookingRow, lang: Lang, name: ServiceNameLookup): string {
  return b.service_ids.map((id) => name(id, lang)).join(", ");
}

// ─── Admin: new booking / cancelled by client ───────────────────────────────

export function adminBookingEmail(opts: {
  kind: "new" | "cancelled";
  booking: BookingRow;
  adminLang: Lang;
  serviceName: ServiceNameLookup;
  links: AdminLinks;
  to: string[];
  linkTtlHours: number;
}): EmailMessage {
  const { booking: b, adminLang: lang, links } = opts;
  const d = getAdminDictionary(lang);
  const e = d.emails;
  const dateShort = formatDateShort(b.date, lang);
  const time = hhmm(b.start_time);
  const vars = { number: b.number, date: dateShort, time, name: b.customer_name };
  const subject = t(opts.kind === "new" ? e.newBooking.subject : e.cancelled.subject, vars);
  const services = serviceList(b, lang, opts.serviceName);
  const when = `${formatDateLong(b.date, lang)}, ${time}–${hhmm(b.end_time)}`;

  const table = rows([
    [e.fields.number, `#${b.number}`],
    [e.fields.when, `<span style="font-size:17px;">${esc(when)}</span>`],
    [e.fields.name, esc(b.customer_name)],
    [e.fields.phone, telLink(b.phone)],
    [e.fields.email, b.email ? `<a href="mailto:${esc(b.email)}" style="color:#111827;">${esc(b.email)}</a>` : null],
    [e.fields.car, esc(carLine(b))],
    [e.fields.plate, b.plate ? esc(b.plate) : null],
    [e.fields.services, esc(services)],
    [e.fields.duration, esc(formatDuration(b.duration_min, lang))],
    [e.fields.lang, esc(e.langNames[b.lang])],
  ]);

  const comment = quote(e.clientWrote, b.comment ? escMultiline(b.comment) : esc(e.noComment));

  let actions = "";
  if (opts.kind === "new") {
    actions = `<div style="margin-top:24px;">${links.confirm ? button(links.confirm, e.buttons.confirm, "#16a34a") : ""}${
      links.decline ? button(links.decline, e.buttons.decline, "#dc2626") : ""
    }${button(links.open, e.buttons.open, "#e5e7eb", "#111827")}</div>
<p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">${esc(t(e.linksNote, { hours: opts.linkTtlHours }))}</p>`;
  } else {
    actions = `<p style="margin:20px 0 0;font-size:15px;color:#111827;font-weight:600;">${esc(
      t(e.cancelled.freed, { date: dateShort, from: time, to: hhmm(b.end_time) }),
    )}</p><div style="margin-top:16px;">${button(links.open, e.buttons.open, "#e5e7eb", "#111827")}</div>`;
  }

  const callBtn = `<div style="margin:0 0 16px;">${button(formatPhoneHref(b.phone), `${e.buttons.call} ${b.phone}`, "#16191f")}</div>`;

  const html = layout({
    lang,
    preheader: `${b.customer_name} · ${services} · ${dateShort} ${time}`,
    heading: `${opts.kind === "new" ? e.newBooking.heading : e.cancelled.heading} #${b.number}`,
    banner: opts.kind === "cancelled" ? { text: e.cancelled.heading, color: "#dc2626" } : undefined,
    body: callBtn + table + comment + actions,
  });

  const text = [
    `${opts.kind === "new" ? e.newBooking.heading : e.cancelled.heading} #${b.number}`,
    "",
    `${e.fields.when}: ${when}`,
    `${e.fields.name}: ${b.customer_name}`,
    `${e.fields.phone}: ${b.phone}`,
    b.email ? `${e.fields.email}: ${b.email}` : "",
    `${e.fields.car}: ${carLine(b)}${b.plate ? ` (${b.plate})` : ""}`,
    `${e.fields.services}: ${services} (~${formatDuration(b.duration_min, lang)})`,
    `${e.fields.lang}: ${e.langNames[b.lang]}`,
    "",
    `${e.clientWrote}:`,
    b.comment || e.noComment,
    "",
    opts.kind === "new" && links.confirm ? `${e.buttons.confirm}: ${links.confirm}` : "",
    opts.kind === "new" && links.decline ? `${e.buttons.decline}: ${links.decline}` : "",
    opts.kind === "cancelled" ? t(e.cancelled.freed, { date: dateShort, from: time, to: hhmm(b.end_time) }) : "",
    `${e.buttons.open}: ${links.open}`,
  ]
    .filter((l, i, arr) => l !== "" || arr[i - 1] !== "")
    .join("\n");

  return { to: opts.to, subject, html, text, replyTo: b.email ?? undefined };
}

// ─── Admin: callback request ────────────────────────────────────────────────

export function adminCallbackEmail(opts: { callback: CallbackRow; adminLang: Lang; to: string[]; openUrl: string }): EmailMessage {
  const { callback: c, adminLang: lang } = opts;
  const e = getAdminDictionary(lang).emails;
  const subject = t(e.callback.subject, { name: c.name, phone: c.phone });
  const body =
    `<div style="margin:0 0 16px;">${button(formatPhoneHref(c.phone), `${e.buttons.call} ${c.phone}`, "#16a34a")}</div>` +
    rows([
      [e.fields.name, esc(c.name)],
      [e.fields.phone, telLink(c.phone)],
      [e.fields.lang, esc(e.langNames[c.lang])],
    ]) +
    quote(e.fields.comment, c.comment ? escMultiline(c.comment) : esc(e.noComment)) +
    `<div style="margin-top:20px;">${button(opts.openUrl, e.buttons.open, "#e5e7eb", "#111827")}</div>`;
  const html = layout({ lang, preheader: `${c.name} · ${c.phone}`, heading: e.callback.heading, body });
  const text = [
    e.callback.heading,
    "",
    `${e.fields.name}: ${c.name}`,
    `${e.fields.phone}: ${c.phone}`,
    `${e.fields.lang}: ${e.langNames[c.lang]}`,
    `${e.fields.comment}: ${c.comment || e.noComment}`,
    "",
    `${e.buttons.open}: ${opts.openUrl}`,
  ].join("\n");
  return { to: opts.to, subject, html, text };
}

export function adminTestEmail(opts: { adminLang: Lang; to: string[] }): EmailMessage {
  const e = getAdminDictionary(opts.adminLang).emails;
  const subject = t(e.test.subject, { shop: siteConfig.name });
  const html = layout({
    lang: opts.adminLang,
    preheader: e.test.body,
    heading: subject,
    body: `<p style="font-size:16px;color:#111827;">${esc(e.test.body)}</p>`,
  });
  return { to: opts.to, subject, html, text: e.test.body };
}

// ─── Client emails ──────────────────────────────────────────────────────────

export type ClientEmailKind = "created" | "confirmed" | "declined" | "cancelled";

export function clientEmail(opts: {
  kind: ClientEmailKind;
  booking: BookingRow;
  serviceName: ServiceNameLookup;
  manageUrl: string;
  bookingUrl: string;
}): EmailMessage {
  const { booking: b, kind } = opts;
  const lang = b.lang;
  const e = getDictionary(lang).emails;
  const time = hhmm(b.start_time);
  const dateLong = formatDateLong(b.date, lang);
  const vars = { number: b.number, date: formatDateShort(b.date, lang), time };
  const section = e[kind];
  const subject = t(section.subject, vars);
  const services = serviceList(b, lang, opts.serviceName);

  const details = rows([
    [e.number, `#${b.number}`],
    [e.when, esc(`${dateLong}, ${time}`)],
    [e.services, esc(services)],
    [e.duration, esc(`~${formatDuration(b.duration_min, lang)}`)],
    [e.car, esc(`${carLine(b)}${b.plate ? ` · ${b.plate}` : ""}`)],
    [e.address, esc(fullAddress())],
  ]);

  let cta = "";
  if (kind === "created" || kind === "confirmed") {
    cta = `<div style="margin-top:22px;">${button(opts.manageUrl, e.manageButton)}</div>
<p style="font-size:13px;color:#6b7280;">${esc(t(e.cancelNote, { hours: siteConfig.booking.cancelHoursBefore }))}</p>`;
  } else if (kind === "declined" || kind === "cancelled") {
    const label = kind === "declined" ? e.declined.button : e.cancelled.button;
    cta = `<div style="margin-top:22px;">${button(opts.bookingUrl, label)}</div>`;
  }

  const signature = escMultiline(t(e.signature, { shop: siteConfig.name }));
  const body = `<p style="font-size:16px;color:#111827;margin:0 0 8px;">${esc(t(e.greeting, { name: b.customer_name }))}</p>
<p style="font-size:16px;line-height:1.5;color:#111827;margin:0 0 18px;">${esc(section.intro)}</p>
${details}${cta}
<p style="font-size:14px;color:#374151;margin-top:22px;">${esc(t(e.questions, { phone: siteConfig.contact.phone }))}</p>
<p style="font-size:14px;color:#374151;">${signature}</p>`;

  const html = layout({ lang, preheader: section.intro, heading: subject, body });
  const text = [
    t(e.greeting, { name: b.customer_name }),
    "",
    section.intro,
    "",
    `${e.number}: #${b.number}`,
    `${e.when}: ${dateLong}, ${time}`,
    `${e.services}: ${services}`,
    `${e.car}: ${carLine(b)}${b.plate ? ` · ${b.plate}` : ""}`,
    `${e.address}: ${fullAddress()}`,
    "",
    kind === "created" || kind === "confirmed" ? `${e.manageButton}: ${opts.manageUrl}` : `${opts.bookingUrl}`,
    "",
    t(e.questions, { phone: siteConfig.contact.phone }),
    t(e.signature, { shop: siteConfig.name }),
  ].join("\n");

  return { to: b.email ? [b.email] : [], subject, html, text, replyTo: siteConfig.contact.email };
}
