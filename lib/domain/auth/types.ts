/**
 * lib/domain/auth/types.ts
 *
 * Authoritative Domain Types for the REEC Identity and Authentication Model.
 *
 * Establishes:
 * 1. UserIdentity bound strictly to Supabase Auth identity.
 * 2. REECProfile as an associated profile entity, not an authentication authority.
 * 3. Canonical state machine states and discrete status discriminator.
 * 4. Authoritative domain error representations.
 */

export interface RawSupabaseUser {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  user_metadata?: Record<string, any>;
  created_at?: string;
  last_sign_in_at?: string | null;
}

export interface UserIdentity {
  readonly id: string; // Supabase Auth UID (Sole Identity Authority)
  readonly email: string | null;
  readonly emailConfirmed: boolean;
  readonly isEmailVerified?: boolean;
  readonly emailConfirmedAt: string | null;
  readonly createdAt: string;
  readonly lastSignInAt?: string | null;
}

export interface UserProfile {
  readonly id: string;
  readonly username: string | null;
  readonly displayName: string | null;
  readonly avatarId: string | null;
  readonly gender?: "male" | "female" | null;
  readonly coins?: number | null;
  readonly lastUsernameChangedAt: string | null;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

/**
 * The discrete, non-competing states of the REEC authentication model.
 */
export type AuthStatusType =
  | "unknown"
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "email-unverified"
  | "email-verified"
  | "authentication-error";

export const AuthStatus = {
  UNKNOWN: "unknown" as const,
  ANONYMOUS: "unauthenticated" as const,
  AUTHENTICATING: "loading" as const,
  AUTHENTICATED: "authenticated" as const,
  EMAIL_VERIFICATION_REQUIRED: "email-unverified" as const,
  EMAIL_VERIFIED: "email-verified" as const,
  ERROR: "authentication-error" as const,
};

export type AuthStatus = AuthStatusType;

/**
 * Authoritative domain error codes.
 */
export type AuthDomainErrorCode =
  | "CREDENTIALS_INVALID"
  | "EMAIL_NOT_CONFIRMED"
  | "USER_ALREADY_EXISTS"
  | "USERNAME_TAKEN"
  | "USERNAME_COOLDOWN"
  | "USERNAME_INVALID_SYNTAX"
  | "EMAIL_DELIVERY_FAILED"
  | "VERIFICATION_FAILED"
  | "NETWORK_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "UNAUTHORIZED"
  | "UNKNOWN_ERROR";

export interface AuthDomainError {
  readonly code: AuthDomainErrorCode;
  readonly message: string;
  readonly unconfirmedEmail?: string;
  readonly remainingDays?: number;
  readonly nextChangeDate?: string;
  readonly cause?: unknown;
}

/**
 * Canonical State Machine Representation:
 *
 * UNKNOWN
 *    ↓
 * AUTHENTICATING (loading)
 *    ↓
 * AUTHENTICATED
 *    ├── EMAIL_UNVERIFIED
 *    └── EMAIL_VERIFIED
 *    ↓
 * SIGNED_OUT (unauthenticated)
 */
export type CanonicalAuthState =
  | {
      readonly status: "unknown";
      readonly user: null;
      readonly profile: null;
      readonly session: null;
      readonly error: null;
    }
  | {
      readonly status: "loading";
      readonly user: null;
      readonly profile: null;
      readonly session: null;
      readonly error: null;
    }
  | {
      readonly status: "authenticated";
      readonly verification: "email-verified" | "email-unverified";
      readonly user: UserIdentity;
      readonly profile: UserProfile | null;
      readonly session: any;
      readonly error: null;
    }
  | {
      readonly status: "unauthenticated";
      readonly user: null;
      readonly profile: null;
      readonly session: null;
      readonly error: null;
    }
  | {
      readonly status: "authentication-error";
      readonly user: null;
      readonly profile: null;
      readonly session: null;
      readonly error: AuthDomainError;
    };
