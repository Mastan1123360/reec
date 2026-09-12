/**
 * app/api/auth/profile/route.ts
 *
 * Authoritative Server Endpoint for User Profile Customization.
 * Supports updating Display Name, Gender, Human Face Avatar, and Customizations.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient, getAdminSupabaseClient } from "@/lib/supabase/server";
import { authenticateServerRequest } from "@/lib/domain/server-identity/guard";

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateServerRequest(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const userId = authResult.context.userId;
    const userEmail = authResult.context.userEmail;

    const body = await req.json();
    const { displayName, gender, avatarId } = body;

    const supabase = getAdminSupabaseClient() || getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Authentication database service is currently unavailable" },
        { status: 503 }
      );
    }

    const nowIso = new Date().toISOString();

    // Prepare profile updates
    const updates: Record<string, any> = {
      id: userId,
      email: userEmail || undefined,
      updated_at: nowIso,
    };

    if (typeof displayName === "string") {
      updates.display_name = displayName.trim().slice(0, 50);
    }
    if (gender === "male" || gender === "female") {
      updates.gender = gender;
    }
    if (typeof avatarId === "string" && avatarId.trim()) {
      updates.avatar_id = avatarId.trim();
    }

    // Upsert into public.profiles
    let upsertError: any = null;
    try {
      const res = await (supabase as any)
        .from("profiles")
        .upsert(updates, { onConflict: "id" });
      upsertError = res.error;
    } catch (err) {
      upsertError = err;
    }

    // If schema cache error on gender or other columns, fall back to core columns
    if (upsertError) {
      try {
        const fallbackUpdates: Record<string, any> = {
          id: userId,
          email: userEmail || undefined,
          updated_at: nowIso,
        };
        if (updates.display_name) fallbackUpdates.display_name = updates.display_name;
        if (updates.avatar_id) fallbackUpdates.avatar_id = updates.avatar_id;

        const retry = await (supabase as any)
          .from("profiles")
          .upsert(fallbackUpdates, { onConflict: "id" });
        if (!retry.error) {
          upsertError = null;
        }
      } catch {}
    }

    // Mirror to auth user metadata if admin client is available
    if (supabase.auth?.admin?.updateUserById) {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const existingMeta = userData?.user?.user_metadata || {};
        const newMeta: Record<string, any> = { ...existingMeta };

        if (updates.display_name) newMeta.display_name = updates.display_name;
        if (updates.gender) newMeta.gender = updates.gender;
        if (updates.avatar_id) newMeta.avatar_id = updates.avatar_id;

        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: newMeta,
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: userId,
        displayName: updates.display_name || null,
        gender: updates.gender || "male",
        avatarId: updates.avatar_id || "human-male-alex",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update profile" },
      { status: 500 }
    );
  }
}
