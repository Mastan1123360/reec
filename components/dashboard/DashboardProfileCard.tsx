"use client";

import * as React from "react";
import {
  User,
  Award,
  Flame,
  Clock,
  BookOpen,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Palette,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth-context";
import { useUserAvatar } from "@/lib/avatars";
import { useProgressStore } from "@/lib/progress/store";
import { calculateRankFromLessons } from "@/lib/badges";
import { cn } from "@/lib/utils";

interface DashboardProfileCardProps {
  onOpenDetails: () => void;
  className?: string;
  variant?: "standard" | "horizontal" | "compact";
}

export function DashboardProfileCard({
  onOpenDetails,
  className,
  variant = "standard",
}: DashboardProfileCardProps) {
  const { user, profile, openAuthModal } = useAuth();
  const { currentAvatar } = useUserAvatar(
    profile?.avatarId,
    profile?.gender
  );

  const completedLessons = useProgressStore((s) => s.completedLessons);
  const studyTimeMinutes = useProgressStore((s) => s.studyTimeMinutes);
  const getStreak = useProgressStore((s) => s.getStreak);

  const streak = getStreak();
  const lessonCount = completedLessons?.size || 0;
  const rankInfo = calculateRankFromLessons(lessonCount);

  const effectiveDisplayName = profile?.displayName || "Learner";
  const userHandle = profile?.username || (user?.email ? user.email.split("@")[0] : "guest");

  const formatStudyTime = (minutes: number) => {
    const totalMins = Math.floor(Math.max(0, minutes || 0));
    if (totalMins < 60) return `${totalMins}m`;
    const hrs = Math.floor(totalMins / 60);
    const remMins = totalMins % 60;
    return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
  };

  // =========================================================================
  // Horizontal / Compact layout for Mobile and Tablet (< lg)
  // =========================================================================
  if (variant === "horizontal" || variant === "compact") {
    return (
      <div
        id="dashboard-profile-mobile-tablet-card"
        className={cn(
          "relative rounded-2xl glass-elevated border border-slate-200/80 dark:border-white/[0.12] p-3.5 sm:p-4 overflow-hidden transition-all duration-200",
          className
        )}
        style={{
          boxShadow: "var(--glass-specular), 0 8px 24px -6px rgba(0, 0, 0, 0.12)",
        }}
      >
        {/* Ambient accent glow */}
        <div
          className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-20 transition-opacity"
          style={{
            background: user ? currentAvatar.accentHex : "#3b82f6",
          }}
        />

        {user ? (
          <div className="flex flex-col gap-3.5">
            {/* Top row: Avatar + User info + Coin balance + Settings */}
            <div className="flex items-center justify-between gap-3">
              <div
                onClick={onOpenDetails}
                className="flex items-center gap-3 min-w-0 cursor-pointer group"
                title="Click to customize profile"
              >
                {/* Human Face Avatar */}
                <div
                  className={cn(
                    "w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white shrink-0 shadow-md transition-transform group-hover:scale-105",
                    `bg-gradient-to-br ${currentAvatar.gradient}`
                  )}
                  style={{
                    boxShadow: `0 3px 12px -2px ${currentAvatar.accentHex}50`,
                  }}
                >
                  {currentAvatar.svgIcon("w-full h-full")}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      {effectiveDisplayName}
                    </h3>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                      @{userHandle}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span
                      className="inline-flex items-center gap-1 font-semibold"
                      style={{ color: rankInfo.currentRank.accentColor }}
                    >
                      <Award className="w-3 h-3 shrink-0" />
                      {rankInfo.currentRank.title}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{profile?.gender || "male"}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Customize Profile Button */}
                <button
                  type="button"
                  onClick={onOpenDetails}
                  className="p-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border border-blue-500/20 transition-all shrink-0 cursor-pointer"
                  title="Customize Profile"
                  aria-label="Customize Profile"
                >
                  <Palette className="w-4 h-4" />
                </button>

                <Link
                  href="/settings"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors shrink-0 cursor-pointer"
                  title="Account Settings"
                  aria-label="Account Settings"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Bottom row: Telemetry Pills (Lessons, Streak, Time) */}
            <div className="grid grid-cols-3 gap-2">
              <div className="px-2.5 py-1.5 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                  <BookOpen className="w-3 h-3 text-blue-500" />
                  <span>Lessons</span>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {lessonCount}
                </span>
              </div>

              <div className="px-2.5 py-1.5 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500" />
                  <span>Streak</span>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {streak.current}d
                </span>
              </div>

              <div className="px-2.5 py-1.5 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] text-center">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-500" />
                  <span>Time</span>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {formatStudyTime(studyTimeMinutes)}
                </span>
              </div>
            </div>

            {/* View Full Profile and Details button on dashboard */}
            <button
              type="button"
              id="dashboard-mobile-view-full-profile-btn"
              onClick={onOpenDetails}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/25 text-blue-600 dark:text-blue-400 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-[0.99] mt-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>View full profile and details</span>
            </button>
          </div>
        ) : (
          /* Guest State Horizontal */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Guest Explorer
                  </h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                    Local Mode
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Sign in to save streaks, track progress, and customize your persona profile.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openAuthModal}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer min-h-[42px] shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sign In / Create Account</span>
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // Standard vertical card layout (for Desktop right column)
  // =========================================================================
  return (
    <div
      id="dashboard-profile-details-card"
      className={cn(
        "relative rounded-2xl glass-elevated border border-slate-200/80 dark:border-white/[0.12] p-4 sm:p-5 overflow-hidden transition-all duration-200",
        className
      )}
      style={{
        boxShadow: "var(--glass-specular), 0 10px 30px -10px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* Ambient accent glow */}
      <div
        className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl opacity-20 transition-opacity"
        style={{
          background: user ? currentAvatar.accentHex : "#3b82f6",
        }}
      />

      {user ? (
        <div className="flex flex-col gap-3.5">
          {/* Top Row: Avatar + Name + Status + Quick Customize */}
          <div className="flex items-start justify-between gap-3">
            <div
              onClick={onOpenDetails}
              className="flex items-center gap-3 min-w-0 cursor-pointer group"
              title="Click to customize profile"
            >
              {/* Human Face Avatar */}
              <div
                className={cn(
                  "w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full flex items-center justify-center text-white shrink-0 shadow-md transition-transform group-hover:scale-105",
                  `bg-gradient-to-br ${currentAvatar.gradient}`
                )}
                style={{
                  boxShadow: `0 4px 14px -2px ${currentAvatar.accentHex}50`,
                }}
              >
                {currentAvatar.svgIcon("w-full h-full")}
              </div>

              {/* Identity Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    {effectiveDisplayName}
                  </h3>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                    @{userHandle}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  <span
                    className="inline-flex items-center gap-1 font-semibold"
                    style={{ color: rankInfo.currentRank.accentColor }}
                  >
                    <Award className="w-3 h-3 shrink-0" />
                    {rankInfo.currentRank.title}
                  </span>
                  <span>•</span>
                  <span className="truncate capitalize">{profile?.gender || "male"}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenDetails}
                className="p-1.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border border-blue-500/20 transition-colors shrink-0 cursor-pointer"
                title="Customize Profile & Persona"
                aria-label="Customize Profile"
              >
                <Palette className="w-4 h-4" />
              </button>

              <Link
                href="/settings"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors shrink-0 cursor-pointer"
                title="Account Settings"
                aria-label="Account Settings"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Rank Progress Bar */}
          <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06]">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-500" />
                Rank Advancement
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                {lessonCount}/{rankInfo.nextRank ? rankInfo.nextRank.minLessons : lessonCount} Lessons ({rankInfo.progressPercent}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${rankInfo.progressPercent}%`,
                  backgroundColor: rankInfo.currentRank.accentColor,
                }}
              />
            </div>
            {rankInfo.nextRank && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                Next: {rankInfo.nextRank.title} ({rankInfo.nextRank.minLessons - lessonCount} lessons to go)
              </span>
            )}
          </div>

          {/* 3 Quick Telemetry Badges */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/[0.06] text-center">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                <BookOpen className="w-3 h-3 text-blue-500" />
                <span>Lessons</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {lessonCount}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/[0.06] text-center">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-amber-500" />
                <span>Streak</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {streak.current}d
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/[0.06] text-center">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-emerald-500" />
                <span>Time</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {formatStudyTime(studyTimeMinutes)}
              </span>
            </div>
          </div>

          {/* View Full Profile and Details button on dashboard */}
          <button
            type="button"
            id="dashboard-desktop-view-full-profile-btn"
            onClick={onOpenDetails}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/25 text-blue-600 dark:text-blue-400 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-[0.99] mt-0.5"
          >
            <User className="w-3.5 h-3.5" />
            <span>View full profile and details</span>
          </button>
        </div>
      ) : (
        /* Guest State */
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Guest Explorer
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                  Local Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Sync progress and customize persona profile
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Create an account or sign in to permanently save your 30-day telemetry, streaks, and systems code.
          </p>

          <button
            type="button"
            onClick={openAuthModal}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer min-h-[40px]"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sign In / Create Account</span>
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>
      )}
    </div>
  );
}
