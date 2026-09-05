"use client";

import * as React from "react";

export function PhilosophyQuoteWidget() {
  return (
    <div className="py-2 px-1 text-left select-none">
      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
        <span className="text-blue-600 dark:text-blue-400 font-bold mr-1">“</span>
        Discipline compounds. Code today. Freedom tomorrow.
        <span className="text-blue-600 dark:text-blue-400 font-bold ml-1">”</span>
      </div>
      <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
        — REEC Philosophy
      </div>
    </div>
  );
}
