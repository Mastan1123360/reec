"use client";

import * as React from "react";
import Link from "next/link";
import { Box, ChevronRight, MoreHorizontal } from "lucide-react";
import type { DashboardLesson } from "./types";
import { useProgressStore } from "@/lib/progress/store";
import { useIsMounted } from "@/lib/hooks/useIsMounted";

interface CurrentModuleWidgetProps {
  allLessons: DashboardLesson[];
}

export function CurrentModuleWidget({ allLessons }: CurrentModuleWidgetProps) {
  const isMounted = useIsMounted();
  const lastVisited = useProgressStore((s) => s.lastVisited);
  const completedLessons = useProgressStore((s) => s.completedLessons);

  // Find real current module by priority
  const currentLesson = React.useMemo(() => {
    if (!allLessons || allLessons.length === 0) return null;

    if (!isMounted) {
      return allLessons[0];
    }

    // 1. Last visited lesson
    if (lastVisited) {
      const match = allLessons.find(
        (l) =>
          l.path === lastVisited ||
          l.slug === lastVisited ||
          `/lesson/${l.slug}` === lastVisited
      );
      if (match) return match;
    }

    // 2. First unfinished lesson
    const firstUnfinished = allLessons.find(
      (l) => !completedLessons?.has(l.path)
    );
    if (firstUnfinished) return firstUnfinished;

    // 3. Fallback to first lesson
    return allLessons[0];
  }, [allLessons, lastVisited, completedLessons, isMounted]);

  if (!currentLesson) {
    return (
      <div
        className="rounded-[22px] border border-slate-900/[0.06] dark:border-white/[0.07] bg-white/68 dark:bg-[#0b1220]/75 p-3 sm:p-3.5 xl:p-4 backdrop-blur-xl backdrop-saturate-160 flex flex-col justify-between"
        style={{
          boxShadow: "var(--glass-specular), var(--glass-shadow)",
        }}
      >
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100">
            Current Module
          </h3>
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">
          No lessons found in repository.
        </div>
      </div>
    );
  }

  const isCompleted = isMounted && completedLessons?.has(currentLesson.path);
  const progressPct = isCompleted ? 100 : 0;
  const chips =
    currentLesson.tags && currentLesson.tags.length > 0
      ? currentLesson.tags.slice(0, 3)
      : [`Phase ${String(currentLesson.phase).padStart(2, "0")}`, "Core Engine"];

  return (
    <div
      className="rounded-[22px] border border-slate-900/[0.06] dark:border-white/[0.07] bg-white/68 dark:bg-[#0b1220]/75 p-3 sm:p-3.5 xl:p-4 backdrop-blur-xl backdrop-saturate-160 flex flex-col justify-between transition-all duration-200"
      style={{
        boxShadow: "var(--glass-specular), var(--glass-shadow)",
      }}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5">
          <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100">
            Current Module
          </h3>
          <button
            aria-label="More options"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
          >
            <MoreHorizontal size={15} />
          </button>
        </div>

        {/* Module Content */}
        <div className="flex items-start gap-2.5 pt-0.5">
          <Box size={18} className="stroke-[1.75] text-slate-700 dark:text-slate-300 shrink-0 mt-0.5" />

          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-[12.5px] font-bold text-slate-900 dark:text-slate-100 truncate">
              {currentLesson.title}
            </h4>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {currentLesson.subtitle ||
                currentLesson.description ||
                "Foundational systems engineering"}
            </p>

            {/* Chips (Glass tags) */}
            <div className="flex flex-wrap gap-1 mt-1">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded border border-slate-900/[0.05] dark:border-white/[0.06] bg-slate-200/40 dark:bg-white/[0.04] px-1.5 py-0.5 text-[8.5px] font-mono font-medium text-slate-600 dark:text-slate-300 truncate max-w-[100px] backdrop-blur-xs"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-slate-200/50 dark:bg-white/[0.08] overflow-hidden border border-slate-900/[0.04] dark:border-white/[0.03]">
            <div
              className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-400">
            {progressPct}%
          </span>
        </div>
      </div>

      {/* Action Button: Continue Module → */}
      <div className="mt-2.5">
        <Link
          href={currentLesson.path || `/lesson/${currentLesson.slug}`}
          className="group flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-900/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.05] py-1.5 px-3 text-[11px] font-bold text-slate-800 dark:text-slate-200 shadow-xs hover:border-slate-300 dark:hover:border-white/20 hover:bg-white/95 dark:hover:bg-white/[0.09] hover:text-slate-900 dark:hover:text-white transition-all active:scale-[0.99] backdrop-blur-md"
          style={{
            boxShadow: "var(--glass-inner-highlight)",
          }}
        >
          <span>Continue Module</span>
          <ChevronRight
            size={13}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </div>
  );
}
