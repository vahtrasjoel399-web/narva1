"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dbErrorCode } from "@/lib/request";
import { hashToken, notifyCustomerDecision, queue } from "@/lib/notify";

export type EmailActionState = { status: "idle" | "confirmed" | "declined" | "link_used" | "link_expired" | "invalid_link" | "booking_closed" | "error" };

/** The one-time token is the authorisation: no login needed. The DB function consumes it atomically. */
export async function runEmailAction(token: string): Promise<EmailActionState> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return { status: "invalid_link" };
  const { data, error } = await supabaseAdmin().rpc("use_email_action", { p_token_hash: hashToken(token) });
  if (error) {
    const code = dbErrorCode(error);
    if (code === "link_used" || code === "link_expired" || code === "invalid_link" || code === "booking_closed") return { status: code };
    console.error("[email-action]", error);
    return { status: "error" };
  }
  const row = Array.isArray(data) ? data[0] : data;
  queue(() => notifyCustomerDecision(row.booking_id, row.result === "confirmed" ? "confirmed" : "declined"));
  revalidatePath("/admin", "layout");
  return { status: row.result === "confirmed" ? "confirmed" : "declined" };
}
