/**
 * lib/domain/learning/types.ts
 *
 * Implements Master Engineering Specification Section 16:
 * LEARNING DOMAIN
 *
 * Separate authentication from learning.
 * Authentication answers: "Who is this user?"
 * Learning state answers: "What has this user done?"
 *
 * Define conceptually:
 * LearningState
 * ├── currentLesson
 * ├── startedLessons
 * ├── completedLessons
 * ├── progress
 * ├── bookmarks
 * ├── projects
 * ├── activity
 * └── milestones
 *
 * Invariant: Do not mix learning state into authentication state.
 */

import type { Bookmark } from "@/lib/domain/bookmarks/types";
import type { LearningProject } from "@/lib/domain/projects/types";

export interface ActivityLogEntry {
  readonly id: string;
  readonly type: "lesson_started" | "lesson_completed" | "project_milestone" | "code_execution" | "study_session";
  readonly title: string;
  readonly timestamp: string;
  readonly metadata?: Record<string, unknown>;
}

export interface LearningMilestone {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly phase: number;
  readonly isReached: boolean;
  readonly reachedAt: string | null;
}

export interface LearningProgressSummary {
  readonly totalLessons: number;
  readonly completedCount: number;
  readonly startedCount: number;
  readonly completionPercentage: number;
  readonly studyTimeMinutes: number;
  readonly streakDays: number;
}

export interface LearningState {
  /** The current active lesson path or identifier being studied */
  readonly currentLesson: string | null;
  /** Set of unique lesson IDs that the user has started */
  readonly startedLessons: ReadonlySet<string>;
  /** Set of unique lesson IDs that the user has verified as completed */
  readonly completedLessons: ReadonlySet<string>;
  /** Calculated learning progress metrics */
  readonly progress: LearningProgressSummary;
  /** User's saved learning bookmarks */
  readonly bookmarks: readonly Bookmark[];
  /** User's course projects and implementation milestones */
  readonly projects: readonly LearningProject[];
  /** Historical timeline of learning activities */
  readonly activity: readonly ActivityLogEntry[];
  /** Curriculum and personal learning milestones */
  readonly milestones: readonly LearningMilestone[];
}

/**
 * Creates an empty, initial LearningState.
 * Invariant: Completely independent of authentication state.
 */
export function createInitialLearningState(): LearningState {
  return {
    currentLesson: null,
    startedLessons: new Set<string>(),
    completedLessons: new Set<string>(),
    progress: {
      totalLessons: 42,
      completedCount: 0,
      startedCount: 0,
      completionPercentage: 0,
      studyTimeMinutes: 0,
      streakDays: 0,
    },
    bookmarks: [],
    projects: [],
    activity: [],
    milestones: [],
  };
}
