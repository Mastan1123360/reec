"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  PanelLeft,
  PanelRight,
  Code2,
  Terminal,
  AlertCircle,
  FolderTree,
  Maximize2,
  Minimize2,
  Play,
  Activity,
  Loader2,
} from "lucide-react";
import { useRustWorkspace } from "@/lib/rust/state";
import { RustEditor, type RustEditorHandle } from "./RustEditor";
import { Toolbar } from "./Toolbar";
import { FileExplorer } from "./FileExplorer";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { OutputPanel } from "./OutputPanel";
import { TerminalPanel } from "./TerminalPanel";
import { StatusBar } from "./StatusBar";
import { CommandPalette } from "./CommandPalette";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MobileTab = "editor" | "output" | "terminal" | "problems" | "files";
type InspectorTab = "terminal" | "output" | "problems";

export function RustIDE({
  className,
  isFullScreen = false,
  onToggleFullScreen,
}: {
  className?: string;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}) {
  const project = useRustWorkspace((s) => s.project);
  const phase = useRustWorkspace((s) => s.phase);
  const updateFileContent = useRustWorkspace((s) => s.updateFileContent);
  const runOperation = useRustWorkspace((s) => s.runOperation);

  const activeFile = project.files.find((f) => f.id === project.activeFileId) ?? project.files[0];
  const diagnostics = "result" in phase ? phase.result.diagnostics : [];

  // Desktop states
  const [explorerOpen, setExplorerOpen] = React.useState(true);
  const [inspectorOpen, setInspectorOpen] = React.useState(true);
  const [inspectorTab, setInspectorTab] = React.useState<InspectorTab>("terminal");
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  // Mobile / Tablet Tab State (< lg screens)
  const [mobileTab, setMobileTab] = React.useState<MobileTab>("editor");

  const editorRef = React.useRef<RustEditorHandle>(null);
  const prevStatus = React.useRef(phase.status);

  React.useEffect(() => {
    if (prevStatus.current !== phase.status) {
      // If compiler starts running or finishes on mobile/tablet, make output readily available
      if (
        phase.status === "running" ||
        phase.status === "building" ||
        phase.status === "success" ||
        phase.status === "failed" ||
        phase.status === "backend_error"
      ) {
        // Auto-switch to output if currently on editor during a mobile/tablet run
        if (mobileTab === "editor" && (phase.status === "running" || phase.status === "building")) {
          setMobileTab("output");
        }
      }
      prevStatus.current = phase.status;
    }
  }, [phase.status, mobileTab]);

  const handleMobileRun = async () => {
    setMobileTab("output");
    await runOperation("run");
  };

  const handleJumpToSource = (line: number, col: number) => {
    setMobileTab("editor");
    setTimeout(() => {
      editorRef.current?.jumpTo(line, col);
    }, 50);
  };

  const isCompiling =
    phase.status === "checking" ||
    phase.status === "building" ||
    phase.status === "running" ||
    phase.status === "testing" ||
    phase.status === "formatting";

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden bg-white/50 dark:bg-[#070c18]/85 text-slate-900 dark:text-slate-100 relative backdrop-blur-xl",
        className
      )}
    >
      {/* Top Main Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/[0.06] bg-white/70 dark:bg-[#090f1d]/75 backdrop-blur-xl">
        <div className="flex-1 min-w-0">
          <Toolbar />
        </div>

        <div className="flex items-center gap-1 px-2 shrink-0">
          {/* Full Screen Toggle */}
          {onToggleFullScreen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              onClick={onToggleFullScreen}
              title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              aria-label="Toggle Fullscreen"
            >
              {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </Button>
          )}

          {/* Desktop Panel Toggles */}
          <div className="hidden lg:flex items-center gap-1 border-l border-slate-200/60 dark:border-white/[0.06] pl-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl"
              onClick={() => setExplorerOpen((o) => !o)}
              title="Toggle project explorer"
              aria-label="Toggle project explorer"
              aria-pressed={explorerOpen}
            >
              <PanelLeft
                size={14}
                className={explorerOpen ? "text-blue-500" : "text-slate-400"}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl"
              onClick={() => setInspectorOpen((o) => !o)}
              title="Toggle inspector panel"
              aria-label="Toggle inspector panel"
              aria-pressed={inspectorOpen}
            >
              <PanelRight
                size={14}
                className={inspectorOpen ? "text-blue-500" : "text-slate-400"}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Segmented View Switcher (< lg screens) */}
      <div className="flex lg:hidden items-center justify-between border-b border-slate-200/60 dark:border-white/[0.06] bg-white/80 dark:bg-[#0c1322]/80 px-2.5 py-1.5 backdrop-blur-xl">
        <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
          {(
            [
              { id: "editor" as const, label: "Editor", icon: Code2 },
              { id: "output" as const, label: "Output", icon: Activity },
              { id: "terminal" as const, label: "Terminal", icon: Terminal },
              { id: "problems" as const, label: "Issues", icon: AlertCircle },
              { id: "files" as const, label: "Files", icon: FolderTree },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = mobileTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                className={cn(
                  "relative flex-1 min-w-[62px] sm:min-w-[70px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all select-none active:scale-95",
                  isActive
                    ? "text-white font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-white/[0.03]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-ide-tab-pill"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    className="absolute inset-0 rounded-xl bg-blue-600 shadow-xs"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {tab.id === "output" && isCompiling ? (
                    <Loader2 size={13} className="animate-spin text-blue-200 shrink-0" />
                  ) : (
                    <Icon size={13} className="shrink-0" />
                  )}
                  <span>{tab.label}</span>
                  {tab.id === "problems" && diagnostics.length > 0 && (
                    <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[9.5px] font-bold leading-none">
                      {diagnostics.length}
                    </span>
                  )}
                  {tab.id === "output" && phase.status === "success" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0 ring-2 ring-white/20" />
                  )}
                  {tab.id === "output" && phase.status === "failed" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0 ring-2 ring-white/20" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main IDE Body */}
      <div className="flex min-h-0 flex-1 relative overflow-hidden">
        {/* DESKTOP VIEW (lg+) — ZERO CHANGES */}
        <div className="hidden lg:flex w-full h-full min-h-0">
          {/* File Explorer */}
          {explorerOpen && (
            <div className="w-56 shrink-0 border-r border-slate-200/60 dark:border-white/[0.06] bg-slate-50/50 dark:bg-black/20 h-full overflow-y-auto backdrop-blur-md">
              <FileExplorer />
            </div>
          )}

          {/* Center Code Editor */}
          <div className="min-w-0 flex-1 overflow-hidden h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/[0.06] bg-slate-100/40 dark:bg-white/[0.02] px-4 py-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
                <Code2 size={13} className="text-blue-500" />
                {activeFile?.path ?? "src/main.rs"}
              </span>
              <span className="text-[11px] font-mono text-slate-400">Rust 2021</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <RustEditor
                ref={editorRef}
                value={activeFile?.content ?? ""}
                onChange={(v) => activeFile && updateFileContent(activeFile.id, v)}
              />
            </div>
          </div>

          {/* Right Inspector (Terminal / Problems / Output) */}
          {inspectorOpen && (
            <div className="flex w-[460px] max-w-[50%] flex-col border-l border-slate-200/60 dark:border-white/[0.06] bg-slate-50/60 dark:bg-[#070c18]/90 h-full shrink-0 backdrop-blur-xl">
              <div className="flex border-b border-slate-200/60 dark:border-white/[0.06] bg-slate-100/50 dark:bg-white/[0.02]">
                <InspectorTabButton
                  active={inspectorTab === "terminal"}
                  onClick={() => setInspectorTab("terminal")}
                  label="Terminal"
                />
                <InspectorTabButton
                  active={inspectorTab === "problems"}
                  onClick={() => setInspectorTab("problems")}
                  label={`Problems${diagnostics.length ? ` (${diagnostics.length})` : ""}`}
                />
                <InspectorTabButton
                  active={inspectorTab === "output"}
                  onClick={() => setInspectorTab("output")}
                  label="Output"
                />
              </div>

              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {inspectorTab === "terminal" && (
                  <TerminalPanel onJumpToSource={handleJumpToSource} />
                )}
                {inspectorTab === "problems" && (
                  <DiagnosticsPanel
                    diagnostics={diagnostics}
                    onJumpToSource={handleJumpToSource}
                  />
                )}
                {inspectorTab === "output" && <OutputPanel phase={phase} />}
              </div>
            </div>
          )}
        </div>

        {/* MOBILE & TABLET ADAPTIVE VIEW (< lg) — Output Visible with dedicated view */}
        <div className="flex lg:hidden w-full h-full min-h-0 flex-col">
          {mobileTab === "editor" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/[0.06] bg-slate-100/50 dark:bg-white/[0.02] px-3 py-1.5 text-xs font-mono text-slate-500">
                <span className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-bold truncate">
                  <Code2 size={13} className="text-blue-500 shrink-0" />
                  <span className="truncate">{activeFile?.path ?? "src/main.rs"}</span>
                </span>
                <button
                  onClick={handleMobileRun}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-1 text-[11px] font-bold text-white shadow-xs active:scale-95 transition-transform shrink-0"
                >
                  <Play size={10} className="fill-current" />
                  <span>Run</span>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <RustEditor
                  ref={editorRef}
                  value={activeFile?.content ?? ""}
                  onChange={(v) => activeFile && updateFileContent(activeFile.id, v)}
                />
              </div>
            </div>
          )}

          {mobileTab === "output" && (
            <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-slate-50/50 dark:bg-[#070c18]/90">
              <OutputPanel phase={phase} />
            </div>
          )}

          {mobileTab === "terminal" && (
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <TerminalPanel onJumpToSource={handleJumpToSource} />
            </div>
          )}

          {mobileTab === "problems" && (
            <div className="flex-1 overflow-y-auto min-h-0 p-2">
              <DiagnosticsPanel
                diagnostics={diagnostics}
                onJumpToSource={handleJumpToSource}
              />
            </div>
          )}

          {mobileTab === "files" && (
            <div className="flex-1 overflow-y-auto min-h-0 p-2">
              <FileExplorer />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar phase={phase} />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onToggleExplorer={() => setExplorerOpen((o) => !o)}
        onToggleInspector={() => setInspectorOpen((o) => !o)}
      />
    </div>
  );
}

function InspectorTabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 border-b-2 px-3 py-2 text-xs font-bold transition-all",
        active
          ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/5 dark:bg-blue-500/10"
          : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
      )}
    >
      {label}
    </button>
  );
}
