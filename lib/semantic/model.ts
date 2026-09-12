/**
 * lib/semantic/model.ts
 *
 * Lesson Parser (existing)  --->  Lesson Semantic Model (new)
 *
 * This is the layer the brief calls "identify main concepts, learning
 * objectives, mental models, code examples, ... key terminology,
 * dependencies on previous lessons." It runs entirely on data the parser
 * already extracted (frontmatter + blocks + sections) — no network call,
 * no LLM — because structural analysis of an already-parsed document is
 * a deterministic function, and making it non-deterministic would only
 * make the platform slower and flakier for no benefit. The next layer
 * (`interpreter.ts`) is where "how should this be taught" decisions live;
 * this layer only answers "what is in this lesson."
 */

import type { Lesson, ReecBlock } from "@/lib/content/types";
import { matchConcepts, type ConceptNode } from "./ontology";

export interface BlockInventoryEntry {
  kind: string;
  count: number;
  blocks: ReecBlock[];
}

export interface LessonSemanticModel {
  lessonPath: string;
  title: string;
  subtitle: string | null;
  difficulty: number;
  estimatedMinutes: number;
  learningObjectives: string[];
  prerequisiteIds: string[];
  tags: string[];
  keyTerms: string[];
  /** REEC blocks grouped by kind, in document order within each group. */
  inventory: Record<string, BlockInventoryEntry>;
  codeBlockCount: number;
  hasCode: boolean;
  hasOwnershipContent: boolean;
  hasBorrowingContent: boolean;
  hasCompilerThinking: boolean;
  hasProject: boolean;
  hasHistoricalContext: boolean;
  hasEngineeringNotes: boolean;
  hasReflection: boolean;
  hasExercises: boolean;
  /** Concept ontology nodes this lesson touches, in canonical chain order. */
  concepts: ConceptNode[];
  /** A short, human-readable synopsis pulled from the first story/mental
   * model block (or the lesson subtitle as a fallback) — used to seed
   * "Today's Mission" copy without requiring an author to write it twice. */
  missionSynopsis: string;
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "your",
  "have", "will", "what", "when", "where", "which", "does", "doesn't",
  "isn't", "it's", "a", "an", "of", "to", "in", "on", "is", "are", "be",
]);

/** Pulls candidate technical terms out of inline `code` spans that recur
 * across the lesson body — a cheap, deterministic stand-in for "extract
 * key terminology" that needs no model call and degrades gracefully
 * (worst case: a slightly noisy term list, never a missing one). */
function extractKeyTerms(lesson: Lesson, explicit: string[]): string[] {
  if (explicit.length > 0) return explicit;
  const codeSpanRe = /<code>([^<]{2,32})<\/code>/g;
  const counts = new Map<string, number>();
  const allHtml = lesson.sections
    .flatMap((s) => s.nodes)
    .map((n) => (n.type === "prose" ? n.html : n.type === "block" ? n.block.html : n.code.html))
    .join(" ");
  let match: RegExpExecArray | null;
  while ((match = codeSpanRe.exec(allHtml))) {
    const term = match[1].trim();
    if (!term || STOPWORDS.has(term.toLowerCase()) || /[(){}<>;=]/.test(term)) continue;
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term]) => term);
}

function firstSynopsis(lesson: Lesson): string {
  const story = lesson.blocks.find((b) => b.kind === "story");
  const mental = lesson.blocks.find((b) => b.kind === "mental-model");
  const source = story ?? mental;
  if (source) {
    const text = source.markdown.replace(/\s+/g, " ").trim();
    return text.length > 260 ? text.slice(0, 257).trimEnd() + "…" : text;
  }
  return lesson.frontmatter.subtitle ?? lesson.excerpt;
}

export function buildSemanticModel(lesson: Lesson): LessonSemanticModel {
  const { frontmatter, blocks } = lesson;

  const inventory: Record<string, BlockInventoryEntry> = {};
  for (const block of blocks) {
    if (!inventory[block.kind]) inventory[block.kind] = { kind: block.kind, count: 0, blocks: [] };
    inventory[block.kind].count += 1;
    inventory[block.kind].blocks.push(block);
  }

  const codeBlockCount = lesson.sections
    .flatMap((s) => s.nodes)
    .filter((n) => n.type === "code").length;

  const keyTerms = extractKeyTerms(lesson, frontmatter.key_terms);

  const conceptHaystack = [
    frontmatter.title,
    frontmatter.subtitle ?? "",
    ...frontmatter.tags,
    ...keyTerms,
  ];
  const concepts = matchConcepts(conceptHaystack);

  return {
    lessonPath: lesson.path,
    title: frontmatter.title,
    subtitle: frontmatter.subtitle,
    difficulty: frontmatter.difficulty,
    estimatedMinutes:
      frontmatter.estimated_time != null
        ? parseInt(frontmatter.estimated_time, 10) || lesson.readingTimeMinutes
        : lesson.readingTimeMinutes,
    learningObjectives: frontmatter.learning_objectives,
    prerequisiteIds: frontmatter.prerequisites,
    tags: frontmatter.tags,
    keyTerms,
    inventory,
    codeBlockCount,
    hasCode: codeBlockCount > 0 || !!inventory["worked-example"],
    hasOwnershipContent: conceptHaystack.some((h) => /ownership|move-semantics/i.test(h)),
    hasBorrowingContent: conceptHaystack.some((h) => /borrow/i.test(h)),
    hasCompilerThinking: !!inventory["compiler-thinking"],
    hasProject: !!frontmatter.project || !!inventory["project"],
    hasHistoricalContext: !!inventory["historical-context"],
    hasEngineeringNotes: !!inventory["engineering-note"],
    hasReflection: !!inventory["reflection"],
    hasExercises: !!inventory["mini-challenge"],
    concepts,
    missionSynopsis: firstSynopsis(lesson),
  };
}
