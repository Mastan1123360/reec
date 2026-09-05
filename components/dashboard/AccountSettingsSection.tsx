/**
 * components/dashboard/AccountSettingsSection.tsx
 *
 * Account & Learning Settings section with Danger Zone for "Reset All Progress".
 * Matches REEC Apple Glass design system and WCAG AA accessibility standards.
 */
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Trash2,
  Cloud,
  CloudOff,
  RefreshCw,
  User,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Database,
  UserX,
  AtSign,
  Clock,
  Check,
  AlertCircle,
  Edit2,
  Shield,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/supabase/auth-context";
import { ResetDataModal } from "@/components/auth/ResetDataModal";
import { DeleteAccountModal } from "@/components/auth/DeleteAccountModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { cn } from "@/lib/utils";
import {
  checkUsernameChangeCooldown,
  validateUsernameSyntax,
  isUsernameAvailable,
  normalizeUsername,
} from "@/lib/supabase/username-service";

import { ProfileAvatarPicker } from "@/components/auth/ProfileAvatarPicker";
import { useUserAvatar } from "@/lib/avatars";

export function AccountSettingsSection({
  className,
}: {
  className?: string;
}) {
  const {
    user,
    username,
    lastUsernameChangedAt,
    updateUsername,
    openAuthModal,
    signOut,
    syncStatus,
    syncError,
    triggerSync,
    isConfigured,
  } = useAuth();

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Username edit state
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState("");
  const [usernameCheckStatus, setUsernameCheckStatus] = useState<{
    checking: boolean;
    available?: boolean;
    error?: string;
  }>({ checking: false });
  const [usernameSubmitError, setUsernameSubmitError] = useState<string | null>(null);
  const [usernameSubmitSuccess, setUsernameSubmitSuccess] = useState<string | null>(null);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

  // Check 6-month cooldown
  const cooldownStatus = checkUsernameChangeCooldown(lastUsernameChangedAt);

  // Debounced check for new username availability
  useEffect(() => {
    if (!isEditingUsername || !newUsernameInput.trim()) {
      setUsernameCheckStatus({ checking: false });
      return;
    }

    const clean = normalizeUsername(newUsernameInput);
    if (clean === username) {
      setUsernameCheckStatus({ checking: false, available: true });
      return;
    }

    const syntax = validateUsernameSyntax(clean);
    if (!syntax.valid) {
      setUsernameCheckStatus({ checking: false, available: false, error: syntax.error });
      return;
    }

    setUsernameCheckStatus({ checking: true });
    const timer = setTimeout(async () => {
      const res = await isUsernameAvailable(clean, user?.id);
      setUsernameCheckStatus({
        checking: false,
        available: res.available,
        error: res.error,
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [newUsernameInput, isEditingUsername, username, user?.id]);

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameSubmitError(null);
    setUsernameSubmitSuccess(null);

    const clean = normalizeUsername(newUsernameInput);
    if (clean === username) {
      setIsEditingUsername(false);
      return;
    }

    setIsUpdatingUsername(true);
    const res = await updateUsername(clean);
    setIsUpdatingUsername(false);

    if (res.success) {
      setUsernameSubmitSuccess(`Username successfully updated to @${clean}. Next change allowed in 6 months.`);
      setIsEditingUsername(false);
      setNewUsernameInput("");
      setTimeout(() => setUsernameSubmitSuccess(null), 7000);
    } else {
      setUsernameSubmitError(res.error || "Failed to update username");
    }
  };

  const handleManualSync = async () => {
    if (isSyncing || syncStatus === "syncing") return;
    setIsSyncing(true);
    await triggerSync();
    setTimeout(() => setIsSyncing(false), 500);
  };

  const getSyncBadge = () => {
    if (!isConfigured) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
          <CloudOff className="w-3 h-3 text-slate-400" />
          <span>Local Storage Only</span>
        </span>
      );
    }
    if (!user) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Cloud className="w-3 h-3 text-amber-400" />
          <span>Guest (Local Persistence)</span>
        </span>
      );
    }
    switch (syncStatus) {
      case "syncing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
            <span>Syncing Cloud...</span>
          </span>
        );
      case "synced":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Cloud Synchronized</span>
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Sync Retry Ready</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Database className="w-3 h-3 text-slate-400" />
            <span>Cloud Connected</span>
          </span>
        );
    }
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Account Settings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-900/[0.06] dark:border-white/[0.08]">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Account & Learning Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your session, cloud sync status, and educational progress records.
          </p>
        </div>
        <div>{getSyncBadge()}</div>
      </div>

      {/* 1. Profiles & Avatar Section */}
      <div className="rounded-2xl glass-elevated p-4 sm:p-5">
        <ProfileAvatarPicker />
      </div>

      {/* Grid: Account Overview + Cloud Sync Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Profile Card */}
        <div
          className="rounded-2xl glass-elevated p-3.5 sm:p-4 flex flex-col justify-between"
        >
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Learner Profile
              </span>
              <p className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                {user?.email || "Guest Session"}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                {user ? "Authenticated Account" : "Local Browser Persistence"}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-900/[0.04] dark:border-white/[0.05] flex items-center justify-between">
            {user ? (
              <button
                type="button"
                onClick={() => signOut()}
                className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>

        {/* Authentication Card */}
        <div
          className="rounded-2xl glass-elevated p-3.5 sm:p-4 flex flex-col justify-between"
        >
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Authentication
              </span>
              <p className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                {user?.app_metadata?.provider
                  ? `OAuth (${String(user.app_metadata.provider).toUpperCase()})`
                  : user
                  ? "Email & Password"
                  : "Not Signed In"}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Google, GitHub & Password Login
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-900/[0.04] dark:border-white/[0.05] flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Protected by Supabase Auth
            </span>
          </div>
        </div>

        {/* Cloud Synchronization Card */}
        <div
          className="rounded-2xl glass-elevated p-3.5 sm:p-4 flex flex-col justify-between"
        >
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Cloud Sync
              </span>
              <p className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                {user ? "Automated Background Sync" : "Local Sync Active"}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                {syncError ? "Sync issue detected" : "Cross-device persistent"}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-900/[0.04] dark:border-white/[0.05] flex items-center justify-between">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing || syncStatus === "syncing"}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
              <span>{isSyncing ? "Syncing..." : "Sync Cloud Now"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Username & Community Identity Card */}
      <div
        className="rounded-2xl glass-surface p-4 sm:p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-900/[0.06] dark:border-white/[0.08]">
          <div className="flex items-start gap-3">
            <AtSign className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Unique Username Handle
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
                  Globally Unique
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                Your verified identifier on the platform. Every username is strictly unique across all users and can only be changed once every 6 months to preserve identity integrity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {user ? (
              cooldownStatus.canChange ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Check className="w-3 h-3" /> Change Eligible
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Clock className="w-3 h-3" /> 6-Month Cooldown ({cooldownStatus.remainingDays} days left)
                </span>
              )
            ) : null}
          </div>
        </div>

        {/* Current Username Details */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Current Handle
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white">
                @{username || (user?.email?.split("@")[0] ?? "guest")}
              </span>
              {user && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Verified Unique
                </span>
              )}
            </div>
            {lastUsernameChangedAt && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                <span>Last updated: {new Date(lastUsernameChangedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
              </p>
            )}
          </div>

          <div>
            {!user ? (
              <button
                type="button"
                onClick={openAuthModal}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-xs cursor-pointer"
              >
                Sign In to Reserve Handle
              </button>
            ) : !isEditingUsername ? (
              <button
                type="button"
                disabled={!cooldownStatus.canChange}
                onClick={() => {
                  setIsEditingUsername(true);
                  setNewUsernameInput(username || "");
                  setUsernameSubmitError(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                  cooldownStatus.canChange
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-white/10 cursor-not-allowed"
                )}
                title={cooldownStatus.canChange ? "Change your handle" : cooldownStatus.reason}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Change Username</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Username Change Form (if permitted and in edit mode) */}
        {isEditingUsername && (
          <form onSubmit={handleSaveUsername} className="pt-3 border-t border-slate-900/[0.04] dark:border-white/[0.05] space-y-3">
            <div className="max-w-md">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Desired Handle <span className="text-slate-400 text-[10px] font-normal">(3-20 lowercase letters, numbers, underscores)</span>
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={newUsernameInput}
                  onChange={(e) => setNewUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="new_handle"
                  maxLength={20}
                  className="w-full bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/90 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl pl-9 pr-9 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                  {usernameCheckStatus.checking ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  ) : usernameCheckStatus.available === true && newUsernameInput.length >= 3 ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : usernameCheckStatus.available === false ? (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  ) : null}
                </div>
              </div>

              {usernameCheckStatus.error && (
                <p className="mt-1 text-[11px] text-rose-500 font-medium">
                  {usernameCheckStatus.error}
                </p>
              )}
              {usernameCheckStatus.available && newUsernameInput !== username && newUsernameInput.length >= 3 && (
                <p className="mt-1 text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> @{normalizeUsername(newUsernameInput)} is available!
                </p>
              )}

              <p className="mt-1.5 text-[10.5px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3 shrink-0" />
                <span>Once changed, you will not be able to change it again for 6 months.</span>
              </p>
            </div>

            {usernameSubmitError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{usernameSubmitError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isUpdatingUsername || usernameCheckStatus.available === false || !newUsernameInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isUpdatingUsername ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Save New Username</span>
                )}
              </button>
              <button
                type="button"
                disabled={isUpdatingUsername}
                onClick={() => {
                  setIsEditingUsername(false);
                  setUsernameSubmitError(null);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {usernameSubmitSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{usernameSubmitSuccess}</span>
          </div>
        )}

        {/* 6-Month Cooldown Banner if not eligible */}
        {!cooldownStatus.canChange && user && (
          <div className="p-3 rounded-xl bg-amber-500/[0.08] dark:bg-amber-500/[0.05] border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Username change cooldown active</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                You changed your username recently. To prevent identity spoofing, usernames may only be changed once every 6 months. Next change available in {cooldownStatus.remainingDays} days (on {cooldownStatus.nextChangeDate}).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DANGER ZONE: Prominently Labeled & Clearly Discoverable on the Website   */}
      {/* ========================================================================= */}
      <div
        className="rounded-2xl border border-red-500/25 dark:border-red-500/30 bg-red-500/[0.03] dark:bg-red-950/[0.12] p-4 sm:p-5 backdrop-blur-xl transition-all space-y-4"
        style={{
          boxShadow: "0 4px 20px -4px rgba(239, 68, 68, 0.08), var(--glass-inner-highlight)",
        }}
      >
        {/* Section Tag */}
        <div className="flex items-center gap-2 pb-2 border-b border-red-500/15 dark:border-red-500/20">
          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
            Danger Zone
          </h3>
        </div>

        {/* Action 1: Reset All Progress */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-red-500/10 dark:border-red-500/15">
          <div className="space-y-1 max-w-2xl">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Reset All Progress
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Permanently reset your REEC learning progress, including completed lessons,
              bookmarks, notes, study statistics, hidden lesson unlocks, projects, workspace
              files, and activity history. Your account remains active.
            </p>
          </div>

          <div className="shrink-0 flex items-center">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-sm border border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>Reset All Progress</span>
            </button>
          </div>
        </div>

        {/* Action 2: Delete Account & Data */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h4 className="text-sm font-bold text-red-600 dark:text-red-400">
              Delete Account & Data
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Permanently delete your REEC account, authentication credentials, and all cloud learning data.
              This action cannot be undone. Official course content remains unaffected.
            </p>
          </div>

          <div className="shrink-0 flex items-center">
            <button
              type="button"
              onClick={() => {
                if (user) {
                  setIsDeleteModalOpen(true);
                } else {
                  openAuthModal();
                }
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-sm shadow-red-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 cursor-pointer"
            >
              <UserX className="w-3.5 h-3.5 shrink-0" />
              <span>Delete Account & Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secure 2-Step Confirmation Modals */}
      <ResetDataModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
      />

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />

      <AuthModal />
    </div>
  );
}
