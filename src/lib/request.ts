import "server-only";
import { createHash } from "node:crypto";
import { envNumber } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** IPs are never stored in clear text. */
export function ipHash(req: Request): string {
  const salt = process.env.IP_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "salt";
  return createHash("sha256").update(`${salt}:${clientIp(req)}`).digest("hex").slice(0, 32);
}

/**
 * Database-backed rate limit (works across serverless instances).
 * Fails open: if the check itself errors we let the request through.
 */
export async function rateLimit(req: Request, bucket: "booking" | "callback" | "cancel"): Promise<boolean> {
  const limits = {
    booking: envNumber("RATE_LIMIT_BOOKINGS", 5),
    callback: envNumber("RATE_LIMIT_CALLBACKS", 3),
    cancel: envNumber("RATE_LIMIT_CANCELS", 10),
  };
  try {
    const { data, error } = await createServiceClient().rpc("hit_rate_limit", {
      p_key: `${bucket}:${ipHash(req)}`,
      p_limit: limits[bucket],
      p_window_seconds: envNumber("RATE_LIMIT_WINDOW_SECONDS", 600),
    });
    if (error) throw error;
    return data !== false;
  } catch (err) {
    console.error("[rate-limit] check failed, allowing request", err);
    return true;
  }
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
