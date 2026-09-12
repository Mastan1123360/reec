"use client";
import { Brain } from "lucide-react";
import { BlockShell } from "./BlockShell";
import type { WidgetProps } from "../registry";

/** :::mental-model — a foundational framing statement, rendered emphasized. */
export function MentalModelCard({ block, title }: WidgetProps) {
  return (
    <BlockShell
      id={block?.id}
      icon={<Brain size={14} />}
      label="Mental Model"
      title={title ?? block?.title}
      accent="violet"
    >
      <div
        className="[&>blockquote]:m-0 [&>blockquote]:border-l-2 [&>blockquote]:border-violet-500/50 [&>blockquote]:pl-4 [&>blockquote]:font-medium [&>blockquote]:text-foreground [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
        dangerouslySetInnerHTML={{ __html: block?.html ?? "" }}
      />
    </BlockShell>
  );
}
