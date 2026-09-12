"use client";

import * as React from "react";
import { FileCode, FileCog, Plus, X, Circle } from "lucide-react";
import { useRustWorkspace } from "@/lib/rust/state";
import { cn } from "@/lib/utils";

export function FileExplorer() {
  const project = useRustWorkspace((s) => s.project);
  const setActiveFile = useRustWorkspace((s) => s.setActiveFile);
  const addFile = useRustWorkspace((s) => s.addFile);
  const removeFile = useRustWorkspace((s) => s.removeFile);
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  function commitAdd() {
    const name = draft.trim();
    if (!name) {
      setDraft("");
      setAdding(false);
      return;
    }
    if (name === "Cargo.toml" || name.endsWith(".toml")) {
      addFile(name, "manifest");
    } else {
      const path = name.startsWith("src/") ? name : `src/${name}`;
      addFile(path.endsWith(".rs") ? path : `${path}.rs`, name.includes("test") ? "test" : "module");
    }
    setDraft("");
    setAdding(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/[0.06] px-3.5 py-2.5 bg-slate-100/40 dark:bg-white/[0.02]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Project Files</span>
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg p-1 text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          title="Add file"
          aria-label="Add file"
        >
          <Plus size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {project.files.map((f) => (
          <div
            key={f.id}
            onClick={() => setActiveFile(f.id)}
            className={cn(
              "group flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-mono transition-all",
              f.id === project.activeFileId
                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/30 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-white/[0.04]"
            )}
          >
            {f.kind === "manifest" ? (
              <FileCog size={13} className="shrink-0 text-slate-400" />
            ) : (
              <FileCode size={13} className="shrink-0 text-blue-500/80" />
            )}
            <span className="min-w-0 flex-1 truncate">{f.path}</span>
            {f.dirty && <Circle size={5} className="shrink-0 fill-current text-blue-500" />}
            {project.files.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(f.id);
                }}
                className="shrink-0 rounded p-0.5 opacity-0 hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100 transition-all"
                aria-label={`Remove ${f.path}`}
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        {adding && (
          <div className="px-2 py-1">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitAdd}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitAdd();
                if (e.key === "Escape") {
                  setDraft("");
                  setAdding(false);
                }
              }}
              placeholder="module.rs"
              className="w-full rounded-lg border border-blue-500 bg-white dark:bg-white/[0.08] px-2 py-1 text-xs outline-none shadow-xs font-mono"
            />
          </div>
        )}
      </div>
    </div>
  );
}
