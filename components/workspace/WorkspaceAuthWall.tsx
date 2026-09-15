"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth-context";
import {
  Terminal,
  Lock,
  ArrowRight,
  ShieldCheck,
  Cpu,
  FolderGit2,
  Sparkles,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function WorkspaceAuthWall() {
  const { openAuthModal } = useAuth();

  return (
    <div className="relative mx-auto max-w-4xl py-6 sm:py-12 px-4 sm:px-6">
      <div
        id="workspace-auth-lock-wall"
        className="relative overflow-hidden rounded-3xl border border-blue-500/25 dark:border-blue-400/20 bg-white/85 dark:bg-[#0c1222]/90 p-6 sm:p-10 md:p-12 shadow-2xl backdrop-blur-2xl text-center"
        style={{
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25), var(--glass-inner-highlight)",
        }}
      >
        {/* Ambient lighting orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-500/15 dark:bg-blue-400/10 blur-3xl pointer-events-none" />

        {/* Header Badges */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 shadow-md">
            <Terminal size={32} />
            <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
              <Lock size={14} />
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
            <Sparkles size={12} />
            <span>Protected System Resource · Sign-In Required</span>
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white max-w-2xl mx-auto">
          Sign In to Access REEC Code Workspace
        </h2>

        {/* Explanatory Text */}
        <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
          To protect cloud runner capacity, preserve toolchain availability, and prevent system flooding, the interactive Rust workspace and compiler runner require an authenticated engineer account.
        </p>

        {/* Features Included */}
        <div className="my-8 grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-2xl mx-auto text-left">
          <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-blue-500 shrink-0" />
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">Native Cargo Runner</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              Run check, build, run, test, and format directly against the native Rust compiler toolchain.
            </p>
          </div>

          <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <FolderGit2 size={16} className="text-blue-500 shrink-0" />
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">Multi-File Crates</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              Create, organize, and compile multi-file Rust projects with instant Monaco editor intelligence.
            </p>
          </div>

          <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">Cloud Persistence</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              Your source files, revision history, and personal code snippets synchronize seamlessly.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Button
            id="btn-workspace-auth-unlock"
            onClick={openAuthModal}
            size="lg"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-sm shadow-lg transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn size={16} />
            <span>Sign In / Create Account to Access</span>
          </Button>

          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300/80 dark:border-white/15 bg-white/70 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Return to Dashboard</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <p className="mt-5 text-[11px] font-mono text-slate-400 dark:text-slate-500">
          Free account · Instant access · No payment required
        </p>
      </div>
    </div>
  );
}
