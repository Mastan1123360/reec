import { CONCEPT_CHAIN } from "@/lib/semantic/ontology";
import type { ConceptNode } from "@/lib/semantic/ontology";
import { GitBranch, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConceptMap({ concepts }: { concepts: ConceptNode[] }) {
  const activeIds = new Set(concepts.map((c) => c.id));
  if (activeIds.size === 0) return null;

  return (
    <section
      className="mb-10 rounded-[22px] border border-slate-200/60 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c1322]/75 p-5 sm:p-6 backdrop-blur-xl backdrop-saturate-150 shadow-xs"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 4px 20px -2px rgba(0, 0, 0, 0.03)",
      }}
    >
      <div className="mb-3.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <GitBranch size={14} className="text-blue-500" /> Concept Map
      </div>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2.5">
        {CONCEPT_CHAIN.map((node, i) => {
          const isActive = activeIds.has(node.id);
          return (
            <div key={node.id} className="flex items-center">
              <span
                className={cn(
                  "rounded-xl border px-3 py-1 text-xs font-medium transition-all backdrop-blur-md",
                  isActive
                    ? "border-blue-500/40 bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                    : "border-slate-200/60 dark:border-white/[0.06] bg-slate-100/60 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400"
                )}
                style={
                  isActive
                    ? {
                        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.4)",
                      }
                    : undefined
                }
              >
                {node.label}
              </span>
              {i < CONCEPT_CHAIN.length - 1 && (
                <ArrowRight
                  size={12}
                  className={cn("mx-1 shrink-0", isActive ? "text-blue-500/60" : "text-slate-300 dark:text-slate-600")}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3.5 text-xs text-slate-500 dark:text-slate-400">
        Highlighted nodes are what this lesson covers — the rest of the
        chain is where it came from and where it&rsquo;s heading.
      </p>
    </section>
  );
}
