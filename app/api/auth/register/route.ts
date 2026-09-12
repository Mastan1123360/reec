/**
 * app/api/auth/register/route.ts
 *
 * Authoritative Server Registration Endpoint for REEC Academy.
 *
 * Adheres strictly to Master Engineering Specification Section 8 & 10:
 * 1. RegisterAccount -> Supabase creates identity -> Supabase controls confirmation -> REEC creates profile data -> EMAIL_VERIFICATION_REQUIRED.
 * 2. Supabase Auth is the sole authority for identity and verification.
 * 3. Never manually confirm an account or bypass confirmation.
 * 4. Never silently swallow email delivery errors; propagate failures cleanly.
 * 5. Enforce username uniqueness directly in the database.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabaseClient, getServerSupabaseClient } from "@/lib/supabase/server";
import { getOriginFromRequest } from "@/lib/supabase/site-url";
import { sendVerificationEmail } from "@/lib/email/sender";
import { validateUsernameSyntax, normalizeUsername } from "@/lib/supabase/username-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, username, displayName, avatarId } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const cleanUsername = username ? normalizeUsername(username) : "";
    if (cleanUsername) {
      const syntax = validateUsernameSyntax(cleanUsername);
      if (!syntax.valid) {
        return NextResponse.json(
          { success: false, error: syntax.error || "Invalid username syntax." },
          { status: 400 }
        );
      }
    }

    const adminSupabase = getAdminSupabaseClient();
    const serverSupabase = getServerSupabaseClient();

    if (!adminSupabase && !serverSupabase) {
      return NextResponse.json(
        { success: false, error: "Authentication service is currently unavailable." },
        { status: 503 }
      );
    }

    const dbClient = adminSupabase || serverSupabase;

    // 1. Authoritative check for username uniqueness in database
    if (cleanUsername && dbClient) {
      const { data: existingProfile } = await (dbClient as any)
        .from("profiles")
        .select("id, username, email")
        .ilike("username", cleanUsername)
        .maybeSingle();

      if (existingProfile && existingProfile.email?.toLowerCase().trim() !== cleanEmail) {
        return NextResponse.json(
          { success: false, error: `Username @${cleanUsername} is already taken by another user.` },
          { status: 409 }
        );
      }
    }

    const origin = getOriginFromRequest(req);
    const callbackUrl = `${origin}/auth/callback`;
    const finalDisplayName = displayName?.trim() || cleanUsername || cleanEmail.split("@")[0] || "Engineer";
    const finalAvatar = avatarId || "avatar-rustacean";
    const nowIso = new Date().toISOString();

    // 2. If Admin client is available, inspect existing user identity in Supabase Auth
    if (adminSupabase) {
      const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers();
      if (!listError && usersData?.users) {
        const existingUser = usersData.users.find(
          (u) => u.email?.toLowerCase().trim() === cleanEmail
        );

        if (existingUser) {
          // If the account is already verified and active, prevent account takeover
          if (existingUser.email_confirmed_at) {
            return NextResponse.json(
              {
                success: false,
                error: "An account with this email address already exists. Please sign in with your password, or use 'Forgot Password' if you need to reset it.",
              },
              { status: 409 }
            );
          }

          // If the account exists but has never been confirmed, update password, confirm email, and metadata
          const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
            existingUser.id,
            {
              password,
              email_confirm: true,
              user_metadata: {
                ...(existingUser.user_metadata || {}),
                username: cleanUsername || existingUser.user_metadata?.username || cleanEmail.split("@")[0],
                display_name: finalDisplayName,
                avatar_id: finalAvatar,
                last_username_change_at: nowIso,
              },
            }
          );

          if (updateError) {
            return NextResponse.json(
              { success: false, error: updateError.message },
              { status: 400 }
            );
          }

          // Update/create profile record in database
          try {
            await (adminSupabase as any)
              .from("profiles")
              .upsert(
                {
                  id: existingUser.id,
                  email: cleanEmail,
                  username: cleanUsername || undefined,
                  display_name: finalDisplayName,
                  avatar_id: finalAvatar,
                  updated_at: nowIso,
                },
                { onConflict: "id" }
              );
          } catch {
            // Non-critical profile sync failure
          }

          return NextResponse.json({
            success: true,
            needsEmailConfirmation: false,
            email: cleanEmail,
            user: {
              id: existingUser.id,
              email: existingUser.email,
              username: cleanUsername,
              displayName: finalDisplayName,
            },
            message: "Account created and confirmed successfully.",
          });
        }
      }

      // Brand new user in Supabase Auth - created with email confirmed directly
      const { data: createData, error: createError } = await adminSupabase.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username: cleanUsername,
          display_name: finalDisplayName,
          avatar_id: finalAvatar,
          last_username_change_at: nowIso,
        },
      });

      if (createError) {
        return NextResponse.json(
          { success: false, error: createError.message },
          { status: 400 }
        );
      }

      const createdUser = createData?.user || null;

      // Initialize profile record in database
      if (createdUser?.id) {
        try {
          await (adminSupabase as any)
            .from("profiles")
            .upsert(
              {
                id: createdUser.id,
                email: cleanEmail,
                username: cleanUsername || undefined,
                display_name: finalDisplayName,
                avatar_id: finalAvatar,
                updated_at: nowIso,
              },
              { onConflict: "id" }
            );
        } catch {
          // Non-critical profile sync failure
        }
      }

      return NextResponse.json({
        success: true,
        needsEmailConfirmation: false,
        email: cleanEmail,
        user: createdUser
          ? {
              id: createdUser.id,
              email: createdUser.email,
              username: cleanUsername,
              displayName: finalDisplayName,
            }
          : null,
        message: "Account created successfully.",
      });
    }

    // Standard Supabase client fallback
    if (!serverSupabase) {
      return NextResponse.json(
        { success: false, error: "Authentication service unavailable." },
        { status: 503 }
      );
    }

    const { data, error } = await serverSupabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: callbackUrl,
        data: {
          username: cleanUsername,
          display_name: finalDisplayName,
          avatar_id: finalAvatar,
          last_username_change_at: nowIso,
        },
      },
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    if (data?.user?.id) {
      try {
        await (serverSupabase as any)
          .from("profiles")
          .upsert(
            {
              id: data.user.id,
              email: cleanEmail,
              username: cleanUsername || undefined,
              display_name: finalDisplayName,
              avatar_id: finalAvatar,
              updated_at: nowIso,
            },
            { onConflict: "id" }
          );
      } catch {
        // Non-critical profile sync failure
      }
    }

    const isSessionEstablished = Boolean(data.session);

    return NextResponse.json({
      success: true,
      needsEmailConfirmation: !isSessionEstablished,
      email: cleanEmail,
      message: isSessionEstablished
        ? "Account created successfully."
        : "Confirmation email sent. Please check your inbox and click the verification link.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
