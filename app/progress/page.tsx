"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  Terminal,
  Flame,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowLeft,
  Download,
  Plus,
  Play,
  Pause,
  BarChart3,
  Bookmark,
  Activity,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { useProgressStore, formatDateKey } from "@/lib/progress/store";
import { useIsMounted } from "@/lib/hooks/useIsMounted";
import { StudySessionModal } from "@/components/dashboard/StudySessionModal";
import { cn } from "@/lib/utils";

type TimeframeFilter = "today" | "week" | "month" | "all";

const TIMEFRAME_LABELS: Record<TimeframeFilter, string> = {
  today: "Today",
  week: "Last 7 Days",
  month: "Last 30 Days",
  all: "All Time",
};

const PHASES_INFO = [
  { phase: 0, title: "Phase 00: Computer Systems & Architecture", lessonsTotal: 14, href: "/phase/0" },
  { phase: 1, title: "Phase 01: Rust Foundations & Memory Safety", lessonsTotal: 28, href: "/phase/1" },
  { phase: 2, title: "Phase 02: Advanced Systems & Concurrency", lessonsTotal: 20, href: "/phase/2" },
  { phase: 3, title: "Phase 03: OS Engineering & Kernel Basics", lessonsTotal: 18, href: "/phase/3" },
  { phase: 4, title: "Phase 04: High-Performance Networking", lessonsTotal: 16, href: "/phase/4" },
  { phase: 5, title: "Phase 05: Distributed Systems & Consensus", lessonsTotal: 16, href: "/phase/5" },
  { phase: 6, title: "Phase 06: Database Internals & Storage", lessonsTotal: 14, href: "/phase/6" },
  { phase: 7, title: "Phase 07: Cloud-Native & WebAssembly", lessonsTotal: 14, href: "/phase/7" },
  { phase: 8, title: "Phase 08: Production Engineering & Capstone", lessonsTotal: 12, href: "/phase/8" },
];

