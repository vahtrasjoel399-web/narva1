"use server";

import { after } from "next/server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { siteConfig, type Lang } from "@/config/site";
import { createBooking, getAvailability } from "@/lib/bookings";
import { envNotifyEmails } from "@/lib/env";
import { isEmailConfigured } from "@/lib/email/send";
import { manageUrl, sendClientEmail, sendTestNotification } from "@/lib/notify";
import { SERVICE_COLUMNS, SERVICES_TAG } from "@/lib/services";
import { copyDay, copyWeek, slotsForDates, type NewSlot } from "@/lib/slot-gen";
import { createServiceClient, createSessionClient } from "@/lib/supabase/server";
import { addDays, isValidISODate, shopNow, startOfWeek, type ISODate } from "@/lib/time";
import {
  bookingStatuses,
  serviceFromRow,
  type BookingRow,
  type BookingStatus,
  type CallbackRow,
  type NotificationRow,
  type Service,
  type ServiceRow,
  type SettingsRow,
  type SlotRow,
} from "@/lib/types";
import { langSchema, phoneSchema } from "@/lib/validation";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

class AuthError extends Error {}

async function requireAdmin(): Promise<{ email: string }> {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new AuthError("unauthorized");
  const { data } = await createServiceClient()
    .from("admins")
    .select("email")
    .ilike("email", user.email)
    .maybeSingle();
  if (!data) throw new AuthError("forbidden");
  return { email: user.email };
}

/** Wraps every action: auth check, uniform result, no stack traces to the browser. */
async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    await requireAdmin();
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    console.error("[admin action]", err);
    return { ok: false, error: err instanceof Error && err.message.startsWith("E_") ? err.message : "server_error" };
  }
}

const db = () => createServiceClient();
const isoDate = z.string().refine(isValidISODate);
const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

function check<T>(error: { message: string } | null, data: T): T {
  if (error) throw new Error(error.message);
  return data;
}

// ─── Session / badges ────────────────────────────────────────────────────────

export async function getAdminSession(): Promise<ActionResult<{ email: string }>> {
  try {
    return { ok: true, data: await requireAdmin() };
  } catch (err) {
    return { ok: false, error: err instanceof AuthError ? err.message : "server_error" };
  }
}

export type Badges = { unseen: number; latestNumber: number; failedNotifications: number; newCallbacks: number };

