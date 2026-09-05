"use client";

import * as React from "react";
import { useProgressStore } from "@/lib/progress/store";

const CHECKBOX_RE = /<input\s+type="checkbox"([^>]*?)\/?>/g;

function makeInteractive(html: string): { html: string; count: number } {
  let count = 0;
  const out = html.replace(CHECKBOX_RE, (match, attrs: string) => {
    const idx = count++;
    const cleanedAttrs = attrs.replace(/\s*disabled(=""|="disabled")?/g, "");
    return `<input type="checkbox" data-checklist-idx="${idx}"${cleanedAttrs}/>`;
  });
  return { html: out, count };
}

export function InteractiveChecklist({ html, blockId }: { html: string; blockId: string }) {
  const checklist = useProgressStore((s) => s.checklist);
  const toggleChecklistItem = useProgressStore((s) => s.toggleChecklistItem);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const { html: interactiveHtml, count } = React.useMemo(() => makeInteractive(html), [html]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const boxes = container.querySelectorAll<HTMLInputElement>("input[data-checklist-idx]");
    boxes.forEach((box) => {
      const idx = box.getAttribute("data-checklist-idx");
      box.checked = !!checklist[`${blockId}-${idx}`];
    });
  });

  function handleChange(e: React.ChangeEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "checkbox") {
      const idx = target.getAttribute("data-checklist-idx");
      if (idx !== null) toggleChecklistItem(`${blockId}-${idx}`);
    }
  }

  const doneCount = Array.from({ length: count }).filter((_, i) => checklist[`${blockId}-${i}`]).length;

  return (
    <div>
      {count > 0 && (
        <div className="mb-2.5 font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {doneCount}/{count} steps completed
        </div>
      )}
      <div
        ref={containerRef}
        onChange={handleChange}
        className="[&_input[type=checkbox]]:mr-2.5 [&_input[type=checkbox]]:h-4 [&_input[type=checkbox]]:w-4 [&_input[type=checkbox]]:rounded [&_input[type=checkbox]]:cursor-pointer [&_input[type=checkbox]]:accent-blue-600 [&_li:has(input[type=checkbox])]:list-none [&_ul:has(li>input[type=checkbox])]:pl-0 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
        dangerouslySetInnerHTML={{ __html: interactiveHtml }}
      />
    </div>
  );
}
