/**
 * app/api/auth/reset-password/route.ts
 *
 * Authoritative Server Endpoint for Password Updates.
 *
 * Implements Master Engineering Specification Section 11 & Section 15:
 * 11. SERVER IDENTITY RULE:
 *     Never trust userId, email from request body for authorization.
 *     request -> Supabase authenticated session -> verified user identity -> derive user ID -> update password.
 * 15. PASSWORD RECOVERY:
 *     Password recovery must follow the Supabase authentication model.
 *     Forgot password -> Supabase sends recovery email -> user follows recovery link ->
 *     Supabase recovery session -> user sets new password.
 *     NEVER allow an unauthenticated client to simply submit `email + newPassword`
 *     and have the server change the account password. Authentication ownership must be established by Supabase.
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateServerRequest } from "@/lib/domain/server-identity/guard";
import { getAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Strictly verify the caller is authenticated via Supabase session (recovery session)
    const authResult = await authenticateServerRequest(req);
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized: Password reset requires an authenticated Supabase recovery session. " +
            "Direct submission of email and password without a verified Supabase session is strictly forbidden.",
        },
        { status: 401 }
      );
    }

    const { userId } = authResult.context;
    const body = await req.json().catch(() => ({}));
    const { newPassword } = body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // 2. Perform authoritative password update for the verified session identity
    const admin = getAdminSupabaseClient();
    if (admin?.auth?.admin?.updateUserById) {
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
      }
    } else {
      // Fall back to the caller's authenticated Supabase client
      const { error: updateError } = await authResult.context.supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. Your new password is now active.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
