"use client";
import { PackageSearch } from "lucide-react";
import { BlockShell } from "./BlockShell";
import type { WidgetProps } from "../registry";
import { ExpandableCard } from "@/components/experience/ExpandableCard";

/** :::production-note — Production Reading blocks, rendered as an
 * expandable insight card. */
export function ProductionNote({ block, title }: WidgetProps) {
  return (
    <BlockShell
      id={block?.id}
      icon={<PackageSearch size={14} />}
      label="Production Reading"
      title={title ?? block?.title}
      accent="sky"
    >
      <ExpandableCard html={block?.html ?? ""} />
    </BlockShell>
  );
}
