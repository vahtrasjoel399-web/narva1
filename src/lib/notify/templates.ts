import "server-only";
import { siteConfig, type Locale } from "@/config/site";
import { emailDictionaries } from "@/i18n/email";
import { fmt, getDictionary, localeTags } from "@/i18n";
import { formatDate, formatDuration, hhmm } from "@/lib/time";

export type BookingForEmail = {
  id: string;
  number: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_name: string;
  phone: string;
  email: string | null;
  car_make: string;
  car_model: string;
  car_year: number | null;
  plate: string | null;
  comment: string | null;
  lang: Locale;
  manage_token: string;
  serviceNames: Record<Locale, string[]>;
  durationMin: number;
};

export type CallbackForEmail = { id: string; name: string; phone: string; comment: string | null; lang: Locale; created_at: string };

export type RenderedEmail = { subject: string; html: string; text: string };

const C = {
  bg: "#f3f1ed",
  card: "#ffffff",
  ink: "#24211e",
  muted: "#6c665f",
  line: "#e3dfd8",
  dark: "#2a2724",
  accent: "#e8751a",
  danger: "#b3261e",
};
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export function whenLabel(date: string, start: string, end: string | null, lang: Locale): string {
  const d = formatDate(date, localeTags[lang], { weekday: "short", day: "numeric", month: "short" });
  return end ? `${d} ${hhmm(start)}–${hhmm(end)}` : `${d} ${hhmm(start)}`;
}

function carLine(b: BookingForEmail): string {
  return [b.car_make, b.car_model, b.car_year].filter(Boolean).join(" ");
}

function button(href: string, label: string, kind: "primary" | "danger" | "plain"): string {
  const styles = {
    primary: `background:${C.accent};color:#1b1916;border:1px solid ${C.accent};`,
    danger: `background:#ffffff;color:${C.danger};border:1px solid ${C.danger};`,
    plain: `background:#ffffff;color:${C.ink};border:1px solid ${C.line};`,
  }[kind];
  return `<a href="${esc(href)}" style="${styles}display:inline-block;padding:13px 20px;margin:0 8px 8px 0;border-radius:3px;font:600 15px/1 ${FONT};text-decoration:none;">${esc(label)}</a>`;
}

function rows(items: [string, string][]): string {
  return items
    .map(
      ([label, valueHtml]) => `<tr>
  <td style="padding:10px 12px 10px 0;border-top:1px solid ${C.line};color:${C.muted};font:14px/1.4 ${FONT};width:120px;vertical-align:top;">${esc(label)}</td>
  <td style="padding:10px 0;border-top:1px solid ${C.line};color:${C.ink};font:15px/1.45 ${FONT};vertical-align:top;">${valueHtml}</td>
</tr>`,
    )
    .join("");
}

function layout(opts: { lang: Locale; preheader: string; label: string; labelColor?: string; title: string; body: string; footer: string }): string {
  return `<!doctype html>
<html lang="${opts.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.card};border:1px solid ${C.line};border-radius:4px;">
<tr><td style="background:${C.dark};padding:14px 24px;border-radius:4px 4px 0 0;border-bottom:3px solid ${C.accent};font:600 14px/1.2 ${FONT};color:#f3f1ed;letter-spacing:.02em;">${esc(siteConfig.name)}</td></tr>
<tr><td style="padding:24px 24px 8px;">
<div style="font:700 12px/1.2 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${opts.labelColor ?? C.accent};">${esc(opts.label)}</div>
<div style="font:700 24px/1.25 ${FONT};color:${C.ink};margin-top:6px;">${esc(opts.title)}</div>
</td></tr>
<tr><td style="padding:8px 24px 24px;">${opts.body}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid ${C.line};font:13px/1.5 ${FONT};color:${C.muted};">${opts.footer}</td></tr>
</table></td></tr></table></body></html>`;
}

function quote(text: string | null, empty: string): string {
  if (!text) return `<div style="color:${C.muted};font:italic 15px/1.5 ${FONT};">${esc(empty)}</div>`;
  return `<div style="background:${C.bg};border-radius:3px;padding:12px 14px;color:${C.ink};font:15px/1.55 ${FONT};white-space:pre-wrap;">${esc(text)}</div>`;
}

// ---------------------------------------------------------------------------
// Admin emails
// ---------------------------------------------------------------------------

