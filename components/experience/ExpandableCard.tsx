"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const COLLAPSED_HEIGHT = 96; // px

export function ExpandableCard({ html, timeline = false }: { html: string; timeline?: boolean }) {
  const [expanded, setExpanded] = React.useState(false);
  const [overflows, setOverflows] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = contentRef.current;
    if (el) setOverflows(el.scrollHeight > COLLAPSED_HEIGHT + 8);
  }, [html]);

  return (
    <div>
      <div
        ref={contentRef}
        style={!expanded && overflows ? { maxHeight: COLLAPSED_HEIGHT, overflow: "hidden" } : undefined}
        className={
          (timeline ? "reec-timeline " : "") +
          "relative [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {!expanded && overflows && (
        <div className="pointer-events-none -mt-10 h-10 bg-gradient-to-t from-white/90 dark:from-[#0c1322]/95 to-transparent" />
      )}
      {overflows && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
