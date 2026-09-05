"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Layers, Database, Cpu, ArrowRight, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisualizerControls } from "./VisualizerControls";
import type { WidgetProps } from "@/lib/widgets/registry";

export interface MemoryItem {
  id: string;
  name: string;
  type: string;
  value: string;
  address: string;
  sizeBytes: number;
  segment: "stack" | "heap" | "static";
  pointsTo?: string;
  status: "active" | "moved" | "borrowed" | "dropped";
  scope: string;
}

export interface MemoryStepState {
  step: number;
  label: string;
  code: string;
  explanation: string;
  stack: MemoryItem[];
  heap: MemoryItem[];
  staticData?: MemoryItem[];
  activePointer?: { from: string; to: string };
}

const DEFAULT_MEMORY_STEPS: MemoryStepState[] = [
  {
    step: 0,
    label: "Initialization",
    code: `fn main() {\n    let x: i32 = 42;\n}`,
    explanation: "Primitive `x: i32` is allocated directly on the stack frame with 4 bytes. No heap allocation occurs.",
    stack: [
      {
        id: "x",
        name: "x",
        type: "i32",
        value: "42",
        address: "0x7ffee008",
        sizeBytes: 4,
        segment: "stack",
        status: "active",
        scope: "main",
      },
    ],
    heap: [],
  },
  {
    step: 1,
    label: "Heap Allocation",
    code: `fn main() {\n    let x: i32 = 42;\n    let s = String::from("Rust");\n}`,
    explanation: "String `s` creates a 24-byte fat pointer on the stack (ptr, len=4, cap=4) that points to a heap buffer at `0x55aa0010` holding the 4 bytes ['R','u','s','t'].",
    stack: [
      {
        id: "x",
        name: "x",
        type: "i32",
        value: "42",
        address: "0x7ffee008",
        sizeBytes: 4,
        segment: "stack",
        status: "active",
        scope: "main",
      },
      {
        id: "s",
        name: "s",
        type: "String",
        value: "ptr: 0x55aa0010, len: 4, cap: 4",
        address: "0x7ffee010",
        sizeBytes: 24,
        segment: "stack",
        pointsTo: "0x55aa0010",
        status: "active",
        scope: "main",
      },
    ],
    heap: [
      {
        id: "heap-rust",
        name: "s.buffer",
        type: "[u8; 4]",
        value: "['R', 'u', 's', 't']",
        address: "0x55aa0010",
        sizeBytes: 4,
        segment: "heap",
        status: "active",
        scope: "s (owner)",
      },
    ],
    activePointer: { from: "s", to: "0x55aa0010" },
  },
  {
    step: 2,
    label: "Stack Reference Borrow",
    code: `fn main() {\n    let x: i32 = 42;\n    let s = String::from("Rust");\n    let r: &i32 = &x;\n}`,
    explanation: "Reference `r: &i32` creates an 8-byte pointer on the stack containing `0x7ffee008` (address of `x`). `x` is now borrowed.",
    stack: [
      {
        id: "x",
        name: "x",
        type: "i32",
        value: "42",
        address: "0x7ffee008",
        sizeBytes: 4,
        segment: "stack",
        status: "borrowed",
        scope: "main",
      },
      {
        id: "s",
        name: "s",
        type: "String",
        value: "ptr: 0x55aa0010, len: 4, cap: 4",
        address: "0x7ffee010",
        sizeBytes: 24,
        segment: "stack",
        pointsTo: "0x55aa0010",
        status: "active",
        scope: "main",
      },
      {
        id: "r",
        name: "r",
        type: "&i32",
        value: "0x7ffee008 (&x)",
        address: "0x7ffee028",
        sizeBytes: 8,
        segment: "stack",
        pointsTo: "0x7ffee008",
        status: "active",
        scope: "main",
      },
    ],
    heap: [
      {
        id: "heap-rust",
        name: "s.buffer",
        type: "[u8; 4]",
        value: "['R', 'u', 's', 't']",
        address: "0x55aa0010",
        sizeBytes: 4,
        segment: "heap",
        status: "active",
        scope: "s (owner)",
      },
    ],
    activePointer: { from: "r", to: "0x7ffee008" },
  },
  {
    step: 3,
    label: "Move Transfer",
    code: `fn main() {\n    ...\n    let s2 = s; // Move ownership\n}`,
    explanation: "Moving `s` to `s2` bitwise-copies the 24-byte stack metadata to `s2`. The heap address `0x55aa0010` is unchanged. `s` is invalidated to prevent double-free.",
    stack: [
      {
        id: "x",
        name: "x",
        type: "i32",
        value: "42",
        address: "0x7ffee008",
        sizeBytes: 4,
        segment: "stack",
        status: "active",
        scope: "main",
      },
      {
        id: "s",
        name: "s (moved)",
        type: "String",
        value: "[Invalidated / Moved Out]",
        address: "0x7ffee010",
        sizeBytes: 24,
        segment: "stack",
        status: "moved",
        scope: "main",
      },
      {
        id: "s2",
        name: "s2",
        type: "String",
        value: "ptr: 0x55aa0010, len: 4, cap: 4",
        address: "0x7ffee030",
        sizeBytes: 24,
        segment: "stack",
        pointsTo: "0x55aa0010",
        status: "active",
        scope: "main",
      },
    ],
    heap: [
      {
        id: "heap-rust",
        name: "s2.buffer",
        type: "[u8; 4]",
        value: "['R', 'u', 's', 't']",
        address: "0x55aa0010",
        sizeBytes: 4,
        segment: "heap",
        status: "active",
        scope: "s2 (new owner)",
      },
    ],
    activePointer: { from: "s2", to: "0x55aa0010" },
  },
  {
    step: 4,
    label: "RAII Scope Drop",
    code: `} // main exits -> s2 dropped -> heap freed`,
    explanation: "At the end of scope, `s2`'s `Drop` implementation calls allocator deallocation for heap buffer `0x55aa0010`. `s` was moved, so no double-free occurs.",
    stack: [],
    heap: [],
  },
];

