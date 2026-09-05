"use client";

import * as React from "react";
import { Check, Sparkles } from "lucide-react";
import { AVATAR_OPTIONS, useUserAvatar, AvatarOption } from "@/lib/avatars";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/supabase/auth-context";
import { getSupabaseClient } from "@/lib/supabase/client";

interface ProfileAvatarPickerProps {
  className?: string;
  compact?: boolean;
  onSelect?: (avatar: AvatarOption) => void;
}

export function ProfileAvatarPicker({
  className,
  compact = false,
  onSelect,
}: ProfileAvatarPickerProps) {
  const { user } = useAuth();
  const { avatarId, selectAvatar, availableAvatars } = useUserAvatar(
    user?.user_metadata?.avatar_id
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const handlePickAvatar = async (avatar: AvatarOption) => {
    selectAvatar(avatar.id);
    onSelect?.(avatar);

    if (user) {
      setIsSaving(true);
      try {
        const client = getSupabaseClient();
        if (client) {
          await client.auth.updateUser({
            data: { avatar_id: avatar.id },
          });
        }
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      } catch (e) {
        console.warn("[Avatar] Failed to update user metadata in Supabase:", e);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>Choose Your Profile Avatar</span>
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              4 Distinct Styles
            </span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Select a verified persona for your sidebar, header, and community leaderboard.
          </p>
        </div>
        {savedSuccess && (
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-fade-in">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {availableAvatars.map((av) => {
          const isSelected = av.id === avatarId;
          return (
            <button
              key={av.id}
              type="button"
              onClick={() => handlePickAvatar(av)}
              className={cn(
                "relative group flex flex-col items-center text-center p-3 rounded-2xl transition-all cursor-pointer",
                "border focus:outline-none focus:ring-2 focus:ring-blue-500/40",
                isSelected
                  ? "bg-blue-500/10 border-blue-500/50 shadow-md ring-1 ring-blue-500/30"
                  : "glass-control hover:border-slate-300 dark:hover:border-white/20"
              )}
            >
              {/* Selected Badge */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}

              {/* Avatar Icon Sphere */}
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 mb-2",
                  `bg-gradient-to-br ${av.gradient}`
                )}
                style={{
                  boxShadow: `0 8px 16px -4px ${av.accentHex}40`,
                }}
              >
                {av.svgIcon("w-6 h-6 text-white")}
              </div>

              {/* Avatar Info */}
              <div className="w-full">
                <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">
                  {av.name}
                </span>
                {!compact && (
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-mono">
                    {av.title}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
