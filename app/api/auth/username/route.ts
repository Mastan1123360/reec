import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000; // 180 days

// In-memory cache of registered usernames (shared across server sessions)
const inMemoryUsernames = new Map<string, { userId: string; email: string; lastChangedAt: string }>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUsername = searchParams.get("username");
  const excludeUserId = searchParams.get("excludeUserId");
  const action = searchParams.get("action");

  if (!rawUsername) {
    return NextResponse.json({ available: false, error: "Username parameter is required" }, { status: 400 });
  }

  const clean = rawUsername.replace(/^@+/, "").trim().toLowerCase();

  if (action === "lookup") {
    // Lookup email by username for sign-in
    const memRecord = inMemoryUsernames.get(clean);
    if (memRecord) {
      return NextResponse.json({ found: true, email: memRecord.email });
    }

    const supabase = getServerSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("email")
          .ilike("username", clean)
          .maybeSingle();

        if (!error && data?.email) {
          return NextResponse.json({ found: true, email: data.email });
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ found: false, email: null });
  }

  // Syntax check
  if (!USERNAME_REGEX.test(clean)) {
    return NextResponse.json(
      { available: false, error: "Username must be 3-20 characters using letters, numbers, and underscores." },
      { status: 200 }
    );
  }

  const reserved = ["admin", "root", "reec", "system", "anonymous", "demo", "support", "help"];
  if (reserved.includes(clean)) {
    return NextResponse.json(
      { available: false, error: `"${clean}" is a reserved system identifier.` },
      { status: 200 }
    );
  }

  // Check in-memory registry
  const memRecord = inMemoryUsernames.get(clean);
  if (memRecord && memRecord.userId !== excludeUserId) {
    return NextResponse.json({
      available: false,
      error: `Username @${clean} is already taken by another user.`,
    });
  }

  // Check Supabase if configured
  const supabase = getServerSupabaseClient();
  if (supabase) {
    try {
      let query = (supabase as any).from("profiles").select("id, username").ilike("username", clean);
      if (excludeUserId) {
        query = query.neq("id", excludeUserId);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        return NextResponse.json({
          available: false,
          error: `Username @${clean} is already taken by another user.`,
        });
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ available: true, cleanUsername: clean });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, userId, email, lastChangedAt, force } = body;

    if (!username || !userId) {
      return NextResponse.json({ error: "Missing required fields (username, userId)" }, { status: 400 });
    }

    const clean = username.replace(/^@+/, "").trim().toLowerCase();

    if (!USERNAME_REGEX.test(clean)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters using letters, numbers, and underscores." },
        { status: 400 }
      );
    }

    // 1. Check Uniqueness
    const memRecord = inMemoryUsernames.get(clean);
    if (memRecord && memRecord.userId !== userId) {
      return NextResponse.json(
        { error: `Username @${clean} is already taken by another user.` },
        { status: 409 }
      );
    }

    // 2. Check 6-Month Cooldown if this is an update (not initial assignment)
    if (!force && lastChangedAt) {
      const lastTime = new Date(lastChangedAt).getTime();
      if (!isNaN(lastTime)) {
        const elapsed = Date.now() - lastTime;
        if (elapsed < SIX_MONTHS_MS) {
          const remainingDays = Math.ceil((SIX_MONTHS_MS - elapsed) / (24 * 60 * 60 * 1000));
          const nextDate = new Date(lastTime + SIX_MONTHS_MS).toLocaleDateString();
          return NextResponse.json(
            {
              error: `Usernames can only be changed once every 6 months. You can change your username again on ${nextDate} (in ${remainingDays} days).`,
              remainingDays,
              nextChangeDate: nextDate,
            },
            { status: 429 }
          );
        }
      }
    }

    const nowIso = new Date().toISOString();

    // Remove any previous username for this user in memory
    for (const [k, v] of inMemoryUsernames.entries()) {
      if (v.userId === userId) {
        inMemoryUsernames.delete(k);
      }
    }

    inMemoryUsernames.set(clean, {
      userId,
      email: email || "",
      lastChangedAt: nowIso,
    });

    // Sync to Supabase if configured
    const supabase = getServerSupabaseClient();
    if (supabase) {
      try {
        await (supabase as any)
          .from("profiles")
          .upsert({
            id: userId,
            email: email || undefined,
            username: clean,
            last_username_change_at: nowIso,
            updated_at: nowIso,
          }, { onConflict: "id" });
      } catch {
        // ignore schema errors if column doesn't exist yet
      }
    }

    return NextResponse.json({
      success: true,
      username: clean,
      lastChangedAt: nowIso,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err : "Failed to update username" },
      { status: 500 }
    );
  }
}
