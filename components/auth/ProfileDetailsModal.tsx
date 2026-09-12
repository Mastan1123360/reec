/**
 * components/auth/ProfileDetailsModal.tsx
 *
 * Snapchat-style Learner Profile & Customization Dialog.
 *
 * Features:
 * - Clean Snapchat-inspired Bitmoji/Avatar Hero header
 * - Dedicated "Customize Persona" section for Gender (Male/Female) and Human Face Profiles
 * - Display Name editing with instant persistence & dashboard greeting update
 * - Authoritative @username persistence with cooldown awareness
 * - Rank advancement progress & achievement badges (coins completely removed)
 * - Study telemetry (Lessons, Streak, clean integer formatted Time, Bookmarks)
 * - Safe, responsive mobile & tablet alignment
 */
"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Settings,
  Copy,
  Check,
  Award,
  BookOpen,
  Flame,
  Clock,
  Bookmark,
  Palette,
  Edit3,
  Sparkles,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/supabase/auth-context";
import { useUserAvatar, GenderOption, AVATAR_OPTIONS } from "@/lib/avatars";
import { useProgressStore } from "@/lib/progress/store";
import { checkUsernameChangeCooldown, validateUsernameSyntax } from "@/lib/supabase/username-service";
import { calculateRankFromLessons, evaluateBadges } from "@/lib/badges";
import { cn } from "@/lib/utils";

interface ProfileDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDetailsModal({ isOpen, onClose }: ProfileDetailsModalProps) {
  const router = useRouter();
  const {
    user,
    username,
    profile,
    lastUsernameChangedAt,
    updateUsername,
    updateProfile,
    signOut,
    syncStatus,
    triggerSync,
  } = useAuth();

  const {
    currentAvatar,
    avatarId,
    gender,
    selectAvatar,
    selectGender,
    genderFilteredAvatars,
  } = useUserAvatar(
    profile?.avatarId,
    profile?.gender
  );

  const completedLessons = useProgressStore((s) => s.completedLessons);
  const studyTimeMinutes = useProgressStore((s) => s.studyTimeMinutes);
  const getStreak = useProgressStore((s) => s.getStreak);
  const bookmarks = useProgressStore((s) => s.bookmarks);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Tab state: "overview" (Snapchat profile feed) or "customize" (Dedicated customization section)
  const [activeTab, setActiveTab] = useState<"overview" | "customize">("overview");

  // Editing state for Display Name
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState(
    profile?.displayName || ""
  );
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [displayNameSuccess, setDisplayNameSuccess] = useState(false);

  // Sync displayNameInput when profile updates
  useEffect(() => {
    if (!isEditingDisplayName) {
      setDisplayNameInput(profile?.displayName || "");
    }
  }, [profile?.displayName, isEditingDisplayName]);

  // Editing state for Username
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState(
    profile?.username || ""
  );
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState(false);

  const [copiedId, setCopiedId] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const streak = getStreak();
  const lessonCount = completedLessons?.size || 0;
  const rankInfo = calculateRankFromLessons(lessonCount);

  // Evaluate badges (without coins)
  const evaluatedBadges = React.useMemo(() => {
    return evaluateBadges({
      lessonsCount: lessonCount,
      streakDays: streak.current,
      studyMinutes: studyTimeMinutes,
    });
  }, [lessonCount, streak, studyTimeMinutes]);

