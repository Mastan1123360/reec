"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock3,
  BookOpen,
  Sparkles,
  ArrowRight,
  Layers,
  Search,
  Filter,
  Check,
  ChevronsUpDown,
  ListFilter,
  Lock,
  Unlock,
  Terminal,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useProgressStore } from "@/lib/progress/store";
import { useHiddenLessonsStore } from "@/lib/hidden-lessons/store";
import { useIsMounted } from "@/lib/hooks/useIsMounted";
import { BackButton } from "@/components/ui/BackButton";
import { cn } from "@/lib/utils";
import type { Lesson, NavLesson } from "@/lib/content/types";
import type { RoadmapStatus } from "@/lib/content/discover";
import { DURATION, EASING, SPRINGS } from "@/lib/motion";
import { useAuth } from "@/lib/supabase/auth-context";

export type RoadmapLesson = Lesson | NavLesson;

interface RoadmapNavigatorProps {
  roadmap: RoadmapStatus[];
  lessons: RoadmapLesson[];
  initialPhase?: number;
}

type FilterStatus = "all" | "in_progress" | "completed" | "upcoming";

export function RoadmapNavigator({
  roadmap,
  lessons,
  initialPhase,
}: RoadmapNavigatorProps) {
  const isMounted = useIsMounted();
  const { user, openAuthModal } = useAuth();
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const toggleLesson = useProgressStore((s) => s.toggleLesson);
  const unlockedHiddenLessonsMap = useHiddenLessonsStore((s) => s.unlockedLessons);
  const isHiddenLessonUnopened = useHiddenLessonsStore((s) => s.isUnopened);

  const [hiddenLessonsExpanded, setHiddenLessonsExpanded] = React.useState(true);

  const unlockedHiddenList = React.useMemo(() => {
    if (!isMounted) return [];
    return Object.values(unlockedHiddenLessonsMap);
  }, [unlockedHiddenLessonsMap, isMounted]);

  const [expandedPhases, setExpandedPhases] = React.useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    if (initialPhase !== undefined) {
      init[initialPhase] = true;
    } else {
      init[0] = true;
    }
    return init;
  });

  const [expandedWeeks, setExpandedWeeks] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    const p = initialPhase ?? 0;
    init[`${p}-1`] = true;
    return init;
  });

  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("all");
  const [activePhaseJump, setActivePhaseJump] = React.useState<number | null>(initialPhase ?? 0);

  const phaseRefs = React.useRef<Record<number, HTMLDivElement | null>>({});

  // Group lessons by phase and week
  const lessonsByPhaseAndWeek = React.useMemo(() => {
    const phaseMap = new Map<number, Map<number, RoadmapLesson[]>>();
    for (const l of lessons) {
      const p = l.frontmatter.phase;
      const w = l.frontmatter.week ?? 1;
      if (!phaseMap.has(p)) {
        phaseMap.set(p, new Map());
      }
      const weekMap = phaseMap.get(p)!;
      if (!weekMap.has(w)) {
        weekMap.set(w, []);
      }
      weekMap.get(w)!.push(l);
    }
    return phaseMap;
  }, [lessons]);

  const togglePhase = (phaseNumber: number) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phaseNumber]: !prev[phaseNumber],
    }));
  };

  const toggleWeek = (phaseNumber: number, weekNumber: number) => {
    const key = `${phaseNumber}-${weekNumber}`;
    setExpandedWeeks((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAll = () => {
    const nextPhases: Record<number, boolean> = {};
    const nextWeeks: Record<string, boolean> = {};
    roadmap.forEach((r) => {
      nextPhases[r.phase] = true;
      const weekMap = lessonsByPhaseAndWeek.get(r.phase);
      if (weekMap) {
        weekMap.forEach((_, w) => {
          nextWeeks[`${r.phase}-${w}`] = true;
        });
      }
    });
    setExpandedPhases(nextPhases);
    setExpandedWeeks(nextWeeks);
  };

  const collapseAll = () => {
    setExpandedPhases({});
    setExpandedWeeks({});
  };

  const scrollToPhase = (phaseNum: number) => {
    setActivePhaseJump(phaseNum);
    setExpandedPhases((prev) => ({ ...prev, [phaseNum]: true }));
    const el = phaseRefs.current[phaseNum];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Total counts across all curriculum
  const totalLessonCount = lessons.length;
  const totalCompleted = isMounted
    ? lessons.filter((l) => completedLessons.has(l.path)).length
    : 0;
  const overallPct =
    totalLessonCount > 0
      ? Math.round((totalCompleted / totalLessonCount) * 100)
      : 0;

  return (
    <div className="h-full overflow-y-auto px-3 sm:px-6 md:px-8 lg:px-10 py-5 sm:py-7 md:py-8 max-w-5xl mx-auto space-y-4 sm:space-y-6 md:space-y-7 scroll-smooth w-full pb-28 sm:pb-32 lg:pb-12">
      {/* 1. Header Banner */}
      <div
        className="relative overflow-hidden rounded-[24px] sm:rounded-[26px] border border-slate-900/[0.06] dark:border-white/[0.07] bg-white/70 dark:bg-[#0b1220]/80 p-4.5 sm:p-6 md:p-8 backdrop-blur-2xl backdrop-saturate-160 transition-all duration-200"
        style={{
          boxShadow: "var(--glass-specular), var(--glass-shadow)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <BackButton fallbackHref="/" label="Return to Dashboard" className="mt-1" />
            <div className="space-y-1.5 sm:space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <Layers size={13} />
                <span>Full Engineering Curriculum</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Curriculum Roadmap
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                Nine-phase rigorous path from computational fundamentals to advanced distributed systems in Rust. Explore by phase and week.
              </p>
            </div>
          </div>

          {/* Overall Stats Pill */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-slate-900/[0.06] dark:border-white/[0.06] pt-3 sm:pt-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Overall Completion
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
              {overallPct}%
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              {totalCompleted} of {totalLessonCount} lessons
            </div>
          </div>
        </div>

        {/* Search input inside banner */}
        <div className="mt-4 sm:mt-5 relative">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all phases, weeks, and lesson titles..."
            className="w-full pl-9 pr-4 py-2 sm:py-2.5 text-xs rounded-xl border border-slate-900/[0.06] dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.04] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 backdrop-blur-md transition-all shadow-xs"
            style={{
              boxShadow: "var(--glass-inner-highlight)",
            }}
          />
        </div>
      </div>

      {/* 2. Interactive Phase Jump & Filter Bar (Sticky / Fluid) */}
      <div
        className="sticky top-2 z-20 rounded-2xl border border-slate-900/[0.06] dark:border-white/[0.07] bg-white/80 dark:bg-[#070c18]/90 p-2 sm:p-2.5 backdrop-blur-2xl backdrop-saturate-180 shadow-md transition-all space-y-2"
        style={{
          boxShadow: "var(--glass-specular), var(--glass-shadow)",
        }}
      >
        {/* Phase Quick Jump Rail */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
            {roadmap.map((entry) => {
              const phaseLessons = lessons.filter((l) => l.frontmatter.phase === entry.phase);
              const doneCount = isMounted
                ? phaseLessons.filter((l) => completedLessons.has(l.path)).length
                : 0;
              const isDone = phaseLessons.length > 0 && doneCount === phaseLessons.length;
              const isActive = activePhaseJump === entry.phase;

              return (
                <button
                  key={entry.phase}
                  onClick={() => scrollToPhase(entry.phase)}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold transition-all select-none active:scale-95",
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : isDone
                      ? "bg-slate-900/[0.08] dark:bg-white/10 text-slate-900 dark:text-white border border-slate-900/10 dark:border-white/15"
                      : "bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/[0.08]"
                  )}
                >
                  {isDone ? <Check size={11} strokeWidth={3} /> : null}
                  <span>P{String(entry.phase).padStart(2, "0")}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Expand / Collapse */}
          <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-slate-900/[0.06] dark:border-white/[0.06]">
            <button
              onClick={expandAll}
              title="Expand all phases"
              className="px-2 py-1 rounded-lg text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              Expand All
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              onClick={collapseAll}
              title="Collapse all phases"
              className="px-2 py-1 rounded-lg text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              Collapse
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-900/[0.04] dark:border-white/[0.04] text-[11px]">
          <span className="text-slate-400 dark:text-slate-500 text-[10.5px] font-mono px-1 flex items-center gap-1">
            <Filter size={11} /> Filter:
          </span>
          {(
            [
              { id: "all", label: "All Phases" },
              { id: "in_progress", label: "In Progress" },
              { id: "completed", label: "Completed" },
              { id: "upcoming", label: "Upcoming" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={cn(
                "px-2.5 py-0.5 rounded-lg font-medium transition-all",
                filterStatus === f.id
                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/30"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2.5 Unlocked Hidden Lessons Section (Placed at the very TOP of the lessons in the roadmap) */}
      {isMounted && (
        <div className="space-y-2">
          {unlockedHiddenList.length > 0 ? (
            <div
              className={cn(
                "rounded-[22px] border transition-all duration-200 overflow-hidden relative",
                "border-purple-500/40 dark:border-purple-400/35 bg-gradient-to-br from-purple-500/[0.08] via-indigo-500/[0.04] to-blue-500/[0.06] dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-[#0b1220]/80 shadow-md backdrop-blur-xl"
              )}
              style={{
                boxShadow: "var(--glass-specular), 0 0 24px -6px rgba(168, 85, 247, 0.15)",
              }}
            >
              {/* Subtle glowing energy line */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />

              {/* Header Accordion Trigger */}
              <button
                type="button"
                onClick={() => setHiddenLessonsExpanded((v) => !v)}
                aria-expanded={hiddenLessonsExpanded}
                className="w-full flex items-center justify-between p-3.5 sm:p-4.5 md:p-5 text-left transition-all hover:bg-purple-500/[0.04] dark:hover:bg-white/[0.02] active:scale-[0.998] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 cursor-pointer"
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0">
                  <div
                    className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-mono text-xs font-extrabold shadow-md shadow-purple-500/25 border border-purple-400/40"
                    style={{
                      boxShadow: "var(--glass-inner-highlight)",
                    }}
                  >
                    <Sparkles size={18} className="animate-pulse" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-[10.5px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Terminal size={12} />
                        <span>Unlocked Secret Layer</span>
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.2 rounded-full bg-slate-900/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-900/[0.06] dark:border-white/[0.08]">
                        {unlockedHiddenList.length} {unlockedHiddenList.length === 1 ? "Deep Dive" : "Deep Dives"}
                      </span>
                      {unlockedHiddenList.some((l) => l.status === "unlocked_unopened") && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-slate-900/[0.08] dark:bg-white/10 text-slate-900 dark:text-white border border-slate-900/10 dark:border-white/15">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          <span>NEW DISCOVERY</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm sm:text-base md:text-lg font-extrabold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                      Compiler Internals & Hidden Lessons
                    </h2>
                    <p className="text-[11.5px] sm:text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                      Secret deep-dive modules uncovered by pushing the Rust compiler past its limits.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-2 sm:ml-3">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg border border-slate-900/[0.06] dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 transition-colors duration-150",
                      hiddenLessonsExpanded && "bg-slate-900/[0.04] dark:bg-white/[0.06]"
                    )}
                  >
                    <ChevronDown
                      size={14}
                      className={cn(
                        "transition-transform duration-200 ease-out origin-center",
                        hiddenLessonsExpanded ? "rotate-180 text-slate-700 dark:text-slate-200" : "rotate-0"
                      )}
                    />
                  </div>
                </div>
              </button>

              {/* Expanded Hidden Lessons Content */}
              <AnimatePresence initial={false}>
                {hiddenLessonsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
                      opacity: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
                    }}
                    className="overflow-hidden border-t border-purple-500/20 dark:border-white/[0.06] bg-purple-500/[0.02] dark:bg-black/25"
                  >
                    <div className="p-3 sm:p-4.5 space-y-2.5">
                      {unlockedHiddenList.map((hl) => {
                        const isUnopened = hl.status === "unlocked_unopened";
                        const targetSlug = hl.slug || hl.lessonId.toLowerCase();
                        const href = `/hidden-lessons/${targetSlug}`;

                        return (
                          <div
                            key={hl.lessonId}
                            className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl border border-purple-500/30 dark:border-purple-500/20 bg-white/80 dark:bg-[#0c1424]/85 hover:bg-white dark:hover:bg-[#0f192d] hover:border-purple-500/50 dark:hover:border-purple-400/40 transition-all shadow-xs gap-3"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white font-mono text-xs font-bold shadow-xs">
                                {hl.badge || "NLL"}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {isUnopened && (
                                    <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                      UNOPENED
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono font-medium text-purple-600 dark:text-purple-400">
                                    {hl.sourceLessonId ? `From ${hl.sourceLessonId}` : "Execution Triggered"}
                                  </span>
                                </div>
                                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors mt-0.5 truncate">
                                  {hl.title}
                                </h3>
                                {hl.subtitle && (
                                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                    {hl.subtitle}
                                  </p>
                                )}
                                {hl.tags && hl.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {hl.tags.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action CTA Link */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-900/[0.04] dark:border-white/[0.04]">
                              <span className="text-[10.5px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                <Clock3 size={12} /> ~20m deep dive
                              </span>
                              <Link
                                href={href}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs shadow-purple-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <span>Launch Deep Dive</span>
                                <ArrowRight size={13} />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* Locked Teaser Card for mobile/tablet & desktop */
            <div
              className="rounded-2xl border border-dashed border-slate-300 dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.02] p-3 sm:p-4 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 transition-all"
              style={{ boxShadow: "var(--glass-inner-highlight)" }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/[0.05] text-slate-400 border border-slate-200 dark:border-white/[0.06]">
                  <Lock size={13} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10.5px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Hidden Compiler Failures · 0/1 Discovered
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    Run Rust challenges in Phase 01 to unlock internal compiler diagnostics and secret deep dives.
                  </p>
                </div>
              </div>

              <Link
                href="/hidden-lessons"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline self-end sm:self-auto shrink-0"
              >
                <span>Learn How</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 3. Phases List (Phase -> Week -> Lesson) */}
      <div className="space-y-3.5 sm:space-y-4">
        {roadmap.map((entry) => {
          const phaseLessons = lessons.filter((l) => l.frontmatter.phase === entry.phase);
          const completedCount = isMounted
            ? phaseLessons.filter((l) => completedLessons.has(l.path)).length
            : 0;
          const isPhaseDone = phaseLessons.length > 0 && completedCount === phaseLessons.length;
          const isInProgress = completedCount > 0 && !isPhaseDone;
          const isUpcoming = completedCount === 0;

          // Status Filter Check
          if (filterStatus === "completed" && !isPhaseDone) return null;
          if (filterStatus === "in_progress" && !isInProgress) return null;
          if (filterStatus === "upcoming" && (isPhaseDone || isInProgress)) return null;

          const isPhaseOpen = !!expandedPhases[entry.phase] || searchQuery.trim() !== "";
          const phasePct =
            phaseLessons.length > 0
              ? Math.round((completedCount / phaseLessons.length) * 100)
              : 0;

          // Get weeks map for this phase
          const weekMap = lessonsByPhaseAndWeek.get(entry.phase) ?? new Map<number, Lesson[]>();
          const weekNumbers = Array.from(weekMap.keys()).sort((a, b) => a - b);

          // Search filter matching
          const filteredLessons = phaseLessons.filter((l) =>
            searchQuery.trim() === ""
              ? true
              : l.frontmatter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (l.frontmatter.subtitle ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                entry.title.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (
            searchQuery.trim() !== "" &&
            filteredLessons.length === 0 &&
            !entry.title.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            return null;
          }

          return (
            <div
              key={entry.phase}
              ref={(el) => {
                phaseRefs.current[entry.phase] = el;
              }}
              className={cn(
                "rounded-[22px] border transition-all duration-200 overflow-hidden",
                isPhaseOpen
                  ? "border-blue-500/35 dark:border-blue-400/30 bg-white/80 dark:bg-[#0b1220]/85 shadow-md"
                  : "border-slate-900/[0.06] dark:border-white/[0.07] bg-white/70 dark:bg-[#0b1220]/75 hover:border-blue-500/30 dark:hover:border-white/[0.12]"
              )}
              style={{
                boxShadow: "var(--glass-specular), var(--glass-shadow)",
              }}
            >
              {/* Phase Header Accordion Trigger */}
              <button
                onClick={() => togglePhase(entry.phase)}
                aria-expanded={isPhaseOpen}
                aria-controls={`phase-content-${entry.phase}`}
                className="w-full flex items-center justify-between p-3.5 sm:p-4 md:p-5 text-left transition-all duration-150 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] active:bg-slate-100/60 dark:active:bg-white/[0.04] active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold border transition-colors",
                      isPhaseDone
                        ? "border-slate-900/20 bg-slate-900/[0.08] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                        : completedCount > 0
                        ? "border-blue-500/40 bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        : "border-slate-900/[0.06] dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400"
                    )}
                    style={{
                      boxShadow: "var(--glass-inner-highlight)",
                    }}
                  >
                    {isPhaseDone ? (
                      <Check size={16} strokeWidth={2.5} />
                    ) : (
                      <span>P{String(entry.phase).padStart(2, "0")}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Phase {String(entry.phase).padStart(2, "0")}
                      </span>
                      {entry.phase >= 1 && !user && (
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Lock size={10} /> Locked (Auth Req.)
                        </span>
                      )}
                      {entry.hasContent && (
                        <span className="text-[10px] font-mono font-medium px-2 py-0.2 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border border-slate-900/[0.05] dark:border-white/[0.06]">
                          {phaseLessons.length} modules
                        </span>
                      )}
                      {!isPhaseOpen && isInProgress && (
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          In Progress
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                      {entry.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {entry.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-2 sm:ml-3">
                  {entry.hasContent ? (
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        {completedCount}/{phaseLessons.length}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                        {phasePct}% completed
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock3 size={13} /> Coming soon
                    </span>
                  )}
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg border border-slate-900/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.03] text-slate-400 transition-colors duration-150",
                      isPhaseOpen && "text-blue-500 border-blue-500/20 bg-blue-500/5"
                    )}
                  >
                    <ChevronDown
                      size={14}
                      className={cn(
                        "transition-transform duration-200 ease-out origin-center",
                        isPhaseOpen ? "rotate-180 text-blue-500" : "rotate-0"
                      )}
                    />
                  </div>
                </div>
              </button>

              {/* Expanded Phase Content (Weeks) */}
              <AnimatePresence initial={false}>
                {isPhaseOpen && (
                  <motion.div
                    id={`phase-content-${entry.phase}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
                      opacity: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                    }}
                    className="overflow-hidden border-t border-slate-900/[0.06] dark:border-white/[0.06] bg-slate-50/40 dark:bg-black/20"
                  >
                    <div className="px-3 sm:px-5 md:px-6 py-3.5 sm:py-4 space-y-3">
                      {entry.phase >= 1 && !user && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 dark:bg-blue-950/40 text-left">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
                              <Lock size={15} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                Phase {entry.phase} Content is Locked
                              </p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                Sign in or create a free account to unlock full modules and compiler challenges.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openAuthModal();
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 transition-colors shadow-sm cursor-pointer"
                          >
                            Sign In to Unlock
                          </button>
                        </div>
                      )}

                      {!entry.hasContent ? (
                        <div className="p-6 text-center rounded-xl border border-dashed border-slate-300/80 dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.02]">
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            Phase {entry.phase} content is currently being authored. Check back soon.
                          </p>
                        </div>
                      ) : (
                        <>
                          {weekNumbers.map((weekNum) => {
                            const weekKey = `${entry.phase}-${weekNum}`;
                            const weekLessons = weekMap.get(weekNum) ?? [];
                            const isWeekOpen = !!expandedWeeks[weekKey] || searchQuery.trim() !== "";
                            const weekDone = isMounted
                              ? weekLessons.filter((l) => completedLessons.has(l.path)).length
                              : 0;
                            const isWeekFinished =
                              weekLessons.length > 0 && weekDone === weekLessons.length;

                            return (
                              <div
                                key={weekKey}
                                className="rounded-xl border border-slate-900/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-[#0c1424]/70 overflow-hidden backdrop-blur-md transition-all"
                              >
                                {/* Week Accordion Header */}
                                <button
                                  onClick={() => toggleWeek(entry.phase, weekNum)}
                                  aria-expanded={isWeekOpen}
                                  aria-controls={`week-content-${weekKey}`}
                                  className="w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 text-left hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-all duration-150 active:bg-slate-100/80 active:scale-[0.998] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                                >
                                  <div className="flex items-center gap-2 sm:gap-2.5">
                                    <span
                                      className={cn(
                                        "flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-mono font-bold border",
                                        isWeekFinished
                                          ? "border-slate-900/20 bg-slate-900/[0.08] text-slate-900 dark:border-white/20 dark:bg-white/10 dark:text-white"
                                          : "border-slate-900/[0.08] dark:border-white/[0.08] bg-slate-100/80 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400"
                                      )}
                                    >
                                      {isWeekFinished ? <Check size={11} /> : `W${weekNum}`}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      Week {String(weekNum).padStart(2, "0")}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                                      {weekDone}/{weekLessons.length} lessons
                                    </span>
                                    <ChevronRight
                                      size={13}
                                      className={cn(
                                        "text-slate-400 transition-transform duration-200 ease-out origin-center",
                                        isWeekOpen ? "rotate-90 text-blue-500" : "rotate-0"
                                      )}
                                    />
                                  </div>
                                </button>

                                {/* Week Lessons Rows */}
                                <AnimatePresence initial={false}>
                                  {isWeekOpen && (
                                    <motion.div
                                      id={`week-content-${weekKey}`}
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{
                                        height: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                                        opacity: { duration: 0.16, ease: [0.16, 1, 0.3, 1] },
                                      }}
                                      className="overflow-hidden border-t border-slate-900/[0.05] dark:border-white/[0.04] bg-white/40 dark:bg-black/20"
                                    >
                                      <div className="divide-y divide-slate-900/[0.04] dark:divide-white/[0.03]">
                                        {weekLessons.map((lesson) => {
                                          const isDone = isMounted && completedLessons.has(lesson.path);
                                          return (
                                            <div
                                              key={lesson.path}
                                              className="group flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-blue-500/[0.06] dark:hover:bg-blue-500/[0.1] transition-all text-left"
                                            >
                                              {/* Checkbox Trigger (Interactive Completion) */}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  toggleLesson(lesson.path, lesson.frontmatter.title, entry.phase);
                                                }}
                                                aria-label={isDone ? `Mark "${lesson.frontmatter.title}" incomplete` : `Mark "${lesson.frontmatter.title}" completed`}
                                                title={isDone ? "Mark incomplete" : "Mark completed"}
                                                className="p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors mr-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                                              >
                                                {isDone ? (
                                                  <CheckCircle2
                                                    size={16}
                                                    className="text-emerald-600 dark:text-emerald-400 animate-in zoom-in-75 duration-150"
                                                  />
                                                ) : (
                                                  <Circle
                                                    size={16}
                                                    className="text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                                  />
                                                )}
                                              </button>

                                              <Link
                                                href={lesson.path}
                                                className="flex-1 min-w-0 pr-3"
                                              >
                                                <div className="flex items-center gap-2">
                                                  {lesson.frontmatter.day && (
                                                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                                                      Day {String(lesson.frontmatter.day).padStart(2, "0")}
                                                    </span>
                                                  )}
                                                  <span
                                                    className={cn(
                                                      "text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors",
                                                      isDone && "text-slate-600 dark:text-slate-400"
                                                    )}
                                                  >
                                                    {lesson.frontmatter.title}
                                                  </span>
                                                </div>
                                                {lesson.frontmatter.subtitle && (
                                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                    {lesson.frontmatter.subtitle}
                                                  </p>
                                                )}
                                              </Link>

                                              <Link
                                                href={lesson.path}
                                                className="flex items-center gap-2.5 shrink-0"
                                              >
                                                <span className="text-[10.5px] font-mono text-slate-400 dark:text-slate-500">
                                                  {lesson.frontmatter?.estimated_time
                                                    ? lesson.frontmatter.estimated_time.replace(/\s*mins?/i, "m")
                                                    : `${lesson.readingTimeMinutes}m`}
                                                </span>
                                                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100/80 dark:bg-white/[0.04] text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-all">
                                                  <ArrowRight
                                                    size={12}
                                                    className="group-hover:translate-x-0.5 transition-transform duration-150"
                                                  />
                                                </div>
                                              </Link>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

