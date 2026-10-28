import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { siteConfig, type Lang } from "@/config/site";
import { envNotifyEmails, siteUrl } from "@/lib/env";
import { deliver, type DeliveryResult } from "@/lib/email/send";
import {
  adminBookingEmail,
  adminCallbackEmail,
  adminTestEmail,
  clientEmail,
  type ClientEmailKind,
  type ServiceNameLookup,
} from "@/lib/email/templates";
import { fallbackServices, SERVICE_COLUMNS } from "@/lib/services";
import { createServiceClient } from "@/lib/supabase/server";
import { serviceFromRow, type BookingRow, type CallbackRow, type ServiceRow, type SettingsRow } from "@/lib/types";

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(24).toString("hex");

export async function getNotifySettings(): Promise<{ emails: string[]; lang: Lang }> {
  try {
    const { data } = await createServiceClient().from("settings").select("*").eq("id", 1).maybeSingle();
    const s = data as SettingsRow | null;
    const emails = s?.notify_emails?.length ? s.notify_emails : envNotifyEmails();
    return { emails, lang: s?.notify_lang ?? siteConfig.adminLang };
  } catch {
    return { emails: envNotifyEmails(), lang: siteConfig.adminLang };
  }
}

async function serviceNameLookup(): Promise<ServiceNameLookup> {
  let services = fallbackServices();
  try {
    const { data } = await createServiceClient().from("services").select(SERVICE_COLUMNS);
    if (data?.length) services = (data as ServiceRow[]).map(serviceFromRow);
  } catch {
    // keep config names
  }
  return (id, lang) => services.find((s) => s.id === id)?.name[lang] ?? id;
}

export const manageUrl = (b: Pick<BookingRow, "lang" | "manage_token">) =>
  `${siteUrl()}/${b.lang}/booking/manage/${b.manage_token}`;
const bookingUrl = (lang: Lang) => `${siteUrl()}/${lang}/booking`;
const adminBookingUrl = (id: string) => `${siteUrl()}/admin/bookings?id=${id}`;

async function createActionLinks(bookingId: string): Promise<{ confirm?: string; decline?: string }> {
  const confirm = randomToken();
  const decline = randomToken();
  const { error } = await createServiceClient().rpc("create_action_tokens", {
    p_booking_id: bookingId,
    p_confirm_hash: sha256(confirm),
    p_decline_hash: sha256(decline),
    p_ttl_hours: siteConfig.booking.actionLinkTtlHours,
  });
  if (error) {
    console.error("[notify] could not create action tokens", error);
    return {};
  }
  return { confirm: `${siteUrl()}/admin/a/${confirm}`, decline: `${siteUrl()}/admin/a/${decline}` };
}

export async function sendClientEmail(kind: ClientEmailKind, booking: BookingRow): Promise<DeliveryResult | null> {
  if (!booking.email) return null;
  const msg = clientEmail({
    kind,
    booking,
    serviceName: await serviceNameLookup(),
    manageUrl: manageUrl(booking),
    bookingUrl: bookingUrl(booking.lang),
  });
  return deliver(msg, { event: `client_${kind}`, bookingId: booking.id });
}

/** New booking: admin email (with one-time Confirm/Decline links) + client confirmation. */
export async function notifyBookingCreated(booking: BookingRow): Promise<void> {
  const [settings, names] = await Promise.all([getNotifySettings(), serviceNameLookup()]);
  const links = booking.source === "web" ? await createActionLinks(booking.id) : {};
  const adminMsg = adminBookingEmail({
    kind: "new",
    booking,
    adminLang: settings.lang,
    serviceName: names,
    links: { ...links, open: adminBookingUrl(booking.id) },
    to: settings.emails,
    linkTtlHours: siteConfig.booking.actionLinkTtlHours,
  });
  await Promise.all([
    booking.source === "web" ? deliver(adminMsg, { event: "booking_created", bookingId: booking.id }) : null,
    sendClientEmail("created", booking),
  ]);
}

/** Client cancelled through the manage link. */
export async function notifyBookingCancelledByClient(booking: BookingRow): Promise<void> {
  const [settings, names] = await Promise.all([getNotifySettings(), serviceNameLookup()]);
  const adminMsg = adminBookingEmail({
    kind: "cancelled",
    booking,
    adminLang: settings.lang,
    serviceName: names,
    links: { open: adminBookingUrl(booking.id) },
    to: settings.emails,
    linkTtlHours: siteConfig.booking.actionLinkTtlHours,
  });
  await Promise.all([
    deliver(adminMsg, { event: "booking_cancelled", bookingId: booking.id }),
    sendClientEmail("cancelled", booking),
  ]);
}

export async function notifyCallback(callback: CallbackRow): Promise<void> {
  const settings = await getNotifySettings();
  const msg = adminCallbackEmail({
    callback,
    adminLang: settings.lang,
    to: settings.emails,
    openUrl: `${siteUrl()}/admin/callbacks`,
  });
  await deliver(msg, { event: "callback_created", callbackId: callback.id });
}

export async function sendTestNotification(): Promise<DeliveryResult> {
  const settings = await getNotifySettings();
  return deliver(adminTestEmail({ adminLang: settings.lang, to: settings.emails }), { event: "test" });
}
