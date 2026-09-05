import { getCurriculumNavLessons } from "@/lib/content/discover";
import { CURRICULUM_ROADMAP, roadmapTitleForPhase } from "@/lib/content/roadmap";
import { CurriculumShell } from "@/components/CurriculumShell";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Clock, ChevronRight, Clock3, Layers, BookOpen, ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import { notFound } from "next/navigation";
import type { Lesson, NavLesson } from "@/lib/content/types";
import { PhaseLockWall } from "@/components/auth/PhaseLockWall";

export async function generateStaticParams() {
  return CURRICULUM_ROADMAP.map((p) => ({ phaseId: String(p.phase) }));
}

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function PhasePage({ params }: { params: { phaseId?: string } | Promise<{ phaseId?: string }> }) {
  const resolvedParams = await Promise.resolve(params);
  const rawId = String(resolvedParams?.phaseId || "").trim().toLowerCase();
  const cleaned = rawId.replace(/^phase-?/, "").replace(/^p-?/, "").replace(/^0+(?=\d)/, "");
  const phaseNum = cleaned === "" || cleaned === "00" || cleaned === "0" ? 0 : Number(cleaned);

  const roadmapEntry = Number.isInteger(phaseNum)
    ? CURRICULUM_ROADMAP.find((p) => p.phase === phaseNum)
    : CURRICULUM_ROADMAP.find((p) => String(p.phase) === rawId);

  if (!roadmapEntry) {
    notFound();
  }

  const resolvedPhaseNum = roadmapEntry.phase;
  const lessons = await getCurriculumNavLessons();
  const phaseLessons = lessons.filter((l) => l.frontmatter.phase === resolvedPhaseNum);

  // Group lessons by week
  const weekMap = new Map<number, (Lesson | NavLesson)[]>();
  for (const lesson of phaseLessons) {
    const w = lesson.frontmatter.week ?? 1;
    if (!weekMap.has(w)) {
      weekMap.set(w, []);
    }
    weekMap.get(w)!.push(lesson);
  }
  const weekNumbers = Array.from(weekMap.keys()).sort((a, b) => a - b);

  const totalReadingTime = phaseLessons.reduce((acc, l) => acc + (l.readingTimeMinutes || 0), 0);

  return (
    <CurriculumShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:px-8 lg:px-10 pb-28 sm:pb-32 lg:pb-10 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/roadmap" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft size={13} />
            <span>Curriculum Roadmap</span>
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Phase {String(resolvedPhaseNum).padStart(2, "0")}</span>
        </div>

        {/* Phase Header Card */}
        <div className="rounded-[22px] border border-border/70 bg-card/75 dark:bg-[#0b1220]/80 p-5 sm:p-7 backdrop-blur-xl shadow-md space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                Phase {String(resolvedPhaseNum).padStart(2, "0")}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {phaseLessons.length} {phaseLessons.length === 1 ? "lesson" : "lessons"}
              </span>
            </div>
            {totalReadingTime > 0 && (
              <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-lg border border-border/50">
                <Clock size={13} />
                <span>~{totalReadingTime} mins total</span>
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            {roadmapTitleForPhase(resolvedPhaseNum)}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {roadmapEntry.description}
          </p>
        </div>

        {/* Content Section */}
        {phaseLessons.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-border/70 py-16 px-6 text-center bg-card/40">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground border border-border/60">
              <Clock3 size={24} />
            </div>
            <div className="text-sm font-bold text-foreground">Curriculum in Production</div>
            <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
              Lessons for Phase {resolvedPhaseNum} are scheduled. You can explore available lessons in Phase 00 and Phase 01.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/roadmap"
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-all"
              >
                <Layers size={13} />
                <span>View Full Roadmap</span>
              </Link>
              <Link
                href="/phase/0"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all"
              >
                <span>Start Phase 00</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        ) : (
          <PhaseLockWall
            phaseNumber={resolvedPhaseNum}
            phaseTitle={roadmapTitleForPhase(resolvedPhaseNum)}
          >
            <div className="space-y-6">
              {weekNumbers.map((weekNum) => {
                const weekLessons = weekMap.get(weekNum) ?? [];
                return (
                  <div
                    key={weekNum}
                    className="rounded-[20px] border border-border/70 bg-card/60 dark:bg-[#0c1424]/60 overflow-hidden shadow-sm backdrop-blur-md"
                  >
                    {/* Week Banner */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/40 dark:bg-white/[0.02]">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15 text-primary text-xs font-mono font-bold border border-primary/20">
                          W{weekNum}
                        </div>
                        <h2 className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
                          Week {String(weekNum).padStart(2, "0")}
                        </h2>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {weekLessons.length} {weekLessons.length === 1 ? "lesson" : "lessons"}
                      </span>
                    </div>

                    {/* Lessons List */}
                    <div className="divide-y divide-border/40">
                      {weekLessons.map((lesson) => (
                        <Link
                          key={lesson.path}
                          href={lesson.path}
                          className="group flex items-center justify-between gap-3 p-3 sm:p-4 transition-all hover:bg-primary/[0.04] dark:hover:bg-primary/[0.08]"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            {lesson.frontmatter.day && (
                              <span className="mt-0.5 flex h-6 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-mono font-semibold text-muted-foreground border border-border/50 group-hover:border-primary/40 group-hover:text-primary transition-colors">
                                Day {String(lesson.frontmatter.day).padStart(2, "0")}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                {lesson.frontmatter.title}
                              </h3>
                              {lesson.frontmatter.subtitle && (
                                <p className="truncate text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                                  {lesson.frontmatter.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                            <span className="hidden sm:flex items-center gap-1 font-mono text-[11px]">
                              <Clock size={12} /> {lesson.readingTimeMinutes}m
                            </span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary transition-all">
                              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </PhaseLockWall>
        )}
      </div>
    </CurriculumShell>
  );
}

