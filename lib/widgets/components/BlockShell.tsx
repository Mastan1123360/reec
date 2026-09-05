/**
 * BlockShell — shared Apple Glass chrome every REEC block widget renders inside.
 * Keeps individual widgets focused on their semantic differences while sharing
 * depth, translucency, borders, and typography.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export function BlockShell({
  id,
  icon,
  label,
  title,
  accent,
  children,
  className,
}: {
  id?: string;
  icon: React.ReactNode;
  label: string;
  title?: string;
  accent: string; // tailwind color token, e.g. "sky", "blue", "purple", "emerald"
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "group my-6 scroll-mt-24 overflow-hidden rounded-[22px] border border-slate-200/60 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c1322]/75 backdrop-blur-xl backdrop-saturate-150 shadow-xs transition-all duration-200",
        className
      )}
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 4px 20px -2px rgba(0, 0, 0, 0.03)",
      }}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b border-slate-200/60 dark:border-white/[0.06] px-4 py-2.5 text-xs font-bold uppercase tracking-wider backdrop-blur-md",
          `text-${accent}-600 dark:text-${accent}-400 bg-${accent}-500/[0.08]`
        )}
      >
        <span className="shrink-0">{icon}</span>
        <span>{label}</span>
        {title && (
          <>
            <span className="opacity-40">·</span>
            <span className="truncate normal-case tracking-normal font-semibold text-slate-800 dark:text-slate-200">
              {title}
            </span>
          </>
        )}
      </div>
      <div className="reec-prose px-5 py-4 text-[0.925rem] leading-relaxed text-slate-800 dark:text-slate-200">
        {children}
      </div>
    </section>
  );
}
