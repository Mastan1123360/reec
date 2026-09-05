/**
 * components/content/RealtimeContentProvider.tsx
 *
 * Supabase Realtime Content Invalidation & Targeted UI Refresh Boundary.
 *
 * Architecture:
 *   Supabase DB (content_files changes)
 *        ↓
 *   Realtime Event (INSERT / UPDATE / DELETE with affected row payload)
 *        ↓
 *   Targeted Server Cache Invalidation (/api/content/revalidate with slug/lessonId)
 *        ↓
 *   Only the affected lesson is invalidated; unrelated lessons remain cached!
 *        ↓
 *   Targeted Next.js Router Refresh (router.refresh())
 *        ↓
 *   UI Updates Smoothly without full page reload.
 */

"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface RealtimeContentProviderProps {
  children: React.ReactNode;
}

export function RealtimeContentProvider({ children }: RealtimeContentProviderProps) {
  const router = useRouter();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const handleContentEvent = (payload: any) => {
      // Coalesce / Debounce rapid bursts of events into a targeted revalidation
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        const affectedSlug = payload?.new?.slug || payload?.old?.slug || null;
        const affectedLessonId = payload?.new?.lesson_id || payload?.old?.lesson_id || null;
        const eventType = payload?.eventType || "UPDATE";

        try {
          // 1. Invalidate targeted server cache
          await fetch("/api/content/revalidate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug: affectedSlug,
              lessonId: affectedLessonId,
              eventType,
            }),
          });
        } catch {
          // Fail silently on network error
        }

        // 2. Perform targeted client refresh of server components
        router.refresh();

        // 3. Dispatch window event for custom client listeners (e.g. live search / progress)
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("reec:content-updated", {
              detail: {
                eventType,
                slug: affectedSlug,
                lessonId: affectedLessonId,
                table: payload?.table || "content_files",
                timestamp: Date.now(),
              },
            })
          );
        }
      }, 250);
    };

    const channel = supabase
      .channel("reec-canonical-content-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "content_files",
        },
        handleContentEvent
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Connected to live content changes
        }
      });

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [router]);

  return <>{children}</>;
}
