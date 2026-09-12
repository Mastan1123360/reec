/**
 * lib/supabase/client.ts
 *
 * Supabase Browser Client.
 * Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Never accesses or exposes SUPABASE_SERVICE_ROLE_KEY to the client bundle.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function resolveUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
}

function resolveAnonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
}

export const isSupabaseConfigured = (): boolean => {
  const url = resolveUrl();
  const key = resolveAnonKey();
  return Boolean(url && key && !url.includes("your-project") && !key.includes("your-anon-key"));
};

let clientInstance: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient<Database>(resolveUrl(), resolveAnonKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "implicit",
      },
      global: {
        fetch: (...args) => globalThis.fetch(...args),
      },
    });
  }
  return clientInstance;
}
