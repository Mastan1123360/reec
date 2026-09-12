"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Global root error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex items-center justify-center p-6">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <AlertCircle size={44} className="text-rose-500 mb-4 shrink-0" />
          <h1 className="text-3xl font-extrabold tracking-tight">
            Application Error
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {error?.message || "A critical error occurred while loading the application."}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw size={14} /> Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.06] px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-all shadow-xs"
            >
              <Home size={14} /> Back to Dashboard
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
