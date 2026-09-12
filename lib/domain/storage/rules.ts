/**
 * lib/domain/storage/rules.ts
 *
 * Implements Master Engineering Specification Section 28:
 * LOCAL STORAGE BOUNDARY RULES
 *
 * Local storage may be used for:
 * - preferences (e.g. theme, sidebar collapsed)
 * - temporary UI state
 * - non-authoritative cache (offline accelerator)
 * - device-specific settings
 *
 * Local storage must NOT be authoritative for:
 * - authentication
 * - email verification
 * - user identity
 * - username ownership
 * - account ownership
 * - permissions
 * - learning data that is supposed to persist server-side
 */

export const PERMITTED_LOCAL_STORAGE_SCOPES = [
  "theme_preference",
  "sidebar_collapsed",
  "device_editor_settings",
  "client_ui_cache",
] as const;

export const FORBIDDEN_AUTHORITATIVE_STORAGE_SCOPES = [
  "auth_session_authority",
  "email_verification_status",
  "user_identity_authority",
  "username_ownership",
  "account_ownership",
  "permissions",
  "authoritative_learning_state",
] as const;

export function isPermittedLocalStorageKey(key: string): boolean {
  const lower = key.toLowerCase();

  // Explicitly forbidden to be stored as authority in localStorage
  if (
    lower.includes("auth_token_authority") ||
    lower.includes("verified_user_identity") ||
    lower.includes("role_authority") ||
    lower.includes("email_verification_authority")
  ) {
    return false;
  }

  return true;
}
