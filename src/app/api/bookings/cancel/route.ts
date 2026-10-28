import { after } from "next/server";
import { z } from "zod";
import { cancelBookingByToken } from "@/lib/bookings";
import { notifyBookingCancelledByClient } from "@/lib/notify";
import { json, rateLimit } from "@/lib/request";

const schema = z.object({ token: z.string().regex(/^[a-f0-9]{48}$/) });

/** POST /api/bookings/cancel { token } — customer cancels via the secure link. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "not_found" }, 404);
  if (!(await rateLimit(request, "cancel"))) return json({ error: "rate_limited" }, 429);

  const result = await cancelBookingByToken(parsed.data.token);
  if (!result.ok) {
    const status = { not_found: 404, not_cancellable: 409, too_late: 409, server_error: 500 }[result.error];
    return json({ error: result.error }, status);
  }

  const booking = result.booking;
  after(async () => {
    try {
      await notifyBookingCancelledByClient(booking);
    } catch (err) {
      console.error("[api/bookings/cancel] notify failed", err);
    }
  });
  return json({ ok: true, status: booking.status });
}
