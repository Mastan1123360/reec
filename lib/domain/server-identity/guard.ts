/**
 * lib/domain/server-identity/guard.ts
 *
 * Implements Master Engineering Specification Section 11:
 * SERVER IDENTITY RULE:
 * Never trust userId, email, profileId, ownerId from a request body for authorization.
 *
 * When a protected server operation is performed:
 * request -> Supabase authenticated session -> verified user identity -> derive user ID -> perform operation.
 * The client may provide resource identifiers.
 * The client must not be allowed to declare who it is.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { mapSupabaseUserToIdentity } from "@/lib/domain/auth/state-machine";
import type { UserIdentity } from "@/lib/domain/auth/types";

export interface AuthenticatedServerContext {
  user: User;
  identity: UserIdentity;
  userId: string;
  userEmail: string | null;
  supabase: SupabaseClient;
}

/**
 * Extracts and strictly verifies the user's Supabase session from the request.
 * Derives the verified user ID from the authenticated session.
 * Rejects with 401 if token is missing or invalid.
 */
export async function authenticateServerRequest(
  req: NextRequest | Request
): Promise<
  | { success: true; context: AuthenticatedServerContext }
  | { success: false; response: NextResponse }
> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Missing or invalid Authorization header. A valid Bearer token is required.",
        },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Empty authentication token provided.",
        },
        { status: 401 }
      ),
    };
  }

  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).trim();
  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  ).trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Authentication service unavailable: Missing database configuration.",
        },
        { status: 503 }
      ),
    };
  }

  // User client bound strictly to the verified caller token
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
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Session is invalid or expired. Please sign in again.",
        },
        { status: 401 }
      ),
    };
  }

  const identity = mapSupabaseUserToIdentity(user);

  return {
    success: true,
    context: {
      user,
      identity,
      userId: user.id, // Strictly derived from verified session
      userEmail: user.email || null,
      supabase,
    },
  };
}
