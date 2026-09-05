"use client";

import * as React from "react";
import {
  FolderGit2, Plus, Trash2, Pencil, Check, X, FileCode,
} from "lucide-react";
import { useFilesStore, type SavedFile } from "@/lib/files/store";
import { runRustOperation } from "@/lib/rust/client";
import { RustEditor, type RustEditorHandle } from "@/components/rust-ide/RustEditor";
import { DiagnosticsPanel } from "@/components/rust-ide/DiagnosticsPanel";
import { OutputPanel } from "@/components/rust-ide/OutputPanel";
import { StatusBar } from "@/components/rust-ide/StatusBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CompilerPhase } from "@/lib/rust/state";
import type { RustOperation } from "@/lib/rust/types";

const STARTER = "fn main() {\n    println!(\"Hello, hello_reec!\");\n}\n";

export default function HelloReecPage() {
  const files = useFilesStore((s) => s.files);
  const createFile = useFilesStore((s) => s.createFile);
  const updateContent = useFilesStore((s) => s.updateContent);
  const renameFile = useFilesStore((s) => s.renameFile);
  const deleteFile = useFilesStore((s) => s.deleteFile);

  const fileList = React.useMemo(() => Object.values(files).sort((a, b) => b.updatedAt - a.updatedAt), [files]);
  const [selectedId, setSelectedId] = React.useState<string | null>(fileList[0]?.id ?? null);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameDraft, setRenameDraft] = React.useState("");
  const [phase, setPhase] = React.useState<CompilerPhase>({ status: "idle" });

  const selected = fileList.find((f) => f.id === selectedId) ?? null;
  const editorRef = React.useRef<RustEditorHandle>(null);

  React.useEffect(() => {
    if (!selected && fileList.length > 0) setSelectedId(fileList[0].id);
  }, [fileList, selected]);

  function handleCreate() {
    const id = createFile(`untitled-${fileList.length + 1}.rs`, STARTER);
    setSelectedId(id);
    setPhase({ status: "idle" });
  }

  async function run(operation: RustOperation) {
    if (!selected || !selected.content.trim()) return;
    const opStatus = ({ check: "checking", build: "building", run: "running", test: "testing", format: "formatting" } as const)[operation];
    setPhase({ status: opStatus });

    const outcome = await runRustOperation(operation, selected.content, "2021", "debug");

    if (!outcome.ok) {
      setPhase({ status: "backend_error", operation, error: outcome.error });
      return;
    }
    if (operation === "format" && outcome.result.success && outcome.result.formattedSource) {
      updateContent(selected.id, outcome.result.formattedSource);
    }
    setPhase({
      status: outcome.result.success ? "success" : "failed",
      operation,
      result: outcome.result,
    });
  }

  const diagnostics = "result" in phase ? phase.result.diagnostics : [];

  return (
    <div className="flex h-full w-full max-w-[1600px] mx-auto p-2 sm:p-4 gap-3">
      {/* File Explorer Sidebar */}
      <aside
        className="flex w-64 shrink-0 flex-col rounded-[22px] border border-slate-200/60 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c1322]/75 backdrop-blur-2xl backdrop-saturate-150 overflow-hidden shadow-xs"
        style={{
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 4px 20px -2px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/[0.06] px-4 py-3 bg-white/40 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            <FolderGit2 size={15} className="text-blue-500" /> hello_reec
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/[0.08]"
            onClick={handleCreate}
            title="New file"
          >
            <Plus size={14} />
          </Button>
        </div>
        <p className="border-b border-slate-200/50 dark:border-white/[0.04] px-4 py-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Your personal repository. Saved locally to your browser storage.
        </p>
        <div className="flex-1 overflow-y-auto p-2">
          {fileList.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              No files yet. Tap + to create one.
            </div>
          )}
          <ul className="space-y-1">
            {fileList.map((f) => (
              <FileRow
                key={f.id}
                file={f}
                active={f.id === selectedId}
                renaming={renamingId === f.id}
                renameDraft={renameDraft}
                onSelect={() => {
                  setSelectedId(f.id);
                  setPhase({ status: "idle" });
                }}
                onStartRename={() => {
                  setRenamingId(f.id);
                  setRenameDraft(f.name);
                }}
                onRenameChange={setRenameDraft}
                onRenameCommit={() => {
                  if (renameDraft.trim()) renameFile(f.id, renameDraft.trim());
                  setRenamingId(null);
                }}
                onRenameCancel={() => setRenamingId(null)}
                onDelete={() => {
                  deleteFile(f.id);
                  if (selectedId === f.id) setSelectedId(null);
                }}
              />
            ))}
          </ul>
        </div>
      </aside>

      {/* Editor & Compiler Area */}
      <main
        className="flex min-w-0 flex-1 flex-col rounded-[22px] border border-slate-200/60 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c1322]/75 backdrop-blur-2xl backdrop-saturate-150 overflow-hidden shadow-xs"
        style={{
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 4px 20px -2px rgba(0, 0, 0, 0.03)",
        }}
      >
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/[0.06] px-4 py-2 bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                <FileCode size={14} className="text-blue-500" />
                {selected.name}
              </div>
              <CompilerToolbarLocal onRun={run} phase={phase} />
            </div>

            <div className="flex min-h-0 flex-1">
              <div className="min-w-0 flex-1 overflow-hidden">
                <RustEditor
                  ref={editorRef}
                  value={selected.content}
                  onChange={(v) => updateContent(selected.id, v)}
                />
              </div>
              <div className="flex w-full max-w-full flex-col border-l border-slate-200/60 dark:border-white/[0.06] bg-slate-50/40 dark:bg-black/20 sm:w-[380px]">
                <div className="border-b border-slate-200/60 dark:border-white/[0.06] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Diagnostics &amp; Output
                </div>
                {diagnostics.length > 0 ? (
                  <DiagnosticsPanel
                    diagnostics={diagnostics}
                    onJumpToSource={(line, col) => editorRef.current?.jumpTo(line, col)}
                  />
                ) : (
                  <OutputPanel phase={phase} />
                )}
              </div>
            </div>
            <StatusBar phase={phase} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
            <FolderGit2 size={36} className="text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Select a file, or create a new one to begin editing.
            </p>
            <Button size="sm" onClick={handleCreate} className="rounded-xl">
              <Plus size={14} /> New file
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function CompilerToolbarLocal({
  onRun,
  phase,
}: {
  onRun: (op: RustOperation) => void;
  phase: CompilerPhase;
}) {
  const busy = ["checking", "building", "running", "testing", "formatting"].includes(phase.status);
  const ops: { op: RustOperation; label: string }[] = [
    { op: "check", label: "Check" },
    { op: "build", label: "Build" },
    { op: "run", label: "Run" },
    { op: "test", label: "Test" },
    { op: "format", label: "Format" },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {ops.map(({ op, label }) => (
        <Button
          key={op}
          size="sm"
          variant={op === "run" ? "default" : "outline"}
          disabled={busy}
          onClick={() => onRun(op)}
          className="h-7.5 text-[11px]"
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

function FileRow({
  file,
  active,
  renaming,
  renameDraft,
  onSelect,
  onStartRename,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  onDelete,
}: {
  file: SavedFile;
  active: boolean;
  renaming: boolean;
  renameDraft: string;
  onSelect: () => void;
  onStartRename: () => void;
  onRenameChange: (v: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onDelete: () => void;
}) {
  if (renaming) {
    return (
      <li className="flex items-center gap-1 px-2.5 py-1.5">
        <input
          autoFocus
          value={renameDraft}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onRenameCommit();
            if (e.key === "Escape") onRenameCancel();
          }}
          className="w-full rounded-lg border border-blue-500 bg-white dark:bg-white/[0.08] px-2 py-1 text-xs outline-none shadow-xs"
        />
        <button onClick={onRenameCommit} className="text-emerald-500 p-1">
          <Check size={13} />
        </button>
        <button onClick={onRenameCancel} className="text-slate-400 p-1">
          <X size={13} />
        </button>
      </li>
    );
  }

  return (
    <li>
      <button
        onClick={onSelect}
        className={cn(
          "group flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-all",
          active
            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/30"
            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/[0.04]"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <FileCode size={13} className="shrink-0 text-slate-400" />
          <span className="truncate">{file.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartRename();
            }}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50"
          >
            <Pencil size={12} />
          </span>
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-lg p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10"
          >
            <Trash2 size={12} />
          </span>
        </span>
      </button>
    </li>
  );
}
