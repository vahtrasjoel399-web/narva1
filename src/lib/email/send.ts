import "server-only";
import { siteConfig } from "@/config/site";
import { createServiceClient } from "@/lib/supabase/server";

export type EmailMessage = {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type DeliveryRefs = {
  event: string;
  bookingId?: string | null;
  callbackId?: string | null;
};

export type DeliveryResult = { status: "sent" | "failed" | "skipped"; error?: string; attempts: number };

const RETRY_DELAYS_MS = [0, 1000, 4000];

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || `${siteConfig.name} <onboarding@resend.dev>`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One HTTP call to Resend. Throws on failure; `retryable` marks transient errors. */
async function sendOnce(msg: EmailMessage): Promise<void> {
  const url = process.env.RESEND_API_URL || "https://api.resend.com/emails";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const err = new Error(`Resend ${res.status}: ${body.slice(0, 300)}`) as Error & { retryable?: boolean };
      err.retryable = res.status >= 500 || res.status === 429;
      throw err;
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function sendWithRetry(msg: EmailMessage): Promise<DeliveryResult> {
  if (msg.to.length === 0) return { status: "skipped", error: "no recipients", attempts: 0 };
  if (!isEmailConfigured()) {
    console.info(`[email] RESEND_API_KEY not set — skipped "${msg.subject}" to ${msg.to.join(", ")}`);
    return { status: "skipped", error: "RESEND_API_KEY not set", attempts: 0 };
  }
  let lastError = "";
  for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
    if (RETRY_DELAYS_MS[i]) await sleep(RETRY_DELAYS_MS[i]);
    try {
      await sendOnce(msg);
      return { status: "sent", attempts: i + 1 };
    } catch (err) {
      const e = err as Error & { retryable?: boolean; name?: string };
      lastError = e.name === "AbortError" ? "timeout" : e.message;
      const retryable = e.retryable !== false; // network errors / timeouts are retryable
      console.error(`[email] attempt ${i + 1} failed: ${lastError}`);
      if (!retryable) return { status: "failed", error: lastError, attempts: i + 1 };
    }
  }
  return { status: "failed", error: lastError, attempts: RETRY_DELAYS_MS.length };
}

/** Send and record the outcome in notification_log. Never throws. */
export async function deliver(msg: EmailMessage, refs: DeliveryRefs): Promise<DeliveryResult> {
  let result: DeliveryResult;
  try {
    result = await sendWithRetry(msg);
  } catch (err) {
    result = { status: "failed", error: (err as Error).message, attempts: 1 };
  }
  try {
    await createServiceClient()
      .from("notification_log")
      .insert({
        event: refs.event,
        booking_id: refs.bookingId ?? null,
        callback_id: refs.callbackId ?? null,
        recipient: msg.to.join(", ") || null,
        subject: msg.subject,
        status: result.status,
        error: result.error ?? null,
        attempts: result.attempts,
      });
  } catch (err) {
    console.error("[email] could not write notification_log", err);
  }
  return result;
}
