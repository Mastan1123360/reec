"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Trash2, Copy, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisualizerControls } from "./VisualizerControls";
import type { WidgetProps } from "@/lib/widgets/registry";

export interface MoveStep {
  step: number;
  label: string;
  code: string;
  explanation: string;
  sourceStatus: "valid" | "moved_out" | "invalid";
  destStatus: "uninit" | "valid" | "dropped";
  heapStatus: "owned_by_source" | "owned_by_dest" | "freed";
  highlightStackCopy: boolean;
  highlightHeapUntouched: boolean;
  compilerDiagnostic?: string;
}

const DEFAULT_MOVE_STEPS: MoveStep[] = [
  {
    step: 0,
    label: "Original Binding",
    code: `let s1 = String::from("Rust");\n// s1 owns heap buffer [0x5500]`,
    explanation: "s1 holds 24 bytes on the stack: ptr -> 0x5500, len: 4, cap: 4. The heap buffer contains 'Rust'.",
    sourceStatus: "valid",
    destStatus: "uninit",
    heapStatus: "owned_by_source",
    highlightStackCopy: false,
    highlightHeapUntouched: false,
  },
  {
    step: 1,
    label: "Shallow Stack Copy (Move)",
    code: `let s2 = s1;\n// 24 bytes copied from s1 stack frame to s2`,
    explanation: "Rust copies the 24-byte struct (pointer, length, capacity) from s1 to s2. The heap buffer at 0x5500 is NOT copied (shallow copy = O(1) performance).",
    sourceStatus: "moved_out",
    destStatus: "valid",
    heapStatus: "owned_by_dest",
    highlightStackCopy: true,
    highlightHeapUntouched: true,
    compilerDiagnostic: "Note: Move occurred because `String` has type `String`, which does not implement the `Copy` trait.",
  },
  {
    step: 2,
    label: "Invalidation of Source",
    code: `// println!("{}", s1); // COMPILE ERROR!\n// error[E0382]: borrow of moved value: \`s1\``,
    explanation: "To prevent double-free bugs when scope closes, rustc invalidates s1. Accessing s1 is a hard compile-time error.",
    sourceStatus: "invalid",
    destStatus: "valid",
    heapStatus: "owned_by_dest",
    highlightStackCopy: false,
    highlightHeapUntouched: false,
    compilerDiagnostic: "error[E0382]: borrow of moved value: `s1`\n  --> src/main.rs:4:20\n   | value borrowed here after move",
  },
  {
    step: 3,
    label: "RAII Scope Drop",
    code: `} // Scope closes: s2 is dropped, deallocating 0x5500. s1 is ignored.`,
    explanation: "When the scope exits, s2's Drop destructor is invoked, freeing heap buffer 0x5500 exactly ONCE. Because s1 was marked moved, no double-free occurs.",
    sourceStatus: "invalid",
    destStatus: "dropped",
    heapStatus: "freed",
    highlightStackCopy: false,
    highlightHeapUntouched: false,
  },
];

