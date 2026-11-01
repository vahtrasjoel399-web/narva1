import "server-only";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export function clientIpHash(req: Request): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  // Store only a hash, never the raw IP.
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/** true = allowed. Fails open if the database call fails, so a DB hiccup never blocks a real customer. */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  if (process.env.RATE_LIMIT_DISABLED === "1") return true;
  const { data, error } = await supabaseAdmin().rpc("rate_limit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) {
    console.error("[rate-limit]", error.message);
    return true;
  }
  return data === true;
}

/** Postgres RAISE message from our functions, e.g. "slot_taken". */
export function dbErrorCode(error: { message?: string } | null): string | null {
  if (!error?.message) return null;
  const m = error.message.match(/^[a-z_]+$/);
  return m ? m[0] : null;
}
