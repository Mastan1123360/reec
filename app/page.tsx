import { getCurriculumNavLessons, getRoadmapStatus } from "@/lib/content/discover";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { DashboardPhase, DashboardLesson } from "@/components/dashboard/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [roadmap, lessons] = await Promise.all([getRoadmapStatus(), getCurriculumNavLessons()]);

  const dashboardLessons: DashboardLesson[] = lessons.map((l) => ({
    slug: l.slug.join("/"),
    path: l.path,
    title: l.frontmatter.title,
    subtitle: l.frontmatter.subtitle ?? undefined,
    phase: l.frontmatter.phase,
    week: l.frontmatter.week ?? undefined,
    day: l.frontmatter.day ?? undefined,
    tags:
      l.frontmatter.tags && l.frontmatter.tags.length > 0
        ? l.frontmatter.tags
        : [`Phase ${String(l.frontmatter.phase).padStart(2, "0")}`],
    description: l.frontmatter.subtitle ?? l.frontmatter.description ?? l.frontmatter.title,
    estimated_time: l.frontmatter.estimated_time ?? undefined,
    difficulty: l.frontmatter.difficulty ?? undefined,
    category: l.frontmatter.category ?? undefined,
    learning_objectives: l.frontmatter.learning_objectives ?? undefined,
  }));

  const phases: DashboardPhase[] = roadmap.map((p) => {
    const phaseLessons = dashboardLessons.filter((l) => l.phase === p.phase);
    return {
      phaseNumber: p.phase,
      title: p.title,
      tagline: p.description,
      hasContent: p.hasContent,
      lessons: phaseLessons,
    };
  });

  return (
    <DashboardShell
      phases={phases}
      allLessons={dashboardLessons}
    />
  );
}