function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DetailedAnalyticsPage() {
  const isMounted = useIsMounted();
  const [timeframe, setTimeframe] = React.useState<TimeframeFilter>("month");
  const [activityFilter, setActivityFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isStudyModalOpen, setIsStudyModalOpen] = React.useState(false);
  const [selectedHeatmapDay, setSelectedHeatmapDay] = React.useState<string | null>(null);

  // Store bindings
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const completedBlocks = useProgressStore((s) => s.completedBlocks);
  const bookmarks = useProgressStore((s) => s.bookmarks);
  const notes = useProgressStore((s) => s.notes);
  const studyTimeMinutes = useProgressStore((s) => s.studyTimeMinutes);
  const dailyMinutes = useProgressStore((s) => s.dailyMinutes);
  const activeDates = useProgressStore((s) => s.activeDates);
  const activityLog = useProgressStore((s) => s.activityLog);
  const isSessionActive = useProgressStore((s) => s.isSessionActive);
  const setSessionActive = useProgressStore((s) => s.setSessionActive);
  const currentSessionSeconds = useProgressStore((s) => s.currentSessionSeconds);
  const getStreak = useProgressStore((s) => s.getStreak);
  const getTodayMinutes = useProgressStore((s) => s.getTodayMinutes);
  const getWeekDailyMinutes = useProgressStore((s) => s.getWeekDailyMinutes);

  const safeActivities = React.useMemo(() => (isMounted && Array.isArray(activityLog) ? activityLog : []), [isMounted, activityLog]);
  const safeDaily = React.useMemo(() => (isMounted && dailyMinutes ? dailyMinutes : {}), [isMounted, dailyMinutes]);
  const safeActiveDates = React.useMemo(() => (isMounted && Array.isArray(activeDates) ? activeDates : []), [isMounted, activeDates]);
  const streakInfo = isMounted && getStreak ? getStreak() : { current: 0, best: 0, daysStatus: [], todayActive: false };

  // Calculate filtered analytics metrics
  const analyticsData = React.useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayTimestamp = startOfToday.getTime();

    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let filteredActivities = safeActivities;
    if (timeframe === "today") {
      filteredActivities = safeActivities.filter((a) => a.timestamp >= todayTimestamp);
    } else if (timeframe === "week") {
      filteredActivities = safeActivities.filter((a) => a.timestamp >= sevenDaysAgo);
    } else if (timeframe === "month") {
      filteredActivities = safeActivities.filter((a) => a.timestamp >= thirtyDaysAgo);
    }

    // Time calculations
    let totalMins = 0;
    if (timeframe === "today") {
      totalMins = getTodayMinutes ? getTodayMinutes() : 0;
    } else if (timeframe === "week") {
      const weekDays = getWeekDailyMinutes ? getWeekDailyMinutes() : [];
      totalMins = weekDays.reduce((acc, d) => acc + (d.minutes || 0), 0);
    } else if (timeframe === "month") {
      let sum30 = 0;
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dKey = formatDateKey(d);
        sum30 += safeDaily[dKey] || 0;
      }
      totalMins = Math.max(sum30, studyTimeMinutes || 0);
    } else {
      totalMins = studyTimeMinutes || 0;
    }

    const lessonsCompletedCount = isMounted && completedLessons ? completedLessons.size : 0;
    const totalCurriculumLessons = 42;
    const completionPct = Math.min(100, Math.round((lessonsCompletedCount / totalCurriculumLessons) * 100));

    const codeExecutions = filteredActivities.filter(
      (a) => a.type === "workspace_practice" || a.iconType === "code"
    ).length;

    const problemsSolved = isMounted && completedBlocks ? completedBlocks.size : 0;
    const bookmarksCount = isMounted && bookmarks ? bookmarks.size : 0;
    const notesCount = isMounted && notes ? Object.keys(notes).length : 0;

    return {
      totalMins,
      lessonsCompletedCount,
      totalCurriculumLessons,
      completionPct,
      codeExecutions,
      problemsSolved,
      bookmarksCount,
      notesCount,
      filteredActivities,
    };
  }, [
    isMounted,
    timeframe,
    safeActivities,
    safeDaily,
    completedLessons,
    completedBlocks,
    bookmarks,
    notes,
    studyTimeMinutes,
    getTodayMinutes,
    getWeekDailyMinutes,
  ]);

  // Generate 30-day heatmap grid
  const heatmapDays = React.useMemo(() => {
    const days: Array<{
      dateKey: string;
      dateObj: Date;
      minutes: number;
      activityCount: number;
      level: 0 | 1 | 2 | 3 | 4;
      dayOfWeek: string;
      dayNum: number;
      monthName: string;
    }> = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = formatDateKey(d);
      const minutes = safeDaily[dateKey] || 0;
      
      const startDay = new Date(d);
      startDay.setHours(0, 0, 0, 0);
      const endDay = new Date(d);
      endDay.setHours(23, 59, 59, 999);

      const dayActivities = safeActivities.filter(
        (a) => a.timestamp >= startDay.getTime() && a.timestamp <= endDay.getTime()
      );

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (minutes > 60 || dayActivities.length >= 5) level = 4;
      else if (minutes >= 35 || dayActivities.length >= 3) level = 3;
      else if (minutes >= 15 || dayActivities.length >= 2) level = 2;
      else if (minutes > 0 || dayActivities.length > 0) level = 1;

      days.push({
        dateKey,
        dateObj: d,
        minutes,
        activityCount: dayActivities.length,
        level,
        dayOfWeek: d.toLocaleDateString(undefined, { weekday: "narrow" }),
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString(undefined, { month: "short" }),
      });
    }

    return days;
  }, [safeDaily, safeActivities]);

  // Active days count in last 30 days
  const activeDaysLast30 = heatmapDays.filter((d) => d.level > 0).length;
  const consistencyScore = Math.round((activeDaysLast30 / 30) * 100);

  // Filtered Activity Stream list
  const activityStream = React.useMemo(() => {
    let list = analyticsData.filteredActivities;

    if (activityFilter === "lessons") {
      list = list.filter((a) => a.type === "lesson_completed" || a.type === "lesson_uncompleted" || a.type === "lesson_started");
    } else if (activityFilter === "code") {
      list = list.filter((a) => a.type === "workspace_practice" || a.iconType === "code");
    } else if (activityFilter === "study") {
      list = list.filter((a) => a.type === "study_session");
    } else if (activityFilter === "bookmarks") {
      list = list.filter((a) => a.type === "bookmark_added" || a.type === "bookmark_removed");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || (a.subtitle && a.subtitle.toLowerCase().includes(q)));
    }

    return list;
  }, [analyticsData.filteredActivities, activityFilter, searchQuery]);

  // Export telemetry JSON
  const handleExportTelemetry = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      analytics: {
        totalStudyMinutes: studyTimeMinutes,
        completedLessons: Array.from(completedLessons || []),
        completedBlocks: Array.from(completedBlocks || []),
        bookmarks: Array.from(bookmarks || []),
        streak: streakInfo,
        dailyMinutes: safeDaily,
        activeDates: safeActiveDates,
        activityLog: safeActivities,
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reec-telemetry-${formatDateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 w-full min-h-screen overflow-y-auto p-4 sm:p-6 lg:p-8 pb-28 sm:pb-32 lg:pb-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Live Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-white/[0.08]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Dashboard</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Real-time Telemetry</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Detailed Learning Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time tracking of curriculum velocity, engineering workspace practice, and consistency metrics.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe Selector */}
          <div
            className="flex items-center rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.04] p-1 backdrop-blur-xl shadow-xs"
            style={{ boxShadow: "var(--glass-inner-highlight)" }}
          >
            {(["today", "week", "month", "all"] as TimeframeFilter[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  timeframe === tf
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                )}
              >
                {TIMEFRAME_LABELS[tf]}
              </button>
            ))}
          </div>

          {/* Quick Study Logger */}
          <button
            onClick={() => setIsStudyModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-semibold transition-all shadow-xs backdrop-blur-md cursor-pointer"
          >
            <Clock size={14} />
            <span>Track Study Time</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportTelemetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] border border-slate-200/70 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all shadow-xs backdrop-blur-md cursor-pointer"
            title="Download complete telemetry JSON"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* 2. Top Telemetry 4 Glass Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Time Invested */}
        <div
          className="rounded-2xl glass-elevated p-4 flex flex-col justify-between transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Study Time ({TIMEFRAME_LABELS[timeframe]})
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {analyticsData.totalMins >= 60
                ? (analyticsData.totalMins / 60).toFixed(1).replace(".0", "")
                : analyticsData.totalMins}
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {analyticsData.totalMins >= 60 ? "hours" : "mins"}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Today: {getTodayMinutes ? getTodayMinutes() : 0} mins</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              {streakInfo.current > 0 ? "Daily Active" : "Session Pending"}
            </span>
          </div>
        </div>

        {/* Card 2: Curriculum Velocity */}
        <div
          className="rounded-2xl glass-elevated p-4 flex flex-col justify-between transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Curriculum Mastery
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <BookOpen size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {analyticsData.completionPct}%
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              ({analyticsData.lessonsCompletedCount}/{analyticsData.totalCurriculumLessons})
            </span>
          </div>
          {/* Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] space-y-1">
            <div className="h-1.5 w-full rounded-full bg-slate-200/60 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${analyticsData.completionPct}%` }}
              />
            </div>
            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex justify-between">
              <span>Phase 00 & 01</span>
              <span>42 modules loaded</span>
            </div>
          </div>
        </div>

        {/* Card 3: Consistency & Streak */}
        <div
          className="rounded-2xl glass-elevated p-4 flex flex-col justify-between transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Consistency & Streak
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Flame size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {streakInfo.current}
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              day streak
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>30d Consistency: {consistencyScore}%</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              Best: {streakInfo.best}d
            </span>
          </div>
        </div>

        {/* Card 4: Engineering Executions */}
        <div
          className="rounded-2xl glass-elevated p-4 flex flex-col justify-between transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Engineering Lab Actions
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Terminal size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {analyticsData.codeExecutions + analyticsData.problemsSolved}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              interactive runs
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{analyticsData.bookmarksCount} bookmarks pinned</span>
            <span className="text-purple-600 dark:text-purple-400 font-semibold">
              {analyticsData.notesCount} notes
            </span>
          </div>
        </div>
      </div>

      {/* 3. 30-Day Activity Heatmap & Engagement Matrix */}
      <div
        className="rounded-2xl glass-surface p-4 sm:p-5 transition-all space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity size={16} className="text-blue-500" />
              <span>30-Day Activity & Study Heatmap</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daily minutes logged and curriculum actions over the past 30 days.
            </p>
          </div>

          {/* Intensity Legend */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Less</span>
            <div className="w-3 h-3 rounded-xs bg-slate-200 dark:bg-white/10" />
            <div className="w-3 h-3 rounded-xs bg-blue-300 dark:bg-blue-900/60" />
            <div className="w-3 h-3 rounded-xs bg-blue-400 dark:bg-blue-700" />
            <div className="w-3 h-3 rounded-xs bg-blue-500 dark:bg-blue-600" />
            <div className="w-3 h-3 rounded-xs bg-blue-600 dark:bg-blue-400" />
            <span>More</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-30 gap-1.5 pt-2">
          {heatmapDays.map((day) => {
            const isSelected = selectedHeatmapDay === day.dateKey;
            let bgClass = "bg-slate-200/70 dark:bg-white/[0.07] border-slate-300/40 dark:border-white/[0.04]";
            if (day.level === 1) bgClass = "bg-blue-300/80 dark:bg-blue-900/60 border-blue-400/50 dark:border-blue-700/50 text-blue-900 dark:text-blue-200";
            if (day.level === 2) bgClass = "bg-blue-400/90 dark:bg-blue-700 border-blue-500/60 dark:border-blue-600 text-white";
            if (day.level === 3) bgClass = "bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-500 text-white shadow-xs";
            if (day.level === 4) bgClass = "bg-blue-600 dark:bg-blue-400 border-blue-700 dark:border-blue-300 text-white dark:text-slate-900 font-bold shadow-xs";

            return (
              <button
                key={day.dateKey}
                onClick={() => setSelectedHeatmapDay(isSelected ? null : day.dateKey)}
                className={cn(
                  "group relative flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all cursor-pointer aspect-square text-center",
                  bgClass,
                  isSelected && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#0c1322] scale-105"
                )}
                title={`${day.dateKey}: ${day.minutes} mins, ${day.activityCount} actions`}
              >
                <span className="text-[9px] font-mono leading-none">{day.dayNum}</span>
                <span className="text-[8px] font-sans opacity-75 mt-0.5">{day.monthName}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Day Details Popout */}
        {selectedHeatmapDay && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-blue-500" />
              <span>
                <strong>{selectedHeatmapDay}</strong>: {safeDaily[selectedHeatmapDay] || 0} minutes studied
              </span>
            </div>
            <button
              onClick={() => setSelectedHeatmapDay(null)}
              className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Clear
            </button>
          </motion.div>
        )}
      </div>

      {/* 4. Phase Mastery & Feature Breakdown (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left 7 cols: Phase Progression Matrix */}
        <div
          className="lg:col-span-7 rounded-2xl glass-surface p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={16} className="text-blue-500" />
                <span>Phase-by-Phase Mastery</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tracking completion rates across the curriculum structure.
              </p>
            </div>
            <Link
              href="/roadmap"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Roadmap</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="space-y-2.5">
            {PHASES_INFO.map((p) => {
              let done = 0;
              if (p.phase === 0) {
                done = isMounted && completedLessons ? Array.from(completedLessons).filter((l) => l.includes("phase-00")).length : 0;
              } else if (p.phase === 1) {
                done = isMounted && completedLessons ? Array.from(completedLessons).filter((l) => l.includes("phase-01")).length : 0;
              }
              const pct = Math.min(100, Math.round((done / p.lessonsTotal) * 100));

              return (
                <Link
                  key={p.phase}
                  href={p.href}
                  className="group block p-3 rounded-xl glass-elevated transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                          pct >= 100
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : p.phase <= 1
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"
                        )}
                      >
                        {pct >= 100 ? "Mastered" : p.phase <= 1 ? "In Progress" : "Available"}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {p.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-xs text-slate-600 dark:text-slate-400">
                      <span>{done}/{p.lessonsTotal}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{pct}%</span>
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="h-1.5 w-full rounded-full bg-slate-200/60 dark:bg-white/10 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        pct >= 100 ? "bg-emerald-500" : "bg-blue-600 dark:bg-blue-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right 5 cols: Live Practice Session Tracker & Quick Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Live Session Stopwatch */}
          <div
            className="rounded-2xl glass-surface p-4 sm:p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Live Active Session
                </h3>
              </div>
              <button
                onClick={() => setSessionActive(!isSessionActive)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer",
                  isSessionActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "glass-control text-slate-700 dark:text-slate-300"
                )}
              >
                {isSessionActive ? <><Pause size={12} /> Auto-Track On</> : <><Play size={12} /> Start Timer</>}
              </button>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                  {Math.floor(currentSessionSeconds / 60)}m {currentSessionSeconds % 60}s
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Current tab session</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                  {getTodayMinutes ? getTodayMinutes() : 0}m
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Total logged today</span>
              </div>
            </div>

            <button
              onClick={() => setIsStudyModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <Plus size={14} />
              <span>Log Manual Practice Time</span>
            </button>
          </div>

          {/* Quick Stats Summary Glass */}
          <div
            className="rounded-2xl glass-elevated p-4 space-y-2.5"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Telemetry Summary
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/[0.05]">
                <span className="text-slate-600 dark:text-slate-400">Active Days (30d):</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-white">{activeDaysLast30} of 30</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/[0.05]">
                <span className="text-slate-600 dark:text-slate-400">Total Activities Logged:</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-white">{safeActivities.length}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/[0.05]">
                <span className="text-slate-600 dark:text-slate-400">Storage Synchronization:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={13} />
                  <span>Encrypted Local + Cloud</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Chronological Real-Time Event Stream */}
      <div
        className="rounded-2xl glass-surface p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-500" />
              <span>Real-Time Activity Stream</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live chronological feed of all lessons opened, code executed, and milestones reached.
            </p>
          </div>

          {/* Activity Category Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Events" },
              { id: "lessons", label: "Lessons" },
              { id: "code", label: "Code Runs" },
              { id: "study", label: "Study Time" },
              { id: "bookmarks", label: "Bookmarks" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActivityFilter(f.id)}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  activityFilter === f.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Activity List */}
        {activityStream.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No activity events found matching your filter. Start a lesson to generate telemetry!
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/[0.05] max-h-96 overflow-y-auto pr-1">
            {activityStream.map((act) => {
              const isCheck = act.iconType === "check" || act.type === "lesson_completed";
              const isCode = act.iconType === "code" || act.type === "workspace_practice";
              const isTime = act.iconType === "time" || act.type === "study_session";

              return (
                <div
                  key={act.id}
                  className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-white/60 dark:hover:bg-white/[0.02] rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                        isCheck
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : isCode
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                          : isTime
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                      )}
                    >
                      {isCheck ? (
                        <CheckCircle2 size={14} />
                      ) : isCode ? (
                        <Terminal size={14} />
                      ) : isTime ? (
                        <Clock size={14} />
                      ) : (
                        <Bookmark size={14} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {act.title}
                      </div>
                      {act.subtitle && (
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                          {act.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      {formatTimeAgo(act.timestamp)}
                    </span>
                    {act.path && (
                      <Link
                        href={act.path}
                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Jump to module"
                      >
                        <ChevronRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Study Session Modal */}
      <StudySessionModal open={isStudyModalOpen} onClose={() => setIsStudyModalOpen(false)} />
    </div>
  );
}
