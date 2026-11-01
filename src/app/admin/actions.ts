"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { datesForWeekdays, generateSlots } from "@/lib/slots";
import { addDays, todayInTz } from "@/lib/time";
import { dbErrorCode } from "@/lib/request";
import { carSchema, slotChoiceSchema } from "@/lib/validation";
import { notifyCustomerDecision, queue, retryNotification as retry, sendTestEmail as sendTest } from "@/lib/notify";

export type ActionResult = { ok: boolean; message?: string; count?: number; skipped?: number; number?: number };

const db = () => supabaseAdmin();
const time = z.string().regex(/^\d{2}:\d{2}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function refreshSlots() {
  revalidatePath("/admin", "layout");
}

// ------------------------------------------------------------------ session

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function setAdminLang(lang: string) {
  if (!["et", "ru", "en"].includes(lang)) return;
  (await cookies()).set("admin_lang", lang, { path: "/admin", maxAge: 31536000, sameSite: "lax", httpOnly: true });
  revalidatePath("/admin", "layout");
}

// ------------------------------------------------------------------ slots

const addSchema = z.object({
  mode: z.enum(["days", "bulk"]),
  dates: z.array(date).max(400).default([]),
  weekdays: z.array(z.number().int().min(1).max(7)).default([]),
  weeks: z.number().int().min(1).max(26).default(4),
  from: date.optional(),
  start: time,
  end: time,
  length: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  parallel: z.number().int().min(1).max(10),
  lunchStart: time.optional().or(z.literal("")),
  lunchEnd: time.optional().or(z.literal("")),
});

export async function addSlots(input: z.input<typeof addSchema>): Promise<ActionResult> {
  await requireAdmin();
  const p = addSchema.safeParse(input);
  if (!p.success) return { ok: false, message: "invalid" };
  const o = p.data;
  const today = todayInTz(siteConfig.booking.timezone);
  const dates = (o.mode === "bulk" ? datesForWeekdays(o.from && o.from > today ? o.from : today, o.weeks, o.weekdays) : o.dates).filter((d) => d >= today);
  const slots = generateSlots({ dates, start: o.start, end: o.end, length: o.length, parallel: o.parallel, lunchStart: o.lunchStart || undefined, lunchEnd: o.lunchEnd || undefined });
  if (!slots.length) return { ok: true, count: 0, skipped: 0 };
  let created = 0;
  for (let i = 0; i < slots.length; i += 500) {
    const { data, error } = await db().rpc("admin_add_slots", { p_slots: slots.slice(i, i + 500) });
    if (error) return { ok: false, message: error.message };
    created += Number(data ?? 0);
  }
  refreshSlots();
  return { ok: true, count: created, skipped: slots.length - created };
}

export async function updateSlots(ids: string[], action: "block" | "unblock" | "delete"): Promise<ActionResult> {
  await requireAdmin();
  const list = z.array(z.uuid()).max(1000).parse(ids);
  if (!list.length) return { ok: true, count: 0 };
  // Booked slots are never touched here: they belong to a booking.
  const q =
    action === "delete"
      ? db().from("slots").delete({ count: "exact" }).in("id", list).neq("status", "booked")
      : db().from("slots").update({ status: action === "block" ? "blocked" : "free" }, { count: "exact" }).in("id", list).eq("status", action === "block" ? "free" : "blocked");
  const { error, count } = await q;
  if (error) return { ok: false, message: error.message };
  refreshSlots();
  return { ok: true, count: count ?? 0 };
}

export async function setDayClosed(day: string, closed: boolean): Promise<ActionResult> {
  await requireAdmin();
  date.parse(day);
  const { error, count } = await db()
    .from("slots")
    .update({ status: closed ? "blocked" : "free" }, { count: "exact" })
    .eq("date", day)
    .eq("status", closed ? "free" : "blocked");
  if (error) return { ok: false, message: error.message };
  refreshSlots();
  return { ok: true, count: count ?? 0 };
}

/** Copy the slot layout (times + bays) of one day to other dates. Copies are free slots. */
export async function copyDay(source: string, targets: string[]): Promise<ActionResult> {
  await requireAdmin();
  date.parse(source);
  const list = z.array(date).min(1).max(120).parse(targets);
  const { data, error } = await db().from("slots").select("start_time, end_time, bay").eq("date", source);
  if (error) return { ok: false, message: error.message };
  const today = todayInTz(siteConfig.booking.timezone);
  const slots = list.filter((d) => d >= today && d !== source).flatMap((d) => (data ?? []).map((s) => ({ date: d, start_time: s.start_time, end_time: s.end_time, bay: s.bay })));
  if (!slots.length) return { ok: true, count: 0 };
  const res = await db().rpc("admin_add_slots", { p_slots: slots });
  if (res.error) return { ok: false, message: res.error.message };
  refreshSlots();
  return { ok: true, count: Number(res.data ?? 0), skipped: slots.length - Number(res.data ?? 0) };
}

export async function copyWeek(weekStart: string, weeksAhead: number): Promise<ActionResult> {
  await requireAdmin();
  date.parse(weekStart);
  const n = z.number().int().min(1).max(12).parse(weeksAhead);
  const { data, error } = await db().from("slots").select("date, start_time, end_time, bay").gte("date", weekStart).lte("date", addDays(weekStart, 6));
  if (error) return { ok: false, message: error.message };
  const today = todayInTz(siteConfig.booking.timezone);
  const slots = [];
  for (let w = 1; w <= n; w++) {
    for (const s of data ?? []) {
      const d = addDays(s.date, 7 * w);
      if (d >= today) slots.push({ date: d, start_time: s.start_time, end_time: s.end_time, bay: s.bay });
    }
  }
  if (!slots.length) return { ok: true, count: 0 };
  const res = await db().rpc("admin_add_slots", { p_slots: slots });
  if (res.error) return { ok: false, message: res.error.message };
  refreshSlots();
  return { ok: true, count: Number(res.data ?? 0), skipped: slots.length - Number(res.data ?? 0) };
}

// ------------------------------------------------------------------ bookings

const statusSchema = z.enum(["confirmed", "done", "no_show", "cancelled", "declined"]);

export async function setBookingStatus(id: string, next: z.infer<typeof statusSchema>): Promise<ActionResult> {
  await requireAdmin();
  z.uuid().parse(id);
  const status = statusSchema.parse(next);
  const { data: b } = await db().from("bookings").select("status").eq("id", id).single();
  if (!b) return { ok: false, message: "not_found" };
  if (b.status === "cancelled") return { ok: false, message: "cancelled" };

  if (status === "cancelled" || status === "declined") {
    const { error } = await db().rpc("admin_cancel_booking", { p_booking_id: id });
    if (error) return { ok: false, message: error.message };
    queue(() => notifyCustomerDecision(id, status === "declined" ? "declined" : "cancelled"));
  } else {
    const { error } = await db().from("bookings").update({ status, seen_by_admin: true, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return { ok: false, message: error.message };
    if (status === "confirmed" && b.status === "new") queue(() => notifyCustomerDecision(id, "confirmed"));
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function saveBookingNotes(id: string, notes: string): Promise<ActionResult> {
  await requireAdmin();
  z.uuid().parse(id);
  const { error } = await db().from("bookings").update({ admin_notes: z.string().max(4000).parse(notes) || null }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/admin/bookings/${id}`);
  return { ok: true };
}

const manualSchema = slotChoiceSchema.extend(carSchema.shape).extend({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(5).max(30),
  email: z.union([z.literal(""), z.email()]).optional().transform((v) => v || ""),
  lang: z.enum(["et", "ru", "en"]),
});

export async function createManualBooking(input: z.input<typeof manualSchema>): Promise<ActionResult> {
  await requireAdmin();
  const p = manualSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join(", ") };
  const v = p.data;
  const { data, error } = await db().rpc("create_booking", {
    p_date: v.date,
    p_start: v.time,
    p_service_ids: v.services,
    p_customer: { name: v.name, phone: v.phone, email: v.email, car_make: v.car_make, car_model: v.car_model, car_year: v.car_year == null ? "" : String(v.car_year), plate: v.plate, comment: v.comment },
    p_lang: v.lang,
    p_source: "phone",
    p_tz: siteConfig.booking.timezone,
  });
  if (error) return { ok: false, message: dbErrorCode(error) ?? error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (v.email) queue(() => notifyCustomerDecision(row.id, "confirmed"));
  revalidatePath("/admin", "layout");
  return { ok: true, number: row.number, message: row.id };
}

// ------------------------------------------------------------------ services

const serviceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,40}$/),
  name: z.object({ et: z.string().trim().min(1).max(80), ru: z.string().trim().max(80), en: z.string().trim().max(80) }),
  description: z.object({ et: z.string().trim().max(500), ru: z.string().trim().max(500), en: z.string().trim().max(500) }),
  duration_min: z.coerce.number().int().min(15).max(600),
  price_from: z.union([z.literal(""), z.coerce.number().min(0).max(100000)]).transform((v) => (v === "" ? null : v)),
  sort: z.coerce.number().int().min(0).max(10000),
  active: z.boolean(),
});

export async function saveService(input: z.input<typeof serviceSchema>): Promise<ActionResult> {
  await requireAdmin();
  const p = serviceSchema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues.map((i) => i.path.join(".")).join(", ") };
  const { error } = await db().from("services").upsert({ ...p.data, updated_at: new Date().toISOString() });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ------------------------------------------------------------------ callbacks

export async function setCallbackDone(id: string, done: boolean): Promise<ActionResult> {
  await requireAdmin();
  z.uuid().parse(id);
  const { error } = await db().from("callback_requests").update({ status: done ? "done" : "new", seen_by_admin: true }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// ------------------------------------------------------------------ settings & notifications

export async function saveSettings(input: { emails: string; lang: string }): Promise<ActionResult> {
  await requireAdmin();
  const emails = input.emails
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  const bad = emails.filter((e) => !z.email().safeParse(e).success);
  if (bad.length) return { ok: false, message: bad.join(", ") };
  const lang = z.enum(["et", "ru", "en"]).parse(input.lang);
  const now = new Date().toISOString();
  const { error } = await db().from("settings").upsert([
    { key: "notify_emails", value: emails, updated_at: now },
    { key: "notify_lang", value: lang, updated_at: now },
  ]);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function sendTestEmail(): Promise<ActionResult> {
  await requireAdmin();
  const result = await sendTest();
  revalidatePath("/admin", "layout");
  if (result === "sent") return { ok: true };
  const { data } = await db().from("notification_log").select("error").eq("event", "test").order("created_at", { ascending: false }).limit(1).single();
  return { ok: false, message: data?.error ?? "failed" };
}

export async function retryNotification(id: string): Promise<ActionResult> {
  await requireAdmin();
  z.uuid().parse(id);
  const r = await retry(id);
  revalidatePath("/admin", "layout");
  return { ok: r === "sent" || r === "done" };
}

export async function dismissNotification(id: string): Promise<ActionResult> {
  await requireAdmin();
  z.uuid().parse(id);
  await db().from("notification_log").update({ dismissed: true }).eq("id", id);
  revalidatePath("/admin", "layout");
  return { ok: true };
}
