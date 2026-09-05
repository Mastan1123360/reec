"use client";
import { Hammer } from "lucide-react";
import { BlockShell } from "./BlockShell";
import type { WidgetProps } from "../registry";
import { Badge } from "@/components/ui/badge";
import { InteractiveChecklist } from "@/components/experience/InteractiveChecklist";

const STAR = "★";
const EMPTY_STAR = "☆";

export function ProjectBlock({ block, title, props }: WidgetProps) {
  const difficulty = (props?.difficulty as number) ?? undefined;
  const major = Boolean(props?.major);
  return (
    <BlockShell
      id={block?.id}
      icon={<Hammer size={14} />}
      label="Project"
      title={title ?? block?.title}
      accent="teal"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {major && <Badge variant="accent">Major</Badge>}
        {difficulty && (
          <Badge variant="outline">
            {STAR.repeat(difficulty)}
            {EMPTY_STAR.repeat(Math.max(0, 5 - difficulty))}
          </Badge>
        )}
      </div>
      <InteractiveChecklist html={block?.html ?? ""} blockId={block?.id ?? "project"} />
    </BlockShell>
  );
}
