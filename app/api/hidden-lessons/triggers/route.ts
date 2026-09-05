import { NextResponse } from "next/server";
import { getHiddenLessonTriggers } from "@/lib/content/discover";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const triggers = await getHiddenLessonTriggers();
    return NextResponse.json({ triggers });
  } catch (error) {
    console.error("[api/hidden-lessons/triggers] Error loading triggers:", error);
    return NextResponse.json({ triggers: [], error: "Failed to load triggers" }, { status: 500 });
  }
}
