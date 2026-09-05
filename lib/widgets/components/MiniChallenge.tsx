"use client";
import * as React from "react";
import { Swords, CheckCircle2, Code2 } from "lucide-react";
import { BlockShell } from "./BlockShell";
import type { WidgetProps } from "../registry";
import { Button } from "@/components/ui/button";
import { useProgressStore } from "@/lib/progress/store";
import { useRustWorkspace } from "@/lib/rust/state";
import { InteractiveChecklist } from "@/components/experience/InteractiveChecklist";
import { wrapRevealSections } from "@/lib/content/reveal-sections";

const STUB_CODE = `fn main() {\n    // Write your solution here\n}\n`;

/** :::mini-challenge — ChallengeWidget. Any authored "Hint:" / "Solution:"
 * / "Answer:" paragraph (the curriculum's own existing Failure Lab
 * convention) becomes a click-to-reveal section; any markdown checklist
 * becomes real, persisted checkboxes; plus a manual "mark complete" and
 * a real Code Workspace launcher — if the challenge itself contains a
 * code block (the common "here's broken code, fix it" shape), that's
 * the starting point; otherwise it opens a blank `fn main` stub. */
export function MiniChallenge({ block, title }: WidgetProps) {
  const id = block?.id ?? "challenge";
  const done = useProgressStore((s) => s.completedBlocks.has(id));
  const toggle = useProgressStore((s) => s.toggleBlock);
  const openPanel = useRustWorkspace((s) => s.openPanel);
  const label = title ?? block?.title ?? "Mini Challenge";
  const html = React.useMemo(() => wrapRevealSections(block?.html ?? ""), [block?.html]);

  return (
    <BlockShell
      id={block?.id}
      icon={<Swords size={14} />}
      label="Mini Challenge"
      title={title ?? block?.title}
      accent="orange"
    >
      <InteractiveChecklist html={html} blockId={id} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            openPanel(block?.codeSource?.trim() || STUB_CODE, label, {
              lessonId: block?.lessonId,
              challengeId: block?.challengeId,
              blockId: block?.blockId,
              triggerId: block?.triggerId,
              originalLessonSource: block?.codeSource?.trim() || STUB_CODE,
              generatedFromLesson: true,
              executable: true,
            })
          }
        >
          <Code2 size={13} />
          {block?.codeSource ? "Open in Code Workspace" : "Write my solution"}
        </Button>
        <Button
          variant={done ? "default" : "outline"}
          size="sm"
          onClick={() => toggle(id)}
        >
          <CheckCircle2 size={13} />
          {done ? "Completed" : "Mark as done"}
        </Button>
      </div>
    </BlockShell>
  );
}
