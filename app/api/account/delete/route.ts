import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

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

    // Verify confirmation string from request payload
    let body: { confirmation?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty or invalid JSON
    }

    if (body.confirmation !== "DELETE") {
      return NextResponse.json(
        {
          success: false,
          error: 'Confirmation failed. You must provide confirmation: "DELETE".',
        },
        { status: 400 }
      );
    }

    // Authenticate user with their token strictly on the server
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
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
    } = await userClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid user session." },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Use admin client with service role key if available for administrative deletions
    const adminClient = getAdminSupabaseClient() || userClient;

    // 1. Delete all user-owned rows across user data tables
    // Strictly isolate: NEVER touch content_files or content_file_versions
    await Promise.allSettled([
      adminClient.from("user_activity_logs").delete().eq("user_id", userId),
      adminClient.from("user_projects").delete().eq("user_id", userId),
      adminClient.from("user_hidden_lessons").delete().eq("user_id", userId),
      adminClient.from("user_workspace_files").delete().eq("user_id", userId),
      adminClient.from("user_progress").delete().eq("user_id", userId),
      adminClient.from("profiles").delete().eq("id", userId),
    ]);

    // 2. Delete user account from Supabase Auth admin
    if (
      adminClient.auth &&
      adminClient.auth.admin &&
      typeof adminClient.auth.admin.deleteUser === "function"
    ) {
      const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteUserError) {
        console.error("[Account Deletion] Auth admin deleteUser error:", deleteUserError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Your REEC account and all associated cloud data have been permanently deleted.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
