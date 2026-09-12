"use client";

import * as React from "react";
import {
  Terminal as TerminalIcon,
  CornerDownLeft,
  ChevronRight,
  Trash2,
  CheckCircle2,
  XCircle,
  GraduationCap,
} from "lucide-react";
import { useRustWorkspace } from "@/lib/rust/state";
import { getLearningEntry } from "@/lib/rust/learning";
import type { RustOperation, RustDiagnostic } from "@/lib/rust/types";
import { useTheme } from "@/components/ThemeProvider";

export interface TerminalEntry {
  id: string;
  timestamp: Date;
  type: "command" | "system" | "stdout" | "stderr" | "success" | "error" | "diagnostic";
  content?: string;
  operation?: RustOperation;
  durationMs?: number;
  diagnostics?: RustDiagnostic[];
}

const KNOWN_COMMANDS = [
  { cmd: "cargo check", desc: "Validate syntax & borrow check without emitting binary" },
  { cmd: "cargo build", desc: "Compile current crate to binary (debug/release)" },
  { cmd: "cargo run", desc: "Build & execute current binary on REEC runner" },
  { cmd: "cargo test", desc: "Run #[test] unit tests in current file" },
  { cmd: "cargo fmt", desc: "Format active Rust source with rustfmt" },
  { cmd: "help", desc: "Display available REEC terminal commands" },
  { cmd: "clear", desc: "Clear terminal console buffer" },
  { cmd: "history", desc: "Show recent command history" },
  { cmd: "status", desc: "Show active toolchain edition & compiler state" },
  { cmd: "reset", desc: "Reset active project to starter template" },
];

