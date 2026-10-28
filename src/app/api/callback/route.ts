import { after } from "next/server";
import { notifyCallback } from "@/lib/notify";
import { json, rateLimit } from "@/lib/request";
import { createServiceClient } from "@/lib/supabase/server";
import type { CallbackRow } from "@/lib/types";
import { callbackSchema, fieldErrors } from "@/lib/validation";

/** POST /api/callback — "leave your phone, we will call you". */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body && typeof body === "object" && (body as { website?: unknown }).website) {
    return json({ error: "validation", fields: { _: "spam" } }, 400);
  }
  const parsed = callbackSchema.safeParse(body);
  if (!parsed.success) return json({ error: "validation", fields: fieldErrors(parsed.error) }, 422);
  if (!(await rateLimit(request, "callback"))) return json({ error: "rate_limited" }, 429);

  const { data, error } = await createServiceClient()
    .from("callback_requests")
    .insert({
      name: parsed.data.name,
      phone: parsed.data.phone,
      comment: parsed.data.comment || null,
      lang: parsed.data.lang,
    })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[api/callback]", error);
    return json({ error: "server_error" }, 500);
  }

  const callback = data as CallbackRow;
  after(async () => {
    try {
      await notifyCallback(callback);
    } catch (err) {
      console.error("[api/callback] notify failed", err);
    }
  });
  return json({ ok: true }, 201);
}
