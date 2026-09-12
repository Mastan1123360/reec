"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  fallbackHref?: string;
  className?: string;
  label?: string;
}

export function BackButton({
  fallbackHref = "/",
  className,
  label = "Go back",
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-xl border border-slate-900/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-blue-500/40 dark:hover:border-blue-400/30 hover:bg-white/90 dark:hover:bg-white/[0.09] transition-all backdrop-blur-md shadow-xs active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
        className
      )}
      style={{
        boxShadow: "var(--glass-inner-highlight, inset 0 1px 0 rgba(255, 255, 255, 0.45))",
      }}
    >
      <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
    </button>
  );
}
