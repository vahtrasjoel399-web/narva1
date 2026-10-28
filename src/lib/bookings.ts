import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { siteConfig } from "@/config/site";
import { computeStartTimes, type Availability, type FreeSlot } from "@/lib/availability";
import { randomToken } from "@/lib/notify";
import { getServices, totalDuration } from "@/lib/services";
import { createAnonClient, createServiceClient } from "@/lib/supabase/server";
import { addDays, shopNow, type ISODate } from "@/lib/time";
import type { BookingRow } from "@/lib/types";
import type { BookingData } from "@/lib/validation";

const PAGE = 1000;

/** Free slots in a date range (paginated past PostgREST's 1000-row cap). */
export async function getFreeSlots(from: ISODate, to: ISODate, client: SupabaseClient = createAnonClient()): Promise<FreeSlot[]> {
  const out: FreeSlot[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await client
      .from("slots")
      .select("date, start_time, end_time, bay")
      .eq("status", "free")
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("bay")
      .order("start_time")
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as FreeSlot[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export async function getAvailability(
  serviceIds: string[],
  opts: { includePast?: boolean; from?: ISODate; to?: ISODate; client?: SupabaseClient } = {},
): Promise<{ durationMin: number; days: Availability }> {
  const services = await getServices();
  const valid = serviceIds.filter((id) => services.some((s) => s.id === id));
  const durationMin = totalDuration(services, valid);
  if (durationMin <= 0) return { durationMin: 0, days: {} };

  const now = shopNow();
  const from = opts.from ?? now.date;
  const to = opts.to ?? addDays(now.date, siteConfig.booking.maxDaysAhead);
  const slots = await getFreeSlots(from, to, opts.client);
  const days = computeStartTimes(slots, durationMin, {
    today: opts.includePast ? "0000-00-00" : now.date,
    nowMinutes: now.minutes,
    minLeadMinutes: opts.includePast ? 0 : siteConfig.booking.minLeadMinutes,
  });
  return { durationMin, days };
}

export type CreateBookingResult =
  | { ok: true; booking: BookingRow }
  | { ok: false; error: "slot_taken" | "too_soon" | "invalid_service" | "server_error" };

export async function createBooking(data: BookingData, source: "web" | "admin" = "web"): Promise<CreateBookingResult> {
  const { data: result, error } = await createServiceClient().rpc("create_booking", {
    p: {
      date: data.date,
      start_time: data.time,
      service_ids: data.serviceIds,
      customer_name: data.name,
      phone: data.phone,
      email: data.email ?? null,
      car_make: data.carMake,
      car_model: data.carModel,
      car_year: data.carYear ?? null,
      plate: data.plate || null,
      comment: data.comment || null,
      lang: data.lang,
      manage_token: randomToken(),
      source,
      timezone: siteConfig.timezone,
      min_lead_minutes: source === "admin" ? 0 : siteConfig.booking.minLeadMinutes,
      allow_past: source === "admin",
    },
  });
  if (error) {
    console.error("[booking] create_booking failed", error);
    return { ok: false, error: "server_error" };
  }
  return result as CreateBookingResult;
}

export async function getBookingByToken(token: string): Promise<BookingRow | null> {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const { data, error } = await createServiceClient()
    .from("bookings")
    .select("*")
    .eq("manage_token", token)
    .maybeSingle();
  if (error) throw error;
  return (data as BookingRow | null) ?? null;
}

export type CancelResult =
  | { ok: true; booking: BookingRow }
  | { ok: false; error: "not_found" | "not_cancellable" | "too_late" | "server_error"; booking?: BookingRow };

export async function cancelBookingByToken(token: string): Promise<CancelResult> {
  const { data, error } = await createServiceClient().rpc("cancel_booking_by_token", {
    p_token: token,
    p_min_hours: siteConfig.booking.cancelHoursBefore,
    p_timezone: siteConfig.timezone,
  });
  if (error) {
    console.error("[booking] cancel failed", error);
    return { ok: false, error: "server_error" };
  }
  return data as CancelResult;
}
