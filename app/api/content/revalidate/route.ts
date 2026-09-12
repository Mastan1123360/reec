/**
 * app/api/content/revalidate/route.ts
 *
 * Targeted Server Cache Invalidation Route Handler.
 * Supports targeted invalidation for single lesson updates or global invalidation.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { invalidateLessonCache } from "@/lib/content/discover";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let body: { slug?: string; lessonId?: string; eventType?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Empty body
    }

    const { slug, lessonId, eventType } = body;

    if (slug || lessonId) {
      // Targeted invalidation for the specific modified lesson
      invalidateLessonCache(slug || lessonId);
      if (slug) {
        revalidatePath(`/lesson/${slug}`, "page");
      }
    } else {
      // Full invalidation fallback
      invalidateLessonCache();
    }

    // Invalidate roadmap and layouts if structure changed (e.g. INSERT / DELETE)
    if (eventType === "INSERT" || eventType === "DELETE" || !eventType) {
      revalidatePath("/roadmap", "page");
      revalidatePath("/", "layout");
    }

    revalidateTag("content");

    return NextResponse.json({
      success: true,
      revalidated: true,
      targetedSlug: slug || lessonId || "all",
      eventType: eventType || "ALL",
      timestamp: Date.now(),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  invalidateLessonCache();
  revalidatePath("/", "layout");
  return NextResponse.json({
    success: true,
    revalidated: true,
    targetedSlug: "all",
    timestamp: Date.now(),
  });
}
