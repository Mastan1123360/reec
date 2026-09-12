"use client";

import { useRustWorkspace } from "@/lib/rust/state";
import { Menu, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

/** "the lessons should move so they cannot be seen... then we can open
 * it from hamburger" — while the workspace panel is open and
 * lessonVisible is false (the default the instant it opens), this
 * covers everything except the panel itself, so the lesson text isn't
 * visible. The hamburger icon in the panel's own header toggles it. */
export function FocusBackdrop() {
  const isOpen = useRustWorkspace((s) => s.isPanelOpen);
  const lessonVisible = useRustWorkspace((s) => s.lessonVisible);
  const toggleLessonVisible = useRustWorkspace((s) => s.toggleLessonVisible);

  if (!isOpen || lessonVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 top-14 z-30 flex animate-in flex-col items-center justify-center gap-3 bg-background/98 backdrop-blur-sm duration-200 fade-in-0 sm:right-[52%] sm:min-w-0">
      <PenLine size={26} className="text-muted-foreground/50" />
      <p className="max-w-xs text-center text-sm text-muted-foreground">
        Lesson hidden — focus mode. Write your solution in the workspace
        on the right before peeking back.
      </p>
      <Button variant="outline" size="sm" onClick={toggleLessonVisible}>
        <Menu size={14} /> Show lesson
      </Button>
    </div>
  );
}
