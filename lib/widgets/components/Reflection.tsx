"use client";
import * as React from "react";
import { PenSquare, Save } from "lucide-react";
import { BlockShell } from "./BlockShell";
import type { WidgetProps } from "../registry";
import { Button } from "@/components/ui/button";
import { useProgressStore } from "@/lib/progress/store";

/** :::reflection — Notebook widget: prompts render as prose, with a
 * persisted free-text answer box beneath (localStorage-backed via the
 * progress store, keyed by block id). */
export function Reflection({ block, title }: WidgetProps) {
  const id = block?.id ?? "reflection";
  const saved = useProgressStore((s) => s.notes[id] ?? "");
  const setNote = useProgressStore((s) => s.setNote);
  const [draft, setDraft] = React.useState(saved);
  const [savedFlash, setSavedFlash] = React.useState(false);

  return (
    <BlockShell
      id={block?.id}
      icon={<PenSquare size={14} />}
      label="Reflection"
      title={title ?? block?.title}
      accent="indigo"
    >
      <div
        className="[&_p:first-child]:mt-0"
        dangerouslySetInnerHTML={{ __html: block?.html ?? "" }}
      />
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Write your answer — saved locally to your browser..."
        rows={4}
        className="mt-3 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
      />
      <Button
        size="sm"
        variant="outline"
        className="mt-2"
        onClick={() => {
          setNote(id, draft);
          setSavedFlash(true);
          setTimeout(() => setSavedFlash(false), 1500);
        }}
      >
        <Save size={13} />
        {savedFlash ? "Saved" : "Save note"}
      </Button>
    </BlockShell>
  );
}
