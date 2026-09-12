"use client";

import * as React from "react";
import {
  Clock,
  Plus,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  X,
  Play,
  Pause,
  Flame,
} from "lucide-react";
import { useProgressStore } from "@/lib/progress/store";
import { cn } from "@/lib/utils";

interface StudySessionModalProps {
  open: boolean;
  onClose: () => void;
}

export function StudySessionModal({ open, onClose }: StudySessionModalProps) {
  const [customMinutes, setCustomMinutes] = React.useState("30");
  const [sessionNote, setSessionNote] = React.useState("");
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);

  const addStudyMinutes = useProgressStore((s) => s.addStudyMinutes);
  const resetAllProgress = useProgressStore((s) => s.resetAllProgress);
  const isSessionActive = useProgressStore((s) => s.isSessionActive);
  const setSessionActive = useProgressStore((s) => s.setSessionActive);
  const currentSessionSeconds = useProgressStore((s) => s.currentSessionSeconds);
  const getTodayMinutes = useProgressStore((s) => s.getTodayMinutes);
  const studyTimeMinutes = useProgressStore((s) => s.studyTimeMinutes);

  if (!open) return null;

  const handleQuickAdd = (mins: number) => {
    addStudyMinutes(mins, sessionNote || `Quick practice session (+${mins}m)`);
    setSessionNote("");
    onClose();
  };

  const handleCustomAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(customMinutes, 10);
    if (!isNaN(mins) && mins > 0) {
      addStudyMinutes(mins, sessionNote || `Manual study session (+${mins}m)`);
      setSessionNote("");
      onClose();
    }
  };

  const handleReset = () => {
    resetAllProgress();
    setShowResetConfirm(false);
    onClose();
  };

  const formatSessionTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 dark:bg-black/75 p-4 backdrop-blur-md animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c1424]/90 shadow-2xl backdrop-blur-2xl backdrop-saturate-150 p-6 animate-in zoom-in-95 duration-150 space-y-6"
        style={{
          boxShadow:
            "0 20px 50px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 1px 0 0 rgba(255, 255, 255, 0.6) inset",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Clock size={22} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Study & Progress Controls
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live time tracking, practice logs & resets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Live Active Session Card */}
        <div className="rounded-xl border border-blue-500/25 bg-blue-500/[0.06] dark:bg-blue-500/[0.1] p-4 space-y-3 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
              <span>Current Live Session</span>
            </div>
            <button
              onClick={() => setSessionActive(!isSessionActive)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium transition-colors border cursor-pointer",
                isSessionActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10"
              )}
            >
              {isSessionActive ? (
                <>
                  <Pause size={11} /> Auto-Tracking Active
                </>
              ) : (
                <>
                  <Play size={11} /> Tracking Paused
                </>
              )}
            </button>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {formatSessionTime(currentSessionSeconds)}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">This tab session</span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {getTodayMinutes ? getTodayMinutes() : 0}m
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Total today</span>
            </div>
          </div>
        </div>

        {/* Quick Log Options */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Quick Log Practice Time
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[15, 30, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => handleQuickAdd(mins)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 hover:bg-slate-100/90 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all shadow-xs active:scale-95 cursor-pointer backdrop-blur-md"
              >
                <Plus size={13} />
                <span>+{mins} mins</span>
              </button>
            ))}
          </div>

          {/* Custom Input */}
          <form onSubmit={handleCustomAdd} className="flex gap-2 pt-1">
            <input
              type="number"
              min="1"
              max="600"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              placeholder="Minutes"
              className="w-28 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.04] px-3 py-2 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            <input
              type="text"
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              placeholder="Note (e.g. read chapter 2)"
              className="flex-1 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.04] px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
            />
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shrink-0 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              Add
            </button>
          </form>
        </div>

        {/* Reset Progress Section */}
        <div className="border-t border-slate-100 dark:border-white/10 pt-4">
          {showResetConfirm ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 space-y-2 backdrop-blur-md">
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                Are you sure you want to reset all curriculum progress, study minutes, and streaks?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors shadow-sm cursor-pointer"
                >
                  Yes, Reset Everything
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset all progress & start fresh</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
