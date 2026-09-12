/**
 * components/auth/UserMenu.tsx
 *
 * Adaptive User Profile & Sync status menu for Header navigation.
 * Built using the REEC Level 3 Elevated Glass Material System for Light and Dark modes.
 *
 * Distinct responsive layouts:
 * - Mobile (<640px): Full-width bottom-sheet with safe horizontal margins, max-h-[88dvh], internal scroll.
 * - Tablet (640–1023px): Compact anchored popover (~360px wide), no horizontal clipping.
 * - Desktop (1024px+): Anchored floating dropdown.
 *
 * Current avatar only — no avatar gallery inside UserMenu (gallery is in ProfileDetailsModal).
 */
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  CloudOff,
  Award,
  BookOpen,
  Flame,
  Clock,
  Settings,
  Bookmark,
  Copy,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/supabase/auth-context";
import { useUserAvatar } from "@/lib/avatars";
import { useProgressStore } from "@/lib/progress/store";
import { ProfileDetailsModal } from "./ProfileDetailsModal";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const router = useRouter();
  const {
    user,
    profile,
    openAuthModal,
    signOut,
    syncStatus,
    syncError,
    triggerSync,
  } = useAuth();

  // Instant deterministic profile values from authoritative baseline
  const displayName = profile?.displayName || "Learner";
  const userHandle = profile?.username || "learner";
  const avatarId = profile?.avatarId || "human-male-alex";
  const gender = profile?.gender || "male";

  const { currentAvatar } = useUserAvatar(avatarId, gender);

  const completedLessons = useProgressStore((s) => s.completedLessons);
  const studyTimeMinutes = useProgressStore((s) => s.studyTimeMinutes);
  const getStreak = useProgressStore((s) => s.getStreak);
  const bookmarks = useProgressStore((s) => s.bookmarks);

  const [isOpen, setIsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return (
      <button
        onClick={openAuthModal}
        className="flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/25 rounded-xl transition-colors duration-150 shadow-xs cursor-pointer active:scale-95"
        title="Sign in to sync your progress to Supabase"
        aria-label="Sign In"
      >
        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
        <span className="font-semibold text-xs">Sign In</span>
      </button>
    );
  }

  const streak = getStreak();

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await triggerSync();
    } catch {}
    setIsManualSyncing(false);
  };

  const provider =
    user.app_metadata?.provider ||
    user.app_metadata?.providers?.[0] ||
    "email";

  const formatStudyTime = (mins: number) => {
    const totalMins = Math.floor(Math.max(0, mins || 0));
    if (totalMins < 60) return `${totalMins}m`;
    const hrs = Math.floor(totalMins / 60);
    const rem = totalMins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  };

  // Learner rank & tier calculation
  const lessonCount = completedLessons.size;
  const rank =
    lessonCount >= 20
      ? { title: "Rust Architect", level: "Master", nextTarget: 28, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" }
      : lessonCount >= 10
      ? { title: "Systems Hacker", level: "Adept", nextTarget: 20, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" }
      : lessonCount >= 3
      ? { title: "Apprentice Rustacean", level: "Novice", nextTarget: 10, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" }
      : { title: "Rust Cadet", level: "Initiate", nextTarget: 3, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };

  const rankProgressPct = Math.min(100, Math.round((lessonCount / rank.nextTarget) * 100));

  const handleCopyHandle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userHandle) {
      navigator.clipboard.writeText(`@${userHandle}`);
      setCopiedHandle(true);
      setTimeout(() => setCopiedHandle(false), 2000);
    }
  };

  const openFullProfile = () => {
    setIsOpen(false);
    setIsProfileModalOpen(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("reec:open-dashboard-profile"));
    }
  };

  // Shared inner content across all viewports
  const renderProfileBody = (isMobileSheet = false) => (
    <div className="flex flex-col gap-3 min-w-0">
      {/* Profile Header with Avatar & Identity Card */}
      <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full flex items-center justify-center text-white shrink-0 shadow-md",
              `bg-gradient-to-br ${currentAvatar.gradient}`
            )}
            style={{
              boxShadow: `0 4px 14px -2px ${currentAvatar.accentHex}60`,
            }}
          >
            {currentAvatar.svgIcon("w-full h-full")}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {displayName}
              </div>

              {/* Auth Provider Pill */}
              <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                {provider}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={handleCopyHandle}
                className="group flex items-center gap-1 text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                title="Click to copy handle"
              >
                <span>@{userHandle}</span>
                {copiedHandle ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-2.5 h-2.5 text-slate-400 group-hover:text-blue-500" />
                )}
              </button>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {user.email}
            </div>
          </div>
        </div>

        {/* Rank & Progress Bar */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-200/50 dark:border-white/[0.06]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold text-slate-900 dark:text-white">
                {rank.title}
              </span>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">
              {lessonCount}/{rank.nextTarget} Lessons
            </span>
          </div>

          <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${rankProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 Learning Stats Grid */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        <div className="p-2 sm:p-2.5 rounded-xl bg-white/60 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.08] shadow-xs text-center backdrop-blur-md">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-0.5">
            <BookOpen className="w-3 h-3 text-blue-500" />
            <span>Done</span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block mt-0.5">
            {completedLessons.size}
          </span>
        </div>

        <div className="p-2 sm:p-2.5 rounded-xl bg-white/60 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.08] shadow-xs text-center backdrop-blur-md">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-0.5">
            <Flame className="w-3 h-3 text-amber-500" />
            <span>Streak</span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block mt-0.5">
            {streak.current}d
          </span>
        </div>

        <div className="p-2 sm:p-2.5 rounded-xl bg-white/60 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.08] shadow-xs text-center backdrop-blur-md">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-0.5">
            <Clock className="w-3 h-3 text-emerald-500" />
            <span>Time</span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block mt-0.5">
            {formatStudyTime(studyTimeMinutes)}
          </span>
        </div>

        <div className="p-2 sm:p-2.5 rounded-xl bg-white/60 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.08] shadow-xs text-center backdrop-blur-md">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-0.5">
            <Bookmark className="w-3 h-3 text-purple-500" />
            <span>Saved</span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block mt-0.5">
            {bookmarks.size}
          </span>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="px-3 py-2 rounded-xl bg-white/50 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/[0.06] text-xs flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          {syncStatus === "syncing" || syncStatus === "migrating" || isManualSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span>Syncing cloud state...</span>
            </>
          ) : syncStatus === "synced" ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Cloud synchronized</span>
            </>
          ) : syncStatus === "offline" ? (
            <>
              <CloudOff className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Offline · Local active</span>
            </>
          ) : syncStatus === "error" ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span className="truncate max-w-[130px]" title={syncError || "Sync error"}>
                {syncError || "Sync error"}
              </span>
            </>
          ) : (
            <>
              <Cloud className="w-3.5 h-3.5 text-slate-400" />
              <span>Cloud ready</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleManualSync}
          disabled={isManualSyncing || syncStatus === "syncing"}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-50 cursor-pointer"
          title="Sync now"
        >
          <RefreshCw className={`w-3 h-3 ${isManualSyncing ? "animate-spin" : ""}`} />
          <span>Sync</span>
        </button>
      </div>

      {/* View Full Profile & Details action */}
      <div className="pt-1">
        <button
          type="button"
          id="usermenu-open-details-btn"
          onClick={openFullProfile}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 min-h-[44px] rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/25 text-blue-600 dark:text-blue-400 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs active:scale-[0.99]"
        >
          <User className="w-4 h-4" />
          <span>View Full Profile & Details</span>
          <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-75" />
        </button>
      </div>

      {/* Navigation Actions */}
      <div className="space-y-0.5 pt-1 border-t border-slate-200/50 dark:border-white/[0.08]">
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            router.push("/bookmarks");
          }}
          className="w-full flex items-center justify-between px-3 py-2 min-h-[42px] rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 shrink-0 text-purple-500" />
            <span>Saved Bookmarks</span>
          </div>
          {bookmarks.size > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold">
              {bookmarks.size}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            router.push("/settings");
          }}
          className="w-full flex items-center gap-2 px-3 py-2 min-h-[42px] rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
        >
          <Settings className="w-4 h-4 shrink-0 text-slate-400" />
          <span>Account Settings & Profile</span>
        </button>

        <button
          type="button"
          onClick={async () => {
            setIsOpen(false);
            await signOut();
            router.push("/");
          }}
          className="w-full flex items-center gap-2 px-3 py-2 min-h-[42px] rounded-xl text-xs sm:text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Capsule Button: Adaptive across Mobile, Tablet, Desktop */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 h-9 px-2 sm:px-2.5 rounded-xl glass-control text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer active:scale-95 min-h-[36px]"
        title={`${displayName} (@${userHandle}) - Click to view profile`}
        aria-label="User Profile & Settings"
      >
        {/* Profile Picture with sync badge */}
        <div className="relative shrink-0">
          <div
            className={cn(
              "w-[26px] h-[26px] rounded-full flex items-center justify-center text-white shadow-xs transition-transform hover:scale-105",
              `bg-gradient-to-br ${currentAvatar.gradient}`
            )}
            style={{
              boxShadow: `0 2px 8px -1px ${currentAvatar.accentHex}40`,
            }}
          >
            {currentAvatar.svgIcon("w-full h-full")}
          </div>

          {/* Sync Dot for Mobile */}
          <span
            className={cn(
              "sm:hidden absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white dark:ring-slate-900",
              syncStatus === "synced"
                ? "bg-emerald-500"
                : syncStatus === "syncing" || syncStatus === "migrating" || isManualSyncing
                ? "bg-blue-500 animate-pulse"
                : syncStatus === "error"
                ? "bg-rose-500"
                : "bg-slate-400"
            )}
          />
        </div>

        {/* Tablet view: Display name only */}
        <div className="hidden sm:flex md:hidden flex-col items-start leading-tight text-left max-w-[105px]">
          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate w-full">
            {displayName}
          </span>
        </div>

        {/* Laptop & Desktop view: Display name + handle */}
        <div className="hidden md:flex flex-col items-start leading-tight text-left max-w-[120px] lg:max-w-[140px]">
          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate w-full">
            {displayName}
          </span>
          {userHandle && (
            <span className="text-[9.5px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[110px]">
              @{userHandle}
            </span>
          )}
        </div>

        {/* Sync Status Indicator (Tablet & Laptop) */}
        <div className="hidden sm:flex items-center pl-0.5">
          {syncStatus === "syncing" || syncStatus === "migrating" || isManualSyncing ? (
            <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
          ) : syncStatus === "synced" ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" title="Cloud synchronized" />
          ) : syncStatus === "error" ? (
            <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-500/20" title="Sync error" />
          ) : syncStatus === "offline" ? (
            <span className="w-2 h-2 rounded-full bg-slate-400 ring-2 ring-slate-400/20" title="Local storage active" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-400" title="Idle" />
          )}
        </div>
      </button>

      {/* Adaptive Profile Presentation */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Global Backdrop across all views */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-slate-950/60 dark:bg-black/75 backdrop-blur-xs z-50 transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            {/* 1. MOBILE (<640px): True Bottom-Sheet.
                 Header (pull handle + title + close) is a `shrink-0` block OUTSIDE
                 the scrollable region, so it can never scroll out of reach no matter
                 how tall the body content gets. The body is its own `flex-1 min-h-0
                 overflow-y-auto` region. Bottom padding uses env(safe-area-inset-bottom)
                 directly (the previous `pb-safe` class does not exist in this Tailwind
                 setup and generated no CSS at all, which is why content could sit
                 under the home-indicator area). */}
            <div className="block sm:hidden fixed inset-x-0 bottom-0 z-50 px-2 pointer-events-none">
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="pointer-events-auto w-full max-w-lg mx-auto rounded-t-3xl border-t border-x border-slate-200/80 dark:border-white/15 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl max-h-[88dvh] overflow-hidden flex flex-col min-w-0"
                style={{
                  boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.35)",
                }}
              >
                {/* Sticky Header: pull handle + title + close — never scrolls away */}
                <div className="shrink-0 px-4 pt-3">
                  <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mx-auto mb-3" />
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 dark:border-white/[0.08]">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-500" />
                      Learner Profile
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                      aria-label="Close Profile Menu"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Scrollable body — independent scroll region, safe-area-aware bottom padding */}
                <div
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-3"
                  style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
                >
                  {renderProfileBody(true)}
                </div>
              </motion.div>
            </div>

            {/* 2. TABLET (640–1023px): Anchored Compact Popover (~360px wide).
                 Same sticky-header / scrollable-body split as mobile so long content
                 never pushes the close button out of reach or clips horizontally. */}
            <div className="hidden sm:block lg:hidden fixed top-16 right-4 z-50 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-auto w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/80 dark:border-white/15 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col min-w-0"
                style={{
                  boxShadow: "0 20px 48px -8px rgba(0, 0, 0, 0.45)",
                }}
              >
                {/* Sticky Header */}
                <div className="shrink-0 px-4 pt-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/[0.08]">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-500" />
                      Learner Profile
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                      aria-label="Close Profile Menu"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 pt-2.5">
                  {renderProfileBody(false)}
                </div>
              </motion.div>
            </div>

            {/* 3. DESKTOP (1024px+): Standard Dropdown anchored below Capsule */}
            <div className="hidden lg:block absolute top-full right-0 mt-2 z-50 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-auto w-[336px] rounded-2xl border border-slate-200/80 dark:border-white/15 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-3.5 max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain min-w-0"
                style={{
                  boxShadow: "0 20px 48px -8px rgba(0, 0, 0, 0.45)",
                }}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200/60 dark:border-white/[0.08]">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    Learner Profile
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Close Profile Menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {renderProfileBody(false)}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Full Profile & Details Dialog Modal (contains full avatar gallery for customization) */}
      <ProfileDetailsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}
