"use client";

import * as React from "react";
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VisualizerControlsProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onStepSelect?: (step: number) => void;
  stepLabels?: string[];
  className?: string;
}

export function VisualizerControls({
  currentStep,
  totalSteps,
  isPlaying,
  onPlayPause,
  onPrev,
  onNext,
  onReset,
  onStepSelect,
  stepLabels,
  className,
}: VisualizerControlsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.03] p-2.5 sm:p-3 backdrop-blur-md",
        className
      )}
    >
      {/* Playback Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onReset}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer active:scale-95"
          title="Reset to beginning"
          aria-label="Reset"
        >
          <RotateCcw size={14} />
        </button>

        <button
          type="button"
          onClick={onPrev}
          disabled={currentStep === 0}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          title="Previous step"
          aria-label="Previous step"
        >
          <SkipBack size={14} />
        </button>

        <button
          type="button"
          onClick={onPlayPause}
          className={cn(
            "flex h-8 items-center gap-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm",
            isPlaying
              ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <>
              <Pause size={13} />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play size={13} />
              <span>Play</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={currentStep === totalSteps - 1}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          title="Next step"
          aria-label="Next step"
        >
          <SkipForward size={14} />
        </button>
      </div>

      {/* Step Indicators / Stepper Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const isActive = currentStep === idx;
          const isPassed = currentStep > idx;
          const label = stepLabels?.[idx] || `Step ${idx + 1}`;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onStepSelect?.(idx)}
              className={cn(
                "h-6 px-2.5 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer select-none",
                isActive
                  ? "bg-blue-600 text-white shadow-xs scale-105"
                  : isPassed
                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25"
                  : "bg-slate-200/60 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 hover:bg-slate-300/60 dark:hover:bg-white/10"
              )}
              title={label}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
