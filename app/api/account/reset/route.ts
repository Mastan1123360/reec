import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: "Database configuration is not set." },
        { status: 503 }
      );
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing authentication token." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid user session." },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Strictly user-scoped deletions (enforced by RLS and WHERE clause)
    const [actRes, projRes, hlRes, fileRes, progRes] = await Promise.all([
      supabase.from("user_activity_logs").delete().eq("user_id", userId),
      supabase.from("user_projects").delete().eq("user_id", userId),
      supabase.from("user_hidden_lessons").delete().eq("user_id", userId),
      supabase.from("user_workspace_files").delete().eq("user_id", userId),
      supabase.from("user_progress").delete().eq("user_id", userId),
    ]);

    const errors = [actRes.error, projRes.error, hlRes.error, fileRes.error, progRes.error].filter(Boolean);
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Reset could not be completed. Your data has not been removed. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Your REEC data has been reset.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
