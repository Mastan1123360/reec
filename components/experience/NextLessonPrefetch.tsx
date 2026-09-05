/**
 * components/experience/NextLessonPrefetch.tsx
 *
 * Non-blocking client-side background prefetcher for the next curriculum lesson.
 *
 * Guarantees:
 * 1. Runs strictly in the background after initial lesson render.
 * 2. Never blocks or delays rendering of the current lesson.
 * 3. Gracefully ignores network errors or offline states without UI disruption.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface NextLessonPrefetchProps {
  nextPath?: string | null;
}

export function NextLessonPrefetch({ nextPath }: NextLessonPrefetchProps) {
  const router = useRouter();

  useEffect(() => {
    if (!nextPath) return;

    // Use requestIdleCallback or small timeout to prefetch after current page is idle
    const timeoutId = setTimeout(() => {
      try {
        router.prefetch(nextPath);
      } catch {
        // Ignore prefetch failure
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [nextPath, router]);

  return null;
}
