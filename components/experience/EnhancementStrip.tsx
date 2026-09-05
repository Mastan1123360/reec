"use client";

import * as React from "react";
import { widgetRegistry } from "@/lib/widgets/registry";

export function EnhancementStrip({ keys }: { keys: string[] }) {
  const [active, setActive] = React.useState<string | null>(null);
  const uniqueKeys = React.useMemo(() => Array.from(new Set(keys)), [keys]);

  return (
    <div className="mb-6 -mt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Visualizers:
        </span>
        {uniqueKeys.map((key, keyIdx) => {
          const def = widgetRegistry.get(key);
          if (!def) return null;
          const isActive = active === key;
          return (
            <button
              key={`${key}-${keyIdx}`}
              onClick={() => setActive(isActive ? null : key)}
              className={
                "rounded-xl border px-2.5 py-1 text-[11px] font-medium transition-all backdrop-blur-md " +
                (isActive
                  ? "border-blue-500/40 bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                  : "border-slate-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:border-blue-500/30 hover:text-slate-900 dark:hover:text-slate-200")
              }
              style={{
                boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.4)",
              }}
            >
              {def.label}
            </button>
          );
        })}
      </div>
      {active && (() => {
        const def = widgetRegistry.get(active);
        if (!def) return null;
        const Component = def.component;
        return <Component />;
      })()}
    </div>
  );
}
