"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Terminal,
  Bookmark,
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { useProgressStore } from "@/lib/progress/store";
import { cn } from "@/lib/utils";

export function ActivityFeed() {
  const activityLog = useProgressStore((s) => s.activityLog);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const items = mounted && Array.isArray(activityLog) ? activityLog.slice(0, 6) : [];

  function formatTimeAgo(ts: number) {
    const diff = Math.max(0, Date.now() - ts);
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-card/70 dark:bg-[#0d1424]/75 p-6 backdrop-blur-2xl shadow-lg">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Clock size={18} className="text-primary shrink-0" />
          <h3 className="text-base font-bold tracking-tight text-foreground">
            Recent Activity
          </h3>
        </div>
        <Link
          href="/bookmarks"
          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
        >
          <span>Saved Lessons</span>
          <ArrowRight size={12} />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground space-y-2">
          <p>No learning activity logged yet.</p>
          <p className="text-[11px] text-muted-foreground/70">
            Open a lesson or complete a practice challenge to begin recording your history.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((act) => {
            let Icon = CheckCircle2;
            let colorClass = "text-emerald-500";

            if (act.iconType === "code") {
              Icon = Terminal;
              colorClass = "text-violet-500";
            } else if (act.iconType === "bookmark") {
              Icon = Bookmark;
              colorClass = "text-amber-500";
            } else if (act.iconType === "time") {
              Icon = Clock;
              colorClass = "text-blue-500";
            }

            const content = (
              <div className="flex items-start gap-3 p-2 rounded-2xl transition-colors hover:bg-muted/40 group">
                <Icon size={16} className={cn("shrink-0 transition-transform group-hover:scale-110 mt-0.5", colorClass)} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {act.title}
                  </p>
                  {act.subtitle && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {act.subtitle}
                    </p>
                  )}
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0 pt-0.5">
                  {formatTimeAgo(act.timestamp)}
                </span>
              </div>
            );

            if (act.path) {
              return (
                <Link key={act.id} href={act.path}>
                  {content}
                </Link>
              );
            }

            return <div key={act.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
