/**
 * app/api/auth/email-login/route.ts
 *
 * Passwordless Email Authentication Endpoint.
 *
 * Allows users to log in or create an account using only their email address
 * WITHOUT requiring email verification. Users just provide an email, and an
 * authenticated session is provisioned immediately.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabaseClient, getServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
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

    const adminSupabase = getAdminSupabaseClient();
    const serverSupabase = getServerSupabaseClient();

    if (!adminSupabase && !serverSupabase) {
      return NextResponse.json(
        { success: false, error: "Authentication service is currently unavailable." },
        { status: 503 }
      );
    }

    const dbClient = adminSupabase || serverSupabase;
    const nowIso = new Date().toISOString();
    const defaultUsername =
      cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20) || "engineer";
    const displayName = cleanEmail.split("@")[0] || "Engineer";

    if (adminSupabase) {
      // Check if user already exists
      const { data: usersData } = await adminSupabase.auth.admin.listUsers();
      let user = usersData?.users?.find(
        (u) => u.email?.toLowerCase().trim() === cleanEmail
      );

      if (!user) {
        // Create user with email pre-confirmed
        const { data: created, error: createErr } = await adminSupabase.auth.admin.createUser({
          email: cleanEmail,
          email_confirm: true,
          user_metadata: {
            username: defaultUsername,
            display_name: displayName,
            avatar_id: "avatar-rustacean",
            last_username_change_at: nowIso,
          },
        });

        if (createErr || !created?.user) {
          return NextResponse.json(
            { success: false, error: createErr?.message || "Failed to create user account." },
            { status: 400 }
          );
        }
        user = created.user;

        // Upsert profile record
        try {
          await (dbClient as any)
            .from("profiles")
            .upsert(
              {
                id: user.id,
                email: cleanEmail,
                username: defaultUsername,
                display_name: displayName,
                avatar_id: "avatar-rustacean",
                updated_at: nowIso,
              },
              { onConflict: "id" }
            );
        } catch {
          // Non-critical profile sync failure
        }
      } else if (!user.email_confirmed_at) {
        // Confirm unconfirmed user immediately
        await adminSupabase.auth.admin.updateUserById(user.id, {
          email_confirm: true,
        });
      }

      // Generate magiclink token without sending any email
      const { data: linkData, error: linkErr } = await adminSupabase.auth.admin.generateLink({
        type: "magiclink",
        email: cleanEmail,
      });

      if (linkErr || !linkData?.properties?.hashed_token) {
        return NextResponse.json(
          {
            success: false,
            error: linkErr?.message || "Failed to generate authentication credentials.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        tokenHash: linkData.properties.hashed_token,
        email: cleanEmail,
        message: "Authenticated successfully without verification email.",
      });
    }

    // Fallback if adminSupabase is not present: use OTP
    if (serverSupabase) {
      const { error: otpError } = await serverSupabase.auth.signInWithOtp({
        email: cleanEmail,
      });

      if (otpError) {
        return NextResponse.json(
          { success: false, error: otpError.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        email: cleanEmail,
        message: "Sign-in initiated.",
      });
    }

    return NextResponse.json(
      { success: false, error: "Authentication service unavailable." },
      { status: 503 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
