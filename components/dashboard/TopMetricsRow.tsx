"use client";

import * as React from "react";
import { TrendingUp, Flame, Clock, BookOpen, Activity } from "lucide-react";
import type { DashboardLesson } from "./types";
import { useProgressStore } from "@/lib/progress/store";
import { useIsMounted } from "@/lib/hooks/useIsMounted";
import { cn } from "@/lib/utils";

export function OverallProgressCard({
  allLessons,
}: {
  allLessons: DashboardLesson[];
}) {
  const isMounted = useIsMounted();
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const totalLessons = allLessons?.length || 42;
  const completedCount = isMounted && completedLessons ? completedLessons.size : 0;
  const progressPct =
    totalLessons > 0
      ? Math.min(100, Math.round((completedCount / totalLessons) * 100))
      : 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl glass-elevated p-3.5 xl:p-4 flex flex-col justify-between transition-all duration-300 group hover:-translate-y-0.5"
    >
      {/* Subtle Blue Semantic Accent Glow */}
      <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-blue-500/10 dark:bg-blue-500/15 blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-[11px] xl:text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wide">
              Overall Progress
            </span>
          </div>
          <Activity size={14} className="text-slate-400 dark:text-slate-400" />
        </div>

        <div className="mt-2 flex items-baseline">
          <span className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {progressPct}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-200/70 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="relative z-10 mt-2.5 text-[10.5px] xl:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-400 shrink-0" />
        <span>{`${completedCount} / ${totalLessons} modules completed`}</span>
      </div>
    </div>
  );
}

export function CurrentStreakCard() {
  const isMounted = useIsMounted();
  const activeDates = useProgressStore((s) => s.activeDates);
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const getStreak = useProgressStore((s) => s.getStreak);
  const markTodayActive = useProgressStore((s) => s.markTodayActive);

  // Re-compute streak info in real-time when activeDates or completedLessons change
  const streakInfo = React.useMemo(() => {
    if (!isMounted || !getStreak) {
      return { current: 0, best: 0, daysStatus: [false, false, false, false, false, false, false], todayActive: false };
    }
    // Access dependencies to trigger real-time re-calculation
    const _datesCount = activeDates.length;
    const _lessonsCount = completedLessons?.size || 0;
    void _datesCount;
    void _lessonsCount;
    return getStreak();
  }, [isMounted, getStreak, activeDates, completedLessons]);

  const streakDays = streakInfo.current;
  const bestStreak = Math.max(streakDays, streakInfo.best || 0);

  // Sequential 7-day progressive streak marked strictly from left to right (Slot 0 -> Slot 6)
  const filledCount = Math.min(7, streakDays);

  return (
    <div
      className="relative overflow-hidden rounded-2xl glass-elevated p-3.5 xl:p-4 flex flex-col justify-between transition-all duration-300 group hover:-translate-y-0.5"
    >
      {/* Subtle Amber Semantic Accent Glow */}
      <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-amber-500/10 dark:bg-amber-500/15 blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
            <span className="text-[11px] xl:text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wide">
              Current Streak
            </span>
          </div>

          {/* Real-time Status / Quick Check-in Pill */}
          {!streakInfo.todayActive ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                markTodayActive();
              }}
              title="Click to check in today"
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all cursor-pointer active:scale-95"
            >
              Check in
            </button>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Active today
            </span>
          )}
        </div>

        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {streakDays}
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {streakDays === 1 ? "day" : "days"}
          </span>
        </div>

        {/* 7-day Streak Progress Bar / Dots - MARKED STRICTLY FROM LEFT TO RIGHT */}
        <div className="mt-2.5 flex items-center gap-1.5" title={`${filledCount} of 7 weekly streak days completed (left to right)`}>
          {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
            const isMarked = dayIndex < filledCount;
            return (
              <div
                key={dayIndex}
                className={cn(
                  "h-2 flex-1 rounded-full transition-all duration-300",
                  isMarked
                    ? "bg-amber-500 dark:bg-amber-400 shadow-xs shadow-amber-500/40"
                    : "bg-slate-200/80 dark:bg-white/10"
                )}
              />
            );
          })}
        </div>
      </div>

      <div className="relative z-10 mt-2.5 text-[10.5px] xl:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-400 shrink-0" />
        <span>{`Best: ${bestStreak} ${bestStreak === 1 ? "day" : "days"}`}</span>
      </div>
    </div>
  );
}

export function TimeInvestedCard() {
  const isMounted = useIsMounted();
  const studyTimeMinutes = useProgressStore((s) => s.studyTimeMinutes);
  const getWeekDailyMinutes = useProgressStore((s) => s.getWeekDailyMinutes);

  const weekDays = isMounted && getWeekDailyMinutes ? getWeekDailyMinutes() : [];
  const totalMinutes = isMounted ? studyTimeMinutes || 0 : 0;
  const hoursDisplay =
    totalMinutes >= 60
      ? (totalMinutes / 60).toFixed(1).replace(".0", "")
      : "<1";

  const thisWeekMinutes = weekDays.reduce((acc, d) => acc + (d.minutes || 0), 0);
  const thisWeekHoursDisplay =
    thisWeekMinutes > 0
      ? `+${(thisWeekMinutes / 60).toFixed(1)}h this week`
      : "+0.5h this week";

  return (
    <div
      className="relative overflow-hidden rounded-2xl glass-elevated p-3.5 xl:p-4 flex flex-col justify-between transition-all duration-300 group hover:-translate-y-0.5"
    >
      {/* Subtle Emerald Semantic Accent Glow */}
      <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[11px] xl:text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wide">
              Time Invested
            </span>
          </div>

          {/* Glowing blue sine sparkline */}
          <svg width="42" height="16" viewBox="0 0 42 16" fill="none" className="overflow-visible">
            <path
              d="M1 12C6 12 8 4 14 4C20 4 22 14 28 14C34 14 36 6 41 6"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {hoursDisplay}
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            hrs
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-2.5 text-[10.5px] xl:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-400 shrink-0" />
        <span>{thisWeekHoursDisplay}</span>
      </div>
    </div>
  );
}

export function TotalLessonsCard({
  allLessons,
  phasesCount = 9,
}: {
  allLessons: DashboardLesson[];
  phasesCount?: number;
}) {
  const totalCount = allLessons && allLessons.length > 0 ? allLessons.length : 42;

  return (
    <div
      className="relative overflow-hidden rounded-2xl glass-elevated p-3.5 xl:p-4 flex flex-col justify-between transition-all duration-300 group hover:-translate-y-0.5"
    >
      {/* Subtle Indigo Semantic Accent Glow */}
      <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-[11px] xl:text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wide">
              Total Lessons
            </span>
          </div>

          {/* Mini vertical bar visualizer */}
          <div className="flex items-end gap-1 h-4">
            <span className="w-1 rounded-full bg-indigo-500/40 h-2" />
            <span className="w-1 rounded-full bg-indigo-500/60 h-3" />
            <span className="w-1 rounded-full bg-indigo-500 h-4" />
            <span className="w-1 rounded-full bg-indigo-500/80 h-2.5" />
            <span className="w-1 rounded-full bg-indigo-500/50 h-3.5" />
          </div>
        </div>

        <div className="mt-2 flex items-baseline">
          <span className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {totalCount}
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-2.5 text-[10.5px] xl:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-400 shrink-0" />
        <span>Across {phasesCount} structured phases</span>
      </div>
    </div>
  );
}
