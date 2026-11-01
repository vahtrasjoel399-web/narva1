import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { bookingSchema, fieldErrors } from "@/lib/validation";
import { clientIpHash, dbErrorCode, rateLimit } from "@/lib/request";
import { notifyBookingCreated, queue } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", fields: fieldErrors(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;

  // Honeypot: bots fill hidden fields. Pretend success, store nothing.
  if (input.website) {
    return NextResponse.json({ ok: true, number: 0, token: "" });
  }

  if (!(await rateLimit(`booking:${clientIpHash(req)}`, 6, 600))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { data, error } = await supabaseAdmin().rpc("create_booking", {
    p_date: input.date,
    p_start: input.time,
    p_service_ids: input.services,
    p_customer: {
      name: input.name,
      phone: input.phone,
      email: input.email,
      car_make: input.car_make,
      car_model: input.car_model,
      car_year: input.car_year == null ? "" : String(input.car_year),
      plate: input.plate,
      comment: input.comment,
    },
    p_lang: input.lang,
    p_source: "web",
    p_tz: siteConfig.booking.timezone,
  });

  if (error) {
    const code = dbErrorCode(error);
    if (code === "slot_taken" || code === "slot_past") return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    if (code === "unknown_service" || code === "no_services") return NextResponse.json({ error: "validation", fields: { services: "services" } }, { status: 400 });
    console.error("[booking] create failed", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  // Emails go out after the response; a failure is logged, never shown to the customer.
  queue(() => notifyBookingCreated(row.id));

  return NextResponse.json({ ok: true, number: row.number, token: row.manage_token, date: input.date, time: input.time, end: String(row.end_time).slice(0, 5) });
}
