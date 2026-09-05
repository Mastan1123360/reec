import { NextRequest, NextResponse } from "next/server";
import { searchLessons } from "@/lib/content/discover";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rawQ = req.nextUrl.searchParams.get("q") ?? "";
  // Sanitize and limit query length to 200 chars to protect against ReDoS or excessive regex work
  const q = rawQ.slice(0, 200).trim();
  const unlockedParam = req.nextUrl.searchParams.get("unlocked") ?? "";
  const unlockedIds = unlockedParam
    ? unlockedParam
        .slice(0, 1000)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const results = await searchLessons(q, unlockedIds);
  return NextResponse.json(
    results.slice(0, 20).map((l) => ({
      title: l.frontmatter.title,
      subtitle: l.frontmatter.subtitle,
      path: l.path,
      phase: l.frontmatter.phase,
      excerpt: l.excerpt,
    }))
  );
}
