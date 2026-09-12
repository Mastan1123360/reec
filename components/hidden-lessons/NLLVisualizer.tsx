"use client";

import * as React from "react";
import Link from "next/link";
import {
  Code2,
  Terminal,
  CheckCircle2,
  XCircle,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Activity,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type VisualizerMode = "lexical" | "nll" | "polonius";

export function NLLVisualizer() {
  const [mode, setMode] = React.useState<VisualizerMode>("nll");
  const [activeStep, setActiveStep] = React.useState<number>(2);

  const steps = [
    {
      line: 1,
      code: "let mut data = vec![10, 20, 30];",
      point: "P0",
      desc: "Owned vector allocated on heap. Capacity initialized.",
      lexicalActive: false,
      nllActive: false,
    },
    {
      line: 2,
      code: "let slice = &data[..];",
      point: "P1",
      desc: "Immutable loan L0 created. Borrows heap buffer of data.",
      lexicalActive: true,
      nllActive: true,
    },
    {
      line: 3,
      code: 'println!("First element: {}", slice[0]);',
      point: "P2",
      desc: "Final read operation referencing slice. In NLL, liveness terminates HERE.",
      lexicalActive: true,
      nllActive: true,
      nllTerminates: true,
    },
    {
      line: 4,
      code: "data.push(40);",
      point: "P3",
      desc: "Mutable method call requiring exclusive write access (&mut data).",
      lexicalActive: true,
      lexicalConflict: true,
      nllActive: false,
      nllValid: true,
    },
    {
      line: 5,
      code: 'println!("Done: {:?}", data);',
      point: "P4",
      desc: "Read of newly mutated vector data. Program finishes.",
      lexicalActive: true,
      nllActive: false,
    },
  ];

  return (
    <div
      className="rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-500/[0.06] via-slate-900/[0.04] to-transparent dark:from-purple-950/30 dark:via-[#070e1c]/80 dark:to-[#040813]/90 p-4 sm:p-6 backdrop-blur-xl shadow-xl space-y-4 sm:space-y-5"
      style={{ boxShadow: "var(--glass-inner-highlight)" }}
    >
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 dark:border-white/[0.08] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <Activity size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Control Flow Graph (CFG) Liveness Simulator</span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                RFC-2094
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compare how the Rust borrow checker evaluates loan spans across compiler generations
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="inline-flex rounded-xl p-1 bg-slate-200/70 dark:bg-white/[0.06] border border-slate-300/60 dark:border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode("lexical")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              mode === "lexical"
                ? "bg-rose-500 text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Classic Lexical (Pre-2018)
          </button>
          <button
            type="button"
            onClick={() => setMode("nll")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              mode === "nll"
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            NLL Engine (Modern)
          </button>
          <button
            type="button"
            onClick={() => setMode("polonius")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              mode === "polonius"
                ? "bg-purple-600 text-white shadow-sm font-bold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Polonius Datalog
          </button>
        </div>
      </div>

      {/* Simulator Content Body */}
      {mode === "polonius" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 dark:bg-purple-950/20 p-4 font-mono text-xs space-y-2">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold uppercase text-[11px]">
              <Cpu size={14} />
              <span>Polonius Origin Sets Datalog Formulation</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-xs font-sans leading-relaxed">
              Polonius reformulates the borrow checker not around AST spans or lexical CFG ranges, but around mathematical Datalog facts over points <code className="text-purple-600 dark:text-purple-400 font-mono">P</code> and abstract origins <code className="text-purple-600 dark:text-purple-400 font-mono">&apos;origin</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200/70 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] p-3.5 space-y-1.5">
              <div className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                {"loan_issued_at(L0, 'origin, P1)"}
              </div>
              <p className="text-[11.5px] text-slate-600 dark:text-slate-400">
                A loan <code className="font-mono text-purple-600">L0</code> is initiated for origin <code className="font-mono text-purple-600">&apos;origin</code> at CFG statement point <code className="font-mono">P1</code>.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/70 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] p-3.5 space-y-1.5">
              <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {"subset('origin_a, 'origin_b, P)"}
              </div>
              <p className="text-[11.5px] text-slate-600 dark:text-slate-400">
                Calculates sub-loans along CFG paths. If <code className="font-mono text-indigo-600">&apos;origin_a</code> flows into <code className="font-mono text-indigo-600">&apos;origin_b</code>, live loans propagate monotonically.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200/70 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] p-3.5 space-y-1.5">
              <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                loan_invalidated_at(P3, L0)
              </div>
              <p className="text-[11.5px] text-slate-600 dark:text-slate-400">
                At point <code className="font-mono">P3</code>, mutation occurs. Because <code className="font-mono">&apos;origin</code> is not in <code className="font-mono">origin_live_on_entry(P3)</code>, zero error is emitted!
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left: Code Statements Scrubber (7 cols) */}
          <div className="lg:col-span-7 space-y-1 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 pb-1 font-sans">
              <span>Instruction Stream (CFG Points)</span>
              <span>Click step to inspect</span>
            </div>

            {steps.map((step, idx) => {
              const isSelected = activeStep === idx;
              const hasConflict = mode === "lexical" && step.lexicalConflict;
              const isTerminating = mode === "nll" && step.nllTerminates;
              const isValidResolution = mode === "nll" && step.nllValid;

              return (
                <div
                  key={step.line}
                  onClick={() => setActiveStep(idx)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all cursor-pointer select-none",
                    isSelected
                      ? "ring-1 ring-purple-500/50 bg-purple-500/10 border-purple-500/40"
                      : "border-slate-200/60 dark:border-white/[0.05] bg-white/50 dark:bg-white/[0.02] hover:bg-slate-100/70 dark:hover:bg-white/[0.05]"
                  )}
                >
                  <span className="w-5 text-right font-bold text-slate-400 text-[11px]">
                    {step.line}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                    {step.point}
                  </span>

                  <span className="flex-1 text-[11.5px] text-slate-800 dark:text-slate-200 font-mono truncate">
                    {step.code}
                  </span>

                  {/* Badges based on mode */}
                  {hasConflict && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/25 shrink-0">
                      <XCircle size={12} />
                      <span>E0502 Error</span>
                    </span>
                  )}
                  {isTerminating && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25 shrink-0">
                      <Zap size={12} />
                      <span>Loan Drops</span>
                    </span>
                  )}
                  {isValidResolution && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25 shrink-0">
                      <CheckCircle2 size={12} />
                      <span>Accepted</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: Diagnostic Telemetry Inspector (5 cols) */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-slate-900 text-slate-100 p-4 space-y-3 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-400">
                <Terminal size={13} />
                <span>Compiler Diagnostic</span>
              </div>
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold",
                  mode === "lexical"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                )}
              >
                {mode === "lexical" ? "COMPILE ERROR" : "BUILD SUCCESS"}
              </span>
            </div>

            {mode === "lexical" ? (
              <div className="space-y-2 text-[11px] leading-relaxed">
                <div className="text-rose-400 font-bold">
                  error[E0502]: cannot borrow `data` as mutable because it is also borrowed as immutable
                </div>
                <div className="text-slate-400 pl-2 border-l-2 border-rose-500/40 space-y-1 font-mono">
                  <div>{"--> src/main.rs:4:5"}</div>
                  <div>{"2 | let slice = &data[..];"}</div>
                  <div>{"  |             --------- immutable borrow occurs here"}</div>
                  <div>{'3 | println!("{:?}", slice);'}</div>
                  <div>{"4 | data.push(40);"}</div>
                  <div>{"  | ^^^^^^^^^^^^^ mutable borrow occurs here"}</div>
                  <div>{"5 | }"}</div>
                  <div>{"  | - immutable borrow ends at end of scope `}`"}</div>
                </div>
                <div className="text-slate-400 text-[10.5px] pt-1">
                  Reason: In classic Rust (pre-2018), loans were lexically tied to the AST block span, needlessly blocking valid concurrent logic.
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-[11px] leading-relaxed">
                <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  <span>Finished `dev` profile [unoptimized + debuginfo] in 0.04s</span>
                </div>
                <div className="text-slate-400 pl-2 border-l-2 border-emerald-500/40 space-y-1">
                  <div className="text-slate-300">CFG Liveness Analysis:</div>
                  <div>• Loan L0 issued at P1</div>
                  <div>• Last read access of `slice` at P2</div>
                  <div className="text-emerald-400 font-semibold">• L0 live range: [P1, P2]</div>
                  <div className="text-slate-300">• At P3 (`data.push`): L0 is DEAD (0 conflicts)</div>
                </div>
                <div className="text-slate-400 text-[10.5px] pt-1">
                  Reason: Non-Lexical Lifetimes (RFC-2094) computes point-by-point CFG liveness. Since `slice` is never read after line 3, the loan releases immediately!
                </div>
              </div>
            )}

            {/* Selected Step Explanation */}
            <div className="pt-2 border-t border-white/10 text-[11px] text-slate-300 font-sans">
              <span className="font-bold font-mono text-purple-400 mr-1">
                Point {steps[activeStep].point}:
              </span>
              {steps[activeStep].desc}
            </div>
          </div>
        </div>
      )}

      {/* Bottom CTA to launch diagnostic directly in Workspace */}
      <div className="pt-2 border-t border-purple-500/20 dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Sparkles size={14} className="text-purple-500 shrink-0" />
          <span>Experiment with these exact lifetime spans in the live Rust REEC Workspace</span>
        </div>

        <Link
          href="/workspace"
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3.5 py-2 transition-all active:scale-95 shadow-md shadow-purple-500/20 cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <Code2 size={14} />
          <span>Launch In Code Workspace</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
