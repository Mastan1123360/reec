"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, ChevronRight, CheckCircle2, Flame, Award, ArrowUpRight } from "lucide-react";
import type { DashboardPhase, DashboardLesson } from "./types";
import { useProgressStore } from "@/lib/progress/store";
import { useIsMounted } from "@/lib/hooks/useIsMounted";
import { cn } from "@/lib/utils";

interface UpcomingMilestonesCardProps {
  phases: DashboardPhase[];
  allLessons?: DashboardLesson[];
}

export function UpcomingMilestonesCard({ phases }: UpcomingMilestonesCardProps) {
  const isMounted = useIsMounted();
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const getStreak = useProgressStore((s) => s.getStreak);

  const milestones = React.useMemo(() => {
    const streakInfo = isMounted && getStreak ? getStreak() : { current: 0, best: 0 };
    const list: Array<{
      id: string;
      pill: string;
      pillColor: string;
      title: string;
      progressText: string;
      progressPct: number;
      isDone: boolean;
      href: string;
      icon: typeof Calendar;
    }> = [];

    // Phase 00 milestone (14 lessons)
    const p0 = phases.find((p) => p.phaseNumber === 0);
    const p0Total = 14;
    const p0Done = isMounted && p0 ? p0.lessons.filter((l) => completedLessons?.has(l.path)).length : 0;
    const p0Pct = Math.min(100, Math.round((p0Done / p0Total) * 100));
    list.push({
      id: "phase-00",
      pill: "Phase 00",
      pillColor:
        p0Pct >= 100
          ? "bg-slate-900/[0.08] text-slate-900 dark:bg-white/10 dark:text-white border border-slate-900/10 dark:border-white/15"
          : "bg-slate-900/[0.04] text-slate-700 dark:bg-white/[0.06] dark:text-slate-300 border border-slate-900/[0.06] dark:border-white/[0.08]",
      title: "Complete 14 Phase 00 lessons",
      progressText: `${p0Done} / ${p0Total}`,
      progressPct: p0Pct,
      isDone: p0Pct >= 100,
      href: "/phase/0",
      icon: Award,
    });

    // Phase 01 milestone (28 lessons)
    const p1 = phases.find((p) => p.phaseNumber === 1);
    const p1Total = 28;
    const p1Done = isMounted && p1 ? p1.lessons.filter((l) => completedLessons?.has(l.path)).length : 0;
    const p1Pct = Math.min(100, Math.round((p1Done / p1Total) * 100));
    list.push({
      id: "phase-01",
      pill: "Phase 01",
      pillColor:
        p1Pct >= 100
          ? "bg-slate-900/[0.08] text-slate-900 dark:bg-white/10 dark:text-white border border-slate-900/10 dark:border-white/15"
          : "bg-slate-900/[0.04] text-slate-700 dark:bg-white/[0.06] dark:text-slate-300 border border-slate-900/[0.06] dark:border-white/[0.08]",
      title: "Complete 28 Phase 01 lessons",
      progressText: `${p1Done} / ${p1Total}`,
      progressPct: p1Pct,
      isDone: p1Pct >= 100,
      href: "/phase/1",
      icon: Award,
    });

    // 7-day streak milestone
    const currentStreak = streakInfo.current || 0;
    const streakPct = Math.min(100, Math.round((Math.min(7, currentStreak) / 7) * 100));
    list.push({
      id: "streak-milestone",
      pill: "Build Streak",
      pillColor:
        streakPct >= 100
          ? "bg-slate-900/[0.08] text-slate-900 dark:bg-white/10 dark:text-white border border-slate-900/10 dark:border-white/15"
          : "bg-slate-900/[0.04] text-slate-700 dark:bg-white/[0.06] dark:text-slate-300 border border-slate-900/[0.06] dark:border-white/[0.08]",
      title: "Maintain 7-day streak",
      progressText: `${Math.min(7, currentStreak)} / 7`,
      progressPct: streakPct,
      isDone: streakPct >= 100,
      href: "/progress",
      icon: Flame,
    });

    return list;
  }, [phases, completedLessons, getStreak, isMounted]);

  return (
    <div
      className="rounded-2xl glass-surface p-3.5 xl:p-4 flex flex-col justify-between transition-all"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-slate-500 dark:text-slate-400" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Upcoming Milestones
            </h3>
          </div>

          <Link
            href="/roadmap"
            className="group flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
          >
            <span>View Roadmap</span>
            <ChevronRight
              size={12}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        {/* Milestone Rows */}
        <div className="space-y-2 pt-1">
          {milestones.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.id}
                href={m.href}
                className="group block py-2.5 px-3 rounded-xl glass-elevated transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  {/* Left Pill & Title */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 backdrop-blur-md",
                        m.pillColor
                      )}
                    >
                      <Icon size={10} />
                      <span>{m.pill}</span>
                    </span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors truncate">
                      {m.title}
                    </span>
                  </div>

                  {/* Progress Count & Badge */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      {m.progressText}
                    </span>
                    {m.isDone ? (
                      <CheckCircle2 size={13} className="text-slate-700 dark:text-slate-300 shrink-0" />
                    ) : (
                      <ArrowUpRight size={13} className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors shrink-0" />
                    )}
                  </div>
                </div>

                {/* Progress Bar Line */}
                <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      m.isDone ? "bg-slate-900 dark:bg-white" : "bg-blue-600 dark:bg-blue-500"
                    )}
                    style={{ width: `${m.progressPct}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
