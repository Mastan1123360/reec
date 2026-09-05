"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Shield, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisualizerControls } from "./VisualizerControls";
import type { WidgetProps } from "@/lib/widgets/registry";

export interface OwnershipStageInfo {
  stage: "CREATE" | "OWN" | "MOVE" | "BORROW" | "USE" | "DROP" | string;
  title: string;
  code: string;
  owner: string;
  previousOwner?: string;
  valueState: string;
  canRead: boolean;
  canWrite: boolean;
  borrowerCount: number;
  borrowMode: string;
  description: string;
  rustcRule: string;
}

const DEFAULT_OWNERSHIP_STAGES: OwnershipStageInfo[] = [
  {
    stage: "CREATE",
    title: "1. Allocation & Initialization",
    code: `let mut buffer = String::from("Rust Systems");`,
    owner: "buffer",
    valueState: "Allocated",
    canRead: true,
    canWrite: true,
    borrowerCount: 0,
    borrowMode: "None",
    description: "Heap memory is allocated. Variable `buffer` is declared and becomes the sole, exclusive owner of the value.",
    rustcRule: "Each value in Rust has an owner. There can only be one owner at a time.",
  },
  {
    stage: "OWN",
    title: "2. Active Exclusive Ownership",
    code: `buffer.push_str(" 2026"); // Owner modifies data directly`,
    owner: "buffer",
    valueState: "Valid & Exclusive",
    canRead: true,
    canWrite: true,
    borrowerCount: 0,
    borrowMode: "None",
    description: "Because `buffer` is mutable and exclusively owned without active borrows, it has uninhibited read/write privileges.",
    rustcRule: "The owner has full read and write access when no borrows are outstanding.",
  },
  {
    stage: "MOVE",
    title: "3. Ownership Transfer (Move)",
    code: `let target = buffer; // buffer moved to target\n// buffer is now INACCESSIBLE`,
    owner: "target",
    previousOwner: "buffer",
    valueState: "Moved Out (Invalid)",
    canRead: false,
    canWrite: false,
    borrowerCount: 0,
    borrowMode: "None",
    description: "Assignment passes ownership to `target`. `buffer` is statically marked uninitialized by rustc to prevent double-frees.",
    rustcRule: "When ownership moves, the original binding can no longer be used. Copying the stack pointer invalidates the source.",
  },
  {
    stage: "BORROW",
    title: "4. Shared Reference Borrow",
    code: `let r1 = &target;\nlet r2 = &target;\n// target is frozen for mutation while r1, r2 exist`,
    owner: "target",
    valueState: "Borrowed (Shared)",
    canRead: true,
    canWrite: false,
    borrowerCount: 2,
    borrowMode: "Shared (&T)",
    description: "`target` creates two shared references `r1` and `r2`. Reader count = 2. Owner `target` can still be read, but mutation is locked.",
    rustcRule: "You may have any number of immutable references (&T) OR exactly one mutable reference (&mut T), never both.",
  },
  {
    stage: "USE",
    title: "5. Reading Through References",
    code: `println!("r1: {}, r2: {}", r1, r2);\n// Borrows end after their last use`,
    owner: "target",
    valueState: "Valid & Exclusive",
    canRead: true,
    canWrite: true,
    borrowerCount: 0,
    borrowMode: "None",
    description: "References are read by `println!`. Under Non-Lexical Lifetimes (NLL), the borrow ends immediately after its final usage.",
    rustcRule: "References must always be valid for the duration of their active use.",
  },
  {
    stage: "DROP",
    title: "6. Scope Exit & RAII Deallocation",
    code: `} // Scope closes -> target::drop() is called automatically`,
    owner: "None (Freed)",
    valueState: "Deallocated",
    canRead: false,
    canWrite: false,
    borrowerCount: 0,
    borrowMode: "None",
    description: "The scope containing `target` ends. Rust automatically calls `Drop::drop()`, returning heap buffer memory to the global allocator.",
    rustcRule: "When the owner goes out of scope, the value will be automatically dropped and its resources freed.",
  },
];

export function OwnershipTimeline({ props }: WidgetProps = {}) {
  const stages: OwnershipStageInfo[] =
    Array.isArray(props?.stages) && props.stages.length > 0
      ? (props.stages as OwnershipStageInfo[])
      : DEFAULT_OWNERSHIP_STAGES;

  const [currentStep, setCurrentStep] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const prefersReducedMotion = useReducedMotion();

  const totalSteps = stages.length;
  const current = stages[currentStep] || stages[0];

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
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Shield size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Ownership Lifecycle Timeline
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              State machine from allocation to moves, borrows, and RAII cleanup
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 self-start sm:self-auto">
          Stage: {current.stage} ({currentStep + 1}/{totalSteps})
        </span>
      </div>

      {/* Visual Timeline Pipeline Track */}
      <div className="relative py-2 overflow-x-auto">
        <div className="min-w-[280px]">
          <div className="relative flex justify-between items-center">
            <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-slate-200 dark:bg-white/10 rounded-full" />
            {stages.map((s, idx) => {
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;

              return (
                <button
                  key={`${s.stage}-${idx}`}
                  type="button"
                  onClick={() => {
                    setCurrentStep(idx);
                    setIsPlaying(false);
                  }}
                  className={cn(
                    "relative flex flex-col items-center group cursor-pointer transition-all focus-visible:outline-none z-10",
                    isActive ? "scale-110" : ""
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold font-mono transition-all bg-white dark:bg-slate-900",
                      isActive
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                        : isCompleted
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                        : "border-slate-300 dark:border-white/20 text-slate-400"
                    )}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={cn(
                      "mt-1 text-[9.5px] font-mono font-semibold tracking-wider uppercase transition-colors hidden sm:block",
                      isActive
                        ? "text-indigo-600 dark:text-indigo-400 font-bold"
                        : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                    )}
                  >
                    {s.stage}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Code & Explanation Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950 p-3 text-white font-mono text-xs overflow-x-auto">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
            <span>{current.title}</span>
            <span className="text-indigo-400 text-[9px]">Live Scope</span>
          </div>
          <pre className="text-indigo-300 leading-relaxed font-mono">
            {current.code}
          </pre>
        </div>

        <div className="md:col-span-7 flex flex-col justify-between rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white mb-1">
              <UserCheck size={14} className="text-indigo-500" />
              <span>Lifecycle Transition</span>
            </div>
            <p>{current.description}</p>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-white/10 text-[11px] font-mono text-indigo-700 dark:text-indigo-300">
            <strong>Rule:</strong> {current.rustcRule}
          </div>
        </div>
      </div>

      {/* Current State Diagnostic Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-2.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block font-mono">
            Current Owner
          </span>
          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 block truncate">
            {current.owner}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-2.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block font-mono">
            Value State
          </span>
          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
            {current.valueState}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-2.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block font-mono">
            Read / Write
          </span>
          <span className="text-xs font-mono font-bold mt-0.5 flex items-center gap-2">
            <span className={current.canRead ? "text-emerald-500" : "text-red-400"}>
              Read: {current.canRead ? "✓" : "✗"}
            </span>
            <span className={current.canWrite ? "text-emerald-500" : "text-red-400"}>
              Write: {current.canWrite ? "✓" : "✗"}
            </span>
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-2.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block font-mono">
            Active Borrows
          </span>
          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
            {current.borrowMode} ({current.borrowerCount})
          </span>
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
        stepLabels={stages.map((s) => s.stage)}
      />
    </div>
  );
}
