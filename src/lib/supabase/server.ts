import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Public (anon) client without a user session — RLS applies. Safe inside `use cache`. */
export function createAnonClient(): SupabaseClient {
  return createClient(supabaseUrl(), supabaseAnonKey(), noSession);
}

/** Service-role client. Bypasses RLS — only use on the server after validating input / auth. */
export function createServiceClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(supabaseUrl(), key, noSession);
}

/** Cookie-based client carrying the admin's Supabase Auth session. */
export async function createSessionClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component — the proxy refreshes the session instead.
        }
      },
    },
  });
}
