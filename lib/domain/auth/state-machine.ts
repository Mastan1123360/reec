/**
 * lib/domain/auth/state-machine.ts
 *
 * Canonical Authentication State Machine for REEC.
 *
 * Enforces:
 * 1. Exactly one canonical state transition pipeline:
 *    UNKNOWN -> AUTHENTICATING -> AUTHENTICATED (EMAIL_UNVERIFIED | EMAIL_VERIFIED) -> SIGNED_OUT
 * 2. Supabase Auth is the sole authority for identity and confirmation.
 * 3. Strict, unambiguous predicates for:
 *    unknown, loading, authenticated, unauthenticated, email-unverified, email-verified, authentication-error
 */

import type { CanonicalAuthState, UserIdentity, UserProfile, AuthDomainError, AuthStatus } from "./types";

export function createInitialAuthState(): CanonicalAuthState {
  return {
    status: "unknown",
    user: null,
    profile: null,
    session: null,
    error: null,
  };
}

export function transitionToAuthenticating(): CanonicalAuthState {
  return {
    status: "loading",
    user: null,
    profile: null,
    session: null,
    error: null,
  };
}

export function transitionToAuthenticated(
  user: UserIdentity,
  session: any,
  profile: UserProfile | null = null
): CanonicalAuthState {
  const verification = user.emailConfirmed ? "email-verified" : "email-unverified";
  return {
    status: "authenticated",
    verification,
    user,
    profile,
    session,
    error: null,
  };
}

export function transitionToSignedOut(): CanonicalAuthState {
  return {
    status: "unauthenticated",
    user: null,
    profile: null,
    session: null,
    error: null,
  };
}

export function transitionToError(error: AuthDomainError): CanonicalAuthState {
  return {
    status: "authentication-error",
    user: null,
    profile: null,
    session: null,
    error,
  };
}

/**
 * Pure predicate helpers to distinguish states without scattered booleans
 */
export function isUnknown(state: CanonicalAuthState): boolean {
  return state.status === "unknown";
}

export function isLoading(state: CanonicalAuthState): boolean {
  return state.status === "loading";
}

export function isAuthenticated(state: CanonicalAuthState): boolean {
  return state.status === "authenticated";
}

export function isUnauthenticated(state: CanonicalAuthState): boolean {
  return state.status === "unauthenticated";
}

export function isEmailVerified(state: CanonicalAuthState): boolean {
  return state.status === "authenticated" && state.verification === "email-verified";
}

export function isEmailUnverified(state: CanonicalAuthState): boolean {
  return state.status === "authenticated" && state.verification === "email-unverified";
}

export function hasAuthError(state: CanonicalAuthState): boolean {
  return state.status === "authentication-error";
}

/**
 * Computes the discrete status tag for backward compatibility and logging
 */
export function getDiscreteAuthStatus(state: CanonicalAuthState): AuthStatus {
  if (state.status === "authenticated") {
    return state.verification;
  }
  return state.status;
}

/**
 * Maps a Supabase Auth User object directly into the domain UserIdentity.
 * Supabase Auth is the SOLE authority for email confirmation and identity.
 */
export function mapSupabaseUserToIdentity(supabaseUser: any): UserIdentity {
  if (!supabaseUser || !supabaseUser.id) {
    throw new Error("[Identity Model] Cannot map null or invalid Supabase user to UserIdentity");
  }

  const isConfirmed = Boolean(
    supabaseUser.email_confirmed_at ||
    supabaseUser.confirmed_at ||
    supabaseUser.app_metadata?.provider === "google" ||
    supabaseUser.app_metadata?.provider === "github" ||
    supabaseUser.app_metadata?.providers?.includes("google") ||
    supabaseUser.app_metadata?.providers?.includes("github") ||
    (Array.isArray(supabaseUser.identities) &&
      supabaseUser.identities.some(
        (i: any) => i.provider === "google" || i.provider === "github"
      ))
  );

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? null,
    emailConfirmed: isConfirmed,
    isEmailVerified: isConfirmed,
    emailConfirmedAt: supabaseUser.email_confirmed_at ?? supabaseUser.confirmed_at ?? null,
    createdAt: supabaseUser.created_at ?? new Date().toISOString(),
    lastSignInAt: supabaseUser.last_sign_in_at ?? null,
  };
}

/**
 * State machine wrapper class for object-oriented consumers and architectural verification.
 */
export class AuthStateMachine {
  private state: CanonicalAuthState = transitionToSignedOut();

  getState(): any {
    const discrete = getDiscreteAuthStatus(this.state);
    return {
      ...this.state,
      status: discrete === "email-unverified" ? "email-unverified" : this.state.status,
    };
  }

  getUser(): UserIdentity | null {
    return this.state.status === "authenticated" ? this.state.user : null;
  }

  handleSupabaseUser(rawUser: any, session: any = null): CanonicalAuthState {
    if (!rawUser) {
      this.state = transitionToSignedOut();
      return this.state;
    }
    const identity = mapSupabaseUserToIdentity(rawUser);
    this.state = transitionToAuthenticated(identity, session);
    return this.state;
  }

  handleSupabaseSignedOut(): CanonicalAuthState {
    this.state = transitionToSignedOut();
    return this.state;
  }

  handleError(error: any): CanonicalAuthState {
    this.state = transitionToError(error);
    return this.state;
  }
}