export function MoveDropAnimation({ props }: WidgetProps = {}) {
  const steps: MoveStep[] =
    Array.isArray(props?.steps) && props.steps.length > 0
      ? (props.steps as MoveStep[])
      : DEFAULT_MOVE_STEPS;

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
    }, 3200);
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
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Copy size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Move Semantics & RAII Drop Mechanics
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Zero-cost shallow stack copy + automatic double-free prevention
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] font-mono text-amber-600 dark:text-amber-400 self-start sm:self-auto">
          Phase: {current.label}
        </span>
      </div>

      {/* Code & Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950 p-3 text-white font-mono text-xs overflow-x-auto">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Move Lifecycle Code</span>
            <span className="text-amber-400 text-[9px]">MIR Translation</span>
          </div>
          <pre className="text-amber-300 leading-relaxed font-mono">
            {current.code}
          </pre>
        </div>

        <div className="md:col-span-7 flex flex-col justify-between rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          <p>{current.explanation}</p>
          {current.compilerDiagnostic && (
            <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 font-mono text-[10.5px] text-red-700 dark:text-red-300 overflow-x-auto">
              <div className="flex items-center gap-1 font-bold text-red-500 mb-0.5">
                <AlertTriangle size={12} />
                <span>Compiler Safety Check</span>
              </div>
              <pre className="whitespace-pre-wrap">{current.compilerDiagnostic}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Visual Canvas: Stack (s1, s2) -> Heap (0x5500) */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-slate-900/50 p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Stack Frame column */}
          <div className="md:col-span-6 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              Stack Frame Bindings (24 bytes each)
            </div>

            {/* Variable s1 */}
            <div
              className={cn(
                "rounded-xl border p-3 transition-all",
                current.sourceStatus === "valid"
                  ? "border-blue-500/60 bg-blue-500/10 shadow-sm"
                  : current.sourceStatus === "moved_out"
                  ? "border-amber-500/40 bg-amber-500/[0.06]"
                  : "border-slate-300 dark:border-white/10 bg-slate-200/50 dark:bg-white/[0.02] opacity-50 line-through"
              )}
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-slate-900 dark:text-white">let s1: String</span>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded font-mono font-semibold",
                    current.sourceStatus === "valid"
                      ? "bg-blue-600 text-white"
                      : current.sourceStatus === "moved_out"
                      ? "bg-amber-600 text-white"
                      : "bg-red-500/20 text-red-500 border border-red-500/30"
                  )}
                >
                  {current.sourceStatus === "valid"
                    ? "Active Owner"
                    : current.sourceStatus === "moved_out"
                    ? "Moved Out"
                    : "Invalid (Dropped)"}
                </span>
              </div>
              <div className="mt-1 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                ptr: 0x5500 | len: 4 | cap: 4
              </div>
            </div>

            {/* Variable s2 */}
            <div
              className={cn(
                "rounded-xl border p-3 transition-all",
                current.destStatus === "uninit"
                  ? "border-dashed border-slate-300 dark:border-white/10 opacity-40"
                  : current.destStatus === "valid"
                  ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30"
                  : "border-slate-300 dark:border-white/10 opacity-30"
              )}
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-slate-900 dark:text-white">let s2: String</span>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded font-mono font-semibold",
                    current.destStatus === "uninit"
                      ? "bg-slate-300 dark:bg-white/10 text-slate-500"
                      : current.destStatus === "valid"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-400 text-white"
                  )}
                >
                  {current.destStatus === "uninit"
                    ? "Not Declared"
                    : current.destStatus === "valid"
                    ? "Sole Owner"
                    : "Freed on Scope Exit"}
                </span>
              </div>
              <div className="mt-1 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                {current.destStatus === "uninit"
                  ? "uninitialized"
                  : "ptr: 0x5500 | len: 4 | cap: 4"}
              </div>
            </div>
          </div>

          {/* Pointer transition arrow */}
          <div className="hidden md:flex md:col-span-2 flex-col items-center justify-center text-slate-400">
            <ArrowRight size={22} className="animate-pulse text-indigo-500" />
            <span className="text-[10px] font-mono mt-1 text-center font-bold">
              {current.heapStatus === "freed" ? "Freed" : "Points To"}
            </span>
          </div>

          {/* Heap Buffer column */}
          <div className="md:col-span-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono mb-3">
              Heap Memory (0x5500)
            </div>

            <div
              className={cn(
                "rounded-xl border p-4 transition-all text-center space-y-2",
                current.heapStatus === "freed"
                  ? "border-dashed border-red-500/40 bg-red-500/[0.05]"
                  : "border-emerald-500/50 bg-emerald-500/10 shadow-sm"
              )}
            >
              <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white">
                {current.heapStatus === "freed" ? (
                  <Trash2 size={16} className="text-red-500" />
                ) : (
                  <ShieldCheck size={16} className="text-emerald-500" />
                )}
                <span>Address 0x5500</span>
              </div>

              <div className="text-sm font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
                {current.heapStatus === "freed" ? (
                  <span className="text-red-500 line-through">[DEALLOCATED]</span>
                ) : (
                  "['R','u','s','t']"
                )}
              </div>

              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {current.heapStatus === "owned_by_source"
                  ? "Owned by s1"
                  : current.heapStatus === "owned_by_dest"
                  ? "Owned by s2 (Moved)"
                  : "Deallocated by s2::drop()"}
              </div>
            </div>
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
