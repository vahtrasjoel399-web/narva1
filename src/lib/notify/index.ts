import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { after } from "next/server";
import { siteConfig, type Locale } from "@/config/site";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getServices, serviceName } from "@/lib/services";
import { isLocale } from "@/i18n";
import { deliver } from "./deliver";
import { getNotifySettings } from "./settings";
import { adminBookingEmail, adminCallbackEmail, adminTestEmail, customerEmail, type BookingForEmail, type CallbackForEmail, type CustomerKind } from "./templates";

export type NotifyEvent = "booking_created" | "booking_cancelled" | "callback_created" | "booking_confirmed" | "booking_declined" | "test";

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url).replace(/\/$/, "");

/** Run after the response is sent. Errors are logged, never thrown to the caller. */
export function queue(task: () => Promise<unknown>) {
  const run = async () => {
    try {
      await task();
    } catch (e) {
      console.error("[notify] background task failed", e);
    }
  };
  try {
    after(run);
  } catch {
    // Outside a request scope (scripts/tests): run detached.
    void run();
  }
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

async function loadBooking(id: string): Promise<BookingForEmail | null> {
  const { data: b } = await supabaseAdmin().from("bookings").select("*").eq("id", id).single();
  if (!b) return null;
  const services = await getServices({ includeInactive: true });
  const picked = (b.service_ids as string[]).map((sid) => services.find((s) => s.id === sid));
  const names = (lang: Locale) => picked.map((s, i) => serviceName(s, lang) || b.service_ids[i]);
  return {
    ...b,
    lang: isLocale(b.lang) ? b.lang : "et",
    serviceNames: { et: names("et"), ru: names("ru"), en: names("en") },
    durationMin: picked.reduce((sum, s) => sum + (s?.duration_min ?? 0), 0),
  } as BookingForEmail;
}

/** One-time Confirm / Decline links. Only the token hash is stored. */
async function createActionLinks(bookingId: string) {
  const hours = siteConfig.booking.emailActionLinkHours;
  const expires = new Date(Date.now() + hours * 3_600_000).toISOString();
  const confirm = randomBytes(32).toString("base64url");
  const decline = randomBytes(32).toString("base64url");
  await supabaseAdmin()
    .from("email_actions")
    .insert([
      { token_hash: hashToken(confirm), booking_id: bookingId, action: "confirm", expires_at: expires },
      { token_hash: hashToken(decline), booking_id: bookingId, action: "decline", expires_at: expires },
    ])
    .throwOnError();
  return { confirm: `${siteUrl()}/admin/action/${confirm}`, decline: `${siteUrl()}/admin/action/${decline}`, linkHours: hours };
}

const customerUrls = (b: BookingForEmail) => ({ manage: `${siteUrl()}/${b.lang}/booking/${b.manage_token}`, book: `${siteUrl()}/${b.lang}/booking` });

async function sendAdminBooking(b: BookingForEmail, kind: "new" | "cancelled", logId?: string) {
  const settings = await getNotifySettings();
  const adminUrl = `${siteUrl()}/admin/bookings/${b.id}`;
  let links: { confirm?: string; decline?: string; admin: string; linkHours: number } = { admin: adminUrl, linkHours: siteConfig.booking.emailActionLinkHours };
  if (kind === "new" && (b.status === "new" || b.status === "confirmed")) {
    try {
      links = { ...links, ...(await createActionLinks(b.id)) };
    } catch (e) {
      console.error("[notify] action links failed, sending without them", e);
    }
  }
  return deliver({
    event: kind === "new" ? "booking_created" : "booking_cancelled",
    audience: "admin",
    to: settings.emails,
    email: adminBookingEmail(b, settings.lang, kind, links),
    bookingId: b.id,
    logId,
  });
}

async function sendCustomer(b: BookingForEmail, kind: CustomerKind, event: NotifyEvent, logId?: string) {
  if (!b.email) return "skipped" as const;
  return deliver({ event, audience: "customer", to: [b.email], email: customerEmail(b, kind, customerUrls(b)), bookingId: b.id, logId });
}

export async function notifyBookingCreated(bookingId: string) {
  const b = await loadBooking(bookingId);
  if (!b) return;
  await Promise.all([sendAdminBooking(b, "new"), sendCustomer(b, "booked", "booking_created")]);
}

export async function notifyBookingCancelledByClient(bookingId: string) {
  const b = await loadBooking(bookingId);
  if (!b) return;
  await Promise.all([sendAdminBooking(b, "cancelled"), sendCustomer(b, "cancelled", "booking_cancelled")]);
}

/** Customer-only emails after an admin decision. */
export async function notifyCustomerDecision(bookingId: string, kind: "confirmed" | "declined" | "cancelled") {
  const b = await loadBooking(bookingId);
  if (!b) return;
  const event: NotifyEvent = kind === "confirmed" ? "booking_confirmed" : kind === "declined" ? "booking_declined" : "booking_cancelled";
  await sendCustomer(b, kind, event);
}

async function loadCallback(id: string): Promise<CallbackForEmail | null> {
  const { data } = await supabaseAdmin().from("callback_requests").select("*").eq("id", id).single();
  return data ? ({ ...data, lang: isLocale(data.lang) ? data.lang : "et" } as CallbackForEmail) : null;
}

export async function notifyCallback(callbackId: string, logId?: string) {
  const c = await loadCallback(callbackId);
  if (!c) return;
  const settings = await getNotifySettings();
  await deliver({ event: "callback_created", audience: "admin", to: settings.emails, email: adminCallbackEmail(c, settings.lang, `${siteUrl()}/admin/callbacks`), callbackId: c.id, logId });
}

export async function sendTestEmail() {
  const settings = await getNotifySettings();
  return deliver({ event: "test", audience: "admin", to: settings.emails, email: adminTestEmail(settings.lang) });
}

/** Re-send a failed notification from the admin panel. */
export async function retryNotification(logId: string) {
  const { data: log } = await supabaseAdmin().from("notification_log").select("*").eq("id", logId).single();
  if (!log) return "failed";
  if (log.event === "callback_created" && log.callback_id) {
    await notifyCallback(log.callback_id, log.id);
    return "done";
  }
  if (log.event === "test") {
    const settings = await getNotifySettings();
    return deliver({ event: "test", audience: "admin", to: settings.emails, email: adminTestEmail(settings.lang), logId: log.id });
  }
  if (!log.booking_id) return "failed";
  const b = await loadBooking(log.booking_id);
  if (!b) return "failed";
  if (log.audience === "admin") {
    return sendAdminBooking(b, log.event === "booking_cancelled" ? "cancelled" : "new", log.id);
  }
  const kind: CustomerKind =
    log.event === "booking_confirmed" ? "confirmed" : log.event === "booking_declined" ? "declined" : log.event === "booking_cancelled" ? "cancelled" : "booked";
  return sendCustomer(b, kind, log.event as NotifyEvent, log.id);
}
