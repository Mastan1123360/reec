/**
 * lib/domain/progress/events.ts
 *
 * Implements Master Engineering Specification Section 18:
 * PROGRESS MODEL (Domain Events)
 *
 * Progress must be derived from clearly defined learning events.
 * For example:
 * - LessonStarted
 * - LessonCompleted
 * - ProjectCompleted
 * - MilestoneReached
 */

export interface LessonStartedEvent {
  readonly type: "LessonStarted";
  readonly lessonId: string;
  readonly timestamp: string;
  readonly phase?: number;
}

export interface LessonCompletedEvent {
  readonly type: "LessonCompleted";
  readonly lessonId: string;
  readonly timestamp: string;
  readonly phase?: number;
}

export interface ProjectCompletedEvent {
  readonly type: "ProjectCompleted";
  readonly projectId: string;
  readonly timestamp: string;
  readonly phase: number;
}

export interface MilestoneReachedEvent {
  readonly type: "MilestoneReached";
  readonly milestoneId: string;
  readonly timestamp: string;
  readonly description?: string;
}

export type LearningProgressEvent =
  | LessonStartedEvent
  | LessonCompletedEvent
  | ProjectCompletedEvent
  | MilestoneReachedEvent;

export function createLessonStartedEvent(lessonId: string, phase?: number): LessonStartedEvent {
  return {
    type: "LessonStarted",
    lessonId,
    timestamp: new Date().toISOString(),
    phase,
  };
}

export function createLessonCompletedEvent(lessonId: string, phase?: number): LessonCompletedEvent {
  return {
    type: "LessonCompleted",
    lessonId,
    timestamp: new Date().toISOString(),
    phase,
  };
}

export function createProjectCompletedEvent(projectId: string, phase: number): ProjectCompletedEvent {
  return {
    type: "ProjectCompleted",
    projectId,
    timestamp: new Date().toISOString(),
    phase,
  };
}

export function createMilestoneReachedEvent(milestoneId: string, description?: string): MilestoneReachedEvent {
  return {
    type: "MilestoneReached",
    milestoneId,
    timestamp: new Date().toISOString(),
    description,
  };
}
