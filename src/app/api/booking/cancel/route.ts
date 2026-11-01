import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cancelSchema } from "@/lib/validation";
import { clientIpHash, dbErrorCode, rateLimit } from "@/lib/request";
import { notifyBookingCancelledByClient, queue } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = cancelSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!(await rateLimit(`cancel:${clientIpHash(req)}`, 20, 600))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { data, error } = await supabaseAdmin().rpc("cancel_booking_by_token", {
    p_token: parsed.data.token,
    p_min_hours: siteConfig.booking.cancelCutoffHours,
    p_tz: siteConfig.booking.timezone,
  });
  if (error) {
    const code = dbErrorCode(error);
    if (code === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (code === "too_late" || code === "not_cancellable") return NextResponse.json({ error: code }, { status: 409 });
    console.error("[cancel]", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  queue(() => notifyBookingCancelledByClient(data.id));
  return NextResponse.json({ ok: true });
}
