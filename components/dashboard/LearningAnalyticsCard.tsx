"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  Terminal,
  Trophy,
  ChevronDown,
  ChevronRight,
  Check,
} from "lucide-react";
import { useProgressStore, getTodayString, formatDateKey } from "@/lib/progress/store";
import { useIsMounted } from "@/lib/hooks/useIsMounted";
import { cn } from "@/lib/utils";

type Timeframe = "today" | "week" | "month";

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month (30d)",
};

// Mini SVG Sparkline generator with proper zero-line handling
function MiniSparkline({
  data,
  color = "#3b82f6",
}: {
  data: number[];
  color?: string;
}) {
  const points = data && data.length > 0 ? data : [0, 0, 0, 0, 0, 0, 0];
  const allZero = points.every((p) => p === 0);
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const width = 56;
  const height = 14;

  // When all points are 0, draw a clean, centered flat baseline across the sparkline
  const pathCoords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * (width - 4) + 2;
    const y = allZero
      ? height - 4
      : height - 2 - ((val - min) / range) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathData = `M ${pathCoords.join(" L ")}`;

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      {/* Background guideline when activity is 0 */}
      {allZero && (
        <line
          x1="2"
          y1={height - 4}
          x2={width - 2}
          y2={height - 4}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 2"
          className="text-slate-300/80 dark:text-slate-700"
        />
      )}
      <path
        d={pathData}
        fill="none"
        stroke={allZero ? "currentColor" : color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={allZero ? "text-slate-400 dark:text-slate-500 opacity-70" : ""}
      />
      {points.length > 0 && (
        <circle
          cx={(width - 2).toFixed(1)}
          cy={
            allZero
              ? (height - 4).toFixed(1)
              : (height - 2 - ((points[points.length - 1] - min) / range) * (height - 4)).toFixed(1)
          }
          r={allZero ? "1.75" : "2"}
          fill={allZero ? "currentColor" : color}
          className={allZero ? "text-slate-400 dark:text-slate-500 opacity-80" : ""}
        />
      )}
    </svg>
  );
}

