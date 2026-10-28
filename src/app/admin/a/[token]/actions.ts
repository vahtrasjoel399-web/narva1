"use server";

import { after } from "next/server";
import { sendClientEmail, sha256 } from "@/lib/notify";
import { createServiceClient } from "@/lib/supabase/server";
import type { BookingRow, BookingStatus } from "@/lib/types";

export type TokenActionResult =
  | { ok: true; action: "confirm" | "decline"; number: number }
  | { ok: false; error: "invalid" | "used" | "expired" | "not_applicable" | "server_error"; status?: BookingStatus };

/**
 * Executes a one-time Confirm / Decline link from the admin email.
 * The unguessable token is the credential; it is single-use and expires.
 */
export async function performTokenAction(token: string): Promise<TokenActionResult> {
  if (!/^[a-f0-9]{48}$/.test(token)) return { ok: false, error: "invalid" };
  const { data, error } = await createServiceClient().rpc("use_action_token", { p_token_hash: sha256(token) });
  if (error) {
    console.error("[admin action link]", error);
    return { ok: false, error: "server_error" };
  }
  type Failure = Extract<TokenActionResult, { ok: false }>["error"];
  const r = data as { ok: boolean; error?: Failure; action?: "confirm" | "decline"; booking?: BookingRow };
  if (!r.ok || !r.action || !r.booking) {
    return { ok: false, error: r.error ?? "server_error", status: r.booking?.status };
  }
  const booking = r.booking;
  const kind = r.action === "confirm" ? "confirmed" : "declined";
  after(async () => {
    await sendClientEmail(kind, booking).catch((e) => console.error("[admin action link] client email", e));
  });
  return { ok: true, action: r.action, number: booking.number };
}
