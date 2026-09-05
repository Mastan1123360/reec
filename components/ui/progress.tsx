import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60 dark:bg-white/[0.08] border border-slate-200/30 dark:border-white/[0.04]", className)}>
      <div
        className="h-full rounded-full bg-blue-600 dark:bg-blue-500 shadow-xs transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
