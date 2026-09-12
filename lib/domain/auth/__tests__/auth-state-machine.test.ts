/**
 * lib/domain/auth/__tests__/auth-state-machine.test.ts
 *
 * Unit tests verifying REEC Canonical Authentication State Machine
 * and Domain Models (Specification Sections 5, 6, 7, 8, 9, 10).
 */

import { describe, it, expect } from "vitest";
import {
  createInitialAuthState,
  transitionToAuthenticating,
  transitionToAuthenticated,
  transitionToSignedOut,
  transitionToError,
  isUnknown,
  isLoading,
  isAuthenticated,
  isUnauthenticated,
  isEmailVerified,
  isEmailUnverified,
  hasAuthError,
  getDiscreteAuthStatus,
  mapSupabaseUserToIdentity,
} from "../state-machine";
import { mapSupabaseAuthError, createAuthDomainError } from "../errors";
import {
  validateUsernameSyntax,
  checkUsernameChangeCooldown,
  normalizeUsername,
  SIX_MONTHS_MS,
} from "@/lib/supabase/username-service";

describe("REEC Identity & Authentication State Machine", () => {
  it("initial state is strictly UNKNOWN with null identity and session", () => {
    const state = createInitialAuthState();
    expect(state.status).toBe("unknown");
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(isUnknown(state)).toBe(true);
    expect(isLoading(state)).toBe(false);
    expect(isAuthenticated(state)).toBe(false);
    expect(isUnauthenticated(state)).toBe(false);
    expect(getDiscreteAuthStatus(state)).toBe("unknown");
  });

  it("transitionToAuthenticating sets status to loading", () => {
    const state = transitionToAuthenticating();
    expect(state.status).toBe("loading");
    expect(isLoading(state)).toBe(true);
    expect(isAuthenticated(state)).toBe(false);
    expect(getDiscreteAuthStatus(state)).toBe("loading");
  });

  it("transitionToAuthenticated distinguishes EMAIL_VERIFIED vs EMAIL_UNVERIFIED", () => {
    const verifiedIdentity = {
      id: "usr-123",
      email: "engineer@reec.dev",
      emailConfirmed: true,
      emailConfirmedAt: "2026-09-01T12:00:00Z",
      createdAt: "2026-09-01T12:00:00Z",
    };

    const verifiedState = transitionToAuthenticated(
      verifiedIdentity,
      { access_token: "mock-token" },
      { id: "usr-123", username: "rust_acean", displayName: "Rustacean", avatarId: null, lastUsernameChangedAt: null }
    );

    expect(isAuthenticated(verifiedState)).toBe(true);
    expect(isEmailVerified(verifiedState)).toBe(true);
    expect(isEmailUnverified(verifiedState)).toBe(false);
    expect(getDiscreteAuthStatus(verifiedState)).toBe("email-verified");

    const unverifiedIdentity = {
      id: "usr-456",
      email: "pending@reec.dev",
      emailConfirmed: false,
      emailConfirmedAt: null,
      createdAt: "2026-09-10T08:00:00Z",
    };

    const unverifiedState = transitionToAuthenticated(
      unverifiedIdentity,
      { access_token: "mock-token-unverified" },
      null
    );

    expect(isAuthenticated(unverifiedState)).toBe(true);
    expect(isEmailVerified(unverifiedState)).toBe(false);
    expect(isEmailUnverified(unverifiedState)).toBe(true);
    expect(getDiscreteAuthStatus(unverifiedState)).toBe("email-unverified");
  });

  it("transitionToSignedOut sets status to unauthenticated", () => {
    const state = transitionToSignedOut();
    expect(state.status).toBe("unauthenticated");
    expect(isUnauthenticated(state)).toBe(true);
    expect(isAuthenticated(state)).toBe(false);
    expect(getDiscreteAuthStatus(state)).toBe("unauthenticated");
  });

  it("transitionToError sets status to authentication-error with domain error", () => {
    const err = createAuthDomainError("CREDENTIALS_INVALID", "Invalid login credentials.");
    const state = transitionToError(err);
    expect(state.status).toBe("authentication-error");
    expect(hasAuthError(state)).toBe(true);
    expect(state.error?.code).toBe("CREDENTIALS_INVALID");
    expect(getDiscreteAuthStatus(state)).toBe("authentication-error");
  });

  it("mapSupabaseUserToIdentity derives identity strictly from Supabase Auth", () => {
    const rawSupabaseUser = {
      id: "auth-uid-999",
      email: "test@domain.com",
      email_confirmed_at: "2026-09-05T10:00:00Z",
      created_at: "2026-09-01T00:00:00Z",
      last_sign_in_at: "2026-09-10T01:00:00Z",
    };

    const identity = mapSupabaseUserToIdentity(rawSupabaseUser);
    expect(identity.id).toBe("auth-uid-999");
    expect(identity.email).toBe("test@domain.com");
    expect(identity.emailConfirmed).toBe(true);
    expect(identity.emailConfirmedAt).toBe("2026-09-05T10:00:00Z");

    const rawUnconfirmed = {
      id: "auth-uid-000",
      email: "unconfirmed@domain.com",
      email_confirmed_at: null,
    };

    const identityUnconfirmed = mapSupabaseUserToIdentity(rawUnconfirmed);
    expect(identityUnconfirmed.emailConfirmed).toBe(false);
  });
});

