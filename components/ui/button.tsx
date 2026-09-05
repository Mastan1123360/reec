import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-blue-600 dark:bg-blue-500 text-white shadow-xs hover:bg-blue-700 dark:hover:bg-blue-600 border border-blue-500/30",
        outline:
          "border border-slate-200/70 dark:border-white/[0.1] bg-white/70 dark:bg-white/[0.05] text-slate-800 dark:text-slate-200 backdrop-blur-md shadow-xs hover:border-blue-500/40 hover:bg-white dark:hover:bg-white/[0.09] hover:text-blue-600 dark:hover:text-blue-400",
        ghost:
          "hover:bg-slate-100/70 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100",
        link: "text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline",
        glass:
          "border border-slate-200/70 dark:border-white/[0.1] bg-white/80 dark:bg-white/[0.07] text-slate-800 dark:text-slate-200 backdrop-blur-xl shadow-xs hover:border-blue-500/50 hover:bg-white dark:hover:bg-white/[0.12]",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-7.5 rounded-lg px-2.5 text-[11px]",
        lg: "h-11 rounded-2xl px-6 text-sm",
        icon: "h-8 w-8 rounded-xl",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, style, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      style={{
        boxShadow:
          variant === "outline" || variant === "glass"
            ? "inset 0 1px 0 rgba(255, 255, 255, 0.45)"
            : undefined,
        ...style,
      }}
      {...props}
    />
  )
);
Button.displayName = "Button";