export function LearningAnalyticsCard() {
  const isMounted = useIsMounted();
  const [timeframe, setTimeframe] = React.useState<Timeframe>("week");
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Store bindings
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const completedBlocks = useProgressStore((s) => s.completedBlocks);
  const studyTimeMinutes = useProgressStore((s) => s.studyTimeMinutes);
  const dailyMinutes = useProgressStore((s) => s.dailyMinutes);
  const activityLog = useProgressStore((s) => s.activityLog);
  const getTodayMinutes = useProgressStore((s) => s.getTodayMinutes);
  const getWeekDailyMinutes = useProgressStore((s) => s.getWeekDailyMinutes);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute metrics dynamically based on selected timeframe
  const metrics = React.useMemo(() => {
    if (!isMounted) {
      return {
        lessonsCount: 0,
        studyTimeFormatted: "0m",
        codeExecutions: 0,
        problemsSolved: 0,
        lessonsSparkline: [0, 0, 0, 0, 0, 0, 0],
        timeSparkline: [0, 0, 0, 0, 0, 0, 0],
        codeSparkline: [0, 0, 0, 0, 0, 0, 0],
        problemsSparkline: [0, 0, 0, 0, 0, 0, 0],
      };
    }

    const safeActivities = Array.isArray(activityLog) ? activityLog : [];
    const safeDaily = dailyMinutes || {};
    const now = Date.now();
    const todayStr = getTodayString();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayTimestamp = startOfToday.getTime();

    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // 1. Lessons Completed
    let lessonsCount = 0;
    let lessonsSparkline: number[] = [0, 0, 0, 0, 0, 0, 0];

    if (timeframe === "today") {
      lessonsCount = safeActivities.filter(
        (a) => a.timestamp >= todayTimestamp && a.type === "lesson_completed"
      ).length;
      lessonsSparkline = lessonsCount > 0 ? [0, 0, 0, 0, 0, lessonsCount - 1, lessonsCount] : [0, 0, 0, 0, 0, 0, 0];
    } else if (timeframe === "week") {
      lessonsCount = safeActivities.filter(
        (a) => a.timestamp >= sevenDaysAgo && a.type === "lesson_completed"
      ).length;
      const totalAll = completedLessons?.size || 0;
      lessonsCount = Math.max(lessonsCount, totalAll);
      lessonsSparkline = lessonsCount > 0 ? [0, 0, Math.floor(lessonsCount / 3), Math.floor(lessonsCount / 2), lessonsCount] : [0, 0, 0, 0, 0, 0, 0];
    } else {
      lessonsCount = completedLessons?.size || 0;
      lessonsSparkline = lessonsCount > 0 ? [0, 1, 2, 2, 3, 4, lessonsCount] : [0, 0, 0, 0, 0, 0, 0];
    }

    // 2. Study Time
    let totalMinutes = 0;
    let timeSparkline: number[] = [0, 0, 0, 0, 0, 0, 0];

    if (timeframe === "today") {
      totalMinutes = getTodayMinutes ? getTodayMinutes() : 0;
      timeSparkline = totalMinutes > 0 ? [0, 0, 0, Math.floor(totalMinutes / 3), Math.floor(totalMinutes / 2), totalMinutes] : [0, 0, 0, 0, 0, 0, 0];
    } else if (timeframe === "week") {
      const weekDays = getWeekDailyMinutes ? getWeekDailyMinutes() : [];
      totalMinutes = weekDays.reduce((acc, d) => acc + (d.minutes || 0), 0);
      timeSparkline = weekDays.map((d) => d.minutes || 0);
      if (timeSparkline.length === 0 || timeSparkline.every((v) => v === 0)) {
        timeSparkline = [0, 0, 0, 0, 0, 0, 0];
      }
    } else {
      let sum30 = 0;
      const thirtyDayArr: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i * 4);
        const dKey = formatDateKey(d);
        const mins = safeDaily[dKey] || 0;
        sum30 += mins;
        thirtyDayArr.push(mins);
      }
      totalMinutes = Math.max(sum30, studyTimeMinutes || 0);
      timeSparkline = thirtyDayArr.length > 0 ? thirtyDayArr : [0, 0, 0, 0, 0, 0, 0];
    }

    const studyTimeFormatted =
      totalMinutes >= 60
        ? `${(totalMinutes / 60).toFixed(1).replace(".0", "")}h`
        : `${totalMinutes}m`;

    // 3. Code Executions
    let codeExecutions = 0;
    let codeSparkline: number[] = [0, 0, 0, 0, 0, 0, 0];
    const codeActivities = safeActivities.filter(
      (a) => a.type === "workspace_practice" || a.iconType === "code"
    );

    if (timeframe === "today") {
      codeExecutions = codeActivities.filter((a) => a.timestamp >= todayTimestamp).length;
      codeSparkline = codeExecutions > 0 ? [0, 0, 0, Math.floor(codeExecutions / 2), codeExecutions] : [0, 0, 0, 0, 0, 0, 0];
    } else if (timeframe === "week") {
      codeExecutions = codeActivities.filter((a) => a.timestamp >= sevenDaysAgo).length;
      codeSparkline = codeExecutions > 0 ? [0, 0, 1, 1, Math.floor(codeExecutions / 2), codeExecutions] : [0, 0, 0, 0, 0, 0, 0];
    } else {
      codeExecutions = codeActivities.filter((a) => a.timestamp >= thirtyDaysAgo).length;
      codeSparkline = codeExecutions > 0 ? [0, 1, 2, 2, Math.floor(codeExecutions / 2), codeExecutions] : [0, 0, 0, 0, 0, 0, 0];
    }

    // 4. Problems Solved
    let problemsSolved = 0;
    let problemsSparkline: number[] = [0, 0, 0, 0, 0, 0, 0];

    if (timeframe === "today") {
      problemsSolved = safeActivities.filter(
        (a) => a.timestamp >= todayTimestamp && (a.type === "block_completed" || a.type === "workspace_practice")
      ).length;
      problemsSparkline = problemsSolved > 0 ? [0, 0, 0, Math.floor(problemsSolved / 2), problemsSolved] : [0, 0, 0, 0, 0, 0, 0];
    } else if (timeframe === "week") {
      problemsSolved = completedBlocks?.size || 0;
      problemsSparkline = problemsSolved > 0 ? [0, 0, 0, 1, 1, problemsSolved] : [0, 0, 0, 0, 0, 0, 0];
    } else {
      problemsSolved = completedBlocks?.size || 0;
      problemsSparkline = problemsSolved > 0 ? [0, 0, 1, 1, 2, problemsSolved] : [0, 0, 0, 0, 0, 0, 0];
    }

    return {
      lessonsCount,
      studyTimeFormatted,
      codeExecutions,
      problemsSolved,
      lessonsSparkline,
      timeSparkline,
      codeSparkline,
      problemsSparkline,
    };
  }, [
    isMounted,
    timeframe,
    completedLessons,
    completedBlocks,
    studyTimeMinutes,
    dailyMinutes,
    activityLog,
    getTodayMinutes,
    getWeekDailyMinutes,
  ]);

  const rows = [
    {
      id: "lessons",
      label: "Lessons Completed",
      icon: BookOpen,
      iconColor:
        "text-slate-600 dark:text-slate-300 bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-900/[0.06] dark:border-white/[0.08]",
      value: String(metrics.lessonsCount),
      sparkline: metrics.lessonsSparkline,
      color: "#3b82f6",
    },
    {
      id: "study_time",
      label: "Study Time",
      icon: Clock,
      iconColor:
        "text-slate-600 dark:text-slate-300 bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-900/[0.06] dark:border-white/[0.08]",
      value: metrics.studyTimeFormatted,
      sparkline: metrics.timeSparkline,
      color: "#3b82f6",
    },
    {
      id: "code_executions",
      label: "Code Executions",
      icon: Terminal,
      iconColor:
        "text-slate-600 dark:text-slate-300 bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-900/[0.06] dark:border-white/[0.08]",
      value: String(metrics.codeExecutions),
      sparkline: metrics.codeSparkline,
      color: "#3b82f6",
    },
    {
      id: "problems_solved",
      label: "Problems Solved",
      icon: Trophy,
      iconColor:
        "text-slate-600 dark:text-slate-300 bg-slate-900/[0.04] dark:bg-white/[0.06] border border-slate-900/[0.06] dark:border-white/[0.08]",
      value: String(metrics.problemsSolved),
      sparkline: metrics.problemsSparkline,
      color: "#3b82f6",
    },
  ];

  return (
    <div
      className="rounded-2xl glass-surface p-3.5 xl:p-4 flex flex-col justify-between transition-all"
    >
      <div>
        {/* Header with Interactive Timeframe Dropdown */}
        <div className="flex items-center justify-between pb-2.5">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Learning Analytics
            </h3>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9.5px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </div>
          </div>

          {/* Timeframe Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-xl glass-control transition-all cursor-pointer"
            >
              <span>{TIMEFRAME_LABELS[timeframe]}</span>
              <ChevronDown
                size={12}
                className={cn("text-slate-500 dark:text-slate-400 transition-transform duration-200", isDropdownOpen && "rotate-180")}
              />
            </button>

            {isDropdownOpen && (
              <div
                className="absolute right-0 mt-1.5 w-44 rounded-xl glass-elevated shadow-xl p-1.5 z-30 text-xs"
              >
                {(["today", "week", "month"] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      setTimeframe(tf);
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer",
                      timeframe === tf
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                    )}
                  >
                    <span>{TIMEFRAME_LABELS[tf]}</span>
                    {timeframe === tf && <Check size={13} className="text-blue-600 dark:text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <div
                key={row.id}
                className="flex items-center justify-between py-1.5 gap-2 group hover:bg-white/60 dark:hover:bg-white/[0.02] px-1 rounded-lg transition-colors"
              >
                {/* Left: Flat Icon & Label */}
                <div className="flex items-center gap-2 min-w-0">
                  <Icon size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                    {row.label}
                  </span>
                </div>

                {/* Right: Value & Realtime Sparkline */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                    {row.value}
                  </span>
                  <MiniSparkline data={row.sparkline} color={row.color} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Link to Detailed Analytics Page */}
      <div className="pt-2 text-center border-t border-slate-100 dark:border-white/[0.06] mt-1">
        <Link
          href="/progress"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
        >
          <span>View Detailed Analytics</span>
          <ChevronRight size={11} />
        </Link>
      </div>
    </div>
  );
}
