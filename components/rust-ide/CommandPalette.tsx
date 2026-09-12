"use client";

import * as React from "react";
import { Command } from "cmdk";
import {
  CircleCheck, Hammer, Play, FlaskConical, WandSparkles,
  Plus, PanelBottom, PanelLeft, Search as SearchIcon,
} from "lucide-react";
import { useRustWorkspace } from "@/lib/rust/state";

export function CommandPalette({
  open,
  onOpenChange,
  onToggleExplorer,
  onToggleInspector,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onToggleExplorer: () => void;
  onToggleInspector: () => void;
}) {
  const runOperation = useRustWorkspace((s) => s.runOperation);
  const addFile = useRustWorkspace((s) => s.addFile);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function run(fn: () => void) {
    fn();
    onOpenChange(false);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      className="fixed left-1/2 top-24 z-[70] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-[24px] border border-slate-200/70 dark:border-white/[0.1] bg-white/90 dark:bg-[#0c1424]/95 backdrop-blur-3xl backdrop-saturate-150 shadow-2xl animate-in fade-in-0 zoom-in-95"
      style={{
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 20px 48px -8px rgba(0, 0, 0, 0.25)",
      }}
    >
      <div className="flex items-center gap-2.5 border-b border-slate-200/60 dark:border-white/[0.06] px-4 py-3 bg-white/50 dark:bg-white/[0.02]">
        <SearchIcon size={16} className="text-slate-400" />
        <Command.Input
          placeholder="Type a command or shortcut..."
          className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400"
        />
      </div>
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
          No matching command found.
        </Command.Empty>

        <Command.Group heading="Compiler Actions" className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 [&_[cmdk-group-items]]:mt-1">
          <Item icon={CircleCheck} label="Check" shortcut="⇧⌘C" onSelect={() => run(() => runOperation("check"))} />
          <Item icon={Hammer} label="Build" shortcut="⇧⌘B" onSelect={() => run(() => runOperation("build"))} />
          <Item icon={Play} label="Run" shortcut="⌘⏎" onSelect={() => run(() => runOperation("run"))} />
          <Item icon={FlaskConical} label="Test" shortcut="⇧⌘T" onSelect={() => run(() => runOperation("test"))} />
          <Item icon={WandSparkles} label="Format" shortcut="⇧⌘F" onSelect={() => run(() => runOperation("format"))} />
        </Command.Group>

        <Command.Group heading="File Actions" className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 [&_[cmdk-group-items]]:mt-1">
          <Item icon={Plus} label="New file (src/module.rs)" onSelect={() => run(() => addFile("src/module.rs", "module"))} />
        </Command.Group>

        <Command.Group heading="Layout & View" className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 [&_[cmdk-group-items]]:mt-1">
          <Item icon={PanelLeft} label="Toggle project explorer" onSelect={() => run(onToggleExplorer)} />
          <Item icon={PanelBottom} label="Toggle diagnostics & output" onSelect={() => run(onToggleInspector)} />
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

function Item({
  icon: Icon,
  label,
  shortcut,
  onSelect,
}: {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 aria-selected:bg-blue-500/15 aria-selected:text-blue-600 dark:aria-selected:text-blue-400 transition-all"
    >
      <Icon size={14} className="text-slate-400" />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="rounded-md border border-slate-200/60 dark:border-white/[0.08] bg-slate-100/80 dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
