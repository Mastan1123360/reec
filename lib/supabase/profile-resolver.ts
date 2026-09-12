/**
 * lib/supabase/profile-resolver.ts
 *
 * Authoritative, deterministic instant-profile resolver for REEC.
 *
 * Guarantees that the very first authenticated render contains complete
 * profile information directly from Supabase Auth user_metadata/session,
 * before any database or network request.
 *
 * Strict field priority rules:
 *
 * displayName:
 * 1. Supabase Auth user_metadata.full_name
 * 2. user_metadata.name
 * 3. user_metadata.display_name
 * 4. user_metadata.user_name
 * 5. user_metadata.preferred_username
 * 6. per-user local cache (reec_display_name_<userId>)
 * 7. email prefix
 * 8. safe default ("Learner")
 *
 * username:
 * 1. existing REEC username in Auth metadata (user_metadata.username)
 * 2. per-user REEC local cache (reec_username_<userId>)
 * 3. existing persisted username (reec_persisted_username)
 * 4. OAuth provider username (user_metadata.user_name || user_metadata.preferred_username)
 * 5. email prefix fallback
 *
 * avatar:
 * 1. Auth metadata avatar_id (user_metadata.avatar_id)
 * 2. per-user local cache (reec_avatar_id_<userId>)
 * 3. safe default ("human-male-alex")
 *
 * gender:
 * 1. Auth metadata gender (user_metadata.gender)
 * 2. per-user local cache (reec_gender_<userId>)
 * 3. safe default ("male")
 */

import type { UserProfile } from "@/lib/domain/auth/types";
import { normalizeUsername } from "@/lib/supabase/username-service";
import { resolveAvatarId } from "@/lib/avatars";

function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

export interface SupabaseAuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
  app_metadata?: Record<string, any> | null;
  identities?: Array<{ provider?: string; identity_data?: Record<string, any> }> | null;
}

/**
 * Deterministically resolves a complete UserProfile baseline from the given
 * Supabase Auth user/session without awaiting any network operations.
 */
export function resolveInstantProfile(user: SupabaseAuthUserLike): UserProfile {
  const userId = user.id;
  const meta = user.user_metadata || {};
  const email = user.email || null;

  // --------------------------------------------------------------------------
  // 1. displayName Priority
  // --------------------------------------------------------------------------
  let resolvedDisplayName: string | null = null;
  if (isNonEmptyString(meta.full_name)) {
    resolvedDisplayName = meta.full_name.trim();
  } else if (isNonEmptyString(meta.name)) {
    resolvedDisplayName = meta.name.trim();
  } else if (isNonEmptyString(meta.display_name)) {
    resolvedDisplayName = meta.display_name.trim();
  } else if (isNonEmptyString(meta.user_name)) {
    resolvedDisplayName = meta.user_name.trim();
  } else if (isNonEmptyString(meta.preferred_username)) {
    resolvedDisplayName = meta.preferred_username.trim();
  } else if (typeof window !== "undefined" && userId) {
    try {
      const cached = window.localStorage.getItem(`reec_display_name_${userId}`);
      if (isNonEmptyString(cached)) {
        resolvedDisplayName = cached.trim();
      }
    } catch {}
  }

  if (!resolvedDisplayName && email && email.includes("@")) {
    const emailPrefix = email.split("@")[0].trim();
    if (emailPrefix) {
      resolvedDisplayName = emailPrefix;
    }
  }

  if (!resolvedDisplayName) {
    resolvedDisplayName = "Learner";
  }

  // --------------------------------------------------------------------------
  // 2. username Priority
  // --------------------------------------------------------------------------
  let resolvedUsername: string | null = null;
  if (isNonEmptyString(meta.username)) {
    resolvedUsername = normalizeUsername(meta.username);
  } else if (typeof window !== "undefined" && userId) {
    try {
      const cached = window.localStorage.getItem(`reec_username_${userId}`);
      if (isNonEmptyString(cached)) {
        resolvedUsername = normalizeUsername(cached);
      }
    } catch {}
  }

  if (!resolvedUsername && typeof window !== "undefined") {
    try {
      const persisted = window.localStorage.getItem("reec_persisted_username");
      if (isNonEmptyString(persisted)) {
        resolvedUsername = normalizeUsername(persisted);
      }
    } catch {}
  }

  if (!resolvedUsername) {
    if (isNonEmptyString(meta.user_name)) {
      resolvedUsername = normalizeUsername(meta.user_name);
    } else if (isNonEmptyString(meta.preferred_username)) {
      resolvedUsername = normalizeUsername(meta.preferred_username);
    }
  }

  if (!resolvedUsername && email && email.includes("@")) {
    const rawPrefix = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
    if (rawPrefix) {
      resolvedUsername = normalizeUsername(rawPrefix);
    }
  }

  if (!resolvedUsername) {
    resolvedUsername = "learner";
  }

  // --------------------------------------------------------------------------
  // 3. avatar Priority
  // --------------------------------------------------------------------------
  let resolvedAvatarId: string | null = null;
  if (isNonEmptyString(meta.avatar_id)) {
    resolvedAvatarId = resolveAvatarId(meta.avatar_id);
  } else if (typeof window !== "undefined" && userId) {
    try {
      const cached = window.localStorage.getItem(`reec_avatar_id_${userId}`);
      if (isNonEmptyString(cached)) {
        resolvedAvatarId = resolveAvatarId(cached);
      }
    } catch {}
  }

  if (!resolvedAvatarId && typeof window !== "undefined") {
    try {
      const legacy = window.localStorage.getItem("reec_selected_avatar");
      if (isNonEmptyString(legacy)) {
        resolvedAvatarId = resolveAvatarId(legacy);
      }
    } catch {}
  }

  if (!resolvedAvatarId) {
    resolvedAvatarId = "human-male-alex";
  }

  // --------------------------------------------------------------------------
  // 4. gender Priority
  // --------------------------------------------------------------------------
  let resolvedGender: "male" | "female" | null = null;
  if (meta.gender === "male" || meta.gender === "female") {
    resolvedGender = meta.gender;
  } else if (typeof window !== "undefined" && userId) {
    try {
      const cached = window.localStorage.getItem(`reec_gender_${userId}`);
      if (cached === "male" || cached === "female") {
        resolvedGender = cached;
      }
    } catch {}
  }

  if (!resolvedGender && typeof window !== "undefined") {
    try {
      const legacy = window.localStorage.getItem("reec_selected_gender");
      if (legacy === "male" || legacy === "female") {
        resolvedGender = legacy;
      }
    } catch {}
  }

  if (!resolvedGender) {
    resolvedGender = "male";
  }

  // Write per-user local cache so subsequent sync renders have immediate access
  if (typeof window !== "undefined" && userId) {
    try {
      if (resolvedDisplayName) {
        window.localStorage.setItem(`reec_display_name_${userId}`, resolvedDisplayName);
      }
      if (resolvedUsername) {
        window.localStorage.setItem(`reec_username_${userId}`, resolvedUsername);
        window.localStorage.setItem("reec_persisted_username", resolvedUsername);
      }
      if (resolvedAvatarId) {
        window.localStorage.setItem(`reec_avatar_id_${userId}`, resolvedAvatarId);
      }
      if (resolvedGender) {
        window.localStorage.setItem(`reec_gender_${userId}`, resolvedGender);
      }
    } catch {}
  }

  return {
    id: userId,
    username: resolvedUsername,
    displayName: resolvedDisplayName,
    avatarId: resolvedAvatarId,
    gender: resolvedGender,
    coins: typeof meta.coins === "number" ? meta.coins : null,
    lastUsernameChangedAt: meta.last_username_change_at || null,
    createdAt: user_metadata_created_at(user),
    updatedAt: new Date().toISOString(),
  };
}

