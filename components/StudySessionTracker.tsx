"use client";

import * as React from "react";
import { useProgressStore } from "@/lib/progress/store";

export function StudySessionTracker() {
  const recordStudySeconds = useProgressStore((s) => s.recordStudySeconds);
  const isSessionActive = useProgressStore((s) => s.isSessionActive);

  React.useEffect(() => {
    let lastTick = Date.now();
    let accumulatedSeconds = 0;

    const interval = window.setInterval(() => {
      const now = Date.now();
      const deltaSec = Math.min(10, Math.floor((now - lastTick) / 1000));
      lastTick = now;

      // Only track if document is visible and user hasn't explicitly paused
      if (document.visibilityState === "visible" && isSessionActive && deltaSec > 0) {
        accumulatedSeconds += deltaSec;
        if (accumulatedSeconds >= 5) {
          recordStudySeconds(accumulatedSeconds);
          accumulatedSeconds = 0;
        }
      }
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        lastTick = Date.now();
      } else if (accumulatedSeconds > 0) {
        recordStudySeconds(accumulatedSeconds);
        accumulatedSeconds = 0;
      }
    };

    const handleBeforeUnload = () => {
      if (accumulatedSeconds > 0) {
        recordStudySeconds(accumulatedSeconds);
        accumulatedSeconds = 0;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (accumulatedSeconds > 0) {
        recordStudySeconds(accumulatedSeconds);
      }
    };
  }, [recordStudySeconds, isSessionActive]);

  return null;
}