describe("REEC Auth Error Normalization", () => {
  it("maps email_not_confirmed to EMAIL_NOT_CONFIRMED error code without bypass", () => {
    const rawError = new Error("Email not confirmed");
    const domainError = mapSupabaseAuthError(rawError, { email: "user@reec.dev" });
    expect(domainError.code).toBe("EMAIL_NOT_CONFIRMED");
    expect(domainError.unconfirmedEmail).toBe("user@reec.dev");
  });

  it("maps invalid_credentials to CREDENTIALS_INVALID error code", () => {
    const rawError = new Error("Invalid login credentials");
    const domainError = mapSupabaseAuthError(rawError);
    expect(domainError.code).toBe("CREDENTIALS_INVALID");
  });

  it("maps already registered to USER_ALREADY_EXISTS error code", () => {
    const rawError = new Error("User already registered");
    const domainError = mapSupabaseAuthError(rawError);
    expect(domainError.code).toBe("USER_ALREADY_EXISTS");
  });
});

describe("REEC Username Conceptual Model & Validation", () => {
  it("normalizes usernames correctly", () => {
    expect(normalizeUsername("@RustEngineer")).toBe("rustengineer");
    expect(normalizeUsername("   system_dev   ")).toBe("system_dev");
  });

  it("validates username syntax rules strictly", () => {
    expect(validateUsernameSyntax("valid_user").valid).toBe(true);
    expect(validateUsernameSyntax("ab").valid).toBe(false); // too short
    expect(validateUsernameSyntax("a".repeat(25)).valid).toBe(false); // too long
    expect(validateUsernameSyntax("user@reec").valid).toBe(false); // invalid char
    expect(validateUsernameSyntax("admin").valid).toBe(false); // reserved
  });

  it("enforces 6-month cooldown rule", () => {
    const now = Date.now();

    // 1 month ago -> rejected
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const check1 = checkUsernameChangeCooldown(oneMonthAgo);
    expect(check1.canChange).toBe(false);
    expect(check1.remainingDays).toBeGreaterThan(100);

    // 7 months ago -> allowed
    const sevenMonthsAgo = new Date(now - (SIX_MONTHS_MS + 24 * 60 * 60 * 1000)).toISOString();
    const check2 = checkUsernameChangeCooldown(sevenMonthsAgo);
    expect(check2.canChange).toBe(true);

    // Never changed -> allowed
    expect(checkUsernameChangeCooldown(null).canChange).toBe(true);
  });
});