  const unlockedCount = evaluatedBadges.filter((b) => b.unlocked).length;

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayNameInput(profile.displayName);
    } else if (user?.user_metadata?.display_name) {
      setDisplayNameInput(user.user_metadata.display_name);
    }
  }, [profile?.displayName, user?.user_metadata?.display_name]);

  useEffect(() => {
    if (profile?.username) {
      setUsernameInput(profile.username);
    } else if (username) {
      setUsernameInput(username);
    }
  }, [profile?.username, username]);

  const cooldownStatus = checkUsernameChangeCooldown(lastUsernameChangedAt);

  const handleSaveDisplayName = async () => {
    if (!displayNameInput.trim()) return;
    setIsSavingDisplayName(true);
    try {
      const res = await updateProfile({
        displayName: displayNameInput.trim(),
      });
      if (res.success) {
        setDisplayNameSuccess(true);
        setIsEditingDisplayName(false);
        setTimeout(() => setDisplayNameSuccess(false), 3000);
      }
    } catch {}
    setIsSavingDisplayName(false);
  };

  const handleSaveUsername = async () => {
    const clean = usernameInput.trim().toLowerCase().replace(/^@/, "");
    const syntax = validateUsernameSyntax(clean);
    if (!syntax.valid) {
      setUsernameError(syntax.error || "Invalid username");
      return;
    }

    setIsSavingUsername(true);
    setUsernameError(null);
    try {
      const res = await updateUsername(clean);
      if (res.success) {
        setUsernameSuccess(true);
        setIsEditingUsername(false);
        setTimeout(() => setUsernameSuccess(false), 3000);
      } else {
        setUsernameError(res.error || "Failed to update username");
      }
    } catch (err: unknown) {
      setUsernameError(err instanceof Error ? err.message : "Failed to update username");
    }
    setIsSavingUsername(false);
  };

  const handleGenderChange = async (newGender: GenderOption) => {
    selectGender(newGender);
    if (user) {
      await updateProfile({
        gender: newGender,
        avatarId: newGender === "female" ? "human-female-elena" : "human-male-alex",
      });
    }
  };

  const handleAvatarSelect = async (avId: string) => {
    selectAvatar(avId);
    if (user) {
      await updateProfile({
        avatarId: avId,
      });
    }
  };

  const handleResetProgress = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset all progress to zero? This will reset your completed lessons, study time, bookmarks, and streaks."
      )
    ) {
      useProgressStore.getState().resetAllProgress();
      setResetSuccess(true);
      try {
        await triggerSync();
      } catch {}
      setTimeout(() => setResetSuccess(false), 3500);
    }
  };

  const effectiveDisplayName = profile?.displayName || "Learner";
  const userHandle = profile?.username || "learner";

  const formatStudyTime = (mins: number) => {
    const totalMins = Math.floor(Math.max(0, mins || 0));
    if (totalMins < 60) return `${totalMins}m`;
    const hrs = Math.floor(totalMins / 60);
    const remaining = totalMins % 60;
    return remaining > 0 ? `${hrs}h ${remaining}m` : `${hrs}h`;
  };

  const handleCopyId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleManualSync = async () => {
    if (isSyncing || syncStatus === "syncing") return;
    setIsSyncing(true);
    await triggerSync();
    setTimeout(() => setIsSyncing(false), 600);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && user && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 md:p-6">
          {/* Apple Blur Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/75 dark:bg-black/85 backdrop-blur-2xl transition-all"
          />

          {/* Snapchat-Style Profile Card Panel */}
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-[540px] md:max-w-[580px] rounded-t-[32px] sm:rounded-3xl border-t sm:border border-white/80 dark:border-white/[0.14] glass-frosted-deep text-slate-900 dark:text-slate-100 shadow-2xl z-10 flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden"
            style={{
              boxShadow: "var(--glass-specular), 0 32px 64px -16px rgba(0, 0, 0, 0.6)",
            }}
          >
            {/* Top Drag indicator on mobile */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
              <div className="w-10 h-1 bg-slate-300 dark:bg-white/20 rounded-full" />
            </div>

            {/* Header / Close button bar */}
            <div className="shrink-0 px-5 pt-3 pb-2 sm:px-6 sm:pt-4 flex items-center justify-between border-b border-slate-900/[0.05] dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Learner Profile
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1.5 rounded-full hover:bg-slate-100/80 dark:hover:bg-white/10 cursor-pointer"
                aria-label="Close profile modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto overscroll-contain flex-1 px-4 py-3.5 sm:px-6 sm:py-4 space-y-4">
              {/* Notification banners */}
              {displayNameSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Display Name saved! Your greeting has been updated.</span>
                </div>
              )}

              {usernameSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Username @{usernameInput} successfully saved!</span>
                </div>
              )}

              {resetSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Progress reset to zero.</span>
                </div>
              )}

              {/* Snapchat-Style Hero Header */}
              <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-blue-500/[0.08] via-indigo-500/[0.04] to-transparent border border-blue-500/20 text-center flex flex-col items-center">
                {/* Large Bitmoji/Human Face Circle with glowing ring */}
                <div className="relative mb-3 group cursor-pointer" onClick={() => setActiveTab("customize")}>
                  <div
                    className={cn(
                      "w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-105 border-4 border-white dark:border-slate-800",
                      `bg-gradient-to-br ${currentAvatar.gradient}`
                    )}
                    style={{
                      boxShadow: `0 8px 24px -4px ${currentAvatar.accentHex}70`,
                    }}
                  >
                    {currentAvatar.svgIcon("w-full h-full")}
                  </div>
                  {/* Edit avatar badge */}
                  <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-transform active:scale-95" title="Customize Persona">
                    <Palette className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Display Name & Edit */}
                {isEditingDisplayName ? (
                  <div className="w-full max-w-xs space-y-2">
                    <input
                      type="text"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      placeholder="Your Display Name"
                      className="w-full px-3 py-1.5 rounded-xl border border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      autoFocus
                    />
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveDisplayName}
                        disabled={isSavingDisplayName || !displayNameInput.trim()}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingDisplayName ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingDisplayName(false)}
                        className="px-3 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      {effectiveDisplayName}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsEditingDisplayName(true)}
                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      title="Edit Display Name"
                      aria-label="Edit Display Name"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* @username handle & Rank pill */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    @{userHandle}
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${rankInfo.currentRank.accentColor}20`,
                      color: rankInfo.currentRank.accentColor,
                    }}
                  >
                    Level {rankInfo.currentRank.level}: {rankInfo.currentRank.title}
                  </span>
                </div>

                {/* Snapchat-style Quick Stats Pill Row */}
                <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-3.5 pt-3 border-t border-slate-900/[0.06] dark:border-white/[0.06]">
                  <div className="p-2 rounded-xl bg-white/60 dark:bg-white/[0.04] text-center">
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                      <Flame className="w-3 h-3 text-amber-500" />
                      <span>Streak</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                      {streak.current}d
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/60 dark:bg-white/[0.04] text-center">
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                      <BookOpen className="w-3 h-3 text-blue-500" />
                      <span>Lessons</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                      {lessonCount}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/60 dark:bg-white/[0.04] text-center">
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-500" />
                      <span>Time</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                      {formatStudyTime(studyTimeMinutes)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Snapchat Segmented Navigation Bar */}
              <div className="flex rounded-xl bg-slate-200/60 dark:bg-white/[0.06] p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer",
                    activeTab === "overview"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Overview & Achievements
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("customize")}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer",
                    activeTab === "customize"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Customize Persona</span>
                </button>
              </div>

              {/* TAB 1: OVERVIEW & ACHIEVEMENTS */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Rank Advancement Card */}
                  <div className="rounded-2xl p-4 bg-white/55 dark:bg-white/[0.04] border border-white/70 dark:border-white/[0.08] shadow-xs backdrop-blur-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>Rank Progression</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {rankInfo.progressPercent}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${rankInfo.progressPercent}%`,
                          backgroundColor: rankInfo.currentRank.accentColor,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Target: {rankInfo.nextRank ? rankInfo.nextRank.title : "Master Rank Achieved"}</span>
                      <span>{lessonCount}/{rankInfo.nextRank ? rankInfo.nextRank.minLessons : lessonCount} lessons</span>
                    </div>
                  </div>

                  {/* Badges Showcase */}
                  <div className="rounded-2xl p-4 bg-white/55 dark:bg-white/[0.04] border border-white/70 dark:border-white/[0.08] shadow-xs backdrop-blur-lg space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <span>Badges ({unlockedCount}/{evaluatedBadges.length} Unlocked)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                      {evaluatedBadges.map((badge) => (
                        <div
                          key={badge.id}
                          className={cn(
                            "p-2.5 rounded-xl border flex flex-col items-center text-center transition-all",
                            badge.unlocked
                              ? "bg-white/80 dark:bg-white/[0.06] border-amber-500/30 shadow-xs"
                              : "bg-slate-100/40 dark:bg-white/[0.02] border-slate-200/40 dark:border-white/[0.04] opacity-60"
                          )}
                        >
                          <span className="text-2xl mb-1">{badge.icon}</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate w-full">
                            {badge.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                            {badge.description}
                          </span>
                          <span
                            className={cn(
                              "text-[9px] font-semibold mt-1.5 px-1.5 py-0.2 rounded-full",
                              badge.unlocked
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-slate-200/60 dark:bg-white/10 text-slate-500"
                            )}
                          >
                            {badge.unlocked ? "Unlocked" : `${badge.currentProgress}/${badge.threshold}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Username Handle Section */}
                  <div className="rounded-2xl p-4 bg-white/55 dark:bg-white/[0.04] border border-white/70 dark:border-white/[0.08] shadow-xs backdrop-blur-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Username Handle
                      </span>
                      {!isEditingUsername && (
                        <button
                          type="button"
                          onClick={() => setIsEditingUsername(true)}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Change Username
                        </button>
                      )}
                    </div>

                    {isEditingUsername ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">@</span>
                            <input
                              type="text"
                              value={usernameInput}
                              onChange={(e) => setUsernameInput(e.target.value)}
                              placeholder="unique_username"
                              className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono font-semibold focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleSaveUsername}
                            disabled={isSavingUsername || !usernameInput.trim()}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
                          >
                            {isSavingUsername ? "Saving..." : "Lock In"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingUsername(false);
                              setUsernameError(null);
                            }}
                            className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                        {usernameError && (
                          <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {usernameError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/60 dark:bg-white/[0.03]">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          @{userHandle}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {cooldownStatus.canChange ? "Eligible to change" : `Cooldown: ${cooldownStatus.remainingDays}d left`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cloud Sync & Study Telemetry */}
                  <div className="rounded-2xl p-4 bg-white/55 dark:bg-white/[0.04] border border-white/70 dark:border-white/[0.08] shadow-xs backdrop-blur-lg space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Cloud Sync & Telemetry
                      </span>
                      <button
                        type="button"
                        onClick={handleManualSync}
                        disabled={isSyncing || syncStatus === "syncing"}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
                        <span>Sync Now</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-white/[0.03] text-center">
                        <span className="text-[10px] text-slate-500 block">Lessons</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">{lessonCount}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-white/[0.03] text-center">
                        <span className="text-[10px] text-slate-500 block">Streak</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">{streak.current}d</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-white/[0.03] text-center">
                        <span className="text-[10px] text-slate-500 block">Study Time</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">{formatStudyTime(studyTimeMinutes)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-white/[0.03] text-center">
                        <span className="text-[10px] text-slate-500 block">Saved</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">{bookmarks.size}</span>
                      </div>
                    </div>

                    {/* Account UID row */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono pt-1">
                      <span>UID: {user.id.slice(0, 12)}...</span>
                      <button
                        type="button"
                        onClick={handleCopyId}
                        className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                      >
                        {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId ? "Copied" : "Copy UID"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DEDICATED CUSTOMIZE PERSONA SECTION (Snapchat Style) */}
              {activeTab === "customize" && (
                <div className="space-y-4">
                  <div className="rounded-2xl p-4 bg-white/55 dark:bg-white/[0.04] border border-white/70 dark:border-white/[0.08] shadow-xs backdrop-blur-lg space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Select Gender & Filter Personas
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Choose Male or Female to filter realistic human face avatars. (Male is default)
                        </span>
                      </div>

                      {/* Gender Selector Toggle */}
                      <div className="flex items-center p-1 rounded-xl bg-slate-200/60 dark:bg-white/10 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleGenderChange("male")}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                            gender === "male"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          👨 Male (Default)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenderChange("female")}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                            gender === "female"
                              ? "bg-rose-600 text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          👩 Female
                        </button>
                      </div>
                    </div>

                    {/* Grid of Human Faces for Selected Gender */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      {genderFilteredAvatars.map((av) => {
                        const isSelected = av.id === avatarId;
                        return (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => handleAvatarSelect(av.id)}
                            className={cn(
                              "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all cursor-pointer border text-center relative group",
                              isSelected
                                ? "bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/30"
                                : "border-slate-200/60 dark:border-white/[0.08] hover:bg-slate-100/80 dark:hover:bg-white/[0.05]"
                            )}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                            <div
                              className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105",
                                `bg-gradient-to-br ${av.gradient}`
                              )}
                            >
                              {av.svgIcon("w-full h-full")}
                            </div>
                            <div className="w-full">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                                {av.name}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                                {av.title}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="shrink-0 p-3.5 sm:p-4 border-t border-slate-900/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push("/settings");
                  }}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white text-xs font-semibold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetProgress}
                  className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  title="Reset all learning progress and stats to zero"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to 0</span>
                </button>
              </div>

              <button
                type="button"
                onClick={async () => {
                  onClose();
                  await signOut();
                  router.push("/");
                }}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
