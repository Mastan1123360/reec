"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, Unlock, CheckCircle2, AlertOctagon, Scale, FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WidgetProps } from "@/lib/widgets/registry";

export interface BorrowScenario {
  id: string;
  title: string;
  code: string;
  isLegal: boolean;
  explanation: string;
  readerCount: number;
  writerCount: number;
  dataStatus: "unlocked" | "shared_locked" | "exclusive_locked" | "conflict";
  errorMessage?: string;
}

const DEFAULT_BORROW_SCENARIOS: BorrowScenario[] = [
  {
    id: "multiple-shared",
    title: "Scenario A: Multiple Shared References (&T)",
    code: `let mut val = 100;\nlet r1 = &val; // shared read lock\nlet r2 = &val; // shared read lock\nprintln!("r1: {}, r2: {}", r1, r2);`,
    isLegal: true,
    explanation: "Multiple immutable references are completely safe because no writer can mutate memory concurrently while readers inspect it. Aliasing without mutability.",
    readerCount: 2,
    writerCount: 0,
    dataStatus: "shared_locked",
  },
  {
    id: "shared-and-mut-conflict",
    title: "Scenario B: Shared + Mutable Conflict (&T + &mut T)",
    code: `let mut val = 100;\nlet r1 = &val;\nlet m1 = &mut val; // ERROR!\nprintln!("{}, {}", r1, m1);`,
    isLegal: false,
    explanation: "Rust rejects having an active shared reference `r1` alongside an active mutable reference `m1`. If `m1` mutated `val`, `r1`'s observed value could invalidate or tear.",
    readerCount: 1,
    writerCount: 1,
    dataStatus: "conflict",
    errorMessage: "error[E0502]: cannot borrow `val` as mutable because it is also borrowed as immutable\n  --> src/main.rs:3:14\n   | \n 2 |   let r1 = &val;\n   |            ---- immutable borrow occurs here\n 3 |   let m1 = &mut val;\n   |            ^^^^^^^^ mutable borrow occurs here\n 4 |   println!(\"{}, {}\", r1, m1);\n   |                      -- immutable borrow later used here",
  },
  {
    id: "double-mutable-conflict",
    title: "Scenario C: Simultaneous Double Mutable (&mut T + &mut T)",
    code: `let mut val = 100;\nlet m1 = &mut val;\nlet m2 = &mut val; // ERROR!\n*m1 += 1;\n*m2 += 2;`,
    isLegal: false,
    explanation: "Two concurrent mutable references create data races in concurrent code and break pointer aliasing guarantees in single-threaded code. The compiler enforces exclusive access.",
    readerCount: 0,
    writerCount: 2,
    dataStatus: "conflict",
    errorMessage: "error[E0499]: cannot borrow `val` as mutable more than once at a time\n  --> src/main.rs:3:14\n   | \n 2 |   let m1 = &mut val;\n   |            -------- first mutable borrow occurs here\n 3 |   let m2 = &mut val;\n   |            ^^^^^^^^ second mutable borrow occurs here",
  },
  {
    id: "sequential-reborrow",
    title: "Scenario D: Sequential Reborrowing (NLL)",
    code: `let mut val = 100;\n{\n    let m1 = &mut val;\n    *m1 += 10;\n} // m1 lifetime terminates\nlet r1 = &val; // LEGAL: m1 is dead\nprintln!("val: {}", r1);`,
    isLegal: true,
    explanation: "Once `m1` is no longer used, its mutable borrow ends. The subsequent shared reference `r1` succeeds with zero conflicts.",
    readerCount: 1,
    writerCount: 0,
    dataStatus: "shared_locked",
  },
];

export function BorrowCheckerSimulation({ props }: WidgetProps = {}) {
  const scenarios: BorrowScenario[] =
    Array.isArray(props?.scenarios) && props.scenarios.length > 0
      ? (props.scenarios as BorrowScenario[])
      : DEFAULT_BORROW_SCENARIOS;

  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const current = scenarios[selectedIdx] || scenarios[0];
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="my-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#070e1d]/90 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-4 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/[0.06] pb-3">
        <div className="flex items-center gap-2.5">
          <Scale size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Borrow Checker Rule Simulator: Aliasing XOR Mutability
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Interactive compile-time verification of reader/writer locks
            </p>
          </div>
        </div>

        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold font-mono self-start sm:self-auto",
            current.isLegal
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800"
          )}
        >
          {current.isLegal ? (
            <>
              <CheckCircle2 size={13} />
              <span>Compiles: PASSED</span>
            </>
          ) : (
            <>
              <AlertOctagon size={13} />
              <span>Compiles: REJECTED</span>
            </>
          )}
        </div>
      </div>

      {/* Scenario Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {scenarios.map((sc, idx) => {
          const isActive = idx === selectedIdx;
          return (
            <button
              key={sc.id}
              onClick={() => setSelectedIdx(idx)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer border",
                isActive
                  ? "border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                  : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {sc.title.split(":")[0]}
            </button>
          );
        })}
      </div>

      {/* Code & Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-6 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950 p-3 text-white font-mono text-xs overflow-x-auto">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <FileCode2 size={12} />
              <span>Rust Program</span>
            </span>
            <span className={current.isLegal ? "text-emerald-400 text-[9px]" : "text-red-400 text-[9px]"}>
              {current.isLegal ? "Valid AST" : "Borrow Error"}
            </span>
          </div>
          <pre className="text-blue-300 leading-relaxed font-mono">
            {current.code}
          </pre>
        </div>

        <div className="md:col-span-6 flex flex-col justify-between rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          <div>
            <div className="font-semibold text-slate-900 dark:text-white mb-1">
              {current.title}
            </div>
            <p>{current.explanation}</p>
          </div>

          {current.errorMessage && (
            <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 font-mono text-[10.5px] text-red-700 dark:text-red-300 overflow-x-auto">
              <div className="font-bold text-red-500 mb-0.5 flex items-center gap-1">
                <AlertOctagon size={12} />
                <span>Compiler Diagnostic (rustc)</span>
              </div>
              <pre className="whitespace-pre-wrap">{current.errorMessage}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Lock State Machine Visualizer */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-slate-900/50 p-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Reader Counter */}
          <div className="flex items-center gap-3 w-full sm:w-auto p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10">
            <Unlock size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                Active Readers (&T)
              </span>
              <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                {current.readerCount} Active
              </span>
            </div>
          </div>

          {/* Core Rule Operator: Aliasing XOR Mutability */}
          <div className="text-center font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="px-2 py-1 rounded bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white">
              RULE: (Readers &gt; 0) XOR (Writers == 1)
            </span>
          </div>

          {/* Writer Counter */}
          <div className="flex items-center gap-3 w-full sm:w-auto p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                current.writerCount > 0
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-slate-100 dark:bg-white/5 text-slate-400"
              )}
            >
              <Lock size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">
                Active Writers (&mut T)
              </span>
              <span
                className={cn(
                  "text-sm font-mono font-bold",
                  current.writerCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
                )}
              >
                {current.writerCount} Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