export async function getBadges(): Promise<ActionResult<Badges>> {
  return run(async () => {
    const c = db();
    const [unseen, latest, failed, callbacks] = await Promise.all([
      c.from("bookings").select("id", { count: "exact", head: true }).eq("seen_by_admin", false),
      c.from("bookings").select("number").order("number", { ascending: false }).limit(1).maybeSingle(),
      c.from("notification_log").select("id", { count: "exact", head: true }).eq("status", "failed").eq("acknowledged", false),
      c.from("callback_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    ]);
    return {
      unseen: unseen.count ?? 0,
      latestNumber: (latest.data as { number: number } | null)?.number ?? 0,
      failedNotifications: failed.count ?? 0,
      newCallbacks: callbacks.count ?? 0,
    };
  });
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export type Dashboard = {
  today: ISODate;
  todayBookings: BookingRow[];
  upcoming: BookingRow[];
  bookingsThisWeek: number;
  freeSlots7d: number;
  unseen: number;
  newCallbacks: number;
  popular: Array<{ id: string; count: number }>;
};

export async function getDashboard(): Promise<ActionResult<Dashboard>> {
  return run(async () => {
    const c = db();
    const today = shopNow().date;
    const weekStart = startOfWeek(today);
    const [upcoming, week, free, unseen, callbacks, recent] = await Promise.all([
      c.from("bookings").select("*").gte("date", today).lte("date", addDays(today, 7)).in("status", ["new", "confirmed"]).order("date").order("start_time").limit(50),
      c.from("bookings").select("id", { count: "exact", head: true }).gte("date", weekStart).lte("date", addDays(weekStart, 6)).neq("status", "cancelled"),
      c.from("slots").select("id", { count: "exact", head: true }).eq("status", "free").gte("date", today).lte("date", addDays(today, 6)),
      c.from("bookings").select("id", { count: "exact", head: true }).eq("seen_by_admin", false),
      c.from("callback_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
      c.from("bookings").select("service_ids").gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()).neq("status", "cancelled").limit(2000),
    ]);
    const rows = check(upcoming.error, upcoming.data ?? []) as BookingRow[];
    const counts = new Map<string, number>();
    for (const r of (recent.data ?? []) as Array<{ service_ids: string[] }>) {
      for (const id of r.service_ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return {
      today,
      todayBookings: rows.filter((b) => b.date === today),
      upcoming: rows.filter((b) => b.date !== today).slice(0, 15),
      bookingsThisWeek: week.count ?? 0,
      freeSlots7d: free.count ?? 0,
      unseen: unseen.count ?? 0,
      newCallbacks: callbacks.count ?? 0,
      popular: [...counts.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count).slice(0, 6),
    };
  });
}

// ─── Slots ───────────────────────────────────────────────────────────────────

export type AdminSlot = SlotRow & { booking?: { id: string; number: number; customer_name: string; status: BookingStatus } };

export async function listSlots(from: ISODate, to: ISODate): Promise<ActionResult<AdminSlot[]>> {
  return run(async () => {
    if (!isValidISODate(from) || !isValidISODate(to)) throw new Error("E_INVALID");
    const c = db();
    const all: SlotRow[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await c
        .from("slots")
        .select("id, date, start_time, end_time, bay, status, booking_id")
        .gte("date", from)
        .lte("date", to)
        .order("date")
        .order("start_time")
        .order("bay")
        .range(offset, offset + 999);
      check(error, null);
      all.push(...((data ?? []) as SlotRow[]));
      if (!data || data.length < 1000) break;
    }
    const ids = [...new Set(all.map((s) => s.booking_id).filter(Boolean))] as string[];
    const bookings = new Map<string, AdminSlot["booking"]>();
    if (ids.length) {
      const { data } = await c.from("bookings").select("id, number, customer_name, status").in("id", ids);
      for (const b of (data ?? []) as Array<NonNullable<AdminSlot["booking"]>>) bookings.set(b.id, b);
    }
    return all.map((s) => ({ ...s, booking: s.booking_id ? bookings.get(s.booking_id) : undefined }));
  });
}

const patternSchema = z.object({
  dates: z.array(isoDate).min(1).max(400),
  start: hhmmSchema,
  end: hhmmSchema,
  lengthMin: z.number().int().min(10).max(480),
  parallel: z.number().int().min(1).max(20),
  lunchFrom: hhmmSchema.optional(),
  lunchTo: hhmmSchema.optional(),
});

async function insertSlots(slots: NewSlot[]) {
  if (slots.length === 0) return { created: 0, skipped: 0 };
  if (slots.length > 5000) throw new Error("E_TOO_MANY");
  const { data, error } = await db().rpc("admin_create_slots", { p_slots: slots });
  return check(error, data) as { created: number; skipped: number };
}

export async function createSlots(input: z.input<typeof patternSchema>): Promise<ActionResult<{ created: number; skipped: number }>> {
  return run(async () => {
    const p = patternSchema.parse(input);
    return insertSlots(slotsForDates(p.dates, p));
  });
}

export async function copySlots(input: {
  mode: "day" | "week";
  source: ISODate;
  targets?: ISODate[];
  weeks?: number;
}): Promise<ActionResult<{ created: number; skipped: number }>> {
  return run(async () => {
    if (!isValidISODate(input.source)) throw new Error("E_INVALID");
    const from = input.mode === "week" ? startOfWeek(input.source) : input.source;
    const to = input.mode === "week" ? addDays(from, 6) : input.source;
    const { data, error } = await db()
      .from("slots")
      .select("date, start_time, end_time, bay")
      .gte("date", from)
      .lte("date", to)
      .limit(5000);
    const source = check(error, data ?? []) as Array<{ date: ISODate; start_time: string; end_time: string; bay: number }>;
    const slots =
      input.mode === "week"
        ? copyWeek(source, from, Math.min(12, Math.max(1, input.weeks ?? 1)))
        : copyDay(source, (input.targets ?? []).filter((d) => isValidISODate(d) && d !== input.source).slice(0, 120));
    return insertSlots(slots);
  });
}

const idList = z.array(z.uuid()).min(1).max(2000);

export async function updateSlots(ids: string[], op: "block" | "unblock" | "delete"): Promise<ActionResult<{ count: number }>> {
  return run(async () => {
    const list = idList.parse(ids);
    const c = db();
    if (op === "delete") {
      const { data, error } = await c.from("slots").delete().in("id", list).neq("status", "booked").select("id");
      return { count: check(error, data ?? []).length };
    }
    const { data, error } = await c
      .from("slots")
      .update({ status: op === "block" ? "blocked" : "free" })
      .in("id", list)
      .eq("status", op === "block" ? "free" : "blocked")
      .select("id");
    return { count: check(error, data ?? []).length };
  });
}

export async function updateDay(date: ISODate, op: "close" | "open" | "deleteFree"): Promise<ActionResult<{ count: number }>> {
  return run(async () => {
    if (!isValidISODate(date)) throw new Error("E_INVALID");
    const c = db();
    if (op === "deleteFree") {
      const { data, error } = await c.from("slots").delete().eq("date", date).in("status", ["free", "blocked"]).select("id");
      return { count: check(error, data ?? []).length };
    }
    const { data, error } = await c
      .from("slots")
      .update({ status: op === "close" ? "blocked" : "free" })
      .eq("date", date)
      .eq("status", op === "close" ? "free" : "blocked")
      .select("id");
    return { count: check(error, data ?? []).length };
  });
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export type BookingFilters = { status?: BookingStatus | "all"; from?: string; to?: string; q?: string; upcoming?: boolean };

export async function listBookings(f: BookingFilters): Promise<ActionResult<BookingRow[]>> {
  return run(async () => {
    let query = db().from("bookings").select("*");
    if (f.status && f.status !== "all" && bookingStatuses.includes(f.status)) query = query.eq("status", f.status);
    if (f.upcoming) query = query.gte("date", shopNow().date);
    if (f.from && isValidISODate(f.from)) query = query.gte("date", f.from);
    if (f.to && isValidISODate(f.to)) query = query.lte("date", f.to);
    const q = (f.q ?? "").trim().replace(/[^\p{L}\p{N}\s+@.-]/gu, "").slice(0, 60);
    if (q) {
      const like = `"*${q}*"`;
      const num = /^\d+$/.test(q.replace(/^#/, "")) ? `,number.eq.${q.replace(/^#/, "")}` : "";
      query = query.or(`customer_name.ilike.${like},phone.ilike.${like},plate.ilike.${like},email.ilike.${like}${num}`);
    }
    const asc = f.upcoming !== false;
    const { data, error } = await query
      .order("date", { ascending: asc })
      .order("start_time", { ascending: asc })
      .limit(300);
    return check(error, data ?? []) as BookingRow[];
  });
}

export async function getBooking(id: string): Promise<ActionResult<BookingRow>> {
  return run(async () => {
    const c = db();
    const { data, error } = await c.from("bookings").select("*").eq("id", z.uuid().parse(id)).single();
    const booking = check(error, data) as BookingRow;
    if (!booking.seen_by_admin) {
      await c.from("bookings").update({ seen_by_admin: true }).eq("id", booking.id);
      booking.seen_by_admin = true;
    }
    return booking;
  });
}

export async function markAllSeen(): Promise<ActionResult<null>> {
  return run(async () => {
    await db().from("bookings").update({ seen_by_admin: true }).eq("seen_by_admin", false);
    return null;
  });
}

export async function setBookingStatus(id: string, status: BookingStatus): Promise<ActionResult<{ booking: BookingRow; emailed: boolean }>> {
  return run(async () => {
    if (!bookingStatuses.includes(status)) throw new Error("E_INVALID");
    const { data, error } = await db().rpc("admin_set_booking_status", { p_id: z.uuid().parse(id), p_status: status });
    const result = check(error, data) as { ok: boolean; error?: string; booking: BookingRow; previous: BookingStatus };
    if (!result.ok) throw new Error(`E_${(result.error ?? "failed").toUpperCase()}`);
    const booking = result.booking;
    const changed = result.previous !== status;
    const emailKind = status === "confirmed" ? "confirmed" : status === "cancelled" ? "declined" : null;
    const emailed = Boolean(changed && emailKind && booking.email);
    if (emailed && emailKind) {
      after(async () => {
        await sendClientEmail(emailKind, booking).catch((e) => console.error("[admin] client email", e));
      });
    }
    return { booking, emailed };
  });
}

export async function saveNotes(id: string, notes: string): Promise<ActionResult<null>> {
  return run(async () => {
    const { error } = await db()
      .from("bookings")
      .update({ admin_notes: notes.slice(0, 4000) || null })
      .eq("id", z.uuid().parse(id));
    check(error, null);
    return null;
  });
}

export async function getManageLink(id: string): Promise<ActionResult<string>> {
  return run(async () => {
    const { data, error } = await db().from("bookings").select("lang, manage_token").eq("id", z.uuid().parse(id)).single();
    return manageUrl(check(error, data) as Pick<BookingRow, "lang" | "manage_token">);
  });
}

export async function getAdminAvailability(serviceIds: string[], date: ISODate): Promise<ActionResult<string[]>> {
  return run(async () => {
    if (!isValidISODate(date)) throw new Error("E_INVALID");
    const { days } = await getAvailability(serviceIds, { includePast: true, from: date, to: date, client: db() });
    return days[date] ?? [];
  });
}

const manualSchema = z.object({
  serviceIds: z.array(z.string()).min(1).max(10),
  date: isoDate,
  time: hhmmSchema,
  name: z.string().trim().min(1).max(120),
  phone: phoneSchema,
  email: z.union([z.literal(""), z.email().max(200)]).optional(),
  carMake: z.string().trim().max(60).optional(),
  carModel: z.string().trim().max(60).optional(),
  carYear: z.union([z.literal(""), z.coerce.number().int().min(1950).max(2100)]).optional(),
  plate: z.string().trim().max(20).optional(),
  comment: z.string().trim().max(2000).optional(),
  lang: langSchema,
  sendEmail: z.boolean().optional(),
});

export async function createManualBooking(input: z.input<typeof manualSchema>): Promise<ActionResult<BookingRow>> {
  return run(async () => {
    const d = manualSchema.parse(input);
    const result = await createBooking(
      {
        serviceIds: d.serviceIds,
        date: d.date,
        time: d.time,
        lang: d.lang,
        name: d.name,
        phone: d.phone,
        email: d.email || undefined,
        carMake: d.carMake ?? "",
        carModel: d.carModel ?? "",
        carYear: d.carYear === "" ? undefined : d.carYear,
        plate: d.plate,
        comment: d.comment,
        consent: true,
      },
      "admin",
    );
    if (!result.ok) throw new Error(`E_${result.error.toUpperCase()}`);
    const booking = result.booking;
    if (d.sendEmail && booking.email) {
      after(async () => {
        await sendClientEmail("created", booking).catch((e) => console.error("[admin] client email", e));
      });
    }
    return booking;
  });
}

// ─── Services ────────────────────────────────────────────────────────────────

export async function listAllServices(): Promise<ActionResult<Service[]>> {
  return run(async () => {
    const { data, error } = await db().from("services").select(SERVICE_COLUMNS).order("sort").order("id");
    return (check(error, data ?? []) as ServiceRow[]).map(serviceFromRow);
  });
}

const localized = z.object({ et: z.string().trim().max(300), ru: z.string().trim().max(300), en: z.string().trim().max(300) });
const serviceSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,40}$/),
  name: localized.refine((n) => n.et && n.ru && n.en),
  description: z.object({ et: z.string().max(1000), ru: z.string().max(1000), en: z.string().max(1000) }),
  icon: z.string().max(30),
  durationMin: z.number().int().min(5).max(1440),
  priceFrom: z.number().min(0).max(100000),
  sort: z.number().int().min(0).max(10000),
  active: z.boolean(),
});

export async function saveService(input: z.input<typeof serviceSchema>, isNew: boolean): Promise<ActionResult<null>> {
  return run(async () => {
    const s = serviceSchema.parse(input);
    const row = {
      id: s.id,
      name: s.name,
      description: s.description,
      icon: s.icon,
      duration_min: s.durationMin,
      price_from: s.priceFrom,
      sort: s.sort,
      active: s.active,
    };
    const c = db();
    if (isNew) {
      const { error } = await c.from("services").insert(row);
      if (error) throw new Error(error.code === "23505" ? "E_EXISTS" : error.message);
    } else {
      const { error } = await c.from("services").update(row).eq("id", s.id);
      check(error, null);
    }
    updateTag(SERVICES_TAG);
    return null;
  });
}

// ─── Callbacks ───────────────────────────────────────────────────────────────

export async function listCallbacks(): Promise<ActionResult<CallbackRow[]>> {
  return run(async () => {
    const c = db();
    const { data, error } = await c.from("callback_requests").select("*").order("created_at", { ascending: false }).limit(200);
    const rows = check(error, data ?? []) as CallbackRow[];
    await c.from("callback_requests").update({ seen_by_admin: true }).eq("seen_by_admin", false);
    return rows;
  });
}

export async function setCallbackStatus(id: string, status: "new" | "done"): Promise<ActionResult<null>> {
  return run(async () => {
    const { error } = await db().from("callback_requests").update({ status }).eq("id", z.uuid().parse(id));
    check(error, null);
    return null;
  });
}

// ─── Settings & notifications ────────────────────────────────────────────────

export type SettingsData = {
  notifyEmails: string[];
  notifyLang: Lang;
  envEmails: string[];
  emailConfigured: boolean;
  log: NotificationRow[];
};

export async function getSettings(): Promise<ActionResult<SettingsData>> {
  return run(async () => {
    const c = db();
    const [settings, log] = await Promise.all([
      c.from("settings").select("*").eq("id", 1).maybeSingle(),
      c.from("notification_log").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    const s = settings.data as SettingsRow | null;
    return {
      notifyEmails: s?.notify_emails ?? [],
      notifyLang: s?.notify_lang ?? siteConfig.adminLang,
      envEmails: envNotifyEmails(),
      emailConfigured: isEmailConfigured(),
      log: (log.data ?? []) as NotificationRow[],
    };
  });
}

export async function saveSettings(input: { notifyEmails: string[]; notifyLang: Lang }): Promise<ActionResult<null>> {
  return run(async () => {
    const emails = z.array(z.email()).max(20).parse(input.notifyEmails.map((e) => e.trim()).filter(Boolean));
    const lang = langSchema.parse(input.notifyLang);
    const { error } = await db()
      .from("settings")
      .upsert({ id: 1, notify_emails: emails, notify_lang: lang, updated_at: new Date().toISOString() });
    check(error, null);
    return null;
  });
}

export async function sendTestEmail(): Promise<ActionResult<{ status: string; error?: string }>> {
  return run(async () => {
    const r = await sendTestNotification();
    return { status: r.status, error: r.error };
  });
}

export async function acknowledgeNotifications(ids: number[] | "all"): Promise<ActionResult<null>> {
  return run(async () => {
    let q = db().from("notification_log").update({ acknowledged: true }).eq("acknowledged", false);
    if (ids !== "all") q = q.in("id", z.array(z.number().int()).max(500).parse(ids));
    const { error } = await q;
    check(error, null);
    return null;
  });
}
