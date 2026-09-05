"use client";

/**
 * components/LessonRenderer.tsx
 *
 * Takes a parsed Lesson and renders it: each section's nodes are walked in
 * document order, prose nodes render as sanitized HTML, and block nodes are
 * dispatched to whatever component is registered under that block's kind
 * in the widget registry (falling back to UnknownBlock). This is the only
 * place in the app that turns a Lesson into pixels — everything upstream
 * (parser, discovery) is pure data.
 */

import * as React from "react";
import "@/lib/widgets"; // side-effect: registers all built-in + future widgets
import { widgetRegistry } from "@/lib/widgets/registry";
import { UnknownBlock } from "@/lib/widgets/components/UnknownBlock";
import { SmartCode } from "@/components/experience/SmartCode";
import { EnhancementStrip } from "@/components/experience/EnhancementStrip";
import type { Lesson } from "@/lib/content/types";
import type { ExperiencePlan } from "@/lib/semantic/interpreter";
import { cn } from "@/lib/utils";

export function LessonRenderer({ lesson, plan }: { lesson: Lesson; plan?: ExperiencePlan }) {
  const enhancementsByBlock = new Map(
    (plan?.blockEnhancements ?? []).map((e) => [e.blockId, e.enhancements])
  );

  return (
    <div className="reec-lesson">
      {lesson.sections.map((section, sIdx) => {
        const sectionKey = section.id || `section-${sIdx}`;
        return (
          <section key={sectionKey} id={section.id || `section-${sIdx}`} className="scroll-mt-24">
            {section.id !== "overview" && (
              <HeadingTag depth={section.depth}>{section.heading}</HeadingTag>
            )}
            {section.nodes.map((node, i) =>
              node.type === "prose" ? (
                <div
                  key={`prose-${sectionKey}-${i}`}
                  className="reec-prose max-w-none text-[0.975rem] leading-7 text-foreground/90"
                  dangerouslySetInnerHTML={{ __html: node.html }}
                />
              ) : node.type === "code" ? (
                <SmartCode key={node.code.id ? `code-${node.code.id}-${i}` : `code-${sectionKey}-${i}`} code={node.code} />
              ) : (
                <React.Fragment key={node.block.id ? `block-${node.block.id}-${i}` : `block-${sectionKey}-${i}`}>
                  <WidgetDispatch kind={node.block.kind} block={node.block} />
                  {enhancementsByBlock.has(node.block.id) && (
                    <EnhancementStrip keys={enhancementsByBlock.get(node.block.id)!} />
                  )}
                </React.Fragment>
              )
            )}
          </section>
        );
      })}
    </div>
  );
}

function WidgetDispatch({ kind, block }: { kind: string; block: Lesson["blocks"][number] }) {
  const def = widgetRegistry.get(kind);
  const Component = def?.component ?? UnknownBlock;
  return <Component block={block} />;
}

function HeadingTag({ depth, children }: { depth: number; children: React.ReactNode }) {
  const size =
    depth <= 1
      ? "text-2xl mt-10"
      : depth === 2
      ? "text-xl mt-9"
      : depth === 3
      ? "text-lg mt-7"
      : "text-base mt-6";
  const Tag = (`h${Math.min(6, Math.max(2, depth))}` as unknown) as keyof JSX.IntrinsicElements;
  return (
    <Tag className={cn("mb-3 font-semibold tracking-tight text-foreground", size)}>
      {children}
    </Tag>
  );
}
