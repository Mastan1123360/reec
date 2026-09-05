"use client";
import { NotebookPen } from "lucide-react";
import { BlockShell } from "./BlockShell";
import type { WidgetProps } from "../registry";
import { ExpandableCard } from "@/components/experience/ExpandableCard";

/** :::engineering-note — Decision Journal / Track H style prompts,
 * rendered as an expandable insight card. */
export function EngineeringNote({ block, title }: WidgetProps) {
  return (
    <BlockShell
      id={block?.id}
      icon={<NotebookPen size={14} />}
      label="Engineering Note"
      title={title ?? block?.title}
      accent="emerald"
    >
      <ExpandableCard html={block?.html ?? ""} />
    </BlockShell>
  );
}
