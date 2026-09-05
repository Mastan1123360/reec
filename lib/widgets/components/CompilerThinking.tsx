"use client";
import * as React from "react";
import { Cpu, Eye, EyeOff } from "lucide-react";
import { BlockShell } from "./BlockShell";
import type { WidgetProps } from "../registry";
import { Button } from "@/components/ui/button";

/**
 * :::compiler-thinking — PredictionWidget. Hides the answer behind a
 * "reveal" interaction so the learner commits to a prediction (per the
 * curriculum's own Track A pedagogy) before seeing rustc's actual verdict.
 * The full block markdown is authored as: Prediction / Types / Memory /
 * Ownership / Borrows / Answer — we don't try to parse that structure;
 * we just gate the whole rendered block behind the reveal for now, which
 * is the minimum viable version of the pedagogy. A future iteration can
 * split "Prediction:" from "Answer:" lines automatically.
 */
export function CompilerThinking({ block, title }: WidgetProps) {
  const [revealed, setRevealed] = React.useState(false);
  return (
    <BlockShell
      id={block?.id}
      icon={<Cpu size={14} />}
      label="Compiler Thinking"
      title={title ?? block?.title}
      accent="rose"
    >
      <div
        className={
          revealed
            ? "[&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
            : "relative max-h-24 overflow-hidden [&_p:first-child]:mt-0"
        }
        dangerouslySetInnerHTML={{ __html: block?.html ?? "" }}
      />
      {!revealed && (
        <div className="pointer-events-none -mt-16 h-16 bg-gradient-to-t from-card to-transparent" />
      )}
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => setRevealed((r) => !r)}
      >
        {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
        {revealed ? "Hide answer" : "Predict, then reveal"}
      </Button>
    </BlockShell>
  );
}
