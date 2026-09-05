"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home, Loader2 } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isRedirect =
    error?.message === "NEXT_REDIRECT" ||
    error?.digest?.startsWith("NEXT_REDIRECT") ||
    error?.message?.includes("NEXT_REDIRECT");

  const isNotFound =
    error?.message === "NEXT_NOT_FOUND" ||
    error?.digest === "NEXT_NOT_FOUND" ||
    error?.message?.includes("NEXT_NOT_FOUND");

  React.useEffect(() => {
    if (isRedirect) {
      // If Next.js redirect thrown inside boundary, complete the navigation
      const digestParts = error?.digest?.split(";") || [];
      const targetUrl = digestParts[2] || "/";
      if (typeof window !== "undefined" && targetUrl) {
        window.location.replace(targetUrl);
      }
      return;
    }

    // Log unexpected non-404, non-redirect errors
    if (!isNotFound) {
      console.error("Application error boundary caught:", error);
    }
  }, [error, isRedirect, isNotFound]);

  if (isRedirect) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-28 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Redirecting to destination...
        </p>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-28 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200/60 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.04] text-blue-500 shadow-xs backdrop-blur-xl mb-4"
          style={{ boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.45)" }}
        >
          <AlertCircle size={32} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Module Not Found
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          This lesson or phase does not exist or hasn&apos;t been published yet.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/70 dark:border-white/[0.1] bg-white/80 dark:bg-white/[0.06] px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-xs backdrop-blur-md"
          >
            <Home size={14} /> Back to Dashboard
          </Link>
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-all shadow-xs"
          >
            View Roadmap
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-28 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-500 shadow-xs backdrop-blur-xl mb-4"
        style={{ boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.45)" }}
      >
        <AlertCircle size={32} />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        {error?.message || "An unexpected error occurred while loading this page."}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-all shadow-xs"
        >
          <RefreshCw size={14} /> Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/70 dark:border-white/[0.1] bg-white/80 dark:bg-white/[0.06] px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-xs backdrop-blur-md"
        >
          <Home size={14} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
