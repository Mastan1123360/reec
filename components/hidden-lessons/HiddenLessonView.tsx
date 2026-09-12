"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Lock,
  ArrowLeft,
  Terminal,
  ShieldCheck,
  Layers,
  BookOpen,
  MapPin,
  Volume2,
  Share2,
  Check,
  Cpu,
  Flame,
  AlertTriangle,
  Code2,
  Play,
} from "lucide-react";
import { LessonExperience } from "@/components/experience/LessonExperience";
import { useHiddenLessonsStore } from "@/lib/hidden-lessons/store";
import { playGrandUnlockChime } from "@/components/hidden-lessons/GrandUnlockModal";
import { NLLVisualizer } from "@/components/hidden-lessons/NLLVisualizer";
import type { Lesson } from "@/lib/content/types";

export function HiddenLessonView({ lesson }: { lesson: Lesson }) {
  const isUnlocked = useHiddenLessonsStore((s) => s.isUnlocked);
  const markAsOpened = useHiddenLessonsStore((s) => s.markAsOpened);
  const [mounted, setMounted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = React.useState(false);

  const unlocked =
    mounted &&
    (isUnlocked(lesson.frontmatter.id) ||
      (lesson.frontmatter.slug && isUnlocked(lesson.frontmatter.slug)));

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (
      mounted &&
      (isUnlocked(lesson.frontmatter.id) ||
        (lesson.frontmatter.slug && isUnlocked(lesson.frontmatter.slug)))
    ) {
      markAsOpened(lesson.frontmatter.id);
      if (lesson.frontmatter.slug) {
        markAsOpened(lesson.frontmatter.slug);
      }
    }
  }, [mounted, lesson.frontmatter.id, lesson.frontmatter.slug, isUnlocked, markAsOpened]);

  const handlePlayChime = () => {
    setIsPlayingAudio(true);
    playGrandUnlockChime();
    setTimeout(() => setIsPlayingAudio(false), 1500);
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Before hydration, render subtle skeleton
  if (!mounted) {
    return (
      <div className="mx-auto max-w-4xl px-3 sm:px-6 py-8 sm:py-12 lg:px-8 text-center text-slate-400">
        <div className="h-10 w-64 mx-auto rounded-xl bg-slate-200/50 dark:bg-white/[0.05] animate-pulse" />
      </div>
    );
  }

  // 1. GRAND HOLOGRAPHIC LOCKED VAULT STATE
  if (!unlocked) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-16 lg:px-8 text-center select-none">
        <div
          className="relative overflow-hidden rounded-[28px] border border-purple-500/30 dark:border-purple-400/20 bg-white/80 dark:bg-[#0a0f1d]/90 p-6 sm:p-10 backdrop-blur-2xl shadow-[0_20px_50px_rgba(147,51,234,0.12)] text-left"
          style={{ boxShadow: "var(--glass-inner-highlight)" }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-purple-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl" />

          {/* Top Status Header */}
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-600 dark:bg-purple-400" />
              </span>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Encrypted Compiler Vault // Level 5 Clearance
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]">
              STATUS: LOCKED
            </span>
          </div>

          {/* Centered Holographic Lock Visual */}
          <div className="text-center py-4 sm:py-6">
            <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-5">
              <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-ping opacity-30" />
              <div className="absolute inset-2 rounded-full border border-purple-500/40 border-dashed animate-spin [animation-duration:15s]" />
              <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-500/30 border border-purple-400/40">
                <Lock size={28} className="text-white" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Declassified Lab Unavailable
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed max-w-lg mx-auto">
              This hidden module is an advanced compiler diagnostics lab that unlocks only when you actively trigger compiler diagnostics or memory invariants in curriculum challenges.
            </p>
          </div>

          {/* Redacted Intel Simulation Card */}
          <div className="mt-4 rounded-2xl border border-slate-200/70 dark:border-white/[0.06] bg-slate-50/70 dark:bg-black/30 p-4 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                <Terminal size={12} />
                <span>Compiler Diagnostic Clue</span>
              </span>
              <span>ERR-SIG // E0502</span>
            </div>
            <div className="text-[11.5px] text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
              Execute Phase 01 code with concurrent mutable and immutable borrows, or explore Non-Lexical Lifetimes (NLL) CFG liveness spans to unlock.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/roadmap"
              className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2.5 shadow-md shadow-purple-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Explore Curriculum Roadmap</span>
            </Link>
            <Link
              href="/workspace"
              className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white/70 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-800 dark:text-slate-200 text-xs font-semibold px-4 py-2.5 transition-all cursor-pointer active:scale-95"
            >
              <Code2 size={14} className="text-purple-500" />
              <span>Open Code Workspace</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Derive source lesson navigation if known
  const sourceLessonId = lesson.frontmatter.trigger?.lessonId;
  const sourceLessonPath =
    sourceLessonId === "P1-W3-D2"
      ? "/lesson/phase-01/week-03/day-02"
      : sourceLessonId
      ? `/lesson/${sourceLessonId.toLowerCase()}`
      : "/roadmap";

  return (
    <article className="mx-auto max-w-4xl px-3 sm:px-6 py-5 sm:py-8 lg:px-8 space-y-5 sm:space-y-7 pb-28 sm:pb-32 lg:pb-16">
      {/* 1. TOP BREADCRUMB & CLEARANCE BADGES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all backdrop-blur-md cursor-pointer"
          >
            <MapPin size={13} className="text-purple-500" />
            <span>Curriculum Roadmap</span>
          </Link>

          {sourceLessonId && (
            <Link
              href={sourceLessonPath}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all backdrop-blur-md cursor-pointer truncate"
            >
              <ArrowLeft size={13} />
              <span className="truncate">Origin: {sourceLessonId}</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Audio Chime Replay Pill with dancing equalizer */}
          <button
            type="button"
            onClick={handlePlayChime}
            className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-300 transition-all cursor-pointer active:scale-95"
            title="Replay Discovery Audio Fanfare"
          >
            {isPlayingAudio ? (
              <div className="flex items-center gap-0.5 h-3">
                <span className="w-0.5 h-full bg-purple-500 animate-pulse rounded-full" />
                <span className="w-0.5 h-2 bg-purple-400 animate-bounce rounded-full [animation-delay:100ms]" />
                <span className="w-0.5 h-3 bg-purple-500 animate-pulse rounded-full [animation-delay:200ms]" />
                <span className="w-0.5 h-1.5 bg-purple-400 animate-bounce rounded-full [animation-delay:150ms]" />
              </div>
            ) : (
              <Volume2 size={13} />
            )}
            <span>{isPlayingAudio ? "Playing Fanfare..." : "Chime"}</span>
          </button>

          {/* Share Discovery Pill */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all cursor-pointer active:scale-95"
            title="Copy Lesson Link"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Share2 size={13} className="text-slate-500" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. ATMOSPHERIC GRAND HERO BANNER */}
      <div
        className="relative overflow-hidden rounded-[26px] border border-purple-500/40 bg-gradient-to-br from-purple-500/15 via-indigo-500/10 to-blue-500/5 dark:from-purple-950/50 dark:via-indigo-950/30 dark:to-[#070e1c]/70 p-5 sm:p-7 backdrop-blur-2xl shadow-xl transition-all"
        style={{
          boxShadow: "0 12px 36px rgba(168, 85, 247, 0.12), var(--glass-inner-highlight)",
        }}
      >
        {/* Specular Ambient Glows */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-60 h-60 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-indigo-500/20 blur-3xl" />

        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
            {/* Holographic Glowing Badge Icon */}
            <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 text-white font-mono font-black text-sm sm:text-base tracking-wider shadow-lg shadow-purple-500/35 border border-purple-400/50">
              {lesson.frontmatter.badge || "NLL"}
              <div className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-mono text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                <Sparkles size={13} />
                <span>Compiler Classified Deep Dive · Systems Discovery</span>
              </div>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                {lesson.frontmatter.title}
              </h1>
              {lesson.frontmatter.subtitle && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {lesson.frontmatter.subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto shrink-0 relative z-10">
            {(lesson.frontmatter.tags || ["rust", "compiler-thinking", "polonius"]).map((tag) => (
              <span
                key={tag}
                className="rounded-lg border border-purple-500/25 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300 backdrop-blur-md"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 3. COMPILER TELEMETRY DOSSIER (3 Columns) */}
        <div className="mt-6 pt-5 border-t border-purple-500/20 dark:border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
          <div className="rounded-xl border border-purple-500/20 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.03] p-3 backdrop-blur-md">
            <div className="text-[10px] font-mono uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1.5">
              <Terminal size={12} />
              <span>Trigger Mechanism</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
              Diagnostic E0502 / CFG Edge
            </div>
            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
              Mutable vs immutable borrow span
            </div>
          </div>

          <div className="rounded-xl border border-purple-500/20 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.03] p-3 backdrop-blur-md">
            <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1.5">
              <Cpu size={12} />
              <span>Compiler Subsystem</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
              Polonius CFG Liveness
            </div>
            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
              Point-based subset relations
            </div>
          </div>

          <div className="rounded-xl border border-purple-500/20 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.03] p-3 backdrop-blur-md">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
              <ShieldCheck size={12} />
              <span>Clearance Level</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
              Tier 5 · Master Systems
            </div>
            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
              Execution-verified discovery
            </div>
          </div>
        </div>
      </div>

      {/* 4. CLASSIFIED MECHANICAL REVELATIONS CARD */}
      <div
        className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#0b1220]/80 p-5 sm:p-6 backdrop-blur-xl space-y-4"
        style={{ boxShadow: "var(--glass-inner-highlight)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2 font-mono">
            <Code2 size={14} className="text-purple-500" />
            <span>Core Architectural Insights In This Deep Dive</span>
          </h2>
          <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 font-bold">
            3 Paradigms Unveiled
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.05] bg-white/50 dark:bg-white/[0.02] p-3.5 space-y-1">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">01.</span>
              <span>Sub-Lexical Liveness</span>
            </div>
            <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Borrows no longer stretch to the closing curly brace <code className="text-purple-600 dark:text-purple-400">{"}"}</code>. Instead, liveness terminates at the exact instruction of last read.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.05] bg-white/50 dark:bg-white/[0.02] p-3.5 space-y-1">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">02.</span>
              <span>Two-Phase Borrows</span>
            </div>
            <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Enables ergonomic patterns like <code className="text-indigo-600 dark:text-indigo-400">vec.push(vec.len())</code> by reserving mutable references before their actual activation point.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/60 dark:border-white/[0.05] bg-white/50 dark:bg-white/[0.02] p-3.5 space-y-1">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">03.</span>
              <span>Polonius Origin Sets</span>
            </div>
            <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Replaces static subtyping with a clean datalog graph formulation of loan origination, propagation, and invalidation points.
            </p>
          </div>
        </div>
      </div>

      {/* 5. INTERACTIVE CFG LIVENESS & POLONIUS VISUALIZER */}
      <NLLVisualizer />

      {/* 6. MAIN AUTHORITATIVE LESSON CONTENT */}
      <LessonExperience lesson={lesson} />
    </article>
  );
}

