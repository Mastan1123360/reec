"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Code2,
  Terminal,
  Bookmark,
  Clock,
  ChevronRight,
  Zap,
  Activity,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useProgressStore, type ActivityItem } from "@/lib/progress/store";
import { useIsMounted } from "@/lib/hooks/useIsMounted";
import { cn } from "@/lib/utils";

function formatLiveRelativeTime(timestamp: number, currentNow: number): string {
  const diffMs = Math.max(0, currentNow - timestamp);
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);

  if (diffSecs < 45) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getActivityConfig(item: ActivityItem) {
  if (item.type === "lesson_completed" || item.iconType === "check") {
    return {
      icon: CheckCircle2,
      color: "text-slate-700 dark:text-slate-300",
      bg: "bg-slate-900/[0.04] dark:bg-white/[0.06] border-slate-900/[0.06] dark:border-white/[0.08]",
      badge: "Completed",
      badgeClass: "bg-slate-900/[0.04] text-slate-700 dark:text-slate-300 border-slate-900/[0.06] dark:border-white/[0.08]",
    };
  }
  if (item.type === "workspace_practice" || item.iconType === "code") {
    return {
      icon: Terminal,
      color: "text-slate-700 dark:text-slate-300",
      bg: "bg-slate-900/[0.04] dark:bg-white/[0.06] border-slate-900/[0.06] dark:border-white/[0.08]",
      badge: "Practice",
      badgeClass: "bg-slate-900/[0.04] text-slate-700 dark:text-slate-300 border-slate-900/[0.06] dark:border-white/[0.08]",
    };
  }
  if (item.type === "study_session" || item.iconType === "time") {
    return {
      icon: Clock,
      color: "text-slate-700 dark:text-slate-300",
      bg: "bg-slate-900/[0.04] dark:bg-white/[0.06] border-slate-900/[0.06] dark:border-white/[0.08]",
      badge: "Session",
      badgeClass: "bg-slate-900/[0.04] text-slate-700 dark:text-slate-300 border-slate-900/[0.06] dark:border-white/[0.08]",
    };
  }
  if (item.type === "bookmark_added" || item.type === "bookmark_removed") {
    return {
      icon: Bookmark,
      color: "text-slate-700 dark:text-slate-300",
      bg: "bg-slate-900/[0.04] dark:bg-white/[0.06] border-slate-900/[0.06] dark:border-white/[0.08]",
      badge: "Saved",
      badgeClass: "bg-slate-900/[0.04] text-slate-700 dark:text-slate-300 border-slate-900/[0.06] dark:border-white/[0.08]",
    };
  }
  if (item.type === "block_completed") {
    return {
      icon: Zap,
      color: "text-slate-700 dark:text-slate-300",
      bg: "bg-slate-900/[0.04] dark:bg-white/[0.06] border-slate-900/[0.06] dark:border-white/[0.08]",
      badge: "Solved",
      badgeClass: "bg-slate-900/[0.04] text-slate-700 dark:text-slate-300 border-slate-900/[0.06] dark:border-white/[0.08]",
    };
  }

  return {
    icon: Code2,
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-900/[0.04] dark:bg-white/[0.06] border-slate-900/[0.06] dark:border-white/[0.08]",
    badge: "Activity",
    badgeClass: "bg-slate-900/[0.04] text-slate-700 dark:text-slate-300 border-slate-900/[0.06] dark:border-white/[0.08]",
  };
}

export function RecentActivityCard() {
  const isMounted = useIsMounted();
  const activityLog = useProgressStore((s) => s.activityLog);
  const clearActivityLog = useProgressStore((s) => s.clearActivityLog);
  const [now, setNow] = React.useState<number>(Date.now());
  const [isResetting, setIsResetting] = React.useState(false);

  // Real-time ticking interval for live timestamps
  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000); // refresh every 10 seconds for real-time relative labels
    return () => clearInterval(timer);
  }, []);

  // Filter only genuine user-created activities
  const userActivities = React.useMemo(() => {
    if (!isMounted || !Array.isArray(activityLog)) return [];
    return activityLog.filter(
      (item) =>
        item &&
        item.id !== "act-welcome" &&
        !item.id.startsWith("init-") &&
        typeof item.timestamp === "number"
    );
  }, [isMounted, activityLog]);

  const displayList = userActivities.slice(0, 3);

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResetting(true);
    clearActivityLog();
    setTimeout(() => setIsResetting(false), 600);
  };

  return (
    <div
      className="rounded-2xl glass-surface p-3.5 xl:p-4 transition-all flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
            <span>Recent Activity</span>
          </h3>
          {/* Live Real-time Indicator Pill */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {userActivities.length > 0 && (
            <button
              onClick={handleReset}
              title="Reset activity log"
              className={cn(
                "flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors focus:outline-none",
                isResetting && "animate-spin text-rose-500"
              )}
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          )}

          <Link
            href="/progress"
            className="group flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
          >
            <span>View All</span>
            <ChevronRight
              size={12}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>

      {/* Real-time Activity Content */}
      {displayList.length === 0 ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-3.5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <Activity size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                No user activity recorded yet
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Complete lessons, run code in the workspace, or solve challenges to stream real-time events.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/phase/0"
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-xs"
            >
              Start Phase 00
            </Link>
            <Link
              href="/workspace"
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 transition-colors"
            >
              Open Workspace
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-1">
          {displayList.map((item) => {
            const config = getActivityConfig(item);
            const Icon = config.icon;
            const targetHref = item.path || "/phase/0";
            const relativeTime = formatLiveRelativeTime(item.timestamp, now);

            return (
              <Link
                key={item.id}
                href={targetHref}
                className="group relative flex items-start gap-2.5 p-2.5 rounded-xl glass-elevated transition-all duration-300 hover:-translate-y-0.5"
              >
                {/* Left Action Icon - Flat */}
                <Icon size={16} className={cn(config.color, "shrink-0 mt-0.5 group-hover:scale-105 transition-transform")} strokeWidth={2} />

                {/* Middle Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={cn(
                        "text-[9px] font-semibold px-1.5 py-0.2 rounded-full border truncate",
                        config.badgeClass
                      )}
                    >
                      {config.badge}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                      {relativeTime}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors">
                    {item.title}
                  </div>

                  {item.subtitle && (
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.subtitle}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
