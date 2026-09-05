/**
 * lib/supabase/username-service.ts
 *
 * Enforces username validation, global uniqueness across all users,
 * and the strict 6-month cooldown policy for username updates.
 */

export interface UsernameRecord {
  username: string;
  userId: string;
  email: string;
  lastChangedAt: string; // ISO string
}

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

const REGISTRY_STORAGE_KEY = "reec_username_registry";

/**
 * Normalizes username input: strips leading '@', trims, converts to lowercase for uniqueness comparisons
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

  const reserved = ["admin", "root", "reec", "system", "anonymous", "demo", "support", "help"];
  if (reserved.includes(clean)) {
    return { valid: false, error: `"${clean}" is a reserved system identifier` };
  }

  return { valid: true, cleanUsername: clean };
}

/**
 * Loads the local username registry from localStorage
 */
export function getLocalUsernameRegistry(): Record<string, UsernameRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Saves the local username registry to localStorage
 */
export function saveLocalUsernameRegistry(registry: Record<string, UsernameRecord>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(registry));
  } catch {
    // ignore
  }
}

/**
 * Checks if a username is available (not taken by another user).
 * Checks both the local registry and Supabase profiles table if available.
 */
export async function isUsernameAvailable(
  rawUsername: string,
  currentUserId?: string | null
): Promise<{ available: boolean; error?: string }> {
  const validation = validateUsernameSyntax(rawUsername);
  if (!validation.valid) {
    return { available: false, error: validation.error };
  }

  const clean = validation.cleanUsername!;

  // 1. Check local registry first
  const registry = getLocalUsernameRegistry();
  const existingRecord = registry[clean];
  if (existingRecord && existingRecord.userId !== currentUserId) {
    return {
      available: false,
      error: `Username @${clean} is already taken by another user.`,
    };
  }

  // 2. Check via API route (which queries Supabase profiles table)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(
        `/api/auth/username?username=${encodeURIComponent(clean)}${
          currentUserId ? `&excludeUserId=${encodeURIComponent(currentUserId)}` : ""
        }`
      );
      if (res.ok) {
        const data = await res.json();
        if (!data.available) {
          return {
            available: false,
            error: data.error || `Username @${clean} is already taken by another user.`,
          };
        }
      }
    } catch {
      // If network fails, local registry check still protected
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
 * Reserves or updates a username for a user, recording the timestamp.
 */
export function recordUsernameInLocalRegistry(
  username: string,
  userId: string,
  email: string,
  timestamp: string = new Date().toISOString()
): void {
  const clean = normalizeUsername(username);
  const registry = getLocalUsernameRegistry();

  // Remove any previous username associated with this user
  for (const key of Object.keys(registry)) {
    if (registry[key].userId === userId) {
      delete registry[key];
    }
  }

  registry[clean] = {
    username: clean,
    userId,
    email,
    lastChangedAt: timestamp,
  };

  saveLocalUsernameRegistry(registry);
}

/**
 * Resolves an email by username from the registry (for sign-in by username)
 */
export function findEmailByUsername(rawUsername: string): string | null {
  const clean = normalizeUsername(rawUsername);
  const registry = getLocalUsernameRegistry();
  return registry[clean]?.email ?? null;
}
