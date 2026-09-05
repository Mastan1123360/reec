"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { X, PanelLeft, Terminal } from "lucide-react";
import { useRustWorkspace } from "@/lib/rust/state";
import { Button } from "@/components/ui/button";

const RustIDE = dynamic(() => import("./RustIDE").then((m) => m.RustIDE), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center p-8 text-xs font-mono text-slate-400 dark:text-slate-500">
      Loading REEC Workspace...
    </div>
  ),
});

export function RustWorkspacePanel() {
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
      className="fixed bottom-0 right-0 top-14 z-40 flex w-full animate-in flex-col border-l border-slate-200/70 dark:border-white/[0.1] bg-white/90 dark:bg-[#090f1d]/95 backdrop-blur-3xl backdrop-saturate-150 shadow-2xl duration-200 slide-in-from-right-8 sm:w-[52%] sm:min-w-[480px]"
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
      <RustIDE className="flex-1" />
    </aside>
  );
}
