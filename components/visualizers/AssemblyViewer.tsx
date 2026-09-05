"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Binary, Cpu, Zap, Code2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WidgetProps } from "@/lib/widgets/registry";

export function AssemblyViewer({ props }: WidgetProps = {}) {
  const [optLevel, setOptLevel] = React.useState<"O0" | "O3">("O3");
  const [arch, setArch] = React.useState<"x86_64" | "aarch64">("x86_64");

  return (
    <div className="my-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#070e1d]/90 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-4 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <Binary size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Zero-Cost Abstractions: Assembly CodeGen Inspector
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Inspect LLVM machine instructions, vectorization, and zero-cost iterator loop unrolling
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-white/[0.06] p-0.5 border border-slate-200 dark:border-white/10 text-[11px] font-mono">
            <button
              onClick={() => setArch("x86_64")}
              className={cn("px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer", arch === "x86_64" ? "bg-orange-600 text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")}
            >
              x86_64
            </button>
            <button
              onClick={() => setArch("aarch64")}
              className={cn("px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer", arch === "aarch64" ? "bg-orange-600 text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")}
            >
              ARM64
            </button>
          </div>

          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-white/[0.06] p-0.5 border border-slate-200 dark:border-white/10 text-[11px] font-mono">
            <button
              onClick={() => setOptLevel("O0")}
              className={cn("px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer", optLevel === "O0" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")}
            >
              Debug (opt-level=0)
            </button>
            <button
              onClick={() => setOptLevel("O3")}
              className={cn("px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer", optLevel === "O3" ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white")}
            >
              Release (opt-level=3)
            </button>
          </div>
        </div>
      </div>

      {/* Side-by-side Source vs Assembly */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Rust High-Level Source */}
        <div className="md:col-span-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950 p-3 text-white font-mono text-xs overflow-x-auto">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Rust Iterator Pipeline</span>
            <span className="text-orange-400 text-[9px]">High-Level</span>
          </div>
          <pre className="text-orange-300 leading-relaxed font-mono">
{`pub fn sum_squares(v: &[i32]) -> i32 {
    v.iter()
     .map(|&x| x * x)
     .filter(|&x| x % 2 == 0)
     .sum()
}`}
          </pre>
        </div>

        {/* Assembly Output */}
        <div className="md:col-span-7 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950 p-3 text-white font-mono text-xs overflow-x-auto">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Emitted Assembly ({arch} - {optLevel})</span>
            <span className="text-emerald-400 text-[9px] font-bold">
              {optLevel === "O3" ? "SIMD Vectorized" : "Unoptimized Frame"}
            </span>
          </div>

          <pre className="text-emerald-300 leading-relaxed font-mono text-[11px]">
            {optLevel === "O3" ? (
              arch === "x86_64" ? (
`example::sum_squares:
    xor     eax, eax
    test    rsi, rsi
    je      .LBB0_3
.LBB0_2:
    mov     ecx, dword ptr [rdi]
    imul    ecx, ecx
    test    cl, 1
    cmovne  ecx, eax
    add     eax, ecx
    add     rdi, 4
    dec     rsi
    jnz     .LBB0_2
.LBB0_3:
    ret`
              ) : (
`example::sum_squares:
    mov     w0, #0
    cbz     x1, .LBB0_3
.LBB0_2:
    ldr     w2, [x0], #4
    mul     w2, w2, w2
    tst     w2, #0x1
    csel    w2, wzr, w2, ne
    add     w0, w0, w2
    subs    x1, x1, #1
    b.ne    .LBB0_2
.LBB0_3:
    ret`
              )
            ) : (
`example::sum_squares:
    push    rbp
    mov     rbp, rsp
    sub     rsp, 48
    mov     qword ptr [rbp - 8], rdi
    mov     qword ptr [rbp - 16], rsi
    # ... 40 instructions of unoptimized stack pushes & calls ...
    leave
    ret`
            )}
          </pre>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300 flex items-center gap-2">
        <Zap size={16} className="text-amber-500 shrink-0" />
        <span>
          <strong>Zero Overhead Proof:</strong> In release mode (`opt-level=3`), the high-level functional chain (`iter()`, `map()`, `filter()`, `sum()`) compiles to the exact same tight assembly loop as a hand-tuned C pointer walk.
        </span>
      </div>
    </div>
  );
}
