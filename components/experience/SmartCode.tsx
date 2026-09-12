"use client";

import * as React from "react";
import { Copy, Check, ChevronDown, ChevronUp, Play } from "lucide-react";
import type { CodeNode } from "@/lib/content/types";
import { Button } from "@/components/ui/button";
import { useRustWorkspace } from "@/lib/rust/state";

const COLLAPSE_THRESHOLD_LINES = 18;

export function SmartCode({ code }: { code: CodeNode }) {
  const openPanel = useRustWorkspace((s) => s.openPanel);
  const [copied, setCopied] = React.useState(false);
  const lineCount = code.source.split("\n").length;
  const [collapsed, setCollapsed] = React.useState(lineCount > COLLAPSE_THRESHOLD_LINES);
  const isRust = ["rust", "rs"].includes(code.lang.toLowerCase());
  const isExecutable = Boolean(isRust && code.executable);

  async function handleCopy() {
    await navigator.clipboard.writeText(code.source);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="reec-code-surface group relative my-6 overflow-hidden rounded-[18px] border border-slate-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-[#070c18]/85 backdrop-blur-xl shadow-xs"
      style={{
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 4px 20px -2px rgba(0, 0, 0, 0.03)",
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/[0.06] bg-slate-100/50 dark:bg-white/[0.02] px-3.5 py-2">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {code.lang}
        </span>
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
          <IconButton label="Copy" onClick={handleCopy}>
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </IconButton>
          {isExecutable && (
            <IconButton
              label="Run in REEC Workspace"
              onClick={() =>
                openPanel(code.source, "Code snippet", {
                  lessonId: code.lessonId,
                  challengeId: code.challengeId,
                  blockId: code.blockId,
                  triggerId: code.triggerId,
                  originalLessonSource: code.source,
                  generatedFromLesson: true,
                  executable: true,
                })
              }
            >
              <Play size={13} className="text-blue-500" />
            </IconButton>
          )}
          {lineCount > COLLAPSE_THRESHOLD_LINES && (
            <IconButton label={collapsed ? "Expand" : "Collapse"} onClick={() => setCollapsed((c) => !c)}>
              {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </IconButton>
          )}
        </div>
      </div>

      <div
        className={collapsed ? "relative max-h-64 overflow-hidden" : ""}
        dangerouslySetInnerHTML={{ __html: code.html }}
      />
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-slate-200/60 dark:border-white/[0.06] bg-white/80 dark:bg-[#0c1424]/90 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 backdrop-blur-md transition-colors"
        >
          <ChevronDown size={13} /> Show {lineCount - COLLAPSE_THRESHOLD_LINES} more lines
        </button>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-white/[0.08]"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
