"use client";
import { Library } from "lucide-react";
import { BlockShell } from "./BlockShell";
import type { WidgetProps } from "../registry";

export function ReadingBlock({ block, title }: WidgetProps) {
  return (
    <BlockShell
      id={block?.id}
      icon={<Library size={14} />}
      label="Production Reading"
      title={title ?? block?.title}
      accent="cyan"
    >
      <div
        className="[&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: block?.html ?? "" }}
      />
    </BlockShell>
  );
}
