"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { useUserAvatar, AvatarOption } from "@/lib/avatars";
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
  const { user, profile } = useAuth();
  const { avatarId, gender, selectAvatar, genderFilteredAvatars } = useUserAvatar(
    profile?.avatarId || user?.user_metadata?.avatar_id,
    profile?.gender || user?.user_metadata?.gender
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
    <div className={cn("space-y-3 sm:space-y-3.5", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Choose Your Profile Avatar
            </h4>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              4 {gender === "female" ? "Female" : "Male"} Personas
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Select a verified persona for your sidebar, header, and community leaderboard.
          </p>
        </div>
        {savedSuccess && (
          <span className="self-start sm:self-center text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-fade-in bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {genderFilteredAvatars.map((av) => {
          const isSelected = av.id === avatarId;
          return (
            <button
              key={av.id}
              type="button"
              onClick={() => handlePickAvatar(av)}
              className={cn(
                "relative group flex flex-col items-center text-center p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer min-h-[96px] sm:min-h-[116px] justify-between",
                "border focus:outline-none focus:ring-2 focus:ring-blue-500/40",
                isSelected
                  ? "bg-blue-500/10 border-blue-500/60 shadow-md ring-1 ring-blue-500/30 dark:bg-blue-500/15"
                  : "glass-control hover:border-slate-300 dark:hover:border-white/20 active:scale-[0.98]"
              )}
            >
              {/* Selected Badge */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}

              {/* Avatar Icon Sphere */}
              <div
                className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 mb-1.5 sm:mb-2 shrink-0",
                  `bg-gradient-to-br ${av.gradient}`
                )}
                style={{
                  boxShadow: `0 6px 14px -3px ${av.accentHex}40`,
                }}
              >
                {av.svgIcon("w-full h-full")}
              </div>

              {/* Avatar Info */}
              <div className="w-full min-w-0">
                <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">
                  {av.name}
                </span>
                {!compact && (
                  <span className="block text-[9.5px] sm:text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-mono">
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
