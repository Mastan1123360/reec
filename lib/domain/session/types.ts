/**
 * lib/domain/session/types.ts
 *
 * Implements Master Engineering Specification Section 13:
 * SESSION MODEL
 *
 * There must be one conceptual session.
 * Do not create:
 *   React session + localStorage session + manual cookie session + Supabase session
 * as independent authorities.
 *
 * Supabase is the session authority.
 * REEC consumes and projects that session into application state.
 * Avoid unnecessary manual token serialization.
 * Avoid copying access/refresh tokens into arbitrary application-managed storage.
 * Use the existing Supabase-supported session mechanism.
 */

import type { Session as SupabaseSession } from "@supabase/supabase-js";
import type { UserIdentity } from "@/lib/domain/auth/types";
import { mapSupabaseUserToIdentity } from "@/lib/domain/auth/state-machine";

export interface CanonicalSession {
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly expiresAt: number | null;
  readonly tokenType: string;
  readonly identity: UserIdentity;
  readonly user: UserIdentity;
}

/**
 * Projects a raw Supabase session into the canonical domain session.
 * Does NOT persist or serialize tokens into custom stores; Supabase client manages its own token lifecycle.
 */
export function projectSupabaseSession(session: SupabaseSession): CanonicalSession {
  if (!session || !session.access_token || !session.user) {
    throw new Error("Invalid session: Missing required Supabase session attributes.");
  }

  const identity = mapSupabaseUserToIdentity(session.user);

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token || null,
    expiresAt: session.expires_at ? session.expires_at * 1000 : null,
    tokenType: session.token_type || "bearer",
    identity,
    user: identity,
  };
}
