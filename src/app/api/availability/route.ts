import type { NextRequest } from "next/server";
import { getAvailability } from "@/lib/bookings";
import { isSupabaseConfigured } from "@/lib/env";
import { json } from "@/lib/request";

/** GET /api/availability?services=oil-change,brakes → free start times per day. */
export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("services") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]+$/.test(s))
    .slice(0, 10);

  if (ids.length === 0) return json({ error: "services_required" }, 400);
  if (!isSupabaseConfigured()) return json({ durationMin: 0, days: {}, error: "not_configured" }, 503);

  try {
    return json(await getAvailability(ids));
  } catch (err) {
    console.error("[api/availability]", err);
    return json({ error: "server_error" }, 500);
  }
}
