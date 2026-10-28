import { siteConfig } from "@/config/site";
import { fullAddress } from "@/lib/format";

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Multi-line user text → safe HTML with <br>. */
export function escMultiline(value: string): string {
  return esc(value).replace(/\r?\n/g, "<br>");
}

const ACCENT = "#ff6a1a";

export function button(href: string, label: string, color: string = ACCENT, textColor = "#ffffff"): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:${color};color:${textColor};text-decoration:none;font-weight:700;font-size:15px;padding:13px 20px;border-radius:10px;margin:4px 8px 4px 0;">${esc(label)}</a>`;
}

export function rows(items: Array<[string, string | null | undefined]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:15px;">${items
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([label, value]) =>
        `<tr><td style="padding:9px 12px 9px 0;color:#6b7280;vertical-align:top;white-space:nowrap;border-bottom:1px solid #eef0f3;">${esc(label)}</td><td style="padding:9px 0;color:#111827;font-weight:600;border-bottom:1px solid #eef0f3;">${value}</td></tr>`,
    )
    .join("")}</table>`;
}

export function quote(label: string, text: string): string {
  return `<div style="margin:20px 0 4px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;font-weight:700;">${esc(label)}</div>
<div style="background:#fff7f2;border-left:4px solid ${ACCENT};padding:14px 16px;border-radius:6px;font-size:16px;line-height:1.5;color:#111827;">${text}</div>`;
}

export function layout(opts: {
  lang: string;
  preheader: string;
  heading: string;
  banner?: { text: string; color: string };
  body: string;
  footer?: string;
}): string {
  const banner = opts.banner
    ? `<div style="background:${opts.banner.color};color:#fff;font-weight:700;padding:10px 24px;font-size:14px;">${esc(opts.banner.text)}</div>`
    : "";
  return `<!doctype html>
<html lang="${esc(opts.lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:16px 8px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td style="background:#16191f;padding:18px 24px;color:#ffffff;font-weight:800;font-size:18px;letter-spacing:-.01em;"><span style="color:${ACCENT};">■</span> ${esc(siteConfig.name)}</td></tr>
<tr><td>${banner}</td></tr>
<tr><td style="padding:24px;">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">${esc(opts.heading)}</h1>
${opts.body}
</td></tr>
<tr><td style="padding:16px 24px 24px;color:#9ca3af;font-size:12px;line-height:1.5;border-top:1px solid #eef0f3;">${
    opts.footer ?? `${esc(siteConfig.name)} · ${esc(fullAddress())} · ${esc(siteConfig.contact.phone)}`
  }</td></tr>
</table></td></tr></table></body></html>`;
}
