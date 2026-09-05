export type HiddenLessonStatus = "unlocked_unopened" | "opened";

export interface HiddenLessonStateItem {
  lessonId: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  badge?: string | null;
  tags?: string[];
  status: HiddenLessonStatus;
  unlockedAt: number;
  openedAt?: number | null;
  sourceLessonId?: string | null;
  triggerSource?: string;
  triggerExecutionId?: string;
  triggerType?: string;
  triggerDescription?: string | null;
}

export interface ExecutionEvent {
  operation: "run" | "check" | "build" | "test" | "format" | string;
  attemptId: string;
  status: "success" | "error" | "cancelled";
  language: "rust" | string;
  lessonId?: string;
  challengeId?: string;
  blockId?: string;
  triggerId?: string;
  source: string;
  timestamp: number;
  hasCompilerError?: boolean;
}

export interface HiddenLessonTriggerConfig {
  type: "code_execution" | "lesson_completion" | "project_completion" | string;
  lessonId?: string;
  challengeId?: string;
  blockId?: string;
  executionRequirement?: "execution_attempt" | "successful_run";
}

export interface HiddenLessonManifestItem {
  hiddenLessonId: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  badge?: string | null;
  tags: string[];
  sourceLessonId?: string | null;
  trigger: HiddenLessonTriggerConfig;
}

