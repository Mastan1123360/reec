"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth-context";
import { Lock, Sparkles, ArrowRight, ShieldCheck, BookOpen, Code2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhaseLockWallProps {
  phaseNumber: number;
  phaseTitle?: string;
  lessonTitle?: string;
  children: React.ReactNode;
}

export function PhaseLockWall({
  phaseNumber,
  phaseTitle,
  lessonTitle,
  children,
}: PhaseLockWallProps) {
  const { user, isLoading, openAuthModal } = useAuth();

  // Phase 0 is always open to guests as the computational foundations preview
  if (phaseNumber === 0) {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl py-16 px-4 flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
          Verifying curriculum access rights...
        </p>
      </div>
    );
  }

  // If user is authenticated, render curriculum content
  if (user) {
    return <>{children}</>;
  }

  // Strict Lock Wall for unauthenticated guest users
  return (
    <div className="relative mx-auto max-w-3xl py-8 sm:py-14 px-4 sm:px-6">
      <div
        id="phase-auth-lock-wall"
        className="relative overflow-hidden rounded-3xl border border-blue-500/30 dark:border-blue-400/25 bg-white/85 dark:bg-[#0c1222]/90 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl text-center"
        style={{
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25), var(--glass-inner-highlight)",
        }}
      >
        {/* Glowing aura background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-500/15 dark:bg-blue-400/10 blur-3xl pointer-events-none" />

        {/* Lock Icon */}
        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 shadow-lg">
          <Lock size={28} strokeWidth={2.2} />
        </div>

        {/* Exclusive Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
          <Sparkles size={12} />
          <span>Phase {String(phaseNumber).padStart(2, "0")} Exclusive Content</span>
        </div>

        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white max-w-xl mx-auto">
          {lessonTitle ? (
            <>Unlock &ldquo;{lessonTitle}&rdquo;</>
          ) : (
            <>Unlock Phase {phaseNumber}: {phaseTitle || "Curriculum"}</>
          )}
        </h2>

        {/* Explanatory text */}
        <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
          Phase 1 and beyond are strictly reserved for registered REEC engineers. Sign in or create a free account to unlock this content and sync your progress.
        </p>

        {/* Features included */}
        <div className="my-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-xl mx-auto text-left text-xs text-slate-700 dark:text-slate-200">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
            <Code2 size={16} className="text-blue-500 shrink-0" />
            <span>Interactive compiler challenges</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
            <span>Automated progress sync</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
            <Trophy size={16} className="text-amber-500 shrink-0" />
            <span>Phase mastery verification</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            id="btn-phase-lock-unlock"
            onClick={openAuthModal}
            size="lg"
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-sm shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock size={15} />
            <span>Sign In / Sign Up to Unlock</span>
          </Button>

          <Link
            href="/phase/0"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300/80 dark:border-white/15 bg-white/70 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <BookOpen size={14} />
            <span>Explore Free Phase 0</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
