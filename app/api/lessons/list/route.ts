import { NextResponse } from "next/server";
import { getCurriculumNavLessons } from "@/lib/content/discover";

export const dynamic = "force-dynamic";

export async function GET() {
  const lessons = await getCurriculumNavLessons();
  return NextResponse.json(
    lessons.map((l) => ({
      path: l.path,
      title: l.frontmatter.title,
      subtitle: l.frontmatter.subtitle,
      phase: l.frontmatter.phase,
      readingTimeMinutes: l.readingTimeMinutes,
    }))
  );
}
