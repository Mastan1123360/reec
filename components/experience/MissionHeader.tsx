"use client";
import { Clock, Target, ListChecks, Bookmark, CheckCircle2, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProgressStore } from "@/lib/progress/store";
import type { Lesson } from "@/lib/content/types";
import type { LessonSemanticModel } from "@/lib/semantic/model";
import type { ExperiencePlan } from "@/lib/semantic/interpreter";

const DIFFICULTY_LABEL: Record<number, string> = {
  1: "★☆☆☆☆",
  2: "★★☆☆☆",
  3: "★★★☆☆",
  4: "★★★★☆",
  5: "★★★★★",
};

export function MissionHeader({
  lesson,
  model,
  plan,
}: {
  lesson: Lesson;
  model: LessonSemanticModel;
  plan: ExperiencePlan;
}) {
  const { frontmatter } = lesson;
  const isDone = useProgressStore((s) => s.completedLessons.has(lesson.path));
  const isBookmarked = useProgressStore((s) => s.bookmarks.has(lesson.path));
  const toggleLesson = useProgressStore((s) => s.toggleLesson);
  const toggleBookmark = useProgressStore((s) => s.toggleBookmark);

  return (
    <header
      className="mb-10 rounded-[24px] border border-slate-200/60 dark:border-white/[0.08] bg-white/75 dark:bg-[#0c1322]/80 p-6 sm:p-8 backdrop-blur-2xl backdrop-saturate-150 shadow-xs"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 4px 20px -2px rgba(0, 0, 0, 0.03)",
      }}
    >
      <div className="mb-3.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Badge variant="default">Phase {frontmatter.phase}</Badge>
        {frontmatter.week && <Badge variant="secondary">Week {frontmatter.week}</Badge>}
        {frontmatter.day && <Badge variant="secondary">Day {frontmatter.day}</Badge>}
        <span className="flex items-center gap-1 font-mono text-[11px]">
          <Clock size={12} className="text-slate-400" /> {model.estimatedMinutes} min
        </span>
        <span className="text-slate-400 dark:text-slate-500 font-mono tracking-widest text-[11px]">
          {DIFFICULTY_LABEL[model.difficulty]}
        </span>
      </div>

      <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-slate-900/[0.06] dark:border-white/[0.08] bg-slate-900/[0.04] dark:bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
        <Compass size={13} className="text-slate-500 dark:text-slate-400" />
        <span>Today&rsquo;s Mission</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
        {plan.missionTitle}
      </h1>
      {frontmatter.subtitle && (
        <p className="mt-2 text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium">
          {frontmatter.subtitle}
        </p>
      )}
      {plan.missionSynopsis && (
        <p className="mt-3.5 max-w-2xl text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {plan.missionSynopsis}
        </p>
      )}

      {model.learningObjectives.length > 0 && (
        <div
          className="mt-6 rounded-2xl border border-slate-200/60 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.03] p-4 sm:p-5 backdrop-blur-md"
          style={{
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.4)",
          }}
        >
          <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Target size={14} className="text-slate-500 dark:text-slate-400" /> Learning Objectives
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            {model.learningObjectives.map((obj, i) => (
              <li key={i} className="flex gap-2 items-start">
                <ListChecks size={14} className="mt-0.5 shrink-0 text-slate-500 dark:text-slate-400" />
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {model.keyTerms.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Key concepts:</span>
          {model.keyTerms.map((t, idx) => (
            <Badge key={`${t}-${idx}`} variant="outline" className="font-mono text-[10.5px]">
              {t}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2.5 pt-4 border-t border-slate-200/50 dark:border-white/[0.06]">
        <Button
          variant={isDone ? "default" : "outline"}
          size="sm"
          onClick={() => toggleLesson(lesson.path)}
        >
          <CheckCircle2 size={14} />
          {isDone ? "Completed" : "Mark lesson complete"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleBookmark(lesson.path)}
        >
          <Bookmark size={14} fill={isBookmarked ? "currentColor" : "none"} />
          {isBookmarked ? "Bookmarked" : "Bookmark"}
        </Button>
      </div>
    </header>
  );
}
