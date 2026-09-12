"use client";
import { HelpCircle } from "lucide-react";
import { BlockShell } from "./BlockShell";
import type { WidgetProps } from "../registry";

/** Fallback for any ":::kind" not registered in the widget engine. Lesson
 * authoring should never be blocked by a missing widget implementation —
 * this renders the raw content plainly and flags the unknown kind. */
export function UnknownBlock({ block, title }: WidgetProps) {
  return (
    <BlockShell
      id={block?.id}
      icon={<HelpCircle size={14} />}
      label={`Unregistered block: ${block?.kind ?? "unknown"}`}
      title={title ?? block?.title}
      accent="zinc"
    >
      <div
        className="[&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
        dangerouslySetInnerHTML={{ __html: block?.html ?? "" }}
      />
    </BlockShell>
  );
}
