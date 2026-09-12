"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  ArrowRight,
  Clock3,
  ChevronRight,
  Sparkles,
  Zap,
} from "lucide-react";
import type { DashboardLesson } from "./types";
import { useProgressStore } from "@/lib/progress/store";
import { useIsMounted } from "@/lib/hooks/useIsMounted";

interface ContinueLearningCardProps {
  allLessons: DashboardLesson[];
}

export function ContinueLearningCard({ allLessons }: ContinueLearningCardProps) {
  const isMounted = useIsMounted();
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const lastVisited = useProgressStore((s) => s.lastVisited);

  // Derive active / current mission:
  // 1. Last visited lesson if available
  // 2. Or first uncompleted lesson
  // 3. Or first lesson
  const { currentMission, upNextLessons } = React.useMemo(() => {
    if (!allLessons || allLessons.length === 0) {
      return { currentMission: null, upNextLessons: [] };
    }

    let mission: DashboardLesson | undefined;
    if (isMounted && lastVisited) {
      mission = allLessons.find((l) => l.path === lastVisited);
    }

    if (!mission && isMounted && completedLessons) {
      mission = allLessons.find((l) => !completedLessons.has(l.path));
    }

    if (!mission) {
      mission = allLessons[0];
    }

    // Up next: lessons following the current mission
    const missionIdx = allLessons.findIndex((l) => l.path === mission?.path);
    const following = missionIdx >= 0 ? allLessons.slice(missionIdx + 1) : allLessons.slice(1);
    const uncompletedFollowing = isMounted && completedLessons
      ? following.filter((l) => !completedLessons.has(l.path))
      : following;

    const upNext = (uncompletedFollowing.length > 0 ? uncompletedFollowing : following).slice(0, 2);

    return { currentMission: mission, upNextLessons: upNext };
  }, [allLessons, isMounted, lastVisited, completedLessons]);

  if (!currentMission) {
    return null;
  }

  const phaseTag = `PHASE ${String(currentMission.phase).padStart(2, "0")}`;
  const isMissionDone = Boolean(isMounted && completedLessons?.has(currentMission.path));
  const estimatedTime = currentMission.estimated_time || "15m";
  const missionChips = currentMission.tags && currentMission.tags.length > 0
    ? currentMission.tags.slice(0, 3)
    : ["foundations", "systems", "rust"];

  return (
    <div className="rounded-2xl glass-surface p-4 sm:p-5 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-900/[0.05] dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="flex h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Continue Learning
          </h3>
          <span className="hidden sm:inline-block text-[10.5px] font-mono font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-500/20">
            Active Mission
          </span>
        </div>

        <Link
          href={`/phase/${currentMission.phase}`}
          className="group flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
        >
          <span>View Phase</span>
          <ChevronRight
            size={12}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      {/* Main Content Layout: Hero Mission + Up Next */}
      <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Primary Featured Current Mission (Hero) */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between rounded-xl glass-elevated p-4 sm:p-4.5 transition-all duration-300 relative overflow-hidden group">
          {/* Subtle Accent Radial Glow */}
          <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-blue-500/10 dark:bg-blue-500/15 blur-2xl" />

          <div className="relative z-10">
            {/* Mission Badge & Phase */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase">
                {phaseTag}
              </span>
              <span className="flex items-center gap-1 text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
                <Clock3 size={11} className="shrink-0" />
                <span>{estimatedTime}</span>
              </span>
            </div>

            {/* Mission Title */}
            <h4 className="mt-1.5 text-sm sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug line-clamp-2">
              {currentMission.title}
            </h4>

            {/* Mission Synopsis */}
            {currentMission.description && (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {currentMission.description}
              </p>
            )}

            {/* Chips */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {missionChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-md border border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-400"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="relative z-10 mt-4 pt-3 border-t border-slate-900/[0.05] dark:border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {isMissionDone ? "Module completed · review" : "In progress"}
            </span>

            <Link
              href={currentMission.path}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs shadow-blue-500/25 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>{isMissionDone ? "Review Lesson" : "Resume Mission"}</span>
              <ArrowRight size={13} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Up Next Shelf */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Zap size={11} className="text-amber-500" />
              <span>Up Next</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
              In sequence
            </span>
          </div>

          {upNextLessons.length > 0 ? (
            upNextLessons.map((nxt, idx) => (
              <Link
                key={nxt.path || idx}
                href={nxt.path}
                className="group flex-1 flex flex-col justify-between rounded-xl glass-elevated p-3 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Phase {String(nxt.phase).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock3 size={10} />
                      {nxt.estimated_time || "15m"}
                    </span>
                  </div>
                  <h5 className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                    {nxt.title}
                  </h5>
                </div>

                <div className="mt-2 flex items-center justify-end">
                  <span className="text-[10.5px] font-semibold text-slate-500 group-hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 flex items-center gap-1 transition-colors">
                    <span>Jump to lesson</span>
                    <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="flex-1 rounded-xl glass-elevated p-4 flex flex-col items-center justify-center text-center">
              <Sparkles size={18} className="text-blue-500 mb-1" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                You are on track!
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Explore the next phase in the curriculum roadmap.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
