"use client";

import { CheckCircle2, XCircle, Loader2, Ban, WifiOff, Clock } from "lucide-react";
import type { CompilerPhase } from "@/lib/rust/state";
import { cn } from "@/lib/utils";

const IN_PROGRESS_LABEL: Record<string, string> = {
  checking: "Checking",
  building: "Building",
  running: "Running",
  testing: "Testing",
  formatting: "Formatting",
};

export function OutputPanel({ phase }: { phase: CompilerPhase }) {
  if (phase.status === "idle") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-center text-xs font-mono text-slate-400 dark:text-slate-500">
        Run your code to view console output here.
      </div>
    );
  }

  if (
    phase.status === "checking" ||
    phase.status === "building" ||
    phase.status === "running" ||
    phase.status === "testing" ||
    phase.status === "formatting"
  ) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 px-4 py-8 text-xs font-mono text-slate-500 dark:text-slate-400">
        <Loader2 size={15} className="animate-spin text-blue-500" />
        {IN_PROGRESS_LABEL[phase.status]}…
      </div>
    );
  }

  if (phase.status === "cancelled") {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 px-4 py-8 text-xs font-mono text-slate-400">
        <Ban size={15} /> Cancelled.
      </div>
    );
  }

  if (phase.status === "backend_error") {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
          <WifiOff size={15} /> REEC couldn&rsquo;t reach the compiler
        </div>
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">{phase.error.message}</p>
        {phase.error.upstreamDetail && (
          <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-200/60 dark:border-white/[0.08] bg-slate-900/90 text-slate-200 p-3 font-mono text-[11px] leading-relaxed">
            {phase.error.upstreamDetail}
          </pre>
        )}
      </div>
    );
  }

  // success | failed
  const { result, operation } = phase;
  const isFormat = operation === "format";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-white/[0.06] bg-slate-100/40 dark:bg-white/[0.02] px-4 py-2 text-xs font-mono">
        {phase.status === "success" ? (
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <CheckCircle2 size={13} /> {isFormat ? "Formatted" : "Execution Finished"}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold">
            <XCircle size={13} /> {result.diagnostics.some((d) => d.level === "error") ? "Failed" : "Failed to run"}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-[10px] font-mono text-slate-400">
          <Clock size={11} /> {result.durationMs}ms
        </span>
      </div>

      {isFormat ? (
        <div className="p-4 text-xs text-slate-600 dark:text-slate-400">
          {result.success
            ? "Formatting applied to the editor."
            : "rustfmt couldn't format this file — see Problems for details."}
        </div>
      ) : (
        <>
          <OutputSection label="STDOUT" content={result.stdout} empty="(no standard output)" />
          {result.stderr && !result.diagnostics.length && (
            <OutputSection label="STDERR" content={result.stderr} tone="error" />
          )}
        </>
      )}
    </div>
  );
}

function OutputSection({
  label,
  content,
  empty,
  tone,
}: {
  label: string;
  content: string;
  empty?: string;
  tone?: "error";
}) {
  return (
    <div className="border-b border-slate-200/60 dark:border-white/[0.06] p-3.5 last:border-b-0">
      <div className="mb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</div>
      <pre
        className={cn(
          "whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed",
          tone === "error" ? "text-red-500" : "text-slate-800 dark:text-slate-200"
        )}
      >
        {content || <span className="text-slate-400 dark:text-slate-500 italic">{empty}</span>}
      </pre>
    </div>
  );
}
