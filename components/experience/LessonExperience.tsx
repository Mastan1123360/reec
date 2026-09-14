"use client";

/**
 * components/experience/LessonExperience.tsx
 *
 * This is the "Learning Experience Generator" step from the pipeline:
 *
 *   Lesson (parsed)
 *     → buildSemanticModel()      "what is in this lesson"
 *     → interpretLesson()         "how should this be taught"
 *     → LessonExperience           assembles the concrete React modules
 *
 * The author never touches this file and never sees its output structure
 * in their markdown — dropping a new .md under /content is still the
 * entire authoring workflow. Every module below is switched on/off by the
 * interpreter's ExperiencePlan, so a lesson with no code gets no Practice
 * module scaffold, a lesson with no historical-context block gets no
 * timeline, etc. — the study session is generated per lesson, not
 * templated identically for all of them.
 */

import * as React from "react";
import { buildSemanticModel } from "@/lib/semantic/model";
import { interpretLesson } from "@/lib/semantic/interpreter";
import type { Lesson } from "@/lib/content/types";
import { useProgressStore } from "@/lib/progress/store";

import { MissionHeader } from "./MissionHeader";
import { ConceptMap } from "./ConceptMap";
import { CompletionSummary } from "./CompletionSummary";
import { NextLessonPreview } from "./NextLessonPreview";
import { NextLessonPrefetch } from "./NextLessonPrefetch";
import { LessonRenderer } from "@/components/LessonRenderer";
import { PhaseLockWall } from "@/components/auth/PhaseLockWall";
import { LessonFullscreenProvider } from "./LessonFullscreenContext";

interface LessonExperienceProps {
  lesson: Lesson;
  prevLesson?: { path: string; title: string } | null;
  nextLesson?: { path: string; title: string; subtitle?: string | null; readingTimeMinutes?: number | string | null } | null;
}

export function LessonExperience({ lesson, prevLesson, nextLesson }: LessonExperienceProps) {
  const model = buildSemanticModel(lesson);
  const plan = interpretLesson(model);

  const setLastVisited = useProgressStore((s) => s.setLastVisited);
  React.useEffect(() => {
    if (lesson?.path && lesson.frontmatter?.title) {
      setLastVisited(lesson.path, lesson.frontmatter.title);
    }
  }, [lesson?.path, lesson?.frontmatter?.title, setLastVisited]);

  const phaseNumber = lesson.frontmatter.phase ?? 0;

  return (
    <LessonFullscreenProvider lesson={lesson} prevLesson={prevLesson} nextLesson={nextLesson}>
      <PhaseLockWall
        phaseNumber={phaseNumber}
        phaseTitle={`Phase ${String(phaseNumber).padStart(2, "0")}`}
        lessonTitle={lesson.frontmatter.title}
      >
        <MissionHeader lesson={lesson} model={model} plan={plan} />

        {plan.capabilities.conceptMap && <ConceptMap concepts={model.concepts} />}

        {/* "Interactive Reading" — the existing widget-driven renderer,
            now additionally passed the plan so it can attach per-block
            visualizer enhancements (EnhancementStrip) where the
            interpreter decided they apply. */}
        <LessonRenderer lesson={lesson} plan={plan} />

        <CompletionSummary lesson={lesson} model={model} />
        <NextLessonPreview lesson={lesson} prevLesson={prevLesson} nextLesson={nextLesson} />
        <NextLessonPrefetch nextPath={nextLesson?.path} />
      </PhaseLockWall>
    </LessonFullscreenProvider>
  );
}
