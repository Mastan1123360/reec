"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import type { DashboardPhase } from "./types";
import { cn } from "@/lib/utils";

interface LearningRoadmapProps {
  phases: DashboardPhase[];
}

export function LearningRoadmap({ phases }: LearningRoadmapProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);

  const checkScroll = React.useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);

    const isAtStart = scrollLeft <= 4;
    const isAtEnd = maxScroll <= 4 || scrollLeft >= maxScroll - 6;

    setCanScrollLeft(!isAtStart);
    setCanScrollRight(!isAtEnd);

    if (phases.length === 0) return;

    if (isAtEnd) {
      setActiveIndex(phases.length - 1);
      return;
    }

    if (isAtStart) {
      setActiveIndex(0);
      return;
    }

    const cards = Array.from(container.children) as HTMLElement[];
    if (cards.length > 0) {
      let closestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const dist = Math.abs(card.offsetLeft - scrollLeft);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      }

      setActiveIndex(Math.min(phases.length - 1, Math.max(0, closestIdx)));
    }
  }, [phases.length]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scrollToIndex = (index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const cards = Array.from(container.children) as HTMLElement[];
    const target = cards[index];
    if (!target) return;

    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);

    if (index === phases.length - 1) {
      container.scrollTo({
        left: maxScroll,
        behavior: "smooth",
      });
    } else if (index === 0) {
      container.scrollTo({
        left: 0,
        behavior: "smooth",
      });
    } else {
      container.scrollTo({
        left: Math.min(target.offsetLeft, maxScroll),
        behavior: "smooth",
      });
    }
  };

  const handlePrev = () => {
    const container = scrollRef.current;
    if (!container) return;
    const cards = Array.from(container.children) as HTMLElement[];
    if (cards.length === 0) return;

    const currentScroll = container.scrollLeft;
    const prevCards = cards.filter((c) => c.offsetLeft < currentScroll - 15);
    if (prevCards.length > 0) {
      const prevCard = prevCards[prevCards.length - 1];
      container.scrollTo({
        left: Math.max(0, prevCard.offsetLeft),
        behavior: "smooth",
      });
    } else {
      container.scrollTo({
        left: 0,
        behavior: "smooth",
      });
    }
  };

  const handleNext = () => {
    const container = scrollRef.current;
    if (!container) return;
    const cards = Array.from(container.children) as HTMLElement[];
    if (cards.length === 0) return;

    const currentScroll = container.scrollLeft;
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    const nextCard = cards.find((c) => c.offsetLeft > currentScroll + 15);
    if (nextCard) {
      container.scrollTo({
        left: Math.min(nextCard.offsetLeft, maxScroll),
        behavior: "smooth",
      });
    } else {
      container.scrollTo({
        left: maxScroll,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="space-y-4">
      {/* Header with Title and Carousel Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Layers size={20} className="text-primary shrink-0" />
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Curriculum Roadmap</span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                9 Phases
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Core progression from engineering foundations to advanced systems
            </p>
          </div>
        </div>

        {/* Carousel Navigation Arrows */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            disabled={!canScrollLeft && activeIndex === 0}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Previous Phase"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNext}
            disabled={!canScrollRight && activeIndex === phases.length - 1}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Next Phase"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Carousel Track with Smooth Snap Scrolling */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth snap-x snap-mandatory scrollbar-none no-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {phases.map((phase, idx) => {
          const isActive = idx === activeIndex;

          return (
            <Link
              key={phase.phaseNumber}
              href={`/phase/${phase.phaseNumber}`}
              className={cn(
                "group snap-start shrink-0 w-[280px] sm:w-[320px] rounded-3xl border p-5 backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between relative",
                "bg-gradient-to-b from-card/90 via-card/75 to-card/60 dark:from-[#0f172a]/90 dark:via-[#0c1322]/80 dark:to-[#070b14]/95 shadow-lg",
                isActive
                  ? "border-primary/60 shadow-xl shadow-primary/10"
                  : "border-border/70 hover:border-primary/40 hover:-translate-y-1"
              )}
            >
              {/* Card Top: Phase Badge & Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                    Phase {String(phase.phaseNumber).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
                    {phase.hasContent ? "Active" : "Planned"}
                  </span>
                </div>

                {/* Card Title (Name of the Phase) */}
                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {phase.title}
                  </h3>
                  {phase.tagline && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                      {phase.tagline}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer: Simple Clean Action */}
              <div className="mt-6 pt-3 border-t border-border/40 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                  <span>Explore Phase</span>
                  <ArrowRight
                    size={13}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {phase.hasContent && phase.lessons.length > 0
                    ? `${phase.lessons.length} ${phase.lessons.length === 1 ? "lesson" : "lessons"}`
                    : "Coming soon"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination Dots Rail */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {phases.map((_, idx) => (
          <button
            key={idx}
            onClick={() => scrollToIndex(idx)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-200",
              idx === activeIndex
                ? "w-6 bg-primary"
                : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
            )}
            aria-label={`Jump to Phase ${idx}`}
          />
        ))}
      </div>
    </section>
  );
}
