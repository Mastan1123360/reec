"use client";

import * as React from "react";
import {
  Cpu,
  ShieldCheck,
  FlaskConical,
  Zap,
  FileCode2,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PhilosophyPillar {
  icon: React.ElementType;
  tag: string;
  title: string;
  description: string;
  color: string;
  borderColor: string;
  bgColor: string;
}

const PILLARS: PhilosophyPillar[] = [
  {
    icon: Cpu,
    tag: "First Principles",
    title: "Hardware & Memory First",
    description:
      "Understand registers, stack vs. heap layout, cache lines, and OS system calls before touching high-level syntax abstractions.",
    color: "text-sky-500",
    borderColor: "border-sky-500/30",
    bgColor: "bg-sky-500/10",
  },
  {
    icon: ShieldCheck,
    tag: "Safety & Invariants",
    title: "Compile-Time Rigor Over Runtime Hope",
    description:
      "Design systems with zero-panic invariants. Leverage affine types and borrow semantics to eliminate data races and use-after-free bugs statically.",
    color: "text-emerald-500",
    borderColor: "border-emerald-500/30",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: FlaskConical,
    tag: "Failure Labs",
    title: "Intentional Break / Fix Discipline",
    description:
      "True systems intuition comes from deliberately breaking the compiler, analyzing raw diagnostics, and constructing robust architectural fixes.",
    color: "text-rose-500",
    borderColor: "border-rose-500/30",
    bgColor: "bg-rose-500/10",
  },
  {
    icon: Zap,
    tag: "Performance",
    title: "Zero-Cost & Deterministic RAII",
    description:
      "Strive for zero-copy slicing, cache-aligned data layout, and deterministic resource lifecycles without garbage collection overhead.",
    color: "text-amber-500",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: FileCode2,
    tag: "Engineering Journal",
    title: "Document Architectural Decisions",
    description:
      "Every data model, synchronization primitive, and serialization format includes an explicit decision log justifying trade-offs.",
    color: "text-indigo-500",
    borderColor: "border-indigo-500/30",
    bgColor: "bg-indigo-500/10",
  },
];

export function ReecPhilosophySection() {
  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Sparkles size={20} className="text-primary shrink-0" />
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>The REEC Philosophy</span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                Core Tenets
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Guiding principles for engineering resilient, high-performance systems in Rust
            </p>
          </div>
        </div>
      </div>

      {/* Grid of 5 Philosophy Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PILLARS.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.title}
              className={cn(
                "group relative flex flex-col justify-between rounded-3xl border border-border/70 bg-gradient-to-b from-card/85 via-card/70 to-card/50 dark:from-[#0f172a]/85 dark:via-[#0c1322]/75 dark:to-[#070b14]/90 p-5 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-2xl",
                idx === 4 && "md:col-span-2 lg:col-span-1"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Icon size={20} className={cn(pillar.color, "shrink-0 transition-transform group-hover:scale-105")} />
                  <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 py-0.5 rounded-full bg-muted/40 border border-border/50">
                    {pillar.tag}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Pillar {String(idx + 1).padStart(2, "0")}</span>
                <span className="text-primary font-medium">REEC Standard</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
