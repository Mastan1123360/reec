/**
 * lib/supabase/server.ts
 *
 * Server-only Supabase client for backend operations (Content read service, auth, etc.).
 * Uses SUPABASE_SERVICE_ROLE_KEY when available on the server for administrative writes,
 * or NEXT_PUBLIC_SUPABASE_ANON_KEY for read-only / standard operations.
 *
 * NEVER imported into client components.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function resolveServerUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).trim();
}

function resolveServiceRoleKey(): string | undefined {
  const env = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (env && !env.includes("your-service-role-key")) return env.trim();
  return undefined;
}

function resolveAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  ).trim();
}

export const isServerSupabaseConfigured = (): boolean => {
  const url = resolveServerUrl();
  const anonKey = resolveAnonKey();
  return Boolean(
    url &&
    anonKey &&
    !url.includes("your-project") &&
    !anonKey.includes("your-anon-key")
  );
};

let serverClientInstance: SupabaseClient<Database> | null = null;
let serverAdminInstance: SupabaseClient<Database> | null = null;

/**
 * Standard server-side Supabase client using anon key
 */
export function getServerSupabaseClient(): SupabaseClient<Database> | null {
  if (!isServerSupabaseConfigured()) {
    return null;
  }
  if (!serverClientInstance) {
    const key = resolveServiceRoleKey() || resolveAnonKey();
    serverClientInstance = createClient<Database>(resolveServerUrl(), key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serverClientInstance;
}

/**
 * Elevated server-side Supabase client using service-role key (only when configured in env)
 */
export function getAdminSupabaseClient(): SupabaseClient<Database> | null {
  const serviceKey = resolveServiceRoleKey();
  if (!serviceKey) {
    // Service role key is not configured in environment
    return null;
  }
  if (!serverAdminInstance) {
    serverAdminInstance = createClient<Database>(resolveServerUrl(), serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serverAdminInstance;
}
