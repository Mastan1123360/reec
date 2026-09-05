"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Box,
  Terminal,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { DashboardLesson } from "./types";
import { useProgressStore } from "@/lib/progress/store";
import { useIsMounted } from "@/lib/hooks/useIsMounted";

interface ContinueLearningCardProps {
  allLessons: DashboardLesson[];
}

export function ContinueLearningCard({ allLessons }: ContinueLearningCardProps) {
  const isMounted = useIsMounted();
  const completedLessons = useProgressStore((s) => s.completedLessons);

  // Derive real lessons: prioritize uncompleted, then available
  const uncompleted = isMounted
    ? allLessons.filter((l) => !completedLessons?.has(l.path))
    : allLessons;
  const candidateLessons = uncompleted.length > 0 ? uncompleted : allLessons;
  const displayLessons = candidateLessons.slice(0, 3);

  const cards = displayLessons.map((l, idx) => {
    const isDone = Boolean(isMounted && completedLessons?.has(l.path));
    const Icon = idx === 0 ? BookOpen : idx === 1 ? Box : Terminal;

    const phaseTag = `PHASE ${String(l.phase).padStart(2, "0")}`;
    const description =
      idx === 0
        ? "Understanding how source code becomes a running process"
        : idx === 1
        ? "Building a professional development environment from the ground up"
        : "Understanding assembly, registers, and the machine beneath the...";

    const chips =
      idx === 0
        ? ["compilation", "memory-layout", "stack"]
        : idx === 1
        ? ["unix", "shell", "git"]
        : ["assembly", "cpu", "registers"];

    return {
      id: l.slug,
      href: l.path || `/lesson/${l.slug}`,
      icon: Icon,
      phaseTag,
      title: l.title,
      description,
      chips,
      progress: isDone ? 100 : 0,
    };
  });

  if (cards.length < 3) {
    cards.push({
      id: "upcoming-phase-01",
      href: "/phase/1",
      icon: Sparkles,
      phaseTag: "PHASE 01",
      title: "Rust Foundations: Memory Safety & Borrow Checker",
      description: "Ownership, borrowing, lifetimes, and idiomatic error handling.",
      chips: ["ownership", "borrowing", "lifetimes"],
      progress: 0,
    });
  }

  return (
    <div
      className="rounded-2xl glass-surface p-3.5 xl:p-4 flex flex-col justify-between transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Continue Learning
        </h3>
        <Link
          href="/phase/0"
          className="group flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
        >
          <span>View All</span>
          <ChevronRight
            size={12}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      {/* 3 Module Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-stretch">
        {cards.map((m) => {
          const Icon = m.icon;

          return (
            <Link
              key={m.id}
              href={m.href}
              className="group relative flex flex-col justify-between rounded-xl glass-elevated p-2.5 sm:p-3 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div>
                {/* Top Row: Icon + Phase + Chevron */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon size={14} className="text-slate-600 dark:text-slate-300 shrink-0" />
                    <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                      {m.phaseTag}
                    </span>
                  </div>
                  <ChevronRight
                    size={13}
                    className="text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all"
                  />
                </div>

                {/* Title */}
                <h4 className="mt-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                  {m.title}
                </h4>

                {/* Subtitle / Description */}
                <p className="mt-0.5 text-[10.5px] text-slate-600 dark:text-slate-400 line-clamp-1 leading-normal">
                  {m.description}
                </p>

                {/* Chips */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {m.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded border border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.04] px-1.5 py-0.5 text-[9.5px] font-mono text-slate-600 dark:text-slate-400"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
