import "server-only";
import { cache } from "react";
import { siteConfig, type L10n, type Locale } from "@/config/site";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type Service = {
  id: string;
  name: L10n;
  description: L10n;
  duration_min: number;
  price_from: number | null;
  sort: number;
  active: boolean;
};

export function configServices(): Service[] {
  return siteConfig.services.map((s, i) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    duration_min: s.durationMin,
    price_from: s.priceFrom,
    sort: i * 10,
    active: true,
  }));
}

function normalize(row: Record<string, unknown>): Service {
  const empty: L10n = { et: "", ru: "", en: "" };
  return {
    id: String(row.id),
    name: { ...empty, ...(row.name as Partial<L10n>) },
    description: { ...empty, ...(row.description as Partial<L10n>) },
    duration_min: Number(row.duration_min),
    price_from: row.price_from == null ? null : Number(row.price_from),
    sort: Number(row.sort ?? 0),
    active: Boolean(row.active),
  };
}

/**
 * Services from the database (the admin can edit them). Falls back to the
 * config file if the database is not reachable, so public pages still render.
 */
export const getServices = cache(async (opts: { includeInactive?: boolean } = {}): Promise<Service[]> => {
  try {
    let q = supabaseAdmin().from("services").select("*").order("sort").order("id");
    if (!opts.includeInactive) q = q.eq("active", true);
    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length && !opts.includeInactive) return configServices();
    return data.map(normalize);
  } catch (e) {
    console.error("[services] falling back to config:", (e as Error).message);
    return configServices();
  }
});

export function serviceName(s: Pick<Service, "name"> | undefined, locale: Locale): string {
  if (!s) return "";
  return s.name[locale] || s.name.et || s.name.en || s.name.ru;
}

export function serviceIcon(id: string): string {
  return siteConfig.services.find((s) => s.id === id)?.icon ?? "wrench";
}
