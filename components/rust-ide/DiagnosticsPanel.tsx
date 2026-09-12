"use client";

import * as React from "react";
import { AlertCircle, AlertTriangle, Info, Lightbulb, GraduationCap, ChevronRight } from "lucide-react";
import type { RustDiagnostic, DiagnosticLevel } from "@/lib/rust/types";
import { getLearningEntry } from "@/lib/rust/learning";
import { cn } from "@/lib/utils";

const LEVEL_META: Record<DiagnosticLevel, { icon: React.ElementType; color: string; border: string; bg: string }> = {
  error: { icon: AlertCircle, color: "text-red-500", border: "border-red-500/20", bg: "bg-red-500/5" },
  warning: { icon: AlertTriangle, color: "text-amber-500", border: "border-amber-500/20", bg: "bg-amber-500/5" },
  note: { icon: Info, color: "text-sky-500", border: "border-sky-500/20", bg: "bg-sky-500/5" },
  help: { icon: Lightbulb, color: "text-emerald-500", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
};

export function DiagnosticsPanel({
  diagnostics,
  onJumpToSource,
}: {
  diagnostics: RustDiagnostic[];
  onJumpToSource: (line: number, column: number) => void;
}) {
  if (diagnostics.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8 text-center text-xs font-mono text-slate-400 dark:text-slate-500">
        No diagnostics or compiler issues reported.
      </div>
    );
  }

  return (
    <div className="flex-1 divide-y divide-slate-200/60 dark:divide-white/[0.06] overflow-y-auto p-2 space-y-2">
      {diagnostics.map((d) => (
        <DiagnosticCard key={d.id} diagnostic={d} onJumpToSource={onJumpToSource} />
      ))}
    </div>
  );
}

function DiagnosticCard({
  diagnostic,
  onJumpToSource,
}: {
  diagnostic: RustDiagnostic;
  onJumpToSource: (line: number, column: number) => void;
}) {
  const [showRaw, setShowRaw] = React.useState(false);
  const meta = LEVEL_META[diagnostic.level] || LEVEL_META.error;
  const { icon: Icon, color } = meta;
  const learning = getLearningEntry(diagnostic.code);
  const span = diagnostic.primarySpan;

  return (
    <div
      className={cn(
        "rounded-2xl border p-3.5 backdrop-blur-md transition-all shadow-xs",
        meta.border,
        meta.bg
      )}
      style={{ boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.4)" }}
    >
      <div className="flex items-start gap-2.5">
        <Icon size={16} className={cn("mt-0.5 shrink-0", color)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-1.5">
            {diagnostic.code && (
              <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-md">
                {diagnostic.code}
              </span>
            )}
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{diagnostic.message}</span>
          </div>

          {span && (
            <button
              onClick={() => onJumpToSource(span.line, span.column)}
              className="mt-1.5 inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {span.file}:{span.line}:{span.column}
              <ChevronRight size={11} />
            </button>
          )}

          {span?.snippet && (
            <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-200/60 dark:border-white/[0.08] bg-slate-900/90 text-slate-100 px-3 py-2 font-mono text-[11px] leading-relaxed">
              {span.snippet}
              {span.label && (
                <>
                  {"\n"}
                  <span className={color}>{"^ " + span.label}</span>
                </>
              )}
            </pre>
          )}

          {diagnostic.children.map((child, i) => (
            <div key={i} className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-bold capitalize">{child.level}:</span>
              <span>{child.message}</span>
            </div>
          ))}

          {learning && (
            <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 backdrop-blur-sm">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <GraduationCap size={13} /> REEC concept explanation
              </div>
              <p className="text-xs leading-relaxed text-slate-800 dark:text-slate-200">{learning.whatHappened}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {learning.concepts.map((c) => (
                  <span
                    key={c}
                    className="rounded-lg bg-blue-500/15 border border-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-300"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowRaw((s) => !s)}
            className="mt-2.5 text-[11px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            {showRaw ? "Hide" : "Show"} raw compiler diagnostics
          </button>
          {showRaw && (
            <pre className="mt-1.5 overflow-x-auto rounded-xl bg-black/80 border border-white/10 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-200">
              {diagnostic.raw}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
