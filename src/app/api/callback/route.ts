import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { callbackSchema, fieldErrors } from "@/lib/validation";
import { clientIpHash, rateLimit } from "@/lib/request";
import { notifyCallback, queue } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = callbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", fields: fieldErrors(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;
  if (input.website) return NextResponse.json({ ok: true });

  if (!(await rateLimit(`callback:${clientIpHash(req)}`, 4, 600))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { data, error } = await supabaseAdmin()
    .from("callback_requests")
    .insert({ name: input.name, phone: input.phone, comment: input.comment || null, lang: input.lang })
    .select("id")
    .single();
  if (error) {
    console.error("[callback]", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }

  queue(() => notifyCallback(data.id));
  return NextResponse.json({ ok: true });
}
