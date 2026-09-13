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

export const dualAuthStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      const local = window.localStorage.getItem(key);
      if (local !== null) return local;
    } catch {}

    try {
      if (document.cookie) {
        const cookies = document.cookie.split("; ");
        for (const cookie of cookies) {
          const eqIdx = cookie.indexOf("=");
          if (eqIdx !== -1) {
            const k = cookie.slice(0, eqIdx);
            if (k === key) {
              const v = cookie.slice(eqIdx + 1);
              return decodeURIComponent(v);
            }
          }
        }
      }
    } catch {}
    return null;
  },

  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
    } catch {}

    try {
      const encoded = encodeURIComponent(value);
      // SameSite=None; Secure is required for cross-origin iframes (AI Studio preview environment)
      document.cookie = `${key}=${encoded}; path=/; max-age=31536000; SameSite=None; Secure`;
    } catch {}
  },

  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {}

    try {
      document.cookie = `${key}=; path=/; max-age=0; SameSite=None; Secure`;
    } catch {}
  },
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
        storage: typeof window !== "undefined" ? dualAuthStorage : undefined,
      },
      global: {
        fetch: (...args) => globalThis.fetch(...args),
      },
    });
  }
  return clientInstance;
}
