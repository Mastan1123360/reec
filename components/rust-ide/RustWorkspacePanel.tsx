"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { X, PanelLeft, Terminal, Lock, Sparkles } from "lucide-react";
import { useRustWorkspace } from "@/lib/rust/state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/supabase/auth-context";

const RustIDE = dynamic(() => import("./RustIDE").then((m) => m.RustIDE), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center p-8 text-xs font-mono text-slate-400 dark:text-slate-500">
      Loading REEC Workspace...
    </div>
  ),
});

export function RustWorkspacePanel() {
  const { user, isLoading, openAuthModal } = useAuth();
  const isOpen = useRustWorkspace((s) => s.isPanelOpen);
  const title = useRustWorkspace((s) => s.panelTitle);
  const lessonVisible = useRustWorkspace((s) => s.lessonVisible);
  const closePanel = useRustWorkspace((s) => s.closePanel);
  const toggleLessonVisible = useRustWorkspace((s) => s.toggleLessonVisible);

  React.useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePanel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closePanel]);

  if (!isOpen) return null;

  return (
    <aside
      className="fixed bottom-0 right-0 top-14 z-50 flex w-full animate-in flex-col border-l border-slate-200/70 dark:border-white/[0.1] bg-white/90 dark:bg-[#090f1d]/95 backdrop-blur-3xl backdrop-saturate-150 shadow-2xl duration-200 slide-in-from-right-8 sm:w-[52%] sm:min-w-[480px]"
      style={{
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.45), -8px 0 32px rgba(0, 0, 0, 0.15)",
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/[0.06] px-3.5 py-2.5 bg-white/70 dark:bg-white/[0.02]">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            title={lessonVisible ? "Hide lesson" : "Show lesson"}
            aria-label={lessonVisible ? "Hide lesson" : "Show lesson"}
            aria-pressed={lessonVisible}
            onClick={toggleLessonVisible}
          >
            <PanelLeft size={15} />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              <Terminal size={13} className="text-blue-500" /> REEC Workspace
            </div>
            {title && <div className="truncate text-xs text-slate-500 dark:text-slate-400">{title}</div>}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          onClick={closePanel}
          aria-label="Close workspace"
        >
          <X size={16} />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-3" />
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Verifying workspace access rights...
          </p>
        </div>
      ) : !user ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-8 text-center">
          <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 shadow-md">
            <Terminal size={26} />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
              <Lock size={12} />
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2.5">
            <Sparkles size={11} />
            <span>Authentication Required</span>
          </div>

          <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            Sign In to Access REEC Workspace
          </h3>

          <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            To prevent system flooding and preserve compiler runner capacity, the interactive Rust workspace and execution tools require an authenticated engineer account.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 w-full max-w-xs">
            <Button
              id="btn-panel-workspace-auth"
              onClick={openAuthModal}
              size="default"
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-xs py-2.5 shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock size={13} />
              <span>Sign In / Create Free Account</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={closePanel}
              className="w-full rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Close Panel
            </Button>
          </div>

          <p className="mt-4 text-[10px] font-mono text-slate-400 dark:text-slate-500">
            Instant access · Free account · Cloud synced
          </p>
        </div>
      ) : (
        <RustIDE className="flex-1" />
      )}
    </aside>
  );
}
