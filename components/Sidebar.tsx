"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock3,
  BookOpen,
  Sparkles,
  Check,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProgressStore } from "@/lib/progress/store";
import type { Lesson, NavLesson } from "@/lib/content/types";
import type { RoadmapStatus } from "@/lib/content/discover";
import { useHiddenLessonsStore } from "@/lib/hidden-lessons/store";
import { DURATION, EASING } from "@/lib/motion";

export type SidebarLesson = Lesson | NavLesson;

export function Sidebar({
  lessons,
  roadmap,
}: {
  lessons: SidebarLesson[];
  roadmap: RoadmapStatus[];
}) {
  const pathname = usePathname();
  const completed = useProgressStore((s) => s.completedLessons);
  const unlockedLessonsMap = useHiddenLessonsStore((s) => s.unlockedLessons);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const unlockedLessons = React.useMemo(
    () => (mounted ? Object.values(unlockedLessonsMap) : []),
    [mounted, unlockedLessonsMap]
  );
  const hasHidden = unlockedLessons.length > 0;
  const hasUnopened = unlockedLessons.some((l) => l.status === "unlocked_unopened");

  // Group lessons by phase -> week -> lessons array
  const lessonsByPhaseAndWeek = React.useMemo(() => {
    const phaseMap = new Map<number, Map<number, SidebarLesson[]>>();
    for (const l of lessons) {
      const p = l.frontmatter.phase;
      let w = l.frontmatter.week;
      if (w == null) {
        const weekSlugPart = l.slug.find((s) => /^week-(\d+)$/i.test(s));
        if (weekSlugPart) {
          const match = weekSlugPart.match(/^week-(\d+)$/i);
          if (match) w = parseInt(match[1], 10);
        }
      }
      const weekNum = w ?? 1;

      if (!phaseMap.has(p)) {
        phaseMap.set(p, new Map());
      }
      const weekMap = phaseMap.get(p)!;
      if (!weekMap.has(weekNum)) {
        weekMap.set(weekNum, []);
      }
      weekMap.get(weekNum)!.push(l);
    }
    return phaseMap;
  }, [lessons]);

  return (
    <nav
      className="hidden xl:block h-full w-72 shrink-0 overflow-y-auto border-r border-slate-200/60 dark:border-white/[0.08] bg-white/45 dark:bg-[#090f1d]/50 backdrop-blur-xl px-3.5 py-5 text-sm z-10 select-none scroll-smooth"
      style={{
        boxShadow:
          "inset -1px 0 0 rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      }}
      aria-label="Curriculum Outline"
    >
      <div className="mb-3 px-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <BookOpen size={12} className="text-slate-500 dark:text-slate-400" />
          <span>Curriculum Outline</span>
        </span>
      </div>

      <div className="space-y-1">
        {roadmap.map((entry) => (
          <PhaseGroup
            key={entry.phase}
            phase={entry.phase}
            title={entry.title}
            hasContent={entry.hasContent}
            weekMap={lessonsByPhaseAndWeek.get(entry.phase) ?? new Map()}
            pathname={pathname}
            completed={completed}
          />
        ))}
      </div>

      {/* Hidden Lessons Section */}
      {hasHidden && (
        <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
          <div
            className={cn(
              "rounded-xl p-2 transition-all",
              hasUnopened
                ? "border border-blue-500/40 bg-blue-500/[0.08] dark:bg-blue-500/[0.12] shadow-[0_0_14px_rgba(59,130,246,0.2)]"
                : "border border-slate-200/60 dark:border-white/[0.06] bg-slate-100/40 dark:bg-white/[0.02]"
            )}
          >
            <div className="flex items-center justify-between pb-1 px-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles size={12} className="text-slate-500 dark:text-slate-400" />
                <span>Hidden Lessons</span>
              </span>
              <span className="inline-flex items-center justify-center h-3.5 px-1.5 rounded-full bg-slate-900/[0.06] dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[9.5px] font-bold">
                {unlockedLessons.length}
              </span>
            </div>

            <div className="space-y-1 mt-1">
              {unlockedLessons.map((item) => {
                const isItemActive = pathname === `/hidden-lessons/${item.slug}`;
                const isItemUnopened = item.status === "unlocked_unopened";
                return (
                  <Link
                    key={item.lessonId}
                    href={`/hidden-lessons/${item.slug}`}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1 text-[11.5px] transition-all",
                      isItemActive
                        ? "bg-blue-600 text-white font-medium shadow-xs"
                        : "text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/[0.05]"
                    )}
                  >
                    {isItemUnopened ? (
                      <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                      </span>
                    ) : (
                      <Check size={11} className={isItemActive ? "text-white" : "text-slate-500 dark:text-slate-400"} />
                    )}
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function PhaseGroup({
  phase,
  title,
  hasContent,
  weekMap,
  pathname,
  completed,
}: {
  phase: number;
  title: string;
  hasContent: boolean;
  weekMap: Map<number, SidebarLesson[]>;
  pathname: string | null;
  completed: Set<string>;
}) {
  const weekNumbers = React.useMemo(() => Array.from(weekMap.keys()).sort((a, b) => a - b), [weekMap]);
  const allPhaseLessons = React.useMemo(() => {
    const list: SidebarLesson[] = [];
    for (const w of weekNumbers) {
      const arr = weekMap.get(w);
      if (arr) list.push(...arr);
    }
    return list;
  }, [weekMap, weekNumbers]);

  const activeInPhase =
    allPhaseLessons.some((l) => l.path === pathname) || pathname === `/phase/${phase}`;

  const [phaseOpen, setPhaseOpen] = React.useState(
    activeInPhase || (phase === 0 && hasContent)
  );

  // Track expanded state of weeks within this phase
  const [openWeeks, setOpenWeeks] = React.useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (const w of weekNumbers) {
      const weekLessons = weekMap.get(w) ?? [];
      const hasActive = weekLessons.some((l) => l.path === pathname);
      // Auto-open if week contains active lesson, or default to week 1 for phase 0
      init[w] = hasActive || (phase === 0 && w === weekNumbers[0]);
    }
    return init;
  });

  // Automatically reveal the phase and week when pathname matches an active lesson
  React.useEffect(() => {
    for (const w of weekNumbers) {
      const weekLessons = weekMap.get(w) ?? [];
      if (weekLessons.some((l) => l.path === pathname)) {
        setPhaseOpen(true);
        setOpenWeeks((prev) => ({ ...prev, [w]: true }));
        break;
      }
    }
  }, [pathname, weekNumbers, weekMap]);

  const doneCount = allPhaseLessons.filter((l) => completed.has(l.path)).length;

  if (!hasContent) {
    return (
      <Link
        href={`/phase/${phase}`}
        className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left text-slate-400 dark:text-slate-500 hover:bg-slate-100/60 dark:hover:bg-white/[0.04] hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <span className="truncate text-xs font-medium">
          Phase {phase} — {title}
        </span>
        <Clock3 size={12} className="shrink-0" />
      </Link>
    );
  }

  const toggleWeek = (w: number) => {
    setOpenWeeks((prev) => ({
      ...prev,
      [w]: !prev[w],
    }));
  };

  return (
    <div className="rounded-xl overflow-hidden transition-colors">
      {/* Phase Header */}
      <button
        type="button"
        onClick={() => setPhaseOpen((o) => !o)}
        aria-expanded={phaseOpen}
        className={cn(
          "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left font-medium transition-all text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
          activeInPhase
            ? "bg-blue-500/12 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/30"
            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-white/[0.05]"
        )}
        style={
          activeInPhase
            ? {
                boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.4)",
              }
            : undefined
        }
      >
        <span className="truncate tracking-tight font-semibold">
          Phase {String(phase).padStart(2, "0")} · {title}
        </span>
        <span className="flex items-center gap-1 text-[10.5px] font-mono text-slate-400 dark:text-slate-500">
          {doneCount}/{allPhaseLessons.length}
          <ChevronRight
            size={12}
            className={cn(
              "transition-transform duration-200",
              phaseOpen && "rotate-90"
            )}
          />
        </span>
      </button>

      {/* Week Accordions */}
      <AnimatePresence initial={false}>
        {phaseOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.quick, ease: EASING.easeOut }}
            className="overflow-hidden ml-2 my-1 space-y-1 border-l border-slate-200/60 dark:border-white/[0.08] pl-2"
          >
            {weekNumbers.map((weekNum) => {
              const weekLessons = weekMap.get(weekNum) ?? [];
              const isWeekOpen = !!openWeeks[weekNum];
              const isWeekActive = weekLessons.some((l) => l.path === pathname);
              const weekDoneCount = weekLessons.filter((l) => completed.has(l.path)).length;

              return (
                <WeekGroup
                  key={weekNum}
                  weekNum={weekNum}
                  lessons={weekLessons}
                  isOpen={isWeekOpen}
                  isActive={isWeekActive}
                  doneCount={weekDoneCount}
                  pathname={pathname}
                  completed={completed}
                  onToggle={() => toggleWeek(weekNum)}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WeekGroup({
  weekNum,
  lessons,
  isOpen,
  isActive,
  doneCount,
  pathname,
  completed,
  onToggle,
}: {
  weekNum: number;
  lessons: SidebarLesson[];
  isOpen: boolean;
  isActive: boolean;
  doneCount: number;
  pathname: string | null;
  completed: Set<string>;
  onToggle: () => void;
}) {
  const activeItemRef = React.useRef<HTMLLIElement | null>(null);

  React.useEffect(() => {
    if (isActive && typeof activeItemRef.current?.scrollIntoView === "function") {
      activeItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [isActive, pathname]);

  return (
    <div className="rounded-lg overflow-hidden transition-colors">
      {/* Week Accordion Header */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-[11px] font-semibold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/40",
          isActive
            ? "text-blue-600 dark:text-blue-400 bg-blue-500/[0.06] dark:bg-blue-500/[0.1]"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.03]"
        )}
      >
        <span className="flex items-center gap-1.5 truncate">
          <Calendar size={10} className={isActive ? "text-slate-700 dark:text-slate-200" : "opacity-60"} />
          <span className="uppercase tracking-wider">Week {String(weekNum).padStart(2, "0")}</span>
        </span>
        <span className="flex items-center gap-1 font-mono text-[10px] opacity-75">
          <span>{doneCount}/{lessons.length}</span>
          <ChevronRight
            size={11}
            className={cn(
              "transition-transform duration-200",
              isOpen && "rotate-90"
            )}
          />
        </span>
      </button>

      {/* Week Lessons List */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.quick, ease: EASING.easeOut }}
            className="overflow-hidden ml-2 my-0.5 space-y-0.5 border-l border-slate-200/50 dark:border-white/[0.06] pl-1.5"
          >
            {lessons.map((l) => {
              const isDone = completed.has(l.path);
              const isCurrent = pathname === l.path;
              return (
                <li
                  key={l.path}
                  ref={isCurrent ? activeItemRef : undefined}
                >
                  <Link
                    href={l.path}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1 text-[11.5px] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500",
                      isCurrent
                        ? "bg-blue-600 text-white font-medium shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-slate-100"
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2
                        size={12}
                        className={cn(
                          "shrink-0",
                          isCurrent ? "text-white" : "text-slate-500 dark:text-slate-400"
                        )}
                      />
                    ) : (
                      <Circle size={12} className="shrink-0 opacity-30" />
                    )}
                    <span className="truncate">{l.frontmatter.title}</span>
                  </Link>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
