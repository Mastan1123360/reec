/**
 * lib/domain/progress/rules.ts
 *
 * Implements Master Engineering Specification Section 18:
 * PROGRESS MODEL (Conceptual Rule Engine)
 *
 * The conceptual layer decides: what constitutes progress.
 * The internal layer persists it.
 * The external layer displays it.
 *
 * Invariant: Do not allow arbitrary components to mutate "progress" directly
 * without going through the conceptual rules.
 */

import type {
  LearningProgressEvent,
  LessonStartedEvent,
  LessonCompletedEvent,
  ProjectCompletedEvent,
  MilestoneReachedEvent,
} from "./events";

export interface DerivedProgressState {
  readonly startedLessons: ReadonlySet<string>;
  readonly completedLessons: ReadonlySet<string>;
  readonly completedProjects: ReadonlySet<string>;
  readonly reachedMilestones: ReadonlySet<string>;
  readonly totalCurriculumLessons: number;
  readonly completedCount: number;
  readonly startedCount: number;
  readonly completionPercentage: number;
  readonly lastEventTimestamp: string | null;
}

export function evaluateProgressRules(
  events: readonly LearningProgressEvent[],
  totalCurriculumLessons = 42
): DerivedProgressState {
  const started = new Set<string>();
  const completed = new Set<string>();
  const completedProjects = new Set<string>();
  const milestones = new Set<string>();
  let lastTimestamp: string | null = null;

  for (const event of events) {
    if (event.timestamp) {
      if (!lastTimestamp || new Date(event.timestamp) > new Date(lastTimestamp)) {
        lastTimestamp = event.timestamp;
      }
    }

    switch (event.type) {
      case "LessonStarted":
        started.add(event.lessonId);
        break;

      case "LessonCompleted":
        // A completed lesson is also inherently started
        started.add(event.lessonId);
        completed.add(event.lessonId);
        break;

      case "ProjectCompleted":
        completedProjects.add(event.projectId);
        break;

      case "MilestoneReached":
        milestones.add(event.milestoneId);
        break;
    }
  }

  const completedCount = completed.size;
  const startedCount = started.size;
  const rawPercent =
    totalCurriculumLessons > 0 ? (completedCount / totalCurriculumLessons) * 100 : 0;
  const completionPercentage = Math.min(100, Math.round(rawPercent));

  return {
    startedLessons: started,
    completedLessons: completed,
    completedProjects,
    reachedMilestones: milestones,
    totalCurriculumLessons,
    completedCount,
    startedCount,
    completionPercentage,
    lastEventTimestamp: lastTimestamp,
  };
}
