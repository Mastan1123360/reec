/**
 * lib/domain/roadmap/types.ts
 *
 * Implements Master Engineering Specification Section 21:
 * ROADMAP
 *
 * The roadmap conceptually represents curriculum structure and user progress separately.
 *
 * Curriculum
 *     ↓
 * Roadmap structure (Immutable)
 *
 * User Learning State
 *     ↓
 * Roadmap progress (Dynamic projection)
 *
 * Invariant: Do NOT mutate curriculum structure when recording user progress.
 */

export interface RoadmapLessonNode {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly day: number;
  readonly durationMinutes: number;
  readonly difficulty: "Beginner" | "Intermediate" | "Advanced" | "Expert";
}

export interface RoadmapWeekStructure {
  readonly weekNumber: number;
  readonly title: string;
  readonly lessons: readonly RoadmapLessonNode[];
}

export interface RoadmapPhaseStructure {
  readonly phaseNumber: number;
  readonly title: string;
  readonly description: string;
  readonly weeks: readonly RoadmapWeekStructure[];
  readonly totalLessons: number;
}

/**
 * Immutable Curriculum Structure definition.
 * Authoritative blueprint of the curriculum that never mutates with user activity.
 */
export interface RoadmapStructure {
  readonly phases: readonly RoadmapPhaseStructure[];
  readonly totalCurriculumLessons: number;
}

export interface PhaseProgress {
  readonly phaseNumber: number;
  readonly completedCount: number;
  readonly totalCount: number;
  readonly percentage: number;
  readonly isCompleted: boolean;
}

/**
 * User Learning State projection for the roadmap.
 */
export interface RoadmapProgress {
  readonly completedLessonIds: ReadonlySet<string>;
  readonly startedLessonIds: ReadonlySet<string>;
  readonly currentLessonId: string | null;
  readonly phaseProgress: ReadonlyMap<number, PhaseProgress>;
  readonly overallPercentage: number;
}

export interface ProjectedLessonNode extends RoadmapLessonNode {
  readonly isCompleted: boolean;
  readonly isStarted: boolean;
  readonly isCurrent: boolean;
}

export interface ProjectedPhaseNode {
  readonly phaseNumber: number;
  readonly title: string;
  readonly description: string;
  readonly progress: PhaseProgress;
  readonly weeks: readonly {
    readonly weekNumber: number;
    readonly title: string;
    readonly lessons: readonly ProjectedLessonNode[];
  }[];
}

export interface ProjectedRoadmapView {
  readonly phases: readonly ProjectedPhaseNode[];
  readonly totalLessons: number;
  readonly completedLessonsCount: number;
  readonly overallPercentage: number;
}

/**
 * Authoritatively projects User Learning State onto the immutable Curriculum Roadmap Structure.
 * Guarantee: Neither parameter is mutated.
 */
export function projectRoadmapProgress(
  structure: RoadmapStructure,
  userState: {
    completedLessons: ReadonlySet<string>;
    startedLessons: ReadonlySet<string>;
    currentLesson: string | null;
  }
): ProjectedRoadmapView {
  let totalCompleted = 0;

  const phases: ProjectedPhaseNode[] = structure.phases.map((phase) => {
    let phaseCompletedCount = 0;
    let phaseTotalCount = 0;

    const weeks = phase.weeks.map((week) => {
      const lessons: ProjectedLessonNode[] = week.lessons.map((lesson) => {
        phaseTotalCount++;
        const isCompleted = userState.completedLessons.has(lesson.id) || userState.completedLessons.has(lesson.slug);
        const isStarted = isCompleted || userState.startedLessons.has(lesson.id) || userState.startedLessons.has(lesson.slug);
        const isCurrent = userState.currentLesson === lesson.id || userState.currentLesson === lesson.slug;

        if (isCompleted) {
          phaseCompletedCount++;
          totalCompleted++;
        }

        return {
          ...lesson,
          isCompleted,
          isStarted,
          isCurrent,
        };
      });

      return {
        weekNumber: week.weekNumber,
        title: week.title,
        lessons,
      };
    });

    const phasePercentage = phaseTotalCount > 0 ? Math.round((phaseCompletedCount / phaseTotalCount) * 100) : 0;

    return {
      phaseNumber: phase.phaseNumber,
      title: phase.title,
      description: phase.description,
      progress: {
        phaseNumber: phase.phaseNumber,
        completedCount: phaseCompletedCount,
        totalCount: phaseTotalCount,
        percentage: phasePercentage,
        isCompleted: phaseCompletedCount === phaseTotalCount && phaseTotalCount > 0,
      },
      weeks,
    };
  });

  const overallPercentage =
    structure.totalCurriculumLessons > 0
      ? Math.min(100, Math.round((totalCompleted / structure.totalCurriculumLessons) * 100))
      : 0;

  return {
    phases,
    totalLessons: structure.totalCurriculumLessons,
    completedLessonsCount: totalCompleted,
    overallPercentage,
  };
}
