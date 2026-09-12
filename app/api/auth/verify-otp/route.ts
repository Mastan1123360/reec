import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, token } = await req.json();

    if (!email || !token) {
      return NextResponse.json(
        { success: false, error: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanToken = String(token).trim();

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Authentication service unavailable." },
        { status: 500 }
      );
    }

    // Attempt OTP verification
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: "signup",
    });

    if (error) {
      // Also try type: email
      const { data: retryData, error: retryError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: "email",
      });

      if (retryError) {
        return NextResponse.json(
          {
            success: false,
            error:
              retryError.message ||
              error.message ||
              "Invalid or expired verification code. Please double-check the 6-digit code or request a new code.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        verified: true,
        session: retryData?.session || null,
        message: "Account email verified successfully.",
      });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      session: data?.session || null,
      message: "Account email verified successfully.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