export function MemoryViewer({ props }: WidgetProps = {}) {
  const steps: MemoryStepState[] =
    Array.isArray(props?.steps) && props.steps.length > 0
      ? (props.steps as MemoryStepState[])
      : DEFAULT_MEMORY_STEPS;

  const [currentStep, setCurrentStep] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<MemoryItem | null>(null);
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
    }, 2800);
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
        <div className="flex items-center gap-2.5">
          <Cpu size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Memory Segment Layout
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Stack frame addresses vs Heap buffers & pointer tracking
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] font-mono text-blue-600 dark:text-blue-400 self-start sm:self-auto">
          <span>{current.label}</span>
          <span>({currentStep + 1}/{totalSteps})</span>
        </div>
      </div>

      {/* Code Snippet & Diagnostic Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950 p-3 text-white font-mono text-xs overflow-x-auto">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Rust Source</span>
            <span className="text-emerald-400 text-[9px]">Compiled AST</span>
          </div>
          <pre className="text-blue-300 leading-relaxed font-mono">
            {current.code}
          </pre>
        </div>

        <div className="md:col-span-7 flex flex-col justify-center rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white mb-1">
            <Info size={13} className="text-blue-500" />
            <span>Memory Inspector Analysis</span>
          </div>
          <p>{current.explanation}</p>
        </div>
      </div>

      {/* Memory Segments: Stack (Left) & Heap (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* STACK SEGMENT */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Layers size={14} className="text-indigo-500" />
              <span>Stack Frame (High → Low Memory)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">LIFO Order</span>
          </div>

          <div className="space-y-2 min-h-[140px]">
            {current.stack.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-white/10 text-xs text-slate-400">
                Stack frame empty (Scope exited)
              </div>
            ) : (
              current.stack.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const isMoved = item.status === "moved";
                const isBorrowed = item.status === "borrowed";

                return (
                  <motion.div
                    key={item.id}
                    layout={!prefersReducedMotion}
                    initial={prefersReducedMotion ? {} : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedItem(item)}
                    className={cn(
                      "rounded-lg border p-2.5 text-xs transition-all cursor-pointer",
                      isSelected
                        ? "border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/40"
                        : isMoved
                        ? "border-slate-300 dark:border-white/5 bg-slate-200/40 dark:bg-white/[0.02] opacity-60 line-through"
                        : isBorrowed
                        ? "border-amber-500/40 bg-amber-500/[0.06] text-amber-900 dark:text-amber-200"
                        : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 hover:border-blue-400"
                    )}
                  >
                    <div className="flex items-center justify-between font-mono font-semibold">
                      <span className="text-blue-600 dark:text-blue-400">{item.name}</span>
                      <span className="text-[10px] text-slate-400">{item.address}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                      <span>{item.type}</span>
                      <span>{item.sizeBytes} B</span>
                    </div>
                    <div className="mt-1 text-[10.5px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      {item.value}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* HEAP SEGMENT */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Database size={14} className="text-emerald-500" />
              <span>Heap Allocation (Dynamic Buffers)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">RAII Managed</span>
          </div>

          <div className="space-y-2 min-h-[140px]">
            {current.heap.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-white/10 text-xs text-slate-400">
                Heap buffer empty (No active allocations)
              </div>
            ) : (
              current.heap.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <motion.div
                    key={item.id}
                    layout={!prefersReducedMotion}
                    initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setSelectedItem(item)}
                    className={cn(
                      "rounded-lg border p-2.5 text-xs transition-all cursor-pointer",
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/40"
                        : "border-emerald-500/30 bg-emerald-500/[0.06] hover:border-emerald-500/60"
                    )}
                  >
                    <div className="flex items-center justify-between font-mono font-semibold">
                      <span className="text-emerald-600 dark:text-emerald-400">{item.name}</span>
                      <span className="text-[10px] text-slate-400">{item.address}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                      <span>{item.type}</span>
                      <span>Owner: {item.scope}</span>
                    </div>
                    <div className="mt-1 text-[10.5px] font-mono text-emerald-600 dark:text-emerald-300">
                      Bytes: {item.value}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Item Inspection Panel */}
      {selectedItem && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/[0.05] p-3 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-blue-500" />
            <span className="font-mono text-slate-900 dark:text-white">
              <strong>{selectedItem.name}</strong> ({selectedItem.type}) @ <code>{selectedItem.address}</code> ({selectedItem.sizeBytes} bytes)
            </span>
          </div>
          <button
            onClick={() => setSelectedItem(null)}
            className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

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
