"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Maximize2,
  Minimize2,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Bookmark,
  Clock,
  ChevronRight,
  List,
  Target,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProgressStore } from "@/lib/progress/store";
import type { Lesson } from "@/lib/content/types";

interface FullscreenContextType {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
}

const FullscreenContext = React.createContext<FullscreenContextType>({
  isFullscreen: false,
  toggleFullscreen: () => {},
  enterFullscreen: () => {},
  exitFullscreen: () => {},
});

export function useLessonFullscreen() {
  return React.useContext(FullscreenContext);
}

interface LessonFullscreenProviderProps {
  children: React.ReactNode;
  lesson: Lesson;
  prevLesson?: { path: string; title: string } | null;
  nextLesson?: { path: string; title: string } | null;
}

export function LessonFullscreenProvider({
  children,
  lesson,
  prevLesson,
  nextLesson,
}: LessonFullscreenProviderProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const [activeSectionId, setActiveSectionId] = React.useState<string>("");
  const [mounted, setMounted] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Store actions
  const isDone = useProgressStore((s) => s.completedLessons.has(lesson.path));
  const isBookmarked = useProgressStore((s) => s.bookmarks.has(lesson.path));
  const toggleLesson = useProgressStore((s) => s.toggleLesson);
  const toggleBookmark = useProgressStore((s) => s.toggleBookmark);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Request browser-level HTML5 fullscreen if supported
  const requestBrowserFullscreen = React.useCallback(async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if ((el as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (el as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      } else if ((el as unknown as { mozRequestFullScreen?: () => Promise<void> }).mozRequestFullScreen) {
        await (el as unknown as { mozRequestFullScreen: () => Promise<void> }).mozRequestFullScreen();
      } else if ((el as unknown as { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen) {
        await (el as unknown as { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen();
      }
    } catch {
      // Browser fallback (iOS Safari, sandbox iframe)
    }
  }, []);

  // Exit browser-level HTML5 fullscreen if active
  const exitBrowserFullscreen = React.useCallback(async () => {
    try {
      if (
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement
      ) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
        } else if ((document as unknown as { mozCancelFullScreen?: () => Promise<void> }).mozCancelFullScreen) {
          await (document as unknown as { mozCancelFullScreen: () => Promise<void> }).mozCancelFullScreen();
        }
      }
    } catch {
      // Ignore exit error
    }
  }, []);

  const enterFullscreen = React.useCallback(() => {
    setIsFullscreen(true);
    requestBrowserFullscreen();
  }, [requestBrowserFullscreen]);

  const exitFullscreen = React.useCallback(() => {
    setIsFullscreen(false);
    exitBrowserFullscreen();
  }, [exitBrowserFullscreen]);

  const toggleFullscreen = React.useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Sync with browser native fullscreen events & Escape key
  React.useEffect(() => {
    const handleNativeFullscreenChange = () => {
      const isNative = Boolean(
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement
      );
      if (!isNative && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        exitFullscreen();
      }
    };

    document.addEventListener("fullscreenchange", handleNativeFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleNativeFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleNativeFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleNativeFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen, exitFullscreen]);

  // Lock document body scroll when fullscreen is active
  React.useEffect(() => {
    if (isFullscreen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isFullscreen]);

  // Track scroll progress and active section in fullscreen mode
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollable = target.scrollHeight - target.clientHeight;
    if (scrollable > 0) {
      const pct = Math.min(100, Math.max(0, Math.round((target.scrollTop / scrollable) * 100)));
      setScrollProgress(pct);
    }

    // Determine current section in view
    if (lesson.sections && lesson.sections.length > 0) {
      const sections = lesson.sections;
      const scrollPos = target.scrollTop + 120;
      for (let i = sections.length - 1; i >= 0; i--) {
        const secId = sections[i].id || `section-${i}`;
        const el = document.getElementById(secId);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSectionId(secId);
          break;
        }
      }
    }
  };

  const scrollToSection = (secId: string) => {
    const el = document.getElementById(secId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const contextValue = React.useMemo(
    () => ({
      isFullscreen,
      toggleFullscreen,
      enterFullscreen,
      exitFullscreen,
    }),
    [isFullscreen, toggleFullscreen, enterFullscreen, exitFullscreen]
  );

  const phaseNumber = lesson.frontmatter.phase ?? 0;
  const weekNumber = lesson.frontmatter.week ?? undefined;
  const dayNumber = lesson.frontmatter.day ?? undefined;

  return (
    <FullscreenContext.Provider value={contextValue}>
      <div ref={containerRef} className="relative w-full">
        {!isFullscreen ? children : <div className="min-h-[400px] w-full opacity-0 pointer-events-none" aria-hidden="true" />}
      </div>

      {/* Fullscreen Portal: Teleports directly to document.body to break out of all parent constraints */}
      {mounted && isFullscreen && createPortal(
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="fixed inset-0 z-[9999] w-screen h-screen overflow-y-auto bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col scroll-smooth"
        >
          {/* Top Full-Width Sticky Reading Header */}
          <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/90 dark:bg-[#0c1322]/90 border-b border-slate-200/80 dark:border-white/10 shadow-xs">
            {/* Scroll Reading Progress Bar */}
            <div
              className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 transition-all duration-150 ease-out"
              style={{ width: `${scrollProgress}%` }}
            />

            <div className="w-full px-4 sm:px-6 lg:px-10 py-2.5 sm:py-3 flex items-center justify-between gap-4">
              {/* Left: Quick Back + Lesson Title */}
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exitFullscreen}
                  title="Exit fullscreen mode (Esc)"
                  className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  <ArrowLeft size={16} />
                </Button>

                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="default" className="shrink-0 text-[10px] sm:text-xs">
                    Phase {String(phaseNumber).padStart(2, "0")}
                  </Badge>
                  {weekNumber !== undefined && (
                    <Badge variant="secondary" className="hidden sm:inline-flex text-[10px]">
                      W{weekNumber}
                    </Badge>
                  )}
                  {dayNumber !== undefined && (
                    <Badge variant="secondary" className="hidden sm:inline-flex text-[10px]">
                      D{dayNumber}
                    </Badge>
                  )}
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {lesson.frontmatter.title}
                  </h2>
                </div>
              </div>

              {/* Right: Progress stats & Prominent Exit Fullscreen Button */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <BookOpen size={14} className="text-blue-500" />
                  <span>{scrollProgress}% completed</span>
                  {lesson.readingTimeMinutes && (
                    <span className="text-slate-400 dark:text-slate-600">
                      • {lesson.readingTimeMinutes} min read
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={exitFullscreen}
                  className="min-h-[44px] sm:min-h-[36px] px-3.5 sm:px-4 flex items-center gap-1.5 font-semibold text-xs sm:text-sm rounded-xl border-slate-300 dark:border-white/20 bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  <Minimize2 size={15} />
                  <span>Exit Fullscreen</span>
                  <kbd className="hidden md:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-slate-200/80 dark:bg-white/15 rounded text-slate-600 dark:text-slate-300 border border-slate-300/60 dark:border-white/10">
                    Esc
                  </kbd>
                </Button>
              </div>
            </div>
          </header>

          {/* Fullscreen Body:
              On Laptop (lg: and above): Spans the full screen with an expansive 12-column workstation layout.
              On Mobile / Tablet (< lg): Centered single-column reading view ("other modes are fine").
          */}
          <div className="flex-1 w-full px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8 lg:py-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 w-full max-w-[1780px] mx-auto">
              {/* Laptop Sticky Navigation Rail (Fills the laptop display with meaningful lesson navigation) */}
              <aside className="hidden lg:block lg:col-span-3 xl:col-span-3">
                <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-3 space-y-6 scrollbar-thin">
                  {/* Lesson Overview & Progress Card */}
                  <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-[#0c1322]/70 p-5 backdrop-blur-md shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Lesson Progress
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                        {scrollProgress}%
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-200"
                        style={{ width: `${scrollProgress}%` }}
                      />
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <Button
                        variant={isDone ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleLesson(lesson.path)}
                        className="w-full justify-start gap-2 text-xs"
                      >
                        <CheckCircle2 size={14} />
                        <span>{isDone ? "Lesson Completed" : "Mark as Complete"}</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleBookmark(lesson.path)}
                        className="w-full justify-start gap-2 text-xs"
                      >
                        <Bookmark size={14} fill={isBookmarked ? "currentColor" : "none"} />
                        <span>{isBookmarked ? "Bookmarked" : "Bookmark Lesson"}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Table of Contents / Section Navigator */}
                  {lesson.sections && lesson.sections.length > 0 && (
                    <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-[#0c1322]/70 p-5 backdrop-blur-md shadow-xs space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <List size={14} />
                        <span>On This Page</span>
                      </div>

                      <nav className="space-y-1 text-xs">
                        {lesson.sections.map((section, sIdx) => {
                          const secId = section.id || `section-${sIdx}`;
                          const isActive = activeSectionId === secId;
                          return (
                            <button
                              key={secId}
                              onClick={() => scrollToSection(secId)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 truncate cursor-pointer ${
                                isActive
                                  ? "bg-blue-50 text-blue-600 font-semibold dark:bg-blue-950/50 dark:text-blue-400"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                              }`}
                              style={{ paddingLeft: `${Math.max(10, section.depth * 8)}px` }}
                            >
                              <ChevronRight size={12} className={`shrink-0 ${isActive ? "text-blue-500" : "opacity-40"}`} />
                              <span className="truncate">{section.heading}</span>
                            </button>
                          );
                        })}
                      </nav>
                    </div>
                  )}

                  {/* Key Terms / Concepts */}
                  {lesson.frontmatter.key_terms && lesson.frontmatter.key_terms.length > 0 && (
                    <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-[#0c1322]/70 p-5 backdrop-blur-md shadow-xs space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Sparkles size={14} />
                        <span>Key Concepts</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {lesson.frontmatter.key_terms.map((term, idx) => (
                          <Badge key={`${term}-${idx}`} variant="outline" className="font-mono text-[10px]">
                            {term}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Learning Objectives */}
                  {lesson.frontmatter.learning_objectives && lesson.frontmatter.learning_objectives.length > 0 && (
                    <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-[#0c1322]/70 p-5 backdrop-blur-md shadow-xs space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Target size={14} />
                        <span>Objectives</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {lesson.frontmatter.learning_objectives.map((obj, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Quick Lesson Switchers */}
                  {(prevLesson || nextLesson) && (
                    <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-[#0c1322]/70 p-4 backdrop-blur-md shadow-xs space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Navigation
                      </span>
                      <div className="flex flex-col gap-1.5 pt-1">
                        {prevLesson && (
                          <Link
                            href={prevLesson.path}
                            onClick={exitFullscreen}
                            className="text-xs p-2 rounded-lg bg-slate-100/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-between text-slate-700 dark:text-slate-300 transition-all"
                          >
                            <span className="truncate">← {prevLesson.title}</span>
                          </Link>
                        )}
                        {nextLesson && (
                          <Link
                            href={nextLesson.path}
                            onClick={exitFullscreen}
                            className="text-xs p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 flex items-center justify-between text-blue-700 dark:text-blue-300 font-medium transition-all"
                          >
                            <span className="truncate">{nextLesson.title} →</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </aside>

              {/* Main Reading & Interactive Canvas:
                  Fills the rest of the laptop screen generously across 9 columns.
                  On mobile/tablet, occupies 100% of the single column.
              */}
              <main className="w-full lg:col-span-9 xl:col-span-9 min-w-0 max-w-4xl lg:max-w-none mx-auto">
                {children}
              </main>
            </div>
          </div>

          {/* Floating Quick Exit Pill on Deep Scroll */}
          <button
            onClick={exitFullscreen}
            title="Exit Fullscreen (Esc)"
            className="fixed bottom-6 right-6 z-50 min-h-[44px] px-4 py-2.5 rounded-full shadow-2xl bg-slate-900/90 text-white dark:bg-white/95 dark:text-slate-900 border border-white/20 dark:border-black/10 backdrop-blur-md flex items-center gap-2 text-xs font-bold transition-transform hover:scale-105 active:scale-95 cursor-pointer touch-manipulation"
          >
            <Minimize2 size={14} />
            <span>Exit Fullscreen</span>
          </button>
        </div>,
        document.body
      )}
    </FullscreenContext.Provider>
  );
}
