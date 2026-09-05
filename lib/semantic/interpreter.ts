/**
 * lib/semantic/interpreter.ts
 *
 * Lesson Semantic Model (what's in the lesson)
 *        --->  Lesson Interpreter (how it should be taught)
 *        --->  Experience Plan
 *        --->  Learning Experience Generator (components/experience/*)
 *
 * This is a *rule engine*: given the semantic model, it decides which
 * study-session modules to render and which per-block enhancements to
 * turn on (memory visualizer stub for ownership content, borrow-checker
 * stub for borrowing content, etc.) — exactly the "if lesson teaches X,
 * enable Y" mapping described in the brief.
 *
 * Extensibility: adding a new capability is one new `ExperienceModuleId`
 * plus one rule in `interpretLesson`. No lesson file, and no other module,
 * needs to change — this is what makes "adding a widget improves every
 * compatible lesson automatically" true in practice, not just in principle.
 */

import type { LessonSemanticModel } from "./model";

export type ExperienceModuleId =
  | "mission"
  | "concept-map"
  | "reading"
  | "practice"
  | "reflection"
  | "completion"
  | "next-preview";

export interface BlockEnhancement {
  blockId: string;
  kind: string;
  /** Visualizer/interaction stubs to surface alongside this specific block. */
  enhancements: string[];
}

export interface ExperiencePlan {
  modules: ExperienceModuleId[];
  missionTitle: string;
  missionSynopsis: string;
  /** Per-block extra interactive affordances, keyed by block id, derived
   * from concept matches — e.g. ownership content gets a Memory
   * Visualizer + Move/Drop animation affordance attached to the mental
   * model block that introduces it. */
  blockEnhancements: BlockEnhancement[];
  /** Global lesson-level capability flags surfaced in the UI shell. */
  capabilities: {
    smartCode: boolean;
    predictionQuiz: boolean;
    conceptMap: boolean;
    projectTracker: boolean;
    historicalTimeline: boolean;
  };
}

function ownershipEnhancements(model: LessonSemanticModel): string[] {
  const out: string[] = [];
  if (model.hasOwnershipContent) out.push("memory-viewer", "ownership-timeline", "move-drop-animation");
  if (model.hasBorrowingContent) out.push("borrow-checker-simulation", "reference-graph", "nll-timeline");
  return out;
}

export function interpretLesson(model: LessonSemanticModel): ExperiencePlan {
  const modules: ExperienceModuleId[] = ["mission"];
  if (model.concepts.length > 0) modules.push("concept-map");
  modules.push("reading");
  if (model.hasExercises || model.hasCode) modules.push("practice");
  if (model.hasReflection) modules.push("reflection");
  modules.push("completion", "next-preview");

  const enhancementSet = ownershipEnhancements(model);
  const blockEnhancements: BlockEnhancement[] = [];

  // Attach ownership/borrowing enhancement affordances to whichever block
  // actually introduces the concept — the first mental-model or story
  // block, so the visualizer sits next to the explanation it illustrates
  // rather than floating disconnected at the top of the page.
  if (enhancementSet.length > 0) {
    const anchor =
      model.inventory["mental-model"]?.blocks[0] ?? model.inventory["story"]?.blocks[0];
    if (anchor) {
      blockEnhancements.push({ blockId: anchor.id, kind: anchor.kind, enhancements: enhancementSet });
    }
  }

  // Every compiler-thinking block already renders as a reveal-gated
  // PredictionWidget (existing widget) — the interpreter's job here is
  // just declaring the capability on so the UI shell can badge it.
  const predictionQuiz = model.hasCompilerThinking;

  return {
    modules,
    missionTitle: model.title,
    missionSynopsis: model.missionSynopsis,
    blockEnhancements,
    capabilities: {
      smartCode: model.hasCode,
      predictionQuiz,
      conceptMap: model.concepts.length > 0,
      projectTracker: model.hasProject,
      historicalTimeline: model.hasHistoricalContext,
    },
  };
}
