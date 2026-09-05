"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Box,
  Layers,
  Settings,
  Code2,
  Terminal,
  Shield,
  Coins,
  Cloud,
  Cpu,
} from "lucide-react";
import type { DashboardPhase } from "./types";
import { useProgressStore } from "@/lib/progress/store";
import { useIsMounted } from "@/lib/hooks/useIsMounted";
import { cn } from "@/lib/utils";

interface RoadmapStepperCardProps {
  phases: DashboardPhase[];
}

const PHASE_ICONS = [
  Box, // Phase 0
  Layers, // Phase 1
  Settings, // Phase 2
  Terminal, // Phase 3
  Cpu, // Phase 4
  Shield, // Phase 5
  Coins, // Phase 6
  Cloud, // Phase 7
  Code2, // Phase 8
];

export function RoadmapStepperCard({ phases }: RoadmapStepperCardProps) {
  const isMounted = useIsMounted();
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const updateScrollState = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);

    const isAtStart = scrollLeft <= 4;
    const isAtEnd = maxScroll <= 4 || scrollLeft >= maxScroll - 6;

    setCanScrollLeft(!isAtStart);
    setCanScrollRight(!isAtEnd);
  }, []);

  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const handleScroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const cards = Array.from(container.children) as HTMLElement[];
    if (cards.length === 0) return;

    const currentScroll = container.scrollLeft;
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    const firstCardOffset = cards[0].offsetLeft;

    // Normalized card offsets relative to the scroll container
    const cardPositions = cards.map((c) => Math.max(0, c.offsetLeft - firstCardOffset));

    if (direction === "left") {
      // If already at or near start, wrap around to the end smoothly
      if (currentScroll <= 12) {
        container.scrollTo({
          left: maxScroll,
          behavior: "smooth",
        });
        return;
      }
      // Find the card whose position is strictly less than currentScroll (with 10px tolerance)
      const prevPositions = cardPositions.filter((pos) => pos < currentScroll - 10);
      const target = prevPositions.length > 0 ? prevPositions[prevPositions.length - 1] : 0;

      container.scrollTo({
        left: Math.max(0, target),
        behavior: "smooth",
      });
    } else {
      // If already at or near end, wrap around to the start smoothly
      if (currentScroll >= maxScroll - 12) {
        container.scrollTo({
          left: 0,
          behavior: "smooth",
        });
        return;
      }
      // Find the card whose position is strictly greater than currentScroll (with 10px tolerance)
      const nextPositions = cardPositions.filter((pos) => pos > currentScroll + 10);
      const target = nextPositions.length > 0 ? Math.min(nextPositions[0], maxScroll) : maxScroll;

      container.scrollTo({
        left: Math.min(maxScroll, target),
        behavior: "smooth",
      });
    }
  };

  return (
    <div
      className="relative rounded-2xl glass-surface p-3.5 xl:p-4 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Your Curriculum</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 backdrop-blur-md">
              {phases.length} Phases
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Header Navigation Arrows */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleScroll("left");
              }}
              aria-label="Previous phase"
              title="Previous phase (scrolls or loops)"
              className="flex h-6 w-6 items-center justify-center rounded-lg glass-control text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 active:scale-95 transition-all cursor-pointer pointer-events-auto"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleScroll("right");
              }}
              aria-label="Next phase"
              title="Next phase (scrolls or loops)"
              className="flex h-6 w-6 items-center justify-center rounded-lg glass-control text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 active:scale-95 transition-all cursor-pointer pointer-events-auto"
            >
              <ChevronRight size={13} />
            </button>
          </div>

          <Link
            href="/roadmap"
            className="group flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors ml-1"
          >
            <span>View Full Roadmap</span>
            <ChevronRight
              size={12}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>

      {/* Carousel Track with Floating Left + Right Navigation Controls */}
      <div className="relative group/carousel">
        {/* Floating Left Arrow Button - ALWAYS ACTIVE, NEVER IDLE, PREVENTS CLICK BLEED */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleScroll("left");
          }}
          aria-label="Previous phase"
          title="Previous phase (scrolls/loops)"
          className="absolute -left-2.5 top-1/2 -translate-y-1/2 z-30 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full glass-control transition-all duration-200 cursor-pointer pointer-events-auto shadow-md hover:scale-110 active:scale-95 text-slate-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Floating Right Arrow Button - ALWAYS ACTIVE, NEVER IDLE */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleScroll("right");
          }}
          aria-label="Next phase"
          title="Next phase (scrolls/loops)"
          className="absolute -right-2.5 top-1/2 -translate-y-1/2 z-30 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full glass-control transition-all duration-200 cursor-pointer pointer-events-auto shadow-md hover:scale-110 active:scale-95 text-slate-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
        >
          <ChevronRight size={15} />
        </button>

        {/* Carousel container - Native scrollbar hidden completely across all browsers */}
        <div
          ref={scrollContainerRef}
          tabIndex={0}
          className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth -mx-1 px-2 focus-visible:outline-none scrollbar-none"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {phases.map((phase) => {
            const Icon = PHASE_ICONS[phase.phaseNumber] || Box;
            const phaseLessons = phase.lessons || [];
            
            // Check if this phase has authored/canonical content
            const hasLessons = phase.hasContent && phaseLessons.length > 0;
            const totalCount =
              phase.phaseNumber === 0 ? 14 : phase.phaseNumber === 1 ? 28 : phaseLessons.length;
            
            const completedCount = isMounted && hasLessons
              ? phaseLessons.filter((l) => completedLessons?.has(l.path)).length
              : 0;

            const progressPct =
              hasLessons && totalCount > 0
                ? Math.min(100, Math.round((completedCount / totalCount) * 100))
                : 0;

            return (
              <Link
                key={phase.phaseNumber}
                href={`/phase/${phase.phaseNumber}`}
                className="group relative shrink-0 w-[205px] xl:w-[220px] snap-start rounded-xl glass-elevated p-3 flex flex-col justify-between transition-all duration-300 text-left hover:-translate-y-0.5"
              >
                {/* Top Row: Phase Tag & Flat Icon */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      PHASE {String(phase.phaseNumber).padStart(2, "0")}
                    </span>
                    <Icon size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {phase.title}
                  </h4>

                  {/* Description */}
                  <p className="mt-0.5 text-[10.5px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed h-7">
                    {phase.tagline || "System foundations and low-level development."}
                  </p>
                </div>

                {/* Progress Bar & Counter / Coming Soon State */}
                <div className="mt-2.5 pt-2 border-t border-slate-100/80 dark:border-white/[0.05]">
                  {hasLessons ? (
                    <>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                        <span>{progressPct}% complete</span>
                        <span>{completedCount}/{totalCount}</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-slate-200/60 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className="text-amber-600/90 dark:text-amber-400/90 font-medium">
                          Coming soon
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">Planned</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-slate-200/40 dark:bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500/30 dark:bg-amber-400/30 w-full" />
                      </div>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
