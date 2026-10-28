import { after } from "next/server";
import { createBooking } from "@/lib/bookings";
import { notifyBookingCreated } from "@/lib/notify";
import { json, rateLimit } from "@/lib/request";
import { bookingSchema, fieldErrors } from "@/lib/validation";

/** POST /api/bookings — create a booking (atomic in the database). */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // Honeypot: real users never see or fill this field.
  if (body && typeof body === "object" && "website" in body && (body as { website?: unknown }).website) {
    return json({ error: "validation", fields: { _: "spam" } }, 400);
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) return json({ error: "validation", fields: fieldErrors(parsed.error) }, 422);

  if (!(await rateLimit(request, "booking"))) return json({ error: "rate_limited" }, 429);

  const result = await createBooking(parsed.data, "web");
  if (!result.ok) {
    const status = result.error === "slot_taken" || result.error === "too_soon" ? 409 : result.error === "invalid_service" ? 422 : 500;
    return json({ error: result.error === "too_soon" ? "slot_taken" : result.error }, status);
  }

  const booking = result.booking;
  // Emails go out after the response — a slow or failing mail provider never blocks the booking.
  after(async () => {
    try {
      await notifyBookingCreated(booking);
    } catch (err) {
      console.error("[api/bookings] notify failed", err);
    }
  });

  return json(
    {
      number: booking.number,
      date: booking.date,
      time: booking.start_time.slice(0, 5),
      endTime: booking.end_time.slice(0, 5),
      durationMin: booking.duration_min,
      manageToken: booking.manage_token,
      email: booking.email,
    },
    201,
  );
}
