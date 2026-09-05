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
      {/* Precision Geometric Hexagonal REEC Logo */}
      <div className="relative shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 drop-shadow-sm"
        >
          <defs>
            <linearGradient id="reec-hex-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="50%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
            <linearGradient id="reec-hex-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Hexagonal Base */}
          <polygon
            points="18,2 32,10 32,26 18,34 4,26 4,10"
            fill="url(#reec-hex-gradient)"
            stroke="url(#reec-hex-stroke)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Inner Hexagon Wireframe Accent */}
          <polygon
            points="18,5 29,11.5 29,24.5 18,31 7,24.5 7,11.5"
            stroke="#ffffff"
            strokeOpacity="0.18"
            strokeWidth="0.8"
            strokeLinejoin="round"
            fill="none"
          />

          {/* REEC Monogram "R" */}
          {/* Stem */}
          <path
            d="M13.5 10.5V25.5"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Upper Bowl */}
          <path
            d="M13.5 11H19C21.2 11 22.8 12.4 22.8 14.5C22.8 16.6 21.2 18 19 18H13.5"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Diagonal Leg */}
          <path
            d="M18.2 18L23 25.5"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
