"use client";

import { CheckCircle2, XCircle, Loader2, Circle, WifiOff, Ban } from "lucide-react";
import type { CompilerPhase } from "@/lib/rust/state";

const OPERATION_LABEL: Record<string, string> = {
  check: "Check",
  build: "Build",
  run: "Run",
  test: "Test",
  format: "Format",
};

const IN_PROGRESS_LABEL: Record<string, string> = {
  checking: "Checking",
  building: "Building",
  running: "Running",
  testing: "Testing",
  formatting: "Formatting",
};

export function StatusBar({ phase }: { phase: CompilerPhase }) {
  return (
    <div className="flex items-center gap-1.5 border-t border-slate-200/60 dark:border-white/[0.06] bg-slate-100/40 dark:bg-white/[0.02] px-3.5 py-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 backdrop-blur-md">
      <StatusIndicator phase={phase} />
    </div>
  );
}

function StatusIndicator({ phase }: { phase: CompilerPhase }) {
  switch (phase.status) {
    case "idle":
      return (
        <span className="flex items-center gap-1.5 text-slate-500">
          <Circle size={8} className="fill-current text-slate-400" /> Ready
        </span>
      );
    case "checking":
    case "building":
    case "running":
    case "testing":
    case "formatting":
      return (
        <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
          <Loader2 size={11} className="animate-spin text-blue-500" />
          {IN_PROGRESS_LABEL[phase.status]}…
        </span>
      );
    case "success":
      return (
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
          <CheckCircle2 size={11} className="text-emerald-500" />
          {OPERATION_LABEL[phase.operation]} succeeded in {phase.result.durationMs}ms
        </span>
      );
    case "failed":
      return (
        <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold">
          <XCircle size={11} className="text-red-500" />
          {OPERATION_LABEL[phase.operation]} failed in {phase.result.durationMs}ms
        </span>
      );
    case "backend_error":
      return (
        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
          <WifiOff size={11} className="text-amber-500" />
          Offline / runner unreachable
        </span>
      );
    case "cancelled":
      return (
        <span className="flex items-center gap-1.5 text-slate-500">
          <Ban size={11} /> Cancelled
        </span>
      );
  }
}
