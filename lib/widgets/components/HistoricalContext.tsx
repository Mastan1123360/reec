"use client";
import { Landmark } from "lucide-react";
import { BlockShell } from "./BlockShell";
import type { WidgetProps } from "../registry";
import { ExpandableCard } from "@/components/experience/ExpandableCard";

/** :::historical-context — rendered as an interactive timeline (a
 * vertical rail with a dot per paragraph) inside an expandable card. */
export function HistoricalContext({ block, title }: WidgetProps) {
  return (
    <BlockShell
      id={block?.id}
      icon={<Landmark size={14} />}
      label="Historical Context"
      title={title ?? block?.title}
      accent="stone"
    >
      <ExpandableCard html={block?.html ?? ""} timeline />
    </BlockShell>
  );
}
