/**
 * lib/domain/services/index.ts
 *
 * Implements Master Engineering Specification Sections 30 & 31:
 * API ROUTE & SERVICE RULES
 *
 * Domain/application services express business intent:
 * - registerAccount()
 * - signIn()
 * - requestPasswordRecovery()
 * - updateUsername()
 * - completeLesson()
 * - toggleBookmark()
 * - recordStudySession()
 * - executeRustWorkspace()
 *
 * All business operations are named cleanly, avoiding raw ad-hoc database queries
 * or unstructured state mutations scattered across the app.
 */

import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  mapToApplicationError,
} from "@/lib/domain/errors/types";
import {
  validateUsernameSyntax,
  updateUsernameInDb,
  resolveUsernameToEmail,
} from "@/lib/supabase/username-service";
import {
  createREECProfile,
  type REECProfile,
  type ProfileMetadata,
} from "@/lib/domain/profile/types";
import {
  createBookmark,
  type Bookmark,
} from "@/lib/domain/bookmarks/types";
import {
  startStudySession,
  recordStudyActivity,
  completeStudySession,
  type StudySession,
} from "@/lib/domain/study-session/types";
import {
  startRustExecution,
  resolveRustExecutionSuccess,
  resolveRustExecutionFailure,
  type RustWorkspace,
} from "@/lib/domain/rust-workspace/types";
import { getRustBackend } from "@/lib/rust/playground-adapter";
import type { RustOperation, RustEdition, RustProfile } from "@/lib/rust/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 1. registerAccount
 */
export async function registerAccount(
  supabase: SupabaseClient,
  params: { email: string; password: string; username?: string }
) {
  const email = params.email.trim().toLowerCase();
  const password = params.password;

  if (!email || !password) {
    throw new ValidationError("Email and password are required.");
  }
  if (password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters.");
  }

  let cleanUsername: string | undefined;
  if (params.username) {
    const syntax = validateUsernameSyntax(params.username);
    if (!syntax.valid) {
      throw new ValidationError(syntax.error || "Invalid username format.");
    }
    cleanUsername = syntax.cleanUsername;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: cleanUsername ? { username: cleanUsername } : undefined,
    },
  });

  if (error) {
    throw mapToApplicationError(error, "AuthenticationError");
  }

  return {
    user: data.user,
    session: data.session,
    requiresEmailVerification: !data.session,
  };
}

/**
 * 2. signIn
 */
export async function signIn(
  supabase: SupabaseClient,
  params: { emailOrUsername: string; password: string }
) {
  const identifier = params.emailOrUsername.trim();
  const password = params.password;

  if (!identifier || !password) {
    throw new ValidationError("Identifier and password are required.");
  }

  let emailToUse = identifier;
  // If user entered username instead of email, resolve via authoritative lookup
  if (!identifier.includes("@")) {
    const resolved = await resolveUsernameToEmail(identifier);
    if (!resolved) {
      throw new AuthenticationError("Invalid username or password.");
    }
    emailToUse = resolved;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailToUse,
    password,
  });

  if (error) {
    throw mapToApplicationError(error, "AuthenticationError");
  }

  return {
    user: data.user,
    session: data.session,
  };
}

/**
 * 3. requestPasswordRecovery
 */
export async function requestPasswordRecovery(
  supabase: SupabaseClient,
  email: string,
  redirectTo?: string
) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new ValidationError("Email is required for password recovery.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL || "https://reec.academy"}/auth/reset-password`,
  });

  if (error) {
    throw mapToApplicationError(error, "ExternalServiceError");
  }

  return { success: true, email: cleanEmail };
}

/**
 * 4. updateUsername
 */
export async function updateUsername(
  supabase: SupabaseClient,
  params: { userId: string; newUsername: string }
) {
  if (!params.userId) {
    throw new AuthenticationError("User ID must be derived from authenticated session.");
  }

  const result = await updateUsernameInDb(supabase, params.userId, params.newUsername);
  if (!result.success) {
    if (result.error?.includes("cooldown")) {
      throw new ConflictError(result.error);
    }
    if (result.error?.includes("taken") || result.error?.includes("already in use")) {
      throw new ConflictError(result.error);
    }
    throw new ValidationError(result.error || "Failed to update username.");
  }

  return {
    success: true,
    username: result.username,
  };
}

/**
 * 5. getProfile
 */
