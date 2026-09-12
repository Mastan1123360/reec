/**
 * lib/domain/profile/types.ts
 *
 * Implements Master Engineering Specification Section 12:
 * PROFILE MODEL
 *
 * REECProfile
 * ├── userId
 * ├── username
 * ├── displayName
 * ├── avatar
 * └── profile metadata
 *
 * Invariants:
 * 1. The profile belongs to exactly one Supabase identity.
 * 2. Profile data is not authentication state.
 * 3. Profile existence must not be used as proof of authentication.
 */

export interface ProfileMetadata {
  bio?: string;
  githubUsername?: string;
  website?: string;
  preferredTheme?: string;
  rustExperienceLevel?: "beginner" | "intermediate" | "advanced";
  customTags?: string[];
  [key: string]: unknown;
}

export interface REECProfile {
  /** The foreign key uniquely identifying the one Supabase identity this profile belongs to. */
  readonly userId: string;
  /** Unique case-insensitive application handle (e.g. "rustacean"). Nullable until set. */
  readonly username: string | null;
  /** Human-readable display name. */
  readonly displayName: string | null;
  /** Avatar identifier or image URL. */
  readonly avatar: string | null;
  /** Arbitrary profile metadata. */
  readonly metadata: ProfileMetadata;
  /** Timestamp of last username alteration (for 6-month cooldown enforcement). */
  readonly lastUsernameChangedAt: string | null;
  /** Timestamps */
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

/**
 * Creates and validates a REECProfile domain entity.
 * Invariant: Profile existence must never be used as proof of authentication.
 */
export function createREECProfile(params: {
  userId: string;
  username?: string | null;
  displayName?: string | null;
  avatar?: string | null;
  metadata?: ProfileMetadata;
  lastUsernameChangedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}): REECProfile {
  if (!params.userId || typeof params.userId !== "string") {
    throw new Error(
      "REECProfile invariant violation: Profile must belong to exactly one Supabase userId identity."
    );
  }

  return {
    userId: params.userId,
    username: params.username ? params.username.toLowerCase().trim() : null,
    displayName: params.displayName ? params.displayName.trim() : null,
    avatar: params.avatar || null,
    metadata: params.metadata || {},
    lastUsernameChangedAt: params.lastUsernameChangedAt || null,
    createdAt: params.createdAt,
    updatedAt: params.updatedAt,
  };
}
