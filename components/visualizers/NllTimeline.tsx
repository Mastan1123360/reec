"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Clock, CheckCircle2, XCircle, ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisualizerControls } from "./VisualizerControls";
import type { WidgetProps } from "@/lib/widgets/registry";

export interface NllStep {
  step: number;
  label: string;
  codeLine: string;
  rust2015Status: "alive" | "conflict" | "dead";
  rust2018Status: "alive" | "dead" | "free";
  rust2015Desc: string;
  rust2018Desc: string;
}

const DEFAULT_NLL_STEPS: NllStep[] = [
  {
    step: 0,
    label: "Borrow Creation",
    codeLine: `let mut data = vec![1, 2, 3];\nlet slice = &data[..]; // Borrow begins`,
    rust2015Status: "alive",
    rust2018Status: "alive",
    rust2015Desc: "Lexical Scope: Borrow starts and is bound to the entire enclosing block scope.",
    rust2018Desc: "NLL: Borrow begins at creation point.",
  },
  {
    step: 1,
    label: "Last Use of Reference",
    codeLine: `println!("First item: {}", slice[0]);\n// <-- LAST USE OF \`slice\``,
    rust2015Status: "alive",
    rust2018Status: "dead",
    rust2015Desc: "Lexical Scope: `slice` borrow remains ACTIVE until the closing brace `}`, even though it is never used again.",
    rust2018Desc: "NLL: Compiler analyzes control-flow graph (CFG). Borrow terminates immediately after this statement!",
  },
  {
    step: 2,
    label: "Subsequent Mutation",
    codeLine: `data.push(4); // Modifies original vector`,
    rust2015Status: "conflict",
    rust2018Status: "free",
    rust2015Desc: "Rust 2015 (Lexical): REJECTED! error[E0502]: cannot borrow `data` as mutable because it is also borrowed as immutable by `slice`.",
    rust2018Desc: "Rust 2018+ (NLL): PASSED! `slice` is already dead in the CFG, so `data.push(4)` has exclusive write access.",
  },
  {
    step: 3,
    label: "Scope Exit",
    codeLine: `} // End of enclosing block`,
    rust2015Status: "dead",
    rust2018Status: "dead",
    rust2015Desc: "Lexical Scope: Borrow finally expires here at the closing brace.",
    rust2018Desc: "NLL: Scope finishes cleanly without artificial lifetime extensions.",
  },
];

export function NllTimeline({ props }: WidgetProps = {}) {
  const steps: NllStep[] =
    Array.isArray(props?.steps) && props.steps.length > 0
      ? (props.steps as NllStep[])
      : DEFAULT_NLL_STEPS;

  const [currentStep, setCurrentStep] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const prefersReducedMotion = useReducedMotion();

  const totalSteps = steps.length;
  const current = steps[currentStep] || steps[0];

  React.useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [isPlaying, totalSteps]);

  const handlePlayPause = React.useCallback(() => {
    if (currentStep >= totalSteps - 1 && !isPlaying) {
      setCurrentStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((p) => !p);
    }
  }, [currentStep, totalSteps, isPlaying]);

  return (
    <div className="my-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#070e1d]/90 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-4 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Clock size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Non-Lexical Lifetimes (NLL) vs Lexical Scopes
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Rust 2015 AST scope lifetime vs Rust 2018+ Control-Flow Graph analysis
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-[11px] font-mono text-cyan-600 dark:text-cyan-400 self-start sm:self-auto">
          Step {currentStep + 1} of {totalSteps}: {current.label}
        </span>
      </div>

      {/* Code Snippet */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950 p-3 text-white font-mono text-xs overflow-x-auto">
        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
          <span>Execution Point</span>
          <span className="text-cyan-400 text-[9px]">MIR Borrow Check</span>
        </div>
        <pre className="text-cyan-300 leading-relaxed font-mono">
          {current.codeLine}
        </pre>
      </div>

      {/* Comparison Grid: Rust 2015 Lexical vs Rust 2018+ NLL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* RUST 2015 (LEXICAL SCOPE) */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/40 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
              Rust 2015 (Lexical Scopes)
            </span>
            <span
              className={cn(
                "text-[10.5px] font-mono font-bold px-2 py-0.5 rounded",
                current.rust2015Status === "conflict"
                  ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                  : current.rust2015Status === "alive"
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  : "bg-slate-200 dark:bg-white/10 text-slate-500"
              )}
            >
              {current.rust2015Status === "conflict"
                ? "BORROW CONFLICT (FAIL)"
                : current.rust2015Status === "alive"
                ? "BORROW ACTIVE (RIGID)"
                : "SCOPE CLOSED"}
            </span>
          </div>

          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 pt-1">
            {current.rust2015Desc}
          </p>

          <div className="pt-2">
            <div className="h-2 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  current.rust2015Status === "conflict"
                    ? "bg-red-500 w-full"
                    : current.rust2015Status === "alive"
                    ? "bg-amber-500 w-full"
                    : "bg-slate-400 w-0"
                )}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-1 block">
              Borrow Span: Locked to outer block braces
            </span>
          </div>
        </div>

        {/* RUST 2018+ (NON-LEXICAL LIFETIMES) */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/40 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
              <Zap size={14} />
              <span>Rust 2018+ (NLL Engine)</span>
            </span>
            <span
              className={cn(
                "text-[10.5px] font-mono font-bold px-2 py-0.5 rounded",
                current.rust2018Status === "free"
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : current.rust2018Status === "alive"
                  ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400"
                  : "bg-slate-200 dark:bg-white/10 text-slate-500"
              )}
            >
              {current.rust2018Status === "free"
                ? "VALID MUTATION (SUCCESS)"
                : current.rust2018Status === "alive"
                ? "BORROW ACTIVE"
                : "BORROW ENDED EARLY"}
            </span>
          </div>

          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 pt-1">
            {current.rust2018Desc}
          </p>

          <div className="pt-2">
            <div className="h-2 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  currentStep === 0
                    ? "bg-cyan-500 w-1/2"
                    : currentStep === 1
                    ? "bg-cyan-500 w-1/2"
                    : "bg-emerald-500 w-0"
                )}
              />
            </div>
            <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 mt-1 block">
              Borrow Span: Ends precisely at last use point
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <VisualizerControls
        currentStep={currentStep}
        totalSteps={totalSteps}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onPrev={() => setCurrentStep((s) => Math.max(0, s - 1))}
        onNext={() => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1))}
        onReset={() => {
          setCurrentStep(0);
          setIsPlaying(false);
        }}
        onStepSelect={(s) => {
          setCurrentStep(s);
          setIsPlaying(false);
        }}
        stepLabels={steps.map((s) => s.label)}
      />
    </div>
  );
}
