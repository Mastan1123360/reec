"use client";

import * as React from "react";
import { Maximize2, Minimize2, ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  lessonTitle: string;
  phaseNumber: number;
  weekNumber?: number;
  dayNumber?: number;
  estimatedMinutes?: number;
}

export function LessonFullscreenProvider({
  children,
  lessonTitle,
  phaseNumber,
  weekNumber,
  dayNumber,
  estimatedMinutes,
}: LessonFullscreenProviderProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Request browser-level HTML5 fullscreen if supported
  const requestBrowserFullscreen = React.useCallback(async () => {
    try {
      const el = containerRef.current || document.documentElement;
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
      // Browser rejected native fullscreen (e.g. inside iframe or iOS Safari)
      // The CSS In-App Overlay ensures full-screen reading on all devices regardless!
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
        // User pressed Esc or exited via browser UI
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

  // Lock document body scroll when in-app fullscreen is active
  React.useEffect(() => {
    if (isFullscreen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isFullscreen]);

  // Track reading progress in fullscreen scroll container
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollable = target.scrollHeight - target.clientHeight;
    if (scrollable > 0) {
      const pct = Math.min(100, Math.max(0, Math.round((target.scrollTop / scrollable) * 100)));
      setScrollProgress(pct);
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

  return (
    <FullscreenContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        onScroll={isFullscreen ? handleScroll : undefined}
        className={
          isFullscreen
            ? "fixed inset-0 z-[100] w-screen h-screen overflow-y-auto bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col scroll-smooth"
            : "relative w-full"
        }
      >
        {/* Fullscreen Reading Header (Persistent on top while reading) */}
        {isFullscreen && (
          <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/85 dark:bg-[#0c1322]/90 border-b border-slate-200/70 dark:border-white/[0.08] shadow-xs">
            {/* Scroll Reading Progress Bar */}
            <div
              className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 transition-all duration-150 ease-out"
              style={{ width: `${scrollProgress}%` }}
            />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
              {/* Left: Metadata & Breadcrumb */}
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exitFullscreen}
                  title="Exit fullscreen mode"
                  className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  <ArrowLeft size={16} />
                </Button>

                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="default" className="shrink-0 text-[10px] sm:text-xs">
                    Phase {String(phaseNumber).padStart(2, "0")}
                  </Badge>
                  {weekNumber !== undefined && (
                    <Badge variant="secondary" className="hidden md:inline-flex text-[10px]">
                      W{weekNumber}
                    </Badge>
                  )}
                  {dayNumber !== undefined && (
                    <Badge variant="secondary" className="hidden md:inline-flex text-[10px]">
                      D{dayNumber}
                    </Badge>
                  )}
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {lessonTitle}
                  </h2>
                </div>
              </div>

              {/* Right: Reading stats & Prominent Exit Fullscreen button */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <BookOpen size={13} className="text-blue-500" />
                  <span>{scrollProgress}% read</span>
                  {estimatedMinutes && (
                    <span className="text-slate-400 dark:text-slate-600">
                      • {estimatedMinutes}m
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={exitFullscreen}
                  className="min-h-[44px] sm:min-h-[36px] px-3 sm:px-4 flex items-center gap-1.5 font-semibold text-xs sm:text-sm rounded-xl border-slate-300 dark:border-white/20 bg-white/80 dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100 shadow-xs cursor-pointer active:scale-95 transition-all"
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
        )}

        {/* Content Viewport */}
        <div
          className={
            isFullscreen
              ? "flex-1 min-h-0 w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12"
              : "w-full"
          }
        >
          {children}
        </div>

        {/* Floating Quick Exit Button for Deep Scrolling (Bottom Right) */}
        {isFullscreen && (
          <button
            onClick={exitFullscreen}
            title="Exit Fullscreen (Esc)"
            className="fixed bottom-6 right-6 z-50 min-h-[44px] px-4 py-2.5 rounded-full shadow-2xl bg-slate-900/90 text-white dark:bg-white/95 dark:text-slate-900 border border-white/20 dark:border-black/10 backdrop-blur-md flex items-center gap-2 text-xs font-bold transition-transform hover:scale-105 active:scale-95 cursor-pointer touch-manipulation"
          >
            <Minimize2 size={14} />
            <span>Exit Fullscreen</span>
          </button>
        )}
      </div>
    </FullscreenContext.Provider>
  );
}
