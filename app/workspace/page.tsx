"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = React.useState(false);
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for Escape key to exit fullscreen mode smoothly
  React.useEffect(() => {
    if (!isFullScreen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsFullScreen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullScreen]);

  // When fullscreen is toggled, lock body scroll
  React.useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullScreen]);

  const toggleFullScreen = React.useCallback(() => {
    setIsFullScreen((prev) => !prev);
  }, []);

  // Fullscreen view rendered directly into document.body to escape any transform containing blocks
  const fullScreenContent = isFullScreen && mounted ? (
    <div
      id="workspace-fullscreen-portal"
      className="fixed inset-0 z-[99999] h-dvh w-dvw flex flex-col bg-slate-950 text-slate-100 overflow-hidden"
      style={{
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        margin: 0,
        padding: 0,
        width: "100vw",
        height: "100dvh",
      }}
    >
      <div className="flex-1 min-h-0 w-full h-full overflow-hidden">
        <RustIDE
          className="h-full w-full"
          isFullScreen={true}
          onToggleFullScreen={toggleFullScreen}
        />
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Render portaled fullscreen when active */}
      {mounted && fullScreenContent && createPortal(fullScreenContent, document.body)}

      {/* Standard non-fullscreen page layout */}
      <div className="flex flex-col text-slate-900 dark:text-slate-100 transition-all duration-200 h-full w-full p-2 sm:p-3 lg:p-4">
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

        {/* Main Workspace Surface */}
        <div
          className="min-h-0 flex-1 overflow-hidden transition-all rounded-[22px] border border-slate-200/60 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c1322]/75 backdrop-blur-2xl backdrop-saturate-150 shadow-xl"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 10px 32px 0 rgba(0, 0, 0, 0.08)",
          }}
        >
          <RustIDE
            className="h-full"
            isFullScreen={false}
            onToggleFullScreen={toggleFullScreen}
          />
        </div>
      </div>
    </>
  );
}
