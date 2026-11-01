import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { RenderedEmail } from "./templates";

export type DeliverJob = {
  event: string;
  audience: "admin" | "customer";
  to: string[];
  email: RenderedEmail;
  bookingId?: string | null;
  callbackId?: string | null;
  logId?: string; // set when retrying an existing log row
};

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [0, 1500, 5000];

let resend: Resend | null = null;

async function sendOnce(job: DeliverJob, idempotencyKey: string): Promise<void> {
  if (serverEnv.emailOutbox) {
    // Dev mode: write the email to ./.outbox so it can be opened in a browser.
    const dir = path.join(process.cwd(), ".outbox");
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const base = `${stamp}_${job.event}_${job.audience}`;
    const meta = `<!-- to: ${job.to.join(", ")} | subject: ${job.email.subject} -->\n`;
    await writeFile(path.join(dir, `${base}.html`), meta + job.email.html, "utf8");
    await writeFile(path.join(dir, `${base}.json`), JSON.stringify({ to: job.to, subject: job.email.subject, text: job.email.text, event: job.event, audience: job.audience }, null, 2), "utf8");
    return;
  }
  if (!serverEnv.resendApiKey) throw new Error("RESEND_API_KEY is not set");
  resend ??= new Resend(serverEnv.resendApiKey);
  const { error } = await resend.emails.send(
    {
      from: serverEnv.emailFrom,
      to: job.to,
      subject: job.email.subject,
      html: job.email.html,
      text: job.email.text,
      ...(serverEnv.emailReplyTo ? { replyTo: serverEnv.emailReplyTo } : {}),
    },
    { idempotencyKey },
  );
  if (error) throw new Error(`${error.name}: ${error.message}`);
}

/**
 * Sends an email with retries and records the outcome in notification_log.
 * Never throws: a failed email must not break a booking.
 */
export async function deliver(job: DeliverJob): Promise<"sent" | "failed"> {
  const db = supabaseAdmin();
  let logId = job.logId;
  try {
    if (logId) {
      await db.from("notification_log").update({ status: "pending", error: null, recipient: job.to.join(", "), subject: job.email.subject, updated_at: new Date().toISOString() }).eq("id", logId);
    } else {
      const { data } = await db
        .from("notification_log")
        .insert({ event: job.event, audience: job.audience, recipient: job.to.join(", "), subject: job.email.subject, booking_id: job.bookingId ?? null, callback_id: job.callbackId ?? null })
        .select("id")
        .single();
      logId = data?.id;
    }
  } catch (e) {
    console.error("[notify] could not write log row", e);
  }

  if (!job.to.length) {
    await finish(logId, "failed", 0, "No recipients configured (NOTIFY_EMAILS or admin settings)");
    return "failed";
  }

  // Same key for every attempt of this run, so a send that succeeded but
  // looked like a failure (timeout) is not delivered twice.
  const idempotencyKey = `${logId ?? job.event}-${Date.now()}`;
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (BACKOFF_MS[attempt - 1]) await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
    try {
      await sendOnce(job, idempotencyKey);
      await finish(logId, "sent", attempt, null);
      return "sent";
    } catch (e) {
      lastError = (e as Error).message || String(e);
      console.error(`[notify] ${job.event}/${job.audience} attempt ${attempt} failed: ${lastError}`);
    }
  }
  await finish(logId, "failed", MAX_ATTEMPTS, lastError);
  return "failed";
}

async function finish(logId: string | undefined, status: "sent" | "failed", attempts: number, error: string | null) {
  if (!logId) return;
  try {
    const db = supabaseAdmin();
    const { data } = await db.from("notification_log").select("attempts").eq("id", logId).single();
    await db
      .from("notification_log")
      .update({ status, attempts: (data?.attempts ?? 0) + attempts, error, dismissed: status === "sent", updated_at: new Date().toISOString() })
      .eq("id", logId);
  } catch (e) {
    console.error("[notify] could not update log row", e);
  }
}