export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<REECProfile | null> {
  if (!userId) {
    throw new AuthenticationError("User ID must be derived from authenticated session.");
  }

  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw mapToApplicationError(error, "PersistenceError");
  }

  if (!data) return null;

  return createREECProfile({
    userId: data.id,
    username: data.username,
    displayName: data.display_name,
    avatar: data.avatar_id,
    lastUsernameChangedAt: data.last_username_change_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
}

/**
 * 6. updateProfile
 */
export async function updateProfile(
  supabase: SupabaseClient,
  params: {
    userId: string;
    displayName?: string;
    avatarId?: string;
    metadata?: ProfileMetadata;
  }
): Promise<REECProfile> {
  if (!params.userId) {
    throw new AuthenticationError("User ID must be derived from authenticated session.");
  }

  const nowIso = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    id: params.userId,
    updated_at: nowIso,
  };

  if (params.displayName !== undefined) {
    updatePayload.display_name = params.displayName.trim();
  }
  if (params.avatarId !== undefined) {
    updatePayload.avatar_id = params.avatarId;
  }

  const { data, error } = await (supabase as any)
    .from("profiles")
    .upsert(updatePayload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    throw mapToApplicationError(error, "PersistenceError");
  }

  return createREECProfile({
    userId: data.id,
    username: data.username,
    displayName: data.display_name,
    avatar: data.avatar_id,
    metadata: params.metadata,
    lastUsernameChangedAt: data.last_username_change_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
}

/**
 * 7. completeLesson
 */
export async function completeLesson(
  supabase: SupabaseClient,
  params: { userId: string; lessonId: string; lessonTitle?: string; xpEarned?: number }
) {
  if (!params.userId) {
    throw new AuthenticationError("User ID must be derived from authenticated session.");
  }
  if (!params.lessonId) {
    throw new ValidationError("Lesson ID is required.");
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // 1. Fetch existing authoritative user_progress record
  const { data: existingProgress, error: fetchError } = await (supabase as any)
    .from("user_progress")
    .select("*")
    .eq("user_id", params.userId)
    .maybeSingle();

  if (fetchError && fetchError.code !== "PGRST116") {
    throw mapToApplicationError(fetchError, "PersistenceError");
  }

  const completed = Array.isArray(existingProgress?.completed_lessons)
    ? [...existingProgress.completed_lessons]
    : [];

  if (!completed.includes(params.lessonId)) {
    completed.push(params.lessonId);
  }

  const activeDates = Array.isArray(existingProgress?.active_dates)
    ? [...existingProgress.active_dates]
    : [];

  if (!activeDates.includes(today)) {
    activeDates.unshift(today);
  }

  // 2. Authoritative persistence in user_progress
  const { data, error } = await (supabase as any)
    .from("user_progress")
    .upsert(
      {
        user_id: params.userId,
        completed_lessons: completed,
        active_dates: activeDates,
        version: (Number(existingProgress?.version) || 0) + 1,
        updated_at: now,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    throw mapToApplicationError(error, "PersistenceError");
  }

  // 3. Log user activity
  try {
    await (supabase as any)
      .from("user_activity_logs")
      .insert({
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: params.userId,
        type: "lesson_completed",
        title: `Completed: ${params.lessonTitle || params.lessonId}`,
        timestamp: Date.now(),
        path: `/lesson/${params.lessonId}`,
        icon_type: "check",
      });
  } catch {}

  return {
    success: true,
    lessonId: params.lessonId,
    status: "completed",
    record: data,
  };
}

/**
 * 8. toggleBookmark
 */
export async function toggleBookmark(
  supabase: SupabaseClient,
  params: {
    userId: string;
    lessonId: string;
    lessonPath: string;
    lessonTitle: string;
    notes?: string;
  }
) {
  if (!params.userId) {
    throw new AuthenticationError("User ID must be derived from authenticated session.");
  }

  const bookmark = createBookmark({
    lessonId: params.lessonId,
    lessonPath: params.lessonPath,
    lessonTitle: params.lessonTitle,
    notes: params.notes,
  });

  // Fetch current user_progress
  const { data: existingProgress, error: fetchErr } = await (supabase as any)
    .from("user_progress")
    .select("*")
    .eq("user_id", params.userId)
    .maybeSingle();

  if (fetchErr && fetchErr.code !== "PGRST116") {
    throw mapToApplicationError(fetchErr, "PersistenceError");
  }

  const currentBookmarks = Array.isArray(existingProgress?.bookmarks)
    ? [...existingProgress.bookmarks]
    : [];

  const targetIdentifier = params.lessonPath || params.lessonId;
  const isBookmarked = currentBookmarks.includes(targetIdentifier);

  const nextBookmarks = isBookmarked
    ? currentBookmarks.filter((b) => b !== targetIdentifier)
    : [...currentBookmarks, targetIdentifier];

  const nowIso = new Date().toISOString();

  const { error: upsertErr } = await (supabase as any)
    .from("user_progress")
    .upsert(
      {
        user_id: params.userId,
        bookmarks: nextBookmarks,
        version: (Number(existingProgress?.version) || 0) + 1,
        updated_at: nowIso,
      },
      { onConflict: "user_id" }
    );

  if (upsertErr) {
    throw mapToApplicationError(upsertErr, "PersistenceError");
  }

  try {
    await (supabase as any)
      .from("user_activity_logs")
      .insert({
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: params.userId,
        type: isBookmarked ? "bookmark_removed" : "bookmark_added",
        title: isBookmarked
          ? `Removed Bookmark: ${params.lessonTitle || targetIdentifier}`
          : `Bookmarked: ${params.lessonTitle || targetIdentifier}`,
        timestamp: Date.now(),
        path: params.lessonPath,
        icon_type: "bookmark",
      });
  } catch {}

  return {
    bookmarked: !isBookmarked,
    lessonId: bookmark.lessonId,
  };
}

/**
 * 9. recordStudySession
 */
export async function recordStudySession(
  supabase: SupabaseClient,
  params: {
    userId: string;
    session: StudySession;
  }
) {
  if (!params.userId) {
    throw new AuthenticationError("User ID must be derived from authenticated session.");
  }

  const { session } = params;
  const addMinutes = Math.max(1, Math.round(session.durationSeconds / 60));
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  // Fetch current user_progress
  const { data: existingProgress, error: fetchErr } = await (supabase as any)
    .from("user_progress")
    .select("*")
    .eq("user_id", params.userId)
    .maybeSingle();

  if (fetchErr && fetchErr.code !== "PGRST116") {
    throw mapToApplicationError(fetchErr, "PersistenceError");
  }

  const currentMinutes = Number(existingProgress?.study_time_minutes) || 0;
  const currentDaily = (existingProgress?.daily_minutes as Record<string, number>) || {};
  const updatedDaily = {
    ...currentDaily,
    [today]: (currentDaily[today] || 0) + addMinutes,
  };

  const { data, error } = await (supabase as any)
    .from("user_progress")
    .upsert(
      {
        user_id: params.userId,
        study_time_minutes: currentMinutes + addMinutes,
        daily_minutes: updatedDaily,
        version: (Number(existingProgress?.version) || 0) + 1,
        updated_at: nowIso,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    throw mapToApplicationError(error, "PersistenceError");
  }

  try {
    await (supabase as any)
      .from("user_activity_logs")
      .insert({
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: params.userId,
        type: "study_session",
        title: `Logged +${addMinutes}m study time`,
        subtitle: "Focus session",
        timestamp: Date.now(),
        icon_type: "time",
      });
  } catch {}

  return {
    success: true,
    addedMinutes: addMinutes,
    record: data,
  };
}

/**
 * 10. executeRustWorkspace
 */
export async function executeRustWorkspace(
  workspace: RustWorkspace,
  options: {
    operation?: RustOperation;
    edition?: RustEdition;
    profile?: RustProfile;
  } = {}
): Promise<RustWorkspace> {
  const op = options.operation || "run";
  const activeFile = workspace.files.find((f) => f.path === workspace.activeFile) || workspace.files[0];
  const source = activeFile ? activeFile.content : "";

  if (!source.trim()) {
    throw new ValidationError("No source code to execute in workspace.");
  }

  let runningWorkspace = startRustExecution(workspace, op);

  try {
    const backend = getRustBackend();
    const result = await backend.run({
      operation: op,
      source,
      edition: options.edition || "2021",
      channel: "stable",
      profile: options.profile || "debug",
    });

    return resolveRustExecutionSuccess(runningWorkspace, {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.success ? 0 : 1,
      executionTimeMs: result.durationMs,
      diagnostics: (result.diagnostics || []).map((d) => ({
        line: d.primarySpan?.line || 1,
        column: d.primarySpan?.column || 1,
        message: d.message,
        severity: d.level === "error" ? "error" : "warning",
      })),
    });
  } catch (err: any) {
    const errorKind = err?.kind || "backend_error";
    const status =
      errorKind === "timeout"
        ? "TIMEOUT"
        : errorKind === "network_error"
        ? "NETWORK_ERROR"
        : "FAILED";

    return resolveRustExecutionFailure(runningWorkspace, {
      status,
      errorMessage: err?.message || "Execution failed.",
      stderr: err?.stderr || err?.message,
    });
  }
}
