import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getServices } from "@/lib/services";
import { computeStartTimes, type FreeSlot } from "@/lib/availability";
import { addDays, todayInTz } from "@/lib/time";

export const dynamic = "force-dynamic";

/** GET /api/availability?services=oil-change,brakes -> { minutes, starts: { "2026-10-30": ["09:00", ...] } } */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = (url.searchParams.get("services") ?? "").split(",").filter((s) => /^[a-z0-9-]{2,40}$/.test(s)).slice(0, 10);
  const all = await getServices();
  const chosen = all.filter((s) => ids.includes(s.id));
  // Without a service choice, show any start where a single slot is free.
  const minutes = chosen.length ? chosen.reduce((sum, s) => sum + s.duration_min, 0) : 1;

  const tz = siteConfig.booking.timezone;
  const from = todayInTz(tz);
  const to = addDays(from, siteConfig.booking.horizonDays);
  const { data, error } = await supabaseAdmin().rpc("get_free_slots", { p_from: from, p_to: to, p_tz: tz });
  if (error) {
    console.error("[availability]", error.message);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  const starts = computeStartTimes((data ?? []) as FreeSlot[], minutes);
  return NextResponse.json({ minutes, from, to, starts }, { headers: { "Cache-Control": "no-store" } });
}
