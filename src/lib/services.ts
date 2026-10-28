import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { siteConfig } from "@/config/site";
import { isSupabaseConfigured } from "@/lib/env";
import { createAnonClient } from "@/lib/supabase/server";
import { serviceFromRow, type Service, type ServiceRow } from "@/lib/types";

export const SERVICES_TAG = "services";

export const SERVICE_COLUMNS = "id, name, description, icon, duration_min, price_from, sort, active";

export function fallbackServices(): Service[] {
  return siteConfig.services.map((s, i) => ({ ...s, sort: (i + 1) * 10, active: true }));
}

/**
 * Active services, cached and shared by all public pages.
 * Admin edits call `revalidateTag(SERVICES_TAG)`.
 * Falls back to the config file when the database isn't reachable.
 */
export async function getServices(): Promise<Service[]> {
  "use cache";
  cacheTag(SERVICES_TAG);

  let services: Service[] | null = null;
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await createAnonClient()
        .from("services")
        .select(SERVICE_COLUMNS)
        .eq("active", true)
        .order("sort")
        .order("id");
      if (error) throw error;
      if (data && data.length > 0) services = (data as ServiceRow[]).map(serviceFromRow);
    } catch (err) {
      console.error("[services] falling back to config:", err);
    }
  }

  if (services) cacheLife("hours");
  else cacheLife("minutes");
  return services ?? fallbackServices();
}

export function totalDuration(services: Service[], ids: string[]): number {
  return ids.reduce((sum, id) => sum + (services.find((s) => s.id === id)?.durationMin ?? 0), 0);
}