export function TerminalPanel({
  onJumpToSource,
}: {
  onJumpToSource?: (line: number, column: number) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const phase = useRustWorkspace((s) => s.phase);
  const runOperation = useRustWorkspace((s) => s.runOperation);
  const resetWorkspace = useRustWorkspace((s) => s.reset);
  const edition = useRustWorkspace((s) => s.project.edition);
  const profile = useRustWorkspace((s) => s.profile);
  const activeFile = useRustWorkspace((s) => s.activeFile());

  const [inputVal, setInputVal] = React.useState("");
  const [historyIndex, setHistoryIndex] = React.useState<number | null>(null);
  const [commandHistory, setCommandHistory] = React.useState<string[]>([
    "cargo check",
    "cargo run",
  ]);
  const [entries, setEntries] = React.useState<TerminalEntry[]>([
    {
      id: "term-welcome",
      timestamp: new Date(),
      type: "system",
      content:
        "REEC Terminal v1.4.0 — Rust 2021 Edition. Type 'help' for commands or 'cargo run' to execute.",
    },
  ]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const terminalEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const prevPhaseStatus = React.useRef(phase.status);

  // Auto-scroll on new entries
  React.useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  // Capture compiler phase outputs into terminal stream
  React.useEffect(() => {
    if (prevPhaseStatus.current !== phase.status) {
      if (phase.status === "success") {
        const { result, operation } = phase;
        setEntries((prev) => [
          ...prev,
          ...(result.stdout
            ? [
                {
                  id: `out-${Date.now()}`,
                  timestamp: new Date(),
                  type: "stdout" as const,
                  content: result.stdout,
                },
              ]
            : []),
          {
            id: `succ-${Date.now()}`,
            timestamp: new Date(),
            type: "success" as const,
            operation,
            durationMs: result.durationMs,
            content: `✓ ${operation === "format" ? "rustfmt formatted code" : `cargo ${operation} finished successfully`}`,
          },
        ]);
      } else if (phase.status === "failed") {
        const { result, operation } = phase;
        setEntries((prev) => [
          ...prev,
          ...(result.stdout
            ? [
                {
                  id: `out-${Date.now()}`,
                  timestamp: new Date(),
                  type: "stdout" as const,
                  content: result.stdout,
                },
              ]
            : []),
          ...(result.stderr && !result.diagnostics.length
            ? [
                {
                  id: `err-${Date.now()}`,
                  timestamp: new Date(),
                  type: "stderr" as const,
                  content: result.stderr,
                },
              ]
            : []),
          {
            id: `fail-${Date.now()}`,
            timestamp: new Date(),
            type: "error" as const,
            operation,
            durationMs: result.durationMs,
            diagnostics: result.diagnostics,
            content: `✕ cargo ${operation} failed with ${result.diagnostics.filter((d) => d.level === "error").length || 1} error(s)`,
          },
        ]);
      } else if (phase.status === "backend_error") {
        setEntries((prev) => [
          ...prev,
          {
            id: `b-err-${Date.now()}`,
            timestamp: new Date(),
            type: "stderr",
            content: `REEC Compiler Error: ${phase.error.message}`,
          },
        ]);
      }
      prevPhaseStatus.current = phase.status;
    }
  }, [phase]);

  const suggestions = React.useMemo(() => {
    if (!inputVal.trim()) return [];
    return KNOWN_COMMANDS.filter((k) =>
      k.cmd.toLowerCase().startsWith(inputVal.toLowerCase().trim())
    );
  }, [inputVal]);

  const handleCommandExecute = async (cmdToRun: string) => {
    const raw = cmdToRun.trim();
    if (!raw) return;

    // Add to history
    setCommandHistory((prev) => [raw, ...prev.filter((c) => c !== raw)].slice(0, 100));
    setHistoryIndex(null);
    setInputVal("");
    setShowSuggestions(false);

    // Add command echo entry
    setEntries((prev) => [
      ...prev,
      {
        id: `cmd-${Date.now()}`,
        timestamp: new Date(),
        type: "command",
        content: raw,
      },
    ]);

    const normalized = raw.toLowerCase();

    if (normalized === "clear") {
      setEntries([]);
      return;
    }

    if (normalized === "help") {
      setEntries((prev) => [
        ...prev,
        {
          id: `help-${Date.now()}`,
          timestamp: new Date(),
          type: "system",
          content: KNOWN_COMMANDS.map((k) => `  ${k.cmd.padEnd(14)} ${k.desc}`).join("\n"),
        },
      ]);
      return;
    }

    if (normalized === "history") {
      setEntries((prev) => [
        ...prev,
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date(),
          type: "system",
          content: commandHistory.map((h, i) => `  ${i + 1}. ${h}`).join("\n") || "No history yet",
        },
      ]);
      return;
    }

    if (normalized === "status") {
      setEntries((prev) => [
        ...prev,
        {
          id: `stat-${Date.now()}`,
          timestamp: new Date(),
          type: "system",
          content: `REEC Rust Toolchain Status:
  Edition:    ${edition}
  Profile:    ${profile}
  Active File: ${activeFile?.path || "src/main.rs"} (${activeFile?.content.length || 0} bytes)
  Backend:    REEC WASM / Official Rust Playground API Adapter`,
        },
      ]);
      return;
    }

    if (normalized === "reset") {
      resetWorkspace();
      setEntries((prev) => [
        ...prev,
        {
          id: `rst-${Date.now()}`,
          timestamp: new Date(),
          type: "system",
          content: "✓ Workspace reset to initial starter template.",
        },
      ]);
      return;
    }

    // Cargo operation mappings
    if (normalized === "cargo check" || normalized === "check") {
      await runOperation("check");
    } else if (normalized === "cargo build" || normalized === "build") {
      await runOperation("build");
    } else if (normalized === "cargo run" || normalized === "run") {
      await runOperation("run");
    } else if (normalized === "cargo test" || normalized === "test") {
      await runOperation("test");
    } else if (normalized === "cargo fmt" || normalized === "fmt" || normalized === "format") {
      await runOperation("format");
    } else {
      setEntries((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          timestamp: new Date(),
          type: "stderr",
          content: `reec: command not recognized: "${raw}". Type 'help' for available commands.`,
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommandExecute(inputVal);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex === null ? 0 : Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(nextIndex);
      setInputVal(commandHistory[nextIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === null || historyIndex === 0) {
        setHistoryIndex(null);
        setInputVal("");
      } else {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInputVal(commandHistory[nextIndex]);
      }
    } else if (e.key === "Tab" && suggestions.length > 0) {
      e.preventDefault();
      setInputVal(suggestions[0].cmd);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
      e.preventDefault();
      setEntries([]);
    }
  };

  return (
    <div
      className="flex h-full flex-col font-mono text-[12px] bg-slate-900 dark:bg-slate-950/90 text-slate-100 dark:text-slate-200 backdrop-blur-xl transition-colors"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal Output stream */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2 select-text">
        {entries.map((item) => (
          <div key={item.id} className="leading-relaxed">
            {item.type === "command" && (
              <div className="flex items-center gap-2 font-semibold">
                <span className="text-emerald-400">reec:playground$</span>
                <span className="text-white font-mono">{item.content}</span>
              </div>
            )}

            {item.type === "system" && (
              <div className="text-slate-400 whitespace-pre-wrap">{item.content}</div>
            )}

            {item.type === "stdout" && (
              <div className="text-slate-200 whitespace-pre-wrap font-mono">
                {item.content}
              </div>
            )}

            {item.type === "stderr" && (
              <div className="text-red-400 whitespace-pre-wrap">{item.content}</div>
            )}

            {item.type === "success" && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs py-1">
                <CheckCircle2 size={13} className="shrink-0" />
                <span>{item.content}</span>
                {item.durationMs && (
                  <span className="text-slate-500 text-[10px]">in {item.durationMs}ms</span>
                )}
              </div>
            )}

            {item.type === "error" && (
              <div className="space-y-1.5 py-1">
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <XCircle size={13} className="shrink-0" />
                  <span>{item.content}</span>
                  {item.durationMs && (
                    <span className="text-slate-500 text-[10px]">in {item.durationMs}ms</span>
                  )}
                </div>

                {item.diagnostics && item.diagnostics.length > 0 && (
                  <div className="mt-1 space-y-1.5 pl-3 border-l-2 border-red-500/40">
                    {item.diagnostics.map((diag) => {
                      const learn = getLearningEntry(diag.code);
                      return (
                        <div key={diag.id} className="text-[11px]">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-red-400 font-bold uppercase">{diag.level}:</span>
                            {diag.code && (
                              <span className="text-amber-400 font-semibold">[{diag.code}]</span>
                            )}
                            <span className="text-slate-200">{diag.message}</span>
                          </div>

                          {diag.primarySpan && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (diag.primarySpan) {
                                  onJumpToSource?.(diag.primarySpan.line, diag.primarySpan.column);
                                }
                              }}
                              className="text-blue-400 text-[11px] hover:underline inline-flex items-center gap-1 mt-0.5"
                            >
                              → {diag.primarySpan.file}:{diag.primarySpan.line}:{diag.primarySpan.column}
                              <ChevronRight size={10} />
                            </button>
                          )}

                          {learn && (
                            <div className="mt-1.5 p-2.5 rounded-xl bg-blue-950/60 border border-blue-500/30 text-blue-200 text-xs">
                              <div className="flex items-center gap-1 font-bold text-blue-300 text-[10px] mb-0.5 uppercase tracking-wider">
                                <GraduationCap size={12} /> REEC Guidance
                              </div>
                              <p className="text-[11.5px] leading-relaxed text-slate-300">
                                {learn.whatHappened}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Autocomplete suggestions popup if active */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="mx-2 mb-1 p-1 rounded-xl bg-slate-900/95 border border-slate-700/60 shadow-xl max-h-32 overflow-y-auto backdrop-blur-xl">
          {suggestions.map((s) => (
            <button
              key={s.cmd}
              onClick={(e) => {
                e.stopPropagation();
                setInputVal(s.cmd);
                setShowSuggestions(false);
                inputRef.current?.focus();
              }}
              className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-xs rounded-lg hover:bg-blue-500/20 text-slate-200"
            >
              <span className="font-semibold text-blue-400">{s.cmd}</span>
              <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{s.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Command prompt input bar */}
      <div className="flex items-center gap-2 border-t border-slate-800/80 px-3 py-2 bg-slate-950/60 backdrop-blur-md">
        <span className="text-emerald-400 font-semibold shrink-0 select-none">
          reec:playground$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            setShowSuggestions(e.target.value.trim().length > 0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="type 'cargo run' or 'help'..."
          className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500 caret-blue-500 text-xs font-mono"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          onClick={() => handleCommandExecute(inputVal)}
          disabled={!inputVal.trim()}
          className="shrink-0 p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
          title="Run command (Enter)"
        >
          <CornerDownLeft size={14} />
        </button>
        <button
          onClick={() => setEntries([])}
          className="shrink-0 p-1 text-slate-500 hover:text-slate-300 transition-colors"
          title="Clear console (Ctrl+L)"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
