"use client";
import { BookOpen } from "lucide-react";
import { BlockShell } from "./BlockShell";
import type { WidgetProps } from "../registry";

/** :::story  — the concrete, motivating scenario opening a lesson/section. */
export function StoryCard({ block, title }: WidgetProps) {
  return (
    <BlockShell
      id={block?.id}
      icon={<BookOpen size={14} />}
      label="Opening Story"
      title={title ?? block?.title}
      accent="amber"
    >
      <div
        className="italic text-foreground/90 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0"
        dangerouslySetInnerHTML={{ __html: block?.html ?? "" }}
      />
    </BlockShell>
  );
}
