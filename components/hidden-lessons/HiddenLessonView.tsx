"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, Lock, ArrowLeft, Terminal, ShieldCheck, Layers, BookOpen, MapPin } from "lucide-react";
import { LessonExperience } from "@/components/experience/LessonExperience";
import { useHiddenLessonsStore } from "@/lib/hidden-lessons/store";
import type { Lesson } from "@/lib/content/types";

export function HiddenLessonView({ lesson }: { lesson: Lesson }) {
  const isUnlocked = useHiddenLessonsStore((s) => s.isUnlocked);
  const markAsOpened = useHiddenLessonsStore((s) => s.markAsOpened);
  const [mounted, setMounted] = React.useState(false);

  const unlocked =
    mounted &&
    (isUnlocked(lesson.frontmatter.id) ||
      (lesson.frontmatter.slug && isUnlocked(lesson.frontmatter.slug)));

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (
      mounted &&
      (isUnlocked(lesson.frontmatter.id) ||
        (lesson.frontmatter.slug && isUnlocked(lesson.frontmatter.slug)))
    ) {
      markAsOpened(lesson.frontmatter.id);
      if (lesson.frontmatter.slug) {
        markAsOpened(lesson.frontmatter.slug);
      }
    }
  }, [mounted, lesson.frontmatter.id, lesson.frontmatter.slug, isUnlocked, markAsOpened]);

  // Before hydration, render subtle skeleton
  if (!mounted) {
    return (
      <div className="mx-auto max-w-4xl px-3 sm:px-6 py-8 sm:py-12 lg:px-8 text-center text-slate-400">
        <div className="h-10 w-64 mx-auto rounded-xl bg-slate-200/50 dark:bg-white/[0.05] animate-pulse" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-xl px-3 sm:px-6 py-12 sm:py-20 lg:px-8 text-center select-none">
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/[0.1] bg-white/80 dark:bg-[#091122]/80 p-6 sm:p-10 backdrop-blur-2xl shadow-xl">
          <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 mb-4 sm:mb-5">
            <Lock size={26} />
          </div>
          <div className="font-mono text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-2">
            Undiscovered Secret Layer
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            This Deep Dive is Locked
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed max-w-md mx-auto">
            Hidden Lessons are discovered by actively executing code and triggering compiler diagnostic edge cases in curriculum challenges.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/roadmap"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-5 py-2.5 shadow-md shadow-purple-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Explore Curriculum Roadmap</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Derive source lesson navigation if known
  const sourceLessonId = lesson.frontmatter.trigger?.lessonId;
  const sourceLessonPath =
    sourceLessonId === "P1-W3-D2"
      ? "/lesson/phase-01/week-03/day-02"
      : sourceLessonId
      ? `/lesson/${sourceLessonId.toLowerCase()}`
      : "/roadmap";

  return (
    <article className="mx-auto max-w-4xl px-3 sm:px-6 py-5 sm:py-8 lg:px-8 space-y-4 sm:space-y-6">
      {/* Back Navigation Bar with Mobile/Tablet responsive layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all backdrop-blur-md cursor-pointer"
          >
            <MapPin size={13} className="text-purple-500" />
            <span>Curriculum Roadmap</span>
          </Link>

          {sourceLessonId && (
            <Link
              href={sourceLessonPath}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all backdrop-blur-md cursor-pointer truncate"
            >
              <ArrowLeft size={13} />
              <span className="truncate">Source: {sourceLessonId}</span>
            </Link>
          )}
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[11px] sm:text-[11.5px] font-medium text-purple-600 dark:text-purple-400 self-start sm:self-auto">
          <ShieldCheck size={13} />
          <span>Execution Verified Discovery</span>
        </span>
      </div>

      {/* Atmospheric Header Banner for Mobile, Tablet & Desktop */}
      <div className="rounded-2xl border border-purple-500/35 bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-blue-500/5 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-slate-900/40 p-4.5 sm:p-6 backdrop-blur-xl shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-mono font-bold text-xs sm:text-sm tracking-wider shadow-md shadow-purple-500/25 border border-purple-400/40">
              {lesson.frontmatter.badge || "NLL"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                <Sparkles size={12} />
                <span>Hidden Deep Dive · Compiler Internals</span>
              </div>
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                {lesson.frontmatter.title}
              </h1>
              {lesson.frontmatter.subtitle && (
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                  {lesson.frontmatter.subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto shrink-0">
            {(lesson.frontmatter.tags || ["rust", "compiler-thinking"]).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-purple-500/20 dark:border-white/10 bg-white/80 dark:bg-white/[0.05] px-2 py-0.5 text-[9.5px] sm:text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Authoritative Lesson Content */}
      <LessonExperience lesson={lesson} />
    </article>
  );
}