export function adminBookingEmail(
  b: BookingForEmail,
  lang: Locale,
  kind: "new" | "cancelled",
  links: { confirm?: string; decline?: string; admin: string; linkHours: number },
): RenderedEmail {
  const t = emailDictionaries[lang];
  const a = t.admin;
  const dict = getDictionary(lang);
  const when = whenLabel(b.date, b.start_time, b.end_time, lang);
  const whenShort = whenLabel(b.date, b.start_time, null, lang);
  const services = b.serviceNames[lang].join(", ");
  const duration = formatDuration(b.durationMin, dict.common);
  const subject = fmt(kind === "new" ? a.subjectNew : a.subjectCancelled, { n: b.number, when: whenShort, name: b.customer_name });

  const detailRows: [string, string][] = [
    [a.name, `<strong>${esc(b.customer_name)}</strong>`],
    [a.phone, `<a href="${esc(telHref(b.phone))}" style="color:${C.ink};font-weight:600;">${esc(b.phone)}</a>`],
  ];
  if (b.email) detailRows.push([a.email, `<a href="mailto:${esc(b.email)}" style="color:${C.ink};">${esc(b.email)}</a>`]);
  detailRows.push([a.car, esc(carLine(b))]);
  if (b.plate) detailRows.push([a.plate, `<span style="font-family:Menlo,Consolas,monospace;">${esc(b.plate)}</span>`]);
  detailRows.push([a.services, `${esc(services)}<br><span style="color:${C.muted};">${esc(a.duration)}: ${esc(duration)}</span>`]);
  detailRows.push([a.when, `<strong>${esc(when)}</strong>`]);
  detailRows.push([a.lang, esc(t.langNames[b.lang])]);

  const buttons =
    kind === "new"
      ? `${links.confirm ? button(links.confirm, a.confirm, "primary") : ""}${links.decline ? button(links.decline, a.decline, "danger") : ""}${button(links.admin, a.openAdmin, "plain")}`
      : button(links.admin, a.openAdmin, "plain");

  const body = `
${kind === "cancelled" ? `<p style="margin:0 0 16px;padding:12px 14px;border:1px solid ${C.danger};border-radius:3px;color:${C.danger};font:600 15px/1.45 ${FONT};">${esc(fmt(a.cancelledNote, { when }))}</p>` : ""}
<p style="margin:0 0 16px;">${button(telHref(b.phone), fmt(a.call, { phone: b.phone }), kind === "new" ? "plain" : "primary")}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows(detailRows)}</table>
<div style="margin:20px 0 6px;font:700 12px/1.2 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${C.muted};">${esc(a.clientWrote)}</div>
${quote(b.comment, a.noComment)}
<div style="margin-top:24px;">${buttons}</div>`;

  const footer = kind === "new" ? esc(fmt(a.linkNote, { h: links.linkHours })) : esc(`#${b.number}`);

  const html = layout({
    lang,
    preheader: `${b.customer_name}, ${b.phone}, ${services}`,
    label: `${kind === "new" ? a.headingNew : a.headingCancelled} · #${b.number}`,
    labelColor: kind === "new" ? C.accent : C.danger,
    title: when,
    body,
    footer,
  });

  const text = [
    `${kind === "new" ? a.headingNew : a.headingCancelled} #${b.number}`,
    when,
    kind === "cancelled" ? fmt(a.cancelledNote, { when }) : "",
    "",
    `${a.name}: ${b.customer_name}`,
    `${a.phone}: ${b.phone}`,
    b.email ? `${a.email}: ${b.email}` : "",
    `${a.car}: ${carLine(b)}${b.plate ? `, ${b.plate}` : ""}`,
    `${a.services}: ${services} (${duration})`,
    `${a.lang}: ${t.langNames[b.lang]}`,
    "",
    `${a.clientWrote}:`,
    b.comment || a.noComment,
    "",
    links.confirm ? `${a.confirm}: ${links.confirm}` : "",
    links.decline ? `${a.decline}: ${links.decline}` : "",
    `${a.openAdmin}: ${links.admin}`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return { subject, html, text };
}

export function adminCallbackEmail(c: CallbackForEmail, lang: Locale, adminUrl: string): RenderedEmail {
  const t = emailDictionaries[lang];
  const a = t.admin;
  const subject = fmt(a.subjectCallback, { name: c.name, phone: c.phone });
  const body = `
<p style="margin:0 0 16px;color:${C.ink};font:15px/1.5 ${FONT};">${esc(a.callbackNote)}</p>
<p style="margin:0 0 16px;">${button(telHref(c.phone), fmt(a.call, { phone: c.phone }), "primary")}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows([
    [a.name, `<strong>${esc(c.name)}</strong>`],
    [a.phone, `<a href="${esc(telHref(c.phone))}" style="color:${C.ink};font-weight:600;">${esc(c.phone)}</a>`],
    [a.lang, esc(t.langNames[c.lang])],
  ])}</table>
<div style="margin:20px 0 6px;font:700 12px/1.2 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${C.muted};">${esc(a.comment)}</div>
${quote(c.comment, a.noComment)}
<div style="margin-top:24px;">${button(adminUrl, a.openAdmin, "plain")}</div>`;
  const html = layout({ lang, preheader: `${c.name}, ${c.phone}`, label: a.headingCallback, title: c.name, body, footer: esc(siteConfig.name) });
  const text = [a.headingCallback, a.callbackNote, "", `${a.name}: ${c.name}`, `${a.phone}: ${c.phone}`, `${a.lang}: ${t.langNames[c.lang]}`, `${a.comment}: ${c.comment || a.noComment}`, "", `${a.openAdmin}: ${adminUrl}`].join("\n");
  return { subject, html, text };
}

export function adminTestEmail(lang: Locale): RenderedEmail {
  const a = emailDictionaries[lang].admin;
  const html = layout({ lang, preheader: a.testText, label: "Test", title: a.testSubject, body: `<p style="font:15px/1.5 ${FONT};color:${C.ink};">${esc(a.testText)}</p>`, footer: esc(siteConfig.name) });
  return { subject: a.testSubject, html, text: a.testText };
}

// ---------------------------------------------------------------------------
// Customer emails (in the language the customer booked in)
// ---------------------------------------------------------------------------

export type CustomerKind = "booked" | "confirmed" | "declined" | "cancelled";

export function customerEmail(b: BookingForEmail, kind: CustomerKind, urls: { manage: string; book: string }): RenderedEmail {
  const lang = b.lang;
  const t = emailDictionaries[lang].customer;
  const when = whenLabel(b.date, b.start_time, b.end_time, lang);
  const subjectKey = { booked: t.subjectBooked, confirmed: t.subjectConfirmed, declined: t.subjectDeclined, cancelled: t.subjectCancelled }[kind];
  const textKey = { booked: t.bookedText, confirmed: t.confirmedText, declined: t.declinedText, cancelled: t.cancelledText }[kind];
  const subject = fmt(subjectKey, { n: b.number, when: whenLabel(b.date, b.start_time, null, lang) });
  const address = `${siteConfig.address.street}, ${siteConfig.address.city}`;
  const active = kind === "booked" || kind === "confirmed";

  const body = `
<p style="margin:0 0 8px;color:${C.ink};font:15px/1.5 ${FONT};">${esc(fmt(t.hello, { name: b.customer_name }))}</p>
<p style="margin:0 0 16px;color:${C.ink};font:15px/1.5 ${FONT};">${esc(textKey)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows([
    [t.when, `<strong>${esc(when)}</strong>`],
    [t.services, esc(b.serviceNames[lang].join(", "))],
    [t.car, esc([b.car_make, b.car_model, b.car_year].filter(Boolean).join(" ") + (b.plate ? `, ${b.plate}` : ""))],
    [t.address, esc(address)],
  ])}</table>
<div style="margin-top:24px;">${active ? button(urls.manage, t.manage, "primary") : button(urls.book, t.bookAgain, "primary")}</div>
${active ? `<p style="margin:8px 0 0;color:${C.muted};font:13px/1.5 ${FONT};">${esc(fmt(t.cancelNote, { h: siteConfig.booking.cancelCutoffHours }))}</p>` : ""}`;

  const footer = `${esc(fmt(t.questions, { phone: siteConfig.phone.display }))}<br>${esc(siteConfig.legalName)} · ${esc(address)}<br>${esc(t.autoNote)}`;
  const html = layout({ lang, preheader: textKey, label: `#${b.number}`, title: when, body, footer });
  const text = [
    fmt(t.hello, { name: b.customer_name }),
    textKey,
    "",
    `${t.when}: ${when}`,
    `${t.services}: ${b.serviceNames[lang].join(", ")}`,
    `${t.address}: ${address}`,
    "",
    active ? `${t.manage}: ${urls.manage}` : `${t.bookAgain}: ${urls.book}`,
    "",
    fmt(t.questions, { phone: siteConfig.phone.display }),
  ].join("\n");
  return { subject, html, text };
}
