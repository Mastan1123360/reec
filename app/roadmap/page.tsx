import { getCurriculumNavLessons, getRoadmapStatus } from "@/lib/content/discover";
import { RoadmapNavigator } from "@/components/roadmap/RoadmapNavigator";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Curriculum Roadmap — REEC Academy",
  description: "Explore the nine-phase engineering curriculum roadmap in Rust with hierarchical phase, week, and lesson navigation.",
};

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams?: { phase?: string } | Promise<{ phase?: string }>;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const [roadmap, lessons] = await Promise.all([
    getRoadmapStatus(),
    getCurriculumNavLessons(),
  ]);

  const initialPhase = resolvedSearchParams?.phase !== undefined ? Number(resolvedSearchParams.phase) : 0;

  return (
    <RoadmapNavigator
      roadmap={roadmap}
      lessons={lessons}
      initialPhase={isNaN(initialPhase) ? 0 : initialPhase}
    />
  );
}
