/**
 * app/api/auth/resend-verification/route.ts
 *
 * Authoritative Server Endpoint for Resending Verification Emails.
 *
 * Adheres strictly to Master Engineering Specification Section 7 & 8:
 * - Supabase Auth is the sole authority for email verification.
 * - Never silently swallow delivery failures.
 * - Report success ONLY when verification dispatch succeeded.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabaseClient, getServerSupabaseClient } from "@/lib/supabase/server";
import { getOriginFromRequest } from "@/lib/supabase/site-url";
import { sendVerificationEmail } from "@/lib/email/sender";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const adminSupabase = getAdminSupabaseClient();
    const serverSupabase = getServerSupabaseClient();

    const origin = getOriginFromRequest(req);
    const callbackUrl = `${origin}/auth/callback`;

    if (adminSupabase) {
      let actionLink: string | null = null;

      const { data: signupLinkData, error: signupError } = await adminSupabase.auth.admin.generateLink({
        type: "magiclink",
        email: cleanEmail,
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (signupError) {
        return NextResponse.json({ success: false, error: signupError.message }, { status: 400 });
      }

      if (signupLinkData?.properties?.hashed_token) {
        actionLink = `${origin}/auth/callback?token_hash=${signupLinkData.properties.hashed_token}&type=signup&next=/`;
      } else if (signupLinkData?.properties?.action_link) {
        actionLink = signupLinkData.properties.action_link;
      }

      if (actionLink) {
        const emailResult = await sendVerificationEmail({
          email: cleanEmail,
          actionLink,
          username: cleanEmail.split("@")[0],
        });

        if (emailResult.error && !emailResult.delivered) {
          return NextResponse.json(
            {
              success: false,
              error: `Failed to deliver verification email: ${emailResult.error}. Please try again later.`,
            },
            { status: 502 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "A fresh confirmation email has been sent. Please check your inbox and click the link.",
        });
      }
    }

    // Fallback using serverSupabase client
    if (serverSupabase) {
      const { error } = await serverSupabase.auth.resend({
        type: "signup",
        email: cleanEmail,
      });

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: "Confirmation email dispatched. Please check your inbox.",
      });
    }

    return NextResponse.json(
      { success: false, error: "Authentication service unavailable." },
      { status: 503 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to resend verification";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
