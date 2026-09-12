/**
 * lib/domain/lesson/types.ts
 *
 * Implements Master Engineering Specification Section 17:
 * LESSON MODEL
 *
 * A lesson should conceptually contain:
 * Lesson
 * ├── identity
 * ├── hierarchy
 * ├── content
 * ├── concepts
 * ├── examples
 * ├── challenges
 * ├── metadata
 * └── completion semantics
 *
 * Separate:
 * - lesson exists
 * - lesson loaded
 * - lesson viewed
 * - lesson started
 * - lesson completed
 *
 * Invariant: These are different conceptual states. Do not use one boolean to represent multiple meanings.
 */

export interface LessonIdentity {
  readonly id: string; // e.g. "P0-W1-D1"
  readonly slug: string; // e.g. "phase-00/week-01/day-01"
  readonly path: string; // e.g. "Phase-00/Week-01/Day-01.md"
}

export interface LessonHierarchy {
  readonly phase: number;
  readonly week: number;
  readonly day: number;
  readonly order: number;
}

export interface LessonConcept {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
}

export interface LessonExample {
  readonly id: string;
  readonly title: string;
  readonly code: string;
  readonly explanation: string;
}

export interface LessonChallenge {
  readonly id: string;
  readonly title: string;
  readonly prompt: string;
  readonly starterCode: string;
  readonly solutionCode?: string;
}

export interface LessonMetadata {
  readonly title: string;
  readonly description: string;
  readonly durationMinutes: number;
  readonly difficulty: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  readonly tags: readonly string[];
  readonly badge?: string;
  readonly isHidden?: boolean;
}

export interface LessonCompletionSemantics {
  readonly requiredBlockIds: readonly string[];
  readonly requiredChallengeIds: readonly string[];
  readonly requiresLiveExecution: boolean;
}

export interface Lesson {
  readonly identity: LessonIdentity;
  readonly hierarchy: LessonHierarchy;
  readonly content: string;
  readonly concepts: readonly LessonConcept[];
  readonly examples: readonly LessonExample[];
  readonly challenges: readonly LessonChallenge[];
  readonly metadata: LessonMetadata;
  readonly completionSemantics: LessonCompletionSemantics;
}

/**
 * The 5 independent conceptual lifecycle dimensions of a lesson.
 * Invariant: Never use one boolean to represent multiple meanings.
 */
export interface LessonLifecycleState {
  /** 1. Exists: Declared and recognized in the official curriculum manifest */
  readonly exists: boolean;
  /** 2. Loaded: Markdown and AST content fetched and parsed into memory */
  readonly loaded: boolean;
  /** 3. Viewed: User has actively navigated to and rendered this lesson */
  readonly viewed: boolean;
  /** 4. Started: User has engaged with exercises, runnable blocks, or study logs */
  readonly started: boolean;
  /** 5. Completed: All explicit completion semantics have been validated */
  readonly completed: boolean;
}

export function createInitialLessonLifecycleState(overrides?: Partial<LessonLifecycleState>): LessonLifecycleState {
  return {
    exists: true,
    loaded: false,
    viewed: false,
    started: false,
    completed: false,
    ...overrides,
  };
}

// Explicit domain predicates
export const isLessonExists = (state: LessonLifecycleState): boolean => state.exists;
export const isLessonLoaded = (state: LessonLifecycleState): boolean => state.loaded;
export const isLessonViewed = (state: LessonLifecycleState): boolean => state.viewed;
export const isLessonStarted = (state: LessonLifecycleState): boolean => state.started;
export const isLessonCompleted = (state: LessonLifecycleState): boolean => state.completed;
