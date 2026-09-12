/**
 * app/api/auth/forgot-password/route.ts
 *
 * Implements Master Engineering Specification Section 15:
 * PASSWORD RECOVERY (Step 1: Dispatch recovery email via Supabase)
 *
 * Forgot password -> Supabase sends recovery email -> user follows recovery link ->
 * Supabase recovery session -> user sets new password.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { resolveUsernameToEmail } from "@/lib/supabase/username-service";
import { getAuthCallbackUrl } from "@/lib/supabase/site-url";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawTarget = String(body.email || body.emailOrUsername || "").trim().toLowerCase();

    if (!rawTarget) {
      return NextResponse.json(
        { success: false, error: "Please enter your email address or username." },
        { status: 400 }
      );
    }

    let targetEmail = rawTarget;
    if (!rawTarget.includes("@")) {
      const resolved = await resolveUsernameToEmail(rawTarget);
      if (resolved) {
        targetEmail = resolved;
      } else {
        // Return a generic safe message to prevent username enumeration
        return NextResponse.json({
          success: true,
          message: "If an account exists for that credential, a password recovery link has been sent.",
        });
      }
    }

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Authentication service unavailable" },
        { status: 503 }
      );
    }

    const redirectTo = getAuthCallbackUrl("/auth/reset-password");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo,
    });

    if (resetError) {
      return NextResponse.json({ success: false, error: resetError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Password recovery link dispatched. Please check your email to reset your password.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
