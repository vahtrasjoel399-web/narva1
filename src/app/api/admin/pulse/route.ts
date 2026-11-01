import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { getAdminCounts } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

/** Polled by the open admin panel to raise an alert when something new arrives. */
export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getAdminCounts(), { headers: { "Cache-Control": "no-store" } });
}