function user_metadata_created_at(user: SupabaseAuthUserLike): string {
  if (isNonEmptyString((user as any).created_at)) {
    return (user as any).created_at;
  }
  return new Date().toISOString();
}

/**
 * Safely reconciles an existing in-memory profile with data fetched from
 * public.profiles in the background.
 *
 * CRITICAL RULE:
 * Must NEVER overwrite a valid instant Auth value with null, undefined,
 * empty string, or stale fallback data.
 */
export function reconcileProfileWithDatabase(
  currentProfile: UserProfile,
  dbData: Partial<UserProfile> | null | undefined
): UserProfile {
  if (!dbData) return currentProfile;

  const resolvedDisplayName = isNonEmptyString(dbData.displayName)
    ? dbData.displayName.trim()
    : currentProfile.displayName;

  const resolvedUsername = isNonEmptyString(dbData.username)
    ? normalizeUsername(dbData.username)
    : currentProfile.username;

  const resolvedAvatarId = isNonEmptyString(dbData.avatarId)
    ? resolveAvatarId(dbData.avatarId)
    : currentProfile.avatarId;

  const resolvedGender =
    dbData.gender === "male" || dbData.gender === "female"
      ? dbData.gender
      : currentProfile.gender;

  const resolvedCoins =
    typeof dbData.coins === "number" ? dbData.coins : currentProfile.coins;

  const resolvedLastChanged =
    dbData.lastUsernameChangedAt || currentProfile.lastUsernameChangedAt;

  const updated: UserProfile = {
    ...currentProfile,
    displayName: resolvedDisplayName,
    username: resolvedUsername,
    avatarId: resolvedAvatarId,
    gender: resolvedGender,
    coins: resolvedCoins ?? null,
    lastUsernameChangedAt: resolvedLastChanged ?? null,
    createdAt: dbData.createdAt || currentProfile.createdAt,
    updatedAt: dbData.updatedAt || new Date().toISOString(),
  };

  // Sync back to per-user local storage
  if (typeof window !== "undefined" && currentProfile.id) {
    try {
      const uid = currentProfile.id;
      if (updated.displayName) {
        window.localStorage.setItem(`reec_display_name_${uid}`, updated.displayName);
      }
      if (updated.username) {
        window.localStorage.setItem(`reec_username_${uid}`, updated.username);
        window.localStorage.setItem("reec_persisted_username", updated.username);
      }
      if (updated.avatarId) {
        window.localStorage.setItem(`reec_avatar_id_${uid}`, updated.avatarId);
      }
      if (updated.gender) {
        window.localStorage.setItem(`reec_gender_${uid}`, updated.gender);
      }
    } catch {}
  }

  return updated;
}

/**
 * Updates the per-user localStorage cache when a user modifies their profile.
 */
export function setPerUserProfileCache(
  userId: string,
  updates: {
    displayName?: string;
    username?: string;
    avatarId?: string;
    gender?: "male" | "female";
  }
) {
  if (typeof window === "undefined" || !userId) return;
  try {
    if (updates.displayName) {
      window.localStorage.setItem(`reec_display_name_${userId}`, updates.displayName.trim());
    }
    if (updates.username) {
      const clean = normalizeUsername(updates.username);
      window.localStorage.setItem(`reec_username_${userId}`, clean);
      window.localStorage.setItem("reec_persisted_username", clean);
    }
    if (updates.avatarId) {
      window.localStorage.setItem(`reec_avatar_id_${userId}`, resolveAvatarId(updates.avatarId));
    }
    if (updates.gender) {
      window.localStorage.setItem(`reec_gender_${userId}`, updates.gender);
    }
  } catch {}
}
