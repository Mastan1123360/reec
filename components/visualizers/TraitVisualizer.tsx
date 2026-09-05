"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Network, Zap, Cpu, Code2, Layers, Binary } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WidgetProps } from "@/lib/widgets/registry";

export function TraitVisualizer({ props }: WidgetProps = {}) {
  const [dispatchMode, setDispatchMode] = React.useState<"static" | "dynamic">("static");
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="my-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#070e1d]/90 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-4 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/[0.06] pb-3">
        <div className="flex items-center gap-2.5">
          <Network size={18} className="text-violet-600 dark:text-violet-400 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Trait Dispatch Visualizer: Static Monomorphization vs Dynamic VTables
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Zero-cost generic inlining vs Fat-pointer runtime dynamic dispatch (`dyn Trait`)
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] p-1 border border-slate-200 dark:border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setDispatchMode("static")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer",
              dispatchMode === "static"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Static (impl Trait)
          </button>
          <button
            type="button"
            onClick={() => setDispatchMode("dynamic")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer",
              dispatchMode === "dynamic"
                ? "bg-violet-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Dynamic (&amp;dyn Trait)
          </button>
        </div>
      </div>

      {/* Mode Details */}
      {dispatchMode === "static" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950 p-3 text-white font-mono text-xs overflow-x-auto">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Generic Source</span>
                <span className="text-emerald-400 text-[9px]">Zero Cost</span>
              </div>
              <pre className="text-blue-300 leading-relaxed font-mono">
{`trait Summary {\n    fn summarize(&self) -> String;\n}\n\n// Static generic dispatch\nfn notify<T: Summary>(item: &T) {\n    println!("{}", item.summarize());\n}`}
              </pre>
            </div>

            <div className="md:col-span-6 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950 p-3 text-white font-mono text-xs overflow-x-auto">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Compiler Monomorphization Output</span>
                <span className="text-indigo-400 text-[9px]">Direct JMP / Inlined</span>
              </div>
              <pre className="text-indigo-300 leading-relaxed font-mono">
{`// rustc duplicates specialized functions:\nfn notify_NewsArticle(item: &NewsArticle) {\n    // Direct direct-call instruction\n    call NewsArticle::summarize;\n}\n\nfn notify_Tweet(item: &Tweet) {\n    call Tweet::summarize;\n}`}
              </pre>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.05] p-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 mb-1">
                <Zap size={14} />
                <span>Runtime Cost: 0ns</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11.5px]">
                No vtable indirection. CPU branches are perfectly predicted and can be completely inlined across optimization passes.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white mb-1">
                <Binary size={14} />
                <span>Binary Code Bloat</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11.5px]">
                Each concrete type generates its own copy of the compiled machine code in the text segment.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white mb-1">
                <Layers size={14} />
                <span>Heterogeneous Collections</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11.5px]">
                Cannot store distinct types in a single `Vec&lt;T&gt;` because all elements must have identical memory sizes known at compile time.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950 p-3 text-white font-mono text-xs overflow-x-auto">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Trait Object Source</span>
                <span className="text-violet-400 text-[9px]">Fat Pointer (16 bytes)</span>
              </div>
              <pre className="text-violet-300 leading-relaxed font-mono">
{`// Dynamic dispatch via Fat Pointer\nfn notify(item: &dyn Summary) {\n    println!("{}", item.summarize());\n}\n\n// Enables heterogeneous lists!\nlet list: Vec<Box<dyn Summary>> = vec![\n    Box::new(NewsArticle),\n    Box::new(Tweet),\n];`}
              </pre>
            </div>

            {/* Fat Pointer & Vtable Layout Diagram */}
            <div className="md:col-span-6 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-900 p-3 text-white text-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">
                16-Byte Fat Pointer &amp; VTable Memory Layout
              </div>

              <div className="space-y-2">
                {/* Fat pointer on stack */}
                <div className="grid grid-cols-2 gap-2 text-center font-mono text-[10.5px]">
                  <div className="p-2 rounded bg-indigo-950/80 border border-indigo-500/40 text-indigo-200">
                    <div className="font-bold text-indigo-400">Data Ptr (8B)</div>
                    <div>0x7ffee040</div>
                  </div>
                  <div className="p-2 rounded bg-violet-950/80 border border-violet-500/40 text-violet-200">
                    <div className="font-bold text-violet-400">VTable Ptr (8B)</div>
                    <div>0x55aa0100</div>
                  </div>
                </div>

                {/* Vtable description */}
                <div className="p-2.5 rounded bg-slate-950 border border-white/10 font-mono text-[10.5px] space-y-1">
                  <div className="text-slate-400 text-[9.5px] uppercase font-bold">VTable Entries @ 0x55aa0100:</div>
                  <div className="text-emerald-400">• destructor: Drop::drop (fn ptr)</div>
                  <div className="text-blue-400">• size &amp; align: 32 bytes, 8-align</div>
                  <div className="text-violet-400">• summarize(): fn ptr -&gt; NewsArticle::summarize</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.05] p-3 text-xs">
              <div className="font-bold text-violet-600 dark:text-violet-400 mb-1">
                Flexible Heterogeneous Collections
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11.5px]">
                Allows storing multiple distinct types that implement `Summary` in a uniform `Vec&lt;Box&lt;dyn Summary&gt;&gt;` or passing them across plugin boundaries.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 p-3 text-xs">
              <div className="font-bold text-slate-900 dark:text-white mb-1">
                Indirect Function Call Overhead
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11.5px]">
                Calls require dereferencing the vtable pointer at runtime. Prevents compiler from inlining the method call across hot CPU loops.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
