"use client";
import { CheckCircle2, Circle, PartyPopper, Github, ListTodo } from "lucide-react";
import { useProgressStore } from "@/lib/progress/store";
import type { Lesson } from "@/lib/content/types";
import type { LessonSemanticModel } from "@/lib/semantic/model";
import { Button } from "@/components/ui/button";

export function CompletionSummary({ lesson, model }: { lesson: Lesson; model: LessonSemanticModel }) {
  const completedBlocks = useProgressStore((s) => s.completedBlocks);
  const isLessonDone = useProgressStore((s) => s.completedLessons.has(lesson.path));
  const toggleLesson = useProgressStore((s) => s.toggleLesson);

  const challenges = model.inventory["mini-challenge"]?.blocks ?? [];
  const doneChallenges = challenges.filter((c) => completedBlocks.has(c.id)).length;
  const project = lesson.frontmatter.project;

  return (
    <section
      className="mt-14 rounded-[22px] border border-slate-200/60 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c1322]/75 p-6 sm:p-7 backdrop-blur-xl backdrop-saturate-150 shadow-xs"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 4px 20px -2px rgba(0, 0, 0, 0.03)",
      }}
    >
      <div className="mb-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <PartyPopper size={14} className="text-slate-500 dark:text-slate-400" /> Completion Summary
      </div>

      {challenges.length > 0 && (
        <div className="mb-5 rounded-2xl border border-slate-200/50 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] p-4 backdrop-blur-md">
          <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <ListTodo size={14} className="text-slate-500 dark:text-slate-400" /> Practice checklist ({doneChallenges}/{challenges.length})
          </div>
          <ul className="space-y-1.5">
            {challenges.map((c, idx) => {
              const done = completedBlocks.has(c.id);
              return (
                <li key={`${c.id}-${idx}`} className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  {done ? (
                    <CheckCircle2 size={14} className="shrink-0 text-slate-700 dark:text-slate-300" />
                  ) : (
                    <Circle size={14} className="shrink-0 opacity-40 text-slate-400" />
                  )}
                  <span>{c.title ?? "Mini challenge"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {project && (
        <div className="mb-5 rounded-2xl border border-slate-200/50 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] p-4 backdrop-blur-md">
          <div className="mb-1 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
            Project deliverable: {project.name}
            {project.major && <span className="ml-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">[Major]</span>}
          </div>
          <a
            href={`https://github.com/search?q=${encodeURIComponent(project.name)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
          >
            <Github size={13} /> Reference implementations on GitHub
          </a>
        </div>
      )}

      <Button
        variant={isLessonDone ? "default" : "outline"}
        size="sm"
        onClick={() => toggleLesson(lesson.path)}
      >
        <CheckCircle2 size={14} />
        {isLessonDone ? "Lesson marked complete" : "Mark this lesson complete"}
      </Button>
    </section>
  );
}
