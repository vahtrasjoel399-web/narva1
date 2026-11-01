import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type AdminCounts = { unreadBookings: number; unreadCallbacks: number; failed: number; latestBooking: number | null; latestCallback: string | null };

export async function getAdminCounts(): Promise<AdminCounts> {
  const db = supabaseAdmin();
  const [ub, uc, f, lb, lc] = await Promise.all([
    db.from("bookings").select("id", { count: "exact", head: true }).eq("seen_by_admin", false),
    db.from("callback_requests").select("id", { count: "exact", head: true }).eq("seen_by_admin", false),
    db.from("notification_log").select("id", { count: "exact", head: true }).eq("status", "failed").eq("dismissed", false),
    db.from("bookings").select("number").eq("source", "web").order("number", { ascending: false }).limit(1).maybeSingle(),
    db.from("callback_requests").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    unreadBookings: ub.count ?? 0,
    unreadCallbacks: uc.count ?? 0,
    failed: f.count ?? 0,
    latestBooking: lb.data?.number ?? null,
    latestCallback: lc.data?.id ?? null,
  };
}
