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

const FALLBACK_URL = "https://uofwhyawpvlpdqjgtzav.supabase.co";
const FALLBACK_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvZndoeWF3cHZscGRxamd0emF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzEzMTI4OSwiZXhwIjoyMTAyNzA3Mjg5fQ.qEW6Cl6PmjPPZhJijWX-ftazj-pDvT23iMwgj4phCAs";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvZndoeWF3cHZscGRxamd0emF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMzEyODksImV4cCI6MjEwMjcwNzI4OX0.7avueNZw611ln__9lbHrCwR0MxaDUgin3JpSVSQaSps";

function resolveServerUrl(): string {
  const env = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (env && !env.includes("your-project")) return env;
  return FALLBACK_URL;
}

function resolveServiceRoleKey(): string {
  const env = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (env && !env.includes("your-service-role-key")) return env;
  return FALLBACK_SERVICE_ROLE_KEY;
}

function resolveAnonKey(): string {
  const env = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (env && !env.includes("your-anon-key")) return env;
  return FALLBACK_ANON_KEY;
}

export const isServerSupabaseConfigured = (): boolean => {
  const url = resolveServerUrl();
  const serviceKey = resolveServiceRoleKey();
  const anonKey = resolveAnonKey();
  return Boolean(
    url &&
    (serviceKey || anonKey) &&
    !url.includes("your-project") &&
    !serviceKey.includes("your-service-role-key") &&
    !anonKey.includes("your-anon-key")
  );
};

let serverClientInstance: SupabaseClient<Database> | null = null;
let serverAdminInstance: SupabaseClient<Database> | null = null;

/**
 * Standard server-side Supabase client
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
 * Elevated server-side Supabase client using service-role key
 */
export function getAdminSupabaseClient(): SupabaseClient<Database> | null {
  if (!isServerSupabaseConfigured()) {
    return null;
  }
  if (!serverAdminInstance) {
    const key = resolveServiceRoleKey() || resolveAnonKey();
    serverAdminInstance = createClient<Database>(resolveServerUrl(), key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serverAdminInstance;
}
