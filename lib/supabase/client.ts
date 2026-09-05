/**
 * lib/supabase/client.ts
 *
 * Supabase Browser Client.
 * Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Never accesses or exposes SUPABASE_SERVICE_ROLE_KEY to the client bundle.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const FALLBACK_URL = "https://uofwhyawpvlpdqjgtzav.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvZndoeWF3cHZscGRxamd0emF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMzEyODksImV4cCI6MjEwMjcwNzI4OX0.7avueNZw611ln__9lbHrCwR0MxaDUgin3JpSVSQaSps";

function resolveUrl(): string {
  const env = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (env && !env.includes("your-project")) return env;
  return FALLBACK_URL;
}

function resolveAnonKey(): string {
  const env = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (env && !env.includes("your-anon-key")) return env;
  return FALLBACK_ANON_KEY;
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
      },
    });
  }
  return clientInstance;
}
