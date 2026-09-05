"use client";
import { Code2, Play } from "lucide-react";
import { BlockShell } from "./BlockShell";
import type { WidgetProps } from "../registry";
import { useRustWorkspace } from "@/lib/rust/state";

/**
 * :::worked-example — renders as a CodeIDE-shaped surface: the authored
 * markdown (typically containing fenced code blocks, already syntax
 * highlighted server-side by Shiki via the markdown pipeline) plus a
 * "Run" affordance that opens the real REEC Rust Workspace (right-side
 * panel, backed by app/api/rust/[operation] — a genuine Rust compiler,
 * not a placeholder) pre-filled with this block's actual source,
 * extracted server-side by the parser (block.codeSource).
 */
export function WorkedExample({ block, title }: WidgetProps) {
  const openPanel = useRustWorkspace((s) => s.openPanel);
  const label = title ?? block?.title ?? "Worked Example";
  const hasRunnableCode = !!block?.codeSource?.trim();

  return (
    <BlockShell
      id={block?.id}
      icon={<Code2 size={14} />}
      label="Worked Example"
      title={title ?? block?.title}
      accent="blue"
      className="[&_.reec-prose]:!p-0"
    >
      <div className="relative">
        <div
          className="reec-code-surface overflow-x-auto p-4 text-sm [&_pre]:m-0 [&_pre]:bg-transparent"
          dangerouslySetInnerHTML={{ __html: block?.html ?? "" }}
        />
        <button
          type="button"
          disabled={!hasRunnableCode}
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          title={hasRunnableCode ? "Open in REEC Workspace" : "No runnable code block found in this example"}
          onClick={() =>
            hasRunnableCode &&
            openPanel(block!.codeSource!, label, {
              lessonId: block?.lessonId,
              challengeId: block?.challengeId,
              blockId: block?.blockId,
              triggerId: block?.triggerId,
              originalLessonSource: block!.codeSource!,
              generatedFromLesson: true,
              executable: true,
            })
          }
        >
          <Play size={12} /> Run
        </button>
      </div>
    </BlockShell>
  );
}
