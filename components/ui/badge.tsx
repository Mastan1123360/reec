import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-medium transition-colors backdrop-blur-md",
  {
    variants: {
      variant: {
        default:
          "border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold shadow-xs",
        secondary:
          "border-slate-200/60 dark:border-white/[0.08] bg-slate-100/70 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300",
        outline:
          "border-slate-200/70 dark:border-white/[0.1] bg-white/50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400",
        accent:
          "border-blue-500/40 bg-blue-500/15 text-blue-600 dark:text-blue-300 font-semibold",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, style, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={{
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.35)",
        ...style,
      }}
      {...props}
    />
  );
}
