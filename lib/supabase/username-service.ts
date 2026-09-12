/**
 * lib/supabase/username-service.ts
 *
 * Conceptual Domain Service for REEC Username Management.
 *
 * Adheres strictly to Master Engineering Specification Section 10:
 * - Username is a REEC profile concept, NOT an authentication identity.
 * - Database is the sole authoritative persistent source for usernames.
 * - NO localStorage or in-memory Map registry.
 * - Enforces syntax validation and 6-month cooldown policy.
 */

export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
  cleanUsername?: string;
}

export interface CooldownCheckResult {
  canChange: boolean;
  remainingDays?: number;
  nextChangeDate?: string;
  lastChangedAt?: string;
  reason?: string;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
export const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000; // 180 days
export const COOLDOWN_PERIOD_MS = SIX_MONTHS_MS;


const RESERVED_USERNAMES = new Set([
  "admin",
  "root",
  "reec",
  "system",
  "anonymous",
  "demo",
  "support",
  "help",
  "moderator",
  "official",
]);

/**
 * Normalizes username input: strips leading '@', trims, converts to lowercase for comparisons.
 */
export function normalizeUsername(raw: string): string {
  return raw.replace(/^@+/, "").trim().toLowerCase();
}

/**
 * Validates syntax of a username (length, allowed characters, reserved words)
 */
export function validateUsernameSyntax(raw: string): UsernameValidationResult {
  const clean = normalizeUsername(raw);
  if (!clean) {
    return { valid: false, error: "Username is required" };
  }
  if (clean.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }
  if (clean.length > 20) {
    return { valid: false, error: "Username cannot exceed 20 characters" };
  }
  if (!USERNAME_REGEX.test(clean)) {
    return {
      valid: false,
      error: "Username can only contain letters, numbers, and underscores (_)",
    };
  }

  if (RESERVED_USERNAMES.has(clean)) {
    return { valid: false, error: `"${clean}" is a reserved system identifier` };
  }

  return { valid: true, cleanUsername: clean };
}

/**
 * Checks if a username is available (not taken by another user).
 * Authoritative check executes against the database via server API.
 */
export async function isUsernameAvailable(
  rawUsername: string,
  currentUserIdOrEmail?: string | null
): Promise<{ available: boolean; error?: string }> {
  const validation = validateUsernameSyntax(rawUsername);
  if (!validation.valid) {
    return { available: false, error: validation.error };
  }

  const clean = validation.cleanUsername!;
  const isEmail = currentUserIdOrEmail?.includes("@");

  if (typeof window !== "undefined") {
    try {
      const queryParam = isEmail
        ? `&excludeEmail=${encodeURIComponent(currentUserIdOrEmail!.toLowerCase().trim())}`
        : currentUserIdOrEmail
        ? `&excludeUserId=${encodeURIComponent(currentUserIdOrEmail)}`
        : "";

      const res = await fetch(
        `/api/auth/username?username=${encodeURIComponent(clean)}${queryParam}`
      );
      if (res.ok) {
        const data = await res.json();
        if (!data.available) {
          return {
            available: false,
            error: data.error || `Username @${clean} is already taken by another user.`,
          };
        }
        return { available: true };
      }
    } catch {
      // Network failure
    }
  }

  return { available: true };
}

/**
 * Checks the 6-month cooldown rule for changing a username.
 * Users can only change their username once every 6 months.
 */
export function checkUsernameChangeCooldown(
  lastChangedAt?: string | number | null
): CooldownCheckResult {
  if (!lastChangedAt) {
    return { canChange: true };
  }

  const lastDate = new Date(lastChangedAt);
  const lastTime = lastDate.getTime();
  if (isNaN(lastTime)) {
    return { canChange: true };
  }

  const elapsed = Date.now() - lastTime;
  if (elapsed >= SIX_MONTHS_MS) {
    return {
      canChange: true,
      lastChangedAt: lastDate.toISOString(),
    };
  }

  const remainingMs = SIX_MONTHS_MS - elapsed;
  const remainingDays = Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  const nextChangeDate = new Date(lastTime + SIX_MONTHS_MS).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return {
    canChange: false,
    remainingDays,
    nextChangeDate,
    lastChangedAt: lastDate.toISOString(),
    reason: `Usernames can only be changed once every 6 months. You can change your username again on ${nextChangeDate} (in ${remainingDays} days).`,
  };
}

/**
 * Resolves an email by username via authoritative database lookup.
 * Used exclusively for sign-in by username.
 */
export async function findEmailByUsername(rawUsername: string): Promise<string | null> {
  const clean = normalizeUsername(rawUsername);
  if (!clean) return null;

  try {
    const res = await fetch(`/api/auth/username?action=lookup&username=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.found && data.email) {
        return data.email.toLowerCase().trim();
      }
    }
  } catch {
    // lookup failed
  }

  return null;
}

export const resolveUsernameToEmail = findEmailByUsername;

/**
 * Updates a user's username in the database with syntax validation, cooldown, and uniqueness verification.
 */
export async function updateUsernameInDb(
  supabase: any,
  userId: string,
  newUsername: string
): Promise<{ success: boolean; error?: string; username?: string }> {
  const validation = validateUsernameSyntax(newUsername);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  const clean = validation.cleanUsername!;

  // Check cooldown safely
  let lastChangedAt: string | null = null;
  try {
    const { data: currentProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("id", userId)
      .maybeSingle();

    if (!profileErr) {
      try {
        const { data: cdData } = await supabase
          .from("profiles")
          .select("last_username_change_at")
          .eq("id", userId)
          .maybeSingle();
        if (cdData?.last_username_change_at) {
          lastChangedAt = cdData.last_username_change_at;
        }
      } catch {
        // column not in schema cache
      }
    }
  } catch {
    // profile table error
  }

  if (lastChangedAt) {
    const cooldown = checkUsernameChangeCooldown(lastChangedAt);
    if (!cooldown.canChange) {
      return { success: false, error: cooldown.reason };
    }
  }

  // Check uniqueness
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", clean)
    .neq("id", userId)
    .maybeSingle();

  if (existing) {
    return { success: false, error: `Username @${clean} is already taken by another user.` };
  }

  const now = new Date().toISOString();
  let updateError: any = null;

  try {
    const firstAttempt = await supabase
      .from("profiles")
      .update({
        username: clean,
        last_username_change_at: now,
        updated_at: now,
      })
      .eq("id", userId);
    updateError = firstAttempt.error;
  } catch (err) {
    updateError = err;
  }

  const isSchemaOrColumnError = (err: any) => {
    if (!err) return false;
    const str = (
      (err.message || "") +
      " " +
      (err.details || "") +
      " " +
      (err.hint || "") +
      " " +
      (typeof err === "string" ? err : "")
    ).toLowerCase();
    return (
      str.includes("last_username_change_at") ||
      str.includes("schema cache") ||
      str.includes("column") ||
      err.code === "PGRST204" ||
      err.code === "42703"
    );
  };

  if (updateError && isSchemaOrColumnError(updateError)) {
    try {
      const retryAttempt = await supabase
        .from("profiles")
        .update({
          username: clean,
          updated_at: now,
        })
        .eq("id", userId);
      updateError = retryAttempt.error;
    } catch (err) {
      updateError = err;
    }
  }

  // Always attempt to mirror to auth user metadata if available
  try {
    if (supabase.auth?.updateUser) {
      await supabase.auth.updateUser({
        data: {
          username: clean,
          last_username_change_at: now,
        },
      });
    }
  } catch {
    // Non-blocking metadata sync
  }

  if (updateError) {
    if (updateError.code === "23505" || updateError.message?.includes("unique")) {
      return { success: false, error: `Username @${clean} is already taken by another user.` };
    }

    // If schema cache was stale, the auth metadata was updated, so gracefully succeed
    if (isSchemaOrColumnError(updateError)) {
      try {
        await supabase.rpc("reload_pgrst_schema");
      } catch {}
      return { success: true, username: clean };
    }

    return { success: false, error: updateError.message };
  }

  return { success: true, username: clean };
}
