/**
 * lib/domain/auth/errors.ts
 *
 * Authoritative Error Mapping for the REEC Authentication Conceptual Layer.
 *
 * Converts external (Supabase, network, validation) errors into deterministic
 * domain errors without ever silently converting failure into success.
 */

import type { AuthDomainError, AuthDomainErrorCode } from "./types";

export function createAuthDomainError(
  code: AuthDomainErrorCode,
  message: string,
  extra?: Partial<Omit<AuthDomainError, "code" | "message">>
): AuthDomainError {
  return {
    code,
    message,
    ...extra,
  };
}

export function mapSupabaseAuthError(
  error: unknown,
  context?: { email?: string }
): AuthDomainError {
  if (!error) {
    return createAuthDomainError("UNKNOWN_ERROR", "An unknown authentication error occurred.");
  }

  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
      ? String((error as any).message)
      : String(error);

  const lower = rawMessage.toLowerCase();

  if (lower.includes("email not confirmed") || lower.includes("email_not_confirmed")) {
    return createAuthDomainError(
      "EMAIL_NOT_CONFIRMED",
      "Your email address has not been confirmed yet. Please verify your account using the confirmation link sent to your email.",
      {
        unconfirmedEmail: context?.email,
        cause: error,
      }
    );
  }

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_grant") ||
    lower.includes("invalid credentials")
  ) {
    return createAuthDomainError(
      "CREDENTIALS_INVALID",
      "Invalid login credentials. Please check your username/email and password, or use 'Forgot password' to reset your credentials.",
      { cause: error }
    );
  }

  if (
    lower.includes("already registered") ||
    lower.includes("user already exists") ||
    lower.includes("email already in use") ||
    lower.includes("identity_already_exists")
  ) {
    return createAuthDomainError(
      "USER_ALREADY_EXISTS",
      "An account with this email address already exists. Please sign in with your password, or reset it if forgotten.",
      { cause: error }
    );
  }

  if (
    lower.includes("invalid or expired") ||
    lower.includes("token has expired") ||
    lower.includes("otp_expired")
  ) {
    return createAuthDomainError(
      "VERIFICATION_FAILED",
      "Invalid or expired verification token. Please request a fresh confirmation link.",
      { cause: error }
    );
  }

  if (
    lower.includes("fetch failed") ||
    lower.includes("network error") ||
    lower.includes("failed to fetch")
  ) {
    return createAuthDomainError(
      "NETWORK_ERROR",
      "Unable to connect to the authentication server. Please check your network connection and try again.",
      { cause: error }
    );
  }

  return createAuthDomainError(
    "UNKNOWN_ERROR",
    rawMessage || "Authentication request failed. Please try again.",
    { cause: error }
  );
}
