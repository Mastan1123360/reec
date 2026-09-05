/**
 * lib/content/types.ts
 *
 * The lesson contract. Every markdown lesson file's YAML front matter is
 * validated against LessonFrontmatter. This is the single source of truth
 * for what a lesson author is allowed (and required) to declare.
 */

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface WidgetRef {
  /** Widget registry key, e.g. "ownership-visualizer" */
  type: string;
  /** Arbitrary props forwarded to the widget component */
  props?: Record<string, unknown>;
}

export interface ProjectRef {
  id: string;
  name: string;
  difficulty: Difficulty;
  major?: boolean;
}

export interface FailureLabRef {
  id: string;
  name: string;
  path: string; // content-relative path to the failure lab lesson
}

export interface ReadingRef {
  title: string;
  source?: string;
  url?: string;
}

export interface HiddenLessonTrigger {
  type: "code_execution" | "lesson_completion" | "project_completion" | string;
  lessonId?: string;
  challengeId?: string;
  blockId?: string;
  executionRequirement?: "execution_attempt" | "successful_run";
}

export interface HiddenLessonMeta {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  category?: string;
  tags: string[];
  badge?: string;
  trigger: HiddenLessonTrigger;
}

export interface HiddenLessonFrontmatterEntry {
  id: string;
  type?: "hidden-lesson" | string;
  title: string;
  subtitle?: string;
  description?: string;
  estimated_time?: string | number;
  difficulty?: Difficulty | string;
  learning_objectives?: string[];
  widgets?: (string | WidgetRef)[];
  hidden?: boolean | { enabled: boolean };
  trigger?: {
    type?: string;
    challenge_id?: string;
    challengeId?: string;
    executable_block_id?: string;
    block_id?: string;
    blockId?: string;
    requirement?: "execution_attempt" | "successful_run";
    execution_requirement?: "execution_attempt" | "successful_run";
    executionRequirement?: "execution_attempt" | "successful_run";
    lesson_id?: string;
    lessonId?: string;
  };
  tags?: string[];
  reading?: any[];
  badge?: string;
  slug?: string;
}

/** Raw shape as authored in YAML front matter (all optional-safe). */
export interface LessonFrontmatterInput {
  id: string;
  phase: number;
  week?: number;
  day?: number;
  title: string;
  subtitle?: string;
  description?: string;
  category?: string;
  difficulty?: Difficulty;
  estimated_time?: string;
  learning_objectives?: string[];
  prerequisites?: string[];
  widgets?: WidgetRef[];
  project?: ProjectRef;
  failure_lab?: FailureLabRef;
  tags?: string[];
  key_terms?: string[];
  reading?: ReadingRef[];
  next?: string;
  previous?: string;
  published?: boolean;
  hidden?: boolean;
  badge?: string;
  slug?: string;
  trigger?: HiddenLessonTrigger;
  hidden_lessons?: HiddenLessonFrontmatterEntry[];
}

/** Normalized, fully-defaulted lesson metadata used throughout the app. */
export interface LessonFrontmatter extends Required<
  Pick<
    LessonFrontmatterInput,
    "id" | "phase" | "title" | "published"
  >
> {
  week: number | null;
  day: number | null;
  subtitle: string | null;
  description: string | null;
  category: string | null;
  difficulty: Difficulty;
  estimated_time: string | null;
  learning_objectives: string[];
  prerequisites: string[];
  widgets: WidgetRef[];
  project: ProjectRef | null;
  failure_lab: FailureLabRef | null;
  tags: string[];
  key_terms: string[];
  reading: ReadingRef[];
  next: string | null;
  previous: string | null;
  hidden: boolean;
  badge: string | null;
  slug: string | null;
  trigger: HiddenLessonTrigger | null;
  hidden_lessons?: HiddenLessonFrontmatterEntry[];
}

/**
 * Lightweight, wire-efficient lesson representation for navigation shells,
 * sidebars, roadmaps, and dashboards. Prevents dumping heavy raw Markdown
 * and parsed block AST into the browser bundle.
 */
export interface NavLesson {
  id: string;
  path: string;
  slug: string[];
  frontmatter: {
    id: string;
    phase: number;
    week?: number | null;
    day?: number | null;
    title: string;
    subtitle?: string | null;
    description?: string | null;
    estimated_time?: string | null;
    difficulty?: Difficulty;
    category?: string | null;
    tags?: string[];
    hidden?: boolean;
    published?: boolean;
    learning_objectives?: string[];
  };
  readingTimeMinutes?: number;
}

/** A single semantic REEC block extracted from the lesson body. */
export interface ReecBlock {
  /** e.g. "story", "mental-model", "compiler-thinking" */
  kind: string;
  /** Optional title supplied as the directive's label, e.g. :::story[The Broken Mental Model] */
  title?: string;
  /** Raw markdown content inside the block (rendered separately per-widget) */
  markdown: string;
  /** Rendered HTML for the block's inner markdown */
  html: string;
  /** Stable id for deep-linking / progress tracking */
  id: string;
  /** Raw source of the first fenced code block inside this block, if any
   * — used to seed the Code Workspace editor with real, runnable source
   * rather than HTML-highlighted markup. */
  codeSource?: string;
  codeLang?: string;
  codeExecutable?: boolean;
  challengeId?: string;
  lessonId?: string;
  blockId?: string;
  triggerId?: string;
}

/** A lesson section: a heading-delimited chunk of the document, which may
 * itself contain interleaved prose, REEC blocks, and standalone code. */
export interface LessonSection {
  id: string;
  heading: string;
  depth: number;
  /** Ordered list of content nodes: prose HTML, a REEC block, or a
   * standalone (non-directive) fenced code block promoted to its own
   * node so the engine can attach SmartCode behavior to it. */
  nodes: Array<
    | { type: "prose"; html: string }
    | { type: "block"; block: ReecBlock }
    | { type: "code"; code: CodeNode }
  >;
}

export interface CodeNode {
  id: string;
  lang: string;
  source: string;
  html: string;
  executable?: boolean;
  meta?: string;
  challengeId?: string;
  lessonId?: string;
  blockId?: string;
  triggerId?: string;
}

export interface Lesson {
  frontmatter: LessonFrontmatter;
  /** Content-relative slug array, e.g. ["Phase-00","Week-01","Day-01"] */
  slug: string[];
  /** URL path, e.g. "/lesson/phase-00/week-01/day-01" */
  path: string;
  sections: LessonSection[];
  /** All blocks flattened, in document order */
  blocks: ReecBlock[];
  /** Estimated reading time in minutes, derived from word count */
  readingTimeMinutes: number;
  /** Plain-text excerpt for search indexing */
  excerpt: string;
  rawWordCount: number;
  /** Co-located hidden lessons parsed into independent Lesson objects */
  hiddenLessons?: Lesson[];
  /** Complete raw markdown source from Supabase canonical store */
  rawContent?: string;
  /** SHA-256 hash of raw markdown content */
  contentHash?: string;
}

export interface PhaseSummary {
  phase: number;
  title: string;
  lessonCount: number;
  weeks: number[];
}
