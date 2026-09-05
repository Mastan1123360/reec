"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Terminal } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { cn } from "@/lib/utils";

const RustIDE = dynamic(() => import("@/components/rust-ide/RustIDE").then((m) => m.RustIDE), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center p-8 text-xs font-mono text-slate-400 dark:text-slate-500">
      Bootstrapping REEC Rust Workspace...
    </div>
  ),
});

export default function WorkspacePage() {
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  return (
    <div
      className={cn(
        "flex flex-col text-slate-900 dark:text-slate-100 transition-all duration-200 h-full w-full",
        isFullScreen
          ? "fixed inset-0 z-50 h-screen w-screen p-0 bg-slate-900"
          : "p-2 sm:p-3 lg:p-4"
      )}
    >
      {!isFullScreen && (
        <div className="mb-2.5 flex items-center justify-between gap-4 shrink-0 px-1">
          <div className="flex items-center gap-3">
            <BackButton fallbackHref="/" label="Return to Dashboard" />

            <div>
              <h1 className="flex items-center gap-2 text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                <Terminal size={16} className="text-blue-500" />
                <span>REEC Code Workspace</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Online
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Native Rust toolchain · Check, Build, Run, Test &amp; Format with instant diagnostics
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Surface */}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden transition-all",
          isFullScreen
            ? "border-0 rounded-none"
            : "rounded-[22px] border border-slate-200/60 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c1322]/75 backdrop-blur-2xl backdrop-saturate-150 shadow-xl"
        )}
        style={
          !isFullScreen
            ? {
                boxShadow:
                  "inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 10px 32px 0 rgba(0, 0, 0, 0.08)",
              }
            : undefined
        }
      >
        <RustIDE
          className="h-full"
          isFullScreen={isFullScreen}
          onToggleFullScreen={() => setIsFullScreen((v) => !v)}
        />
      </div>
    </div>
  );
}
