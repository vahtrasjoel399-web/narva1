import { siteConfig } from "@/config/site";

/** Public site URL (no trailing slash), used for links in emails, sitemap and metadata. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return siteConfig.url;
}

export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

export function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/** Comma-separated NOTIFY_EMAILS env var → list. */
export function envNotifyEmails(): string[] {
  return (process.env.NOTIFY_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
