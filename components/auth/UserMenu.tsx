/**
 * components/auth/UserMenu.tsx
 *
 * User Profile & Sync status indicator for Header navigation.
 * Built using the REEC Level 3 Elevated Glass Material System for Light and Dark modes.
 */
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  CloudOff,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/supabase/auth-context";
import { useUserAvatar } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const router = useRouter();
  const { user, username, openAuthModal, signOut, syncStatus, syncError, triggerSync } = useAuth();
  const { currentAvatar, avatarId, selectAvatar, availableAvatars } = useUserAvatar(user?.user_metadata?.avatar_id);
  const [isOpen, setIsOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
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
        className="flex items-center gap-1.5 p-1.5 lg:px-3 lg:py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/25 rounded-xl transition-all shadow-xs backdrop-blur-md cursor-pointer"
        title="Sign in to sync your progress to Supabase"
      >
        <div className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <User className="w-3.5 h-3.5" />
        </div>
        <span className="hidden lg:inline">Sign In</span>
      </button>
    );
  }

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await triggerSync();
    setIsManualSyncing(false);
  };

  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "User";
  const userHandle = username || user.user_metadata?.username || user.email?.split("@")[0];

  return (
    <div className="relative" ref={menuRef}>
      {/* Level 3 Glass capsule control: mobile/tablet shows ONLY profile picture, laptop shows username + profile picture */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 lg:px-2.5 lg:py-1.5 rounded-xl glass-control text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
        title={`${displayName} (@${userHandle})`}
      >
        {/* Profile Picture (Always visible across mobile, tablet, laptop) */}
        <div
          className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs transition-transform hover:scale-105",
            `bg-gradient-to-br ${currentAvatar.gradient}`
          )}
          style={{
            boxShadow: `0 2px 8px -1px ${currentAvatar.accentHex}40`,
          }}
        >
          {currentAvatar.svgIcon("w-3.5 h-3.5 text-white")}
        </div>

        {/* Username + Handle: ONLY visible on laptop/desktop (hidden on mobile/tablet) */}
        <div className="hidden lg:flex flex-col items-start leading-tight text-left">
          <span className="max-w-[105px] truncate font-medium text-slate-800 dark:text-slate-200">
            {displayName}
          </span>
          {userHandle && (
            <span className="text-[9.5px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[95px]">
              @{userHandle}
            </span>
          )}
        </div>

        {/* Sync Status Indicator (shown on laptop, or subtle dot) */}
        <div className="hidden lg:flex items-center pl-0.5">
          {syncStatus === "syncing" || syncStatus === "migrating" || isManualSyncing ? (
            <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
          ) : syncStatus === "synced" ? (
            <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-500/20" title="Cloud synchronized" />
          ) : syncStatus === "error" ? (
            <span className="w-2 h-2 rounded-full bg-slate-500 ring-2 ring-slate-500/20" title="Sync error" />
          ) : syncStatus === "offline" ? (
            <span className="w-2 h-2 rounded-full bg-slate-400 ring-2 ring-slate-400/20" title="Local storage active" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-400" title="Idle" />
          )}
        </div>
      </button>

      {/* Level 3 Elevated Glass Popover */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-2xl glass-surface p-2.5 z-50 text-slate-800 dark:text-slate-200 shadow-2xl"
        >
          <div className="px-3 py-2 border-b border-slate-100 dark:border-white/[0.08] mb-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{displayName}</div>
              {userHandle && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
                  @{userHandle}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</div>
          </div>

          {/* Sync Status Banner */}
          <div className="px-3 py-2 my-1 rounded-xl glass-elevated text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              {syncStatus === "syncing" || syncStatus === "migrating" || isManualSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  <span>Syncing to cloud...</span>
                </>
              ) : syncStatus === "synced" ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  <span>Cloud up to date</span>
                </>
              ) : syncStatus === "offline" ? (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Local only (DB pending)</span>
                </>
              ) : syncStatus === "error" ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
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
              onClick={handleManualSync}
              disabled={isManualSyncing || syncStatus === "syncing"}
              className="p-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded transition-colors disabled:opacity-50 cursor-pointer"
              title="Sync now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Quick Profile Picture Selection */}
          <div className="py-2 px-1 border-t border-slate-100 dark:border-white/[0.08]">
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Profile Avatar
              </span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/settings");
                }}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                More
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5 px-1">
              {availableAvatars.map((av) => {
                const isSelected = av.id === avatarId;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={async () => {
                      selectAvatar(av.id);
                      if (user) {
                        try {
                          const { getSupabaseClient } = await import("@/lib/supabase/client");
                          const client = getSupabaseClient();
                          if (client) {
                            await client.auth.updateUser({
                              data: { avatar_id: av.id },
                            });
                          }
                        } catch {}
                      }
                    }}
                    title={av.name}
                    className={cn(
                      "flex items-center justify-center p-1 rounded-xl transition-all cursor-pointer",
                      isSelected
                        ? "ring-2 ring-blue-500 scale-105"
                        : "opacity-60 hover:opacity-100 hover:scale-105"
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-xs",
                        `bg-gradient-to-br ${av.gradient}`
                      )}
                    >
                      {av.svgIcon("w-4 h-4 text-white")}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-1 mt-1 border-t border-slate-100 dark:border-white/[0.08] space-y-0.5">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/settings");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Reset All Progress</span>
            </button>

            <button
              onClick={async () => {
                setIsOpen(false);
                await signOut();
                router.push("/");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
