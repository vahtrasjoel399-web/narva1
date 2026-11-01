import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS: use only in server code, after
 * validating input (public routes) or checking the admin session (admin).
 */
export function supabaseAdmin(): SupabaseClient {
  if (!serverEnv.supabaseUrl || !serverEnv.supabaseServiceKey) {
    throw new Error("Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  client ??= createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
