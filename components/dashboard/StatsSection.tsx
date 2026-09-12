"use client";

import * as React from "react";
import Link from "next/link";
import {
  Flame,
  Clock,
  CheckCircle2,
  Trophy,
  ArrowRight,
  Play,
  Sparkles,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useProgressStore } from "@/lib/progress/store";
import { StudySessionModal } from "./StudySessionModal";
import type { DashboardPhase } from "./types";
import { cn } from "@/lib/utils";

interface StatsSectionProps {
  phases: DashboardPhase[];
}

export function StatsSection({ phases }: StatsSectionProps) {
  const [timeframe, setTimeframe] = React.useState<"week" | "month">("week");
  const [modalOpen, setModalOpen] = React.useState(false);

  const completedLessons = useProgressStore((s) => s.completedLessons);
  const studyTimeMinutes = useProgressStore((s) => s.studyTimeMinutes);
  const getStreak = useProgressStore((s) => s.getStreak);
  const getWeekDailyMinutes = useProgressStore((s) => s.getWeekDailyMinutes);
  const getMonthWeeklyMinutes = useProgressStore((s) => s.getMonthWeeklyMinutes);
  const lastVisited = useProgressStore((s) => s.lastVisited);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const totalLessons = React.useMemo(() => {
    return phases.reduce((acc, p) => acc + (p.lessons?.length || 0), 0);
  }, [phases]);

  const completedCount = mounted ? (completedLessons?.size || 0) : 0;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Study time formatted
  const totalMins = mounted ? Math.round(studyTimeMinutes || 0) : 0;
  const hoursFormatted = totalMins >= 60 ? `${(totalMins / 60).toFixed(1)}h` : `${totalMins}m`;

  const streak = mounted
    ? getStreak()
    : { current: 0, best: 0, daysStatus: [false, false, false, false, false, false, false], todayActive: false };

  // Real Histogram calculation
  const weekRecords = mounted ? getWeekDailyMinutes() : [];
  const monthRecords = mounted ? getMonthWeeklyMinutes() : [];

  // Max value for scaling heights
  const maxWeekMins = Math.max(...weekRecords.map((w) => w.minutes), 30);
  const maxMonthMins = Math.max(...monthRecords.map((m) => m.minutes), 60);

  // Find next lesson to continue
  const nextLessonHref = React.useMemo(() => {
    if (lastVisited) {
      if (lastVisited.startsWith("/")) return lastVisited;
      return `/lesson/${lastVisited}`;
    }
    for (const phase of phases) {
      for (const l of phase.lessons) {
        if (!completedLessons?.has(l.path)) {
          return l.path;
        }
      }
    }
    return phases[0]?.lessons[0]?.path ?? "/phase/0";
  }, [lastVisited, phases, completedLessons]);

  return (
    <section className="space-y-6">
      {/* Welcome Banner with Quick Resume Button & Practice Controls */}
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-r from-primary/[0.08] via-card/80 to-card/60 p-6 sm:p-8 backdrop-blur-2xl shadow-xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles size={13} />
              <span>Rust Engineering Mastery</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {completedCount > 0 ? "Welcome back, Engineer" : "Begin Your Systems Engineering Path"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {completedCount > 0
                ? `${completedCount} of ${totalLessons} lessons completed. Track your active study time and maintain your streak.`
                : "Zero to professional systems engineer. Author real Rust code, study low-level memory architectures, and master concurrency."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card/80 px-4 py-3.5 text-xs sm:text-sm font-medium text-foreground hover:bg-accent transition-colors shadow-sm"
              title="Manage study logs & reset progress"
            >
              <SlidersHorizontal size={15} />
              <span>Time Controls</span>
            </button>

            <Link
              href={nextLessonHref}
              className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play size={16} className="fill-current" />
              <span>{completedCount > 0 ? "Resume Learning" : "Start Curriculum"}</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Interactive Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Hours of Study with Interactive Real Chart */}
        <div className="rounded-3xl border border-border/70 bg-card/70 dark:bg-[#0d1424]/75 p-6 backdrop-blur-2xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Clock size={18} className="text-primary shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Study Time
              </span>
            </div>

            {/* Timeframe pill selector */}
            <div className="flex items-center rounded-full border border-border/70 bg-muted/40 p-0.5 text-[11px] font-medium">
              <button
                onClick={() => setTimeframe("week")}
                className={cn(
                  "rounded-full px-2.5 py-0.5 transition-all",
                  timeframe === "week"
                    ? "bg-card text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Week
              </button>
              <button
                onClick={() => setTimeframe("month")}
                className={cn(
                  "rounded-full px-2.5 py-0.5 transition-all",
                  timeframe === "month"
                    ? "bg-card text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Month
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-mono">
                {hoursFormatted}
              </span>
              <span className="text-sm font-medium text-muted-foreground">logged</span>
            </div>
            <p className="text-xs text-muted-foreground/80 mt-0.5">
              Real-time auto-tracked learning session
            </p>
          </div>

          {/* Real Histogram Bars */}
          <div className="h-16 flex items-end justify-between gap-2 pt-2 border-t border-border/40">
            {timeframe === "week"
              ? weekRecords.map((bar, idx) => {
                  const heightPct = maxWeekMins > 0 ? Math.max(8, Math.round((bar.minutes / maxWeekMins) * 100)) : 8;
                  const hasStudy = bar.minutes > 0;

                  return (
                    <div key={idx} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end group">
                      <div
                        className="w-full rounded-t-md transition-all duration-300 relative"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: bar.isToday
                            ? "hsl(var(--primary))"
                            : hasStudy
                            ? "hsl(var(--primary) / 0.5)"
                            : "hsl(var(--primary) / 0.15)",
                        }}
                        title={`${bar.label}: ${Math.round(bar.minutes)} mins`}
                      >
                        {bar.isToday && (
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary ring-2 ring-background" />
                        )}
                      </div>
                      <span className={cn("text-[10px] font-mono", bar.isToday ? "font-bold text-primary" : "text-muted-foreground/70")}>
                        {bar.label}
                      </span>
                    </div>
                  );
                })
              : monthRecords.map((bar, idx) => {
                  const heightPct = maxMonthMins > 0 ? Math.max(8, Math.round((bar.minutes / maxMonthMins) * 100)) : 8;
                  const hasStudy = bar.minutes > 0;

                  return (
                    <div key={idx} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end group">
                      <div
                        className="w-full rounded-t-md transition-all duration-300 relative"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: bar.isCurrentWeek
                            ? "hsl(var(--primary))"
                            : hasStudy
                            ? "hsl(var(--primary) / 0.5)"
                            : "hsl(var(--primary) / 0.15)",
                        }}
                        title={`${bar.label}: ${Math.round(bar.minutes)} mins`}
                      >
                        {bar.isCurrentWeek && (
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary ring-2 ring-background" />
                        )}
                      </div>
                      <span className={cn("text-[10px] font-mono", bar.isCurrentWeek ? "font-bold text-primary" : "text-muted-foreground/70")}>
                        {bar.label}
                      </span>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Card 2: Active Streak */}
        <div className="rounded-3xl border border-border/70 bg-card/70 dark:bg-[#0d1424]/75 p-6 backdrop-blur-2xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Flame size={18} className="text-amber-500 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Daily Streak
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Trophy size={13} className="text-amber-500/80" />
              <span>Best: {streak.best}d</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-mono">
                {streak.current}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {streak.current === 1 ? "day streak" : "days in a row"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground/80 mt-0.5">
              {streak.todayActive
                ? "Active today! Streak maintained."
                : "Complete a lesson or practice today to keep your streak."}
            </p>
          </div>

          {/* 7 Days Activity Indicators */}
          <div className="pt-3 border-t border-border/40">
            <div className="flex items-center justify-between gap-1">
              {streak.daysStatus.map((active, idx) => {
                const isLast = idx === streak.daysStatus.length - 1; // today
                return (
                  <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center text-[10px] transition-all",
                        active
                          ? "bg-primary text-primary-foreground font-bold shadow-sm shadow-primary/30"
                          : isLast
                          ? "border-2 border-dashed border-primary/50 text-muted-foreground"
                          : "bg-muted/70 text-muted-foreground border border-border/60"
                      )}
                      title={active ? "Active" : "No activity"}
                    >
                      {active ? "✓" : isLast ? "•" : idx + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 3: Lessons Completed & Overall Progress */}
        <div className="rounded-3xl border border-border/70 bg-card/70 dark:bg-[#0d1424]/75 p-6 backdrop-blur-2xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Curriculum Progress
              </span>
            </div>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {progressPercent}% Done
            </span>
          </div>

          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-mono">
                {completedCount}
              </span>
              <span className="text-sm font-medium text-muted-foreground">/ {totalLessons} lessons</span>
            </div>
            <p className="text-xs text-muted-foreground/80 mt-0.5">
              {phases.length} phases across memory, concurrency & systems
            </p>
          </div>

          {/* Progress Bar with Phase markers */}
          <div className="pt-3 border-t border-border/40 space-y-2">
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/80 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-sky-400 transition-all duration-500"
                style={{ width: `${Math.max(progressPercent > 0 ? 5 : 0, progressPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>Phase 00</span>
              <span>Phase 04</span>
              <span>Phase 08</span>
            </div>
          </div>
        </div>
      </div>

      {/* Study Session & Time Modal */}
      <StudySessionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
