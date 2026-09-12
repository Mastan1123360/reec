"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ReecLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function ReecLogo({
  className,
  size = "md",
  showText = true,
}: ReecLogoProps) {
  const pixelSize = size === "sm" ? 30 : size === "lg" ? 40 : 34;

  return (
    <div className={cn("flex items-center gap-2.5 select-none group", className)}>
      {/* REEC Glowing Rust Cogwheel Medallion Logo */}
      <div className="relative shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
        <img
          src="/logo.png"
          alt="REEC Logo"
          width={pixelSize}
          height={pixelSize}
          className="rounded-full shrink-0 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] object-cover"
          style={{ width: pixelSize, height: pixelSize }}
          referrerPolicy="no-referrer"
        />
      </div>

      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <span className="font-black text-base tracking-wider text-slate-900 dark:text-white font-sans">
            REEC
          </span>
          <span className="hidden dark:block text-[9.5px] font-medium text-slate-400 tracking-tight mt-0.5">
            Understand. Build. Own.
          </span>
        </div>
      )}
    </div>
  );
}
