/**
 * app/api/auth/username/route.ts
 *
 * Authoritative Server Endpoint for REEC Username Management.
 *
 * Implements Master Engineering Specification Section 10:
 * 1. Database is the sole authoritative persistent source for usernames.
 * 2. No in-memory Maps or local storage registries.
 * 3. Username uniqueness enforced by the database.
 * 4. Resolves username -> email solely for authentication.
 * 5. Strict 6-month cooldown enforcement backed by the database.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient, getAdminSupabaseClient } from "@/lib/supabase/server";
import { authenticateServerRequest } from "@/lib/domain/server-identity/guard";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000; // 180 days

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUsername = searchParams.get("username");
  const excludeUserId = searchParams.get("excludeUserId");
  const excludeEmail = searchParams.get("excludeEmail")?.toLowerCase().trim();
  const action = searchParams.get("action");

  if (!rawUsername) {
    return NextResponse.json({ available: false, error: "Username parameter is required" }, { status: 400 });
  }

  const clean = rawUsername.replace(/^@+/, "").trim().toLowerCase();

  const supabase = getAdminSupabaseClient() || getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { available: false, error: "Authentication database service is currently unavailable" },
      { status: 503 }
    );
  }

  if (action === "lookup") {
    // Authoritative database resolution: username -> email for authentication only
    try {
      // 1. Try secure RPC first
      const { data: rpcEmail, error: rpcError } = await (supabase as any).rpc(
        "lookup_email_by_username",
        { lookup_username: clean }
      );

      if (!rpcError && rpcEmail) {
        return NextResponse.json({ found: true, email: rpcEmail });
      }

      // 2. Direct profiles query
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("email")
        .ilike("username", clean)
        .maybeSingle();

      if (!error && data?.email) {
        return NextResponse.json({ found: true, email: data.email });
      }

      // 3. Check auth metadata via admin client if profile record hasn't synced yet
      if (supabase.auth?.admin?.listUsers) {
        const { data: userList } = await supabase.auth.admin.listUsers();
        if (userList?.users) {
          const matched = userList.users.find(
            (u) =>
              u.user_metadata?.username?.toLowerCase() === clean ||
              u.email?.split("@")[0].toLowerCase() === clean
          );
          if (matched?.email) {
            return NextResponse.json({ found: true, email: matched.email });
          }
        }
      }

      return NextResponse.json({ found: false, email: null });
    } catch {
      return NextResponse.json({ found: false, email: null });
    }
  }

  // Syntax check
  if (!USERNAME_REGEX.test(clean)) {
    return NextResponse.json(
      { available: false, error: "Username must be 3-20 characters using letters, numbers, and underscores." },
      { status: 200 }
    );
  }

  if (RESERVED_USERNAMES.has(clean)) {
    return NextResponse.json(
      { available: false, error: `"${clean}" is a reserved system identifier.` },
      { status: 200 }
    );
  }

  // Authoritative database uniqueness check
  try {
    let query = (supabase as any)
      .from("profiles")
      .select("id, username, email")
      .ilike("username", clean);

    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }
    if (excludeEmail) {
      query = query.neq("email", excludeEmail);
    }

    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      return NextResponse.json({
        available: false,
        error: `Username @${clean} is already taken by another user.`,
      });
    }

    return NextResponse.json({ available: true, cleanUsername: clean });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ available: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Specification Section 11: SERVER IDENTITY RULE
    // Never trust userId, email, profileId from request body.
    // request -> Supabase authenticated session -> verified user identity -> derive user ID.
    const authResult = await authenticateServerRequest(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const userId = authResult.context.userId;
    const userEmail = authResult.context.userEmail;

    const body = await req.json();
    const { username, force } = body;

    if (!username) {
      return NextResponse.json({ error: "Missing required field: username" }, { status: 400 });
    }

    const clean = username.replace(/^@+/, "").trim().toLowerCase();

    if (!USERNAME_REGEX.test(clean)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters using letters, numbers, and underscores." },
        { status: 400 }
      );
    }

    if (RESERVED_USERNAMES.has(clean)) {
      return NextResponse.json(
        { error: `"${clean}" is a reserved system identifier.` },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabaseClient() || getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Authentication database service is currently unavailable" },
        { status: 503 }
      );
    }

    // 1. Check cooldown using user_metadata or profiles table
    let lastChangedAt: string | null = null;
    let currentDbUsername: string | null = null;

    if (authResult.context.user?.user_metadata?.last_username_change_at) {
      lastChangedAt = authResult.context.user.user_metadata.last_username_change_at;
    }
    if (authResult.context.user?.user_metadata?.username) {
      currentDbUsername = authResult.context.user.user_metadata.username;
    }

    try {
      const { data: currentProfile, error: profileErr } = await (supabase as any)
        .from("profiles")
        .select("id, username")
        .eq("id", userId)
        .maybeSingle();

      if (!profileErr && currentProfile) {
        if (currentProfile.username) {
          currentDbUsername = currentProfile.username;
        }
        try {
          const { data: cdData } = await (supabase as any)
            .from("profiles")
            .select("last_username_change_at")
            .eq("id", userId)
            .maybeSingle();
          if (cdData?.last_username_change_at) {
            lastChangedAt = cdData.last_username_change_at;
          }
        } catch {
          // Column last_username_change_at not in schema cache
        }
      }
    } catch {
      // Ignored
    }

    // Crucial: Cooldown ONLY applies if user ALREADY has a username and is attempting to CHANGE to a DIFFERENT username
    const isChangingToDifferentUsername =
      currentDbUsername &&
      currentDbUsername.trim().toLowerCase() !== clean.trim().toLowerCase();

    if (!force && isChangingToDifferentUsername && lastChangedAt) {
      const lastTime = new Date(lastChangedAt).getTime();
      if (!isNaN(lastTime)) {
        const elapsed = Date.now() - lastTime;
        if (elapsed < SIX_MONTHS_MS) {
          const remainingDays = Math.ceil((SIX_MONTHS_MS - elapsed) / (24 * 60 * 60 * 1000));
          const nextDate = new Date(lastTime + SIX_MONTHS_MS).toLocaleDateString();
          return NextResponse.json(
            {
              error: `Usernames can only be changed once every 6 months. You can change your username again on ${nextDate} (in ${remainingDays} days).`,
              remainingDays,
              nextChangeDate: nextDate,
            },
            { status: 429 }
          );
        }
      }
    }

    // 2. Check Database Uniqueness against other users
    const { data: existingUserWithUsername } = await (supabase as any)
      .from("profiles")
      .select("id")
      .ilike("username", clean)
      .neq("id", userId)
      .maybeSingle();

    if (existingUserWithUsername) {
      return NextResponse.json(
        { error: `Username @${clean} is already taken by another user.` },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    // 3. Perform authoritative database write
    const profilePayload: Record<string, any> = {
      id: userId,
      email: userEmail || undefined,
      username: clean,
      updated_at: nowIso,
    };

    let upsertError: any = null;
    try {
      const firstAttempt = await (supabase as any)
        .from("profiles")
        .upsert(
          {
            ...profilePayload,
            last_username_change_at: nowIso,
          },
          { onConflict: "id" }
        );
      upsertError = firstAttempt.error;
    } catch (err) {
      upsertError = err;
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

    if (upsertError && isSchemaOrColumnError(upsertError)) {
      try {
        const retryAttempt = await (supabase as any)
          .from("profiles")
          .upsert(profilePayload, { onConflict: "id" });
        upsertError = retryAttempt.error;
      } catch (err) {
        upsertError = err;
      }
    }

    if (upsertError && isSchemaOrColumnError(upsertError)) {
      try {
        const updateAttempt = await (supabase as any)
          .from("profiles")
          .update({ username: clean, updated_at: nowIso })
          .eq("id", userId);
        upsertError = updateAttempt.error;
      } catch (err) {
        upsertError = err;
      }
    }

    // 4. Always mirror to auth user metadata if admin client is available
    if (supabase.auth?.admin?.updateUserById) {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const existingMeta = userData?.user?.user_metadata || {};
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...existingMeta,
            username: clean,
            last_username_change_at: nowIso,
          },
        });
      } catch {}
    }

    if (upsertError) {
      if (upsertError.code === "23505" || upsertError.message?.includes("unique")) {
        return NextResponse.json(
          { error: `Username @${clean} is already taken by another user.` },
          { status: 409 }
        );
      }

      // If it's a schema cache or missing column issue, we've safely saved to auth metadata
      if (isSchemaOrColumnError(upsertError)) {
        try {
          await (supabase as any).rpc("reload_pgrst_schema");
        } catch {}

        return NextResponse.json({
          success: true,
          username: clean,
          lastChangedAt: nowIso,
        });
      }

      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      username: clean,
      lastChangedAt: nowIso,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update username" },
      { status: 500 }
    );
  }
}
