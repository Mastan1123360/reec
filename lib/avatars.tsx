"use client";

import React from "react";

export type GenderOption = "male" | "female";

export interface AvatarOption {
  id: string;
  name: string;
  title: string;
  gender: GenderOption;
  category: string;
  gradient: string;
  accentHex: string;
  bgHex: string;
  imageSrc: string;
  svgIcon: (className?: string) => React.ReactNode;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  // ==========================================
  // MALE PROFILES
  // ==========================================
  {
    id: "human-male-alex",
    name: "Alex",
    title: "Systems Engineer",
    gender: "male",
    category: "Systems",
    gradient: "from-blue-500 via-indigo-600 to-sky-600",
    accentHex: "#2563eb",
    bgHex: "#eff6ff",
    imageSrc: "/avatars/male-alex.png",
    svgIcon: (className = "w-6 h-6") => (
      <div className={`relative overflow-hidden rounded-full shrink-0 ${className}`}>
        <img
          src="/avatars/male-alex.png"
          alt="Alex"
          className="w-full h-full object-cover select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
      </div>
    ),
  },
  {
    id: "human-male-marcus",
    name: "Marcus",
    title: "Kernel Architect",
    gender: "male",
    category: "Architecture",
    gradient: "from-amber-500 via-orange-600 to-red-600",
    accentHex: "#ea580c",
    bgHex: "#fff7ed",
    imageSrc: "/avatars/male-marcus.png",
    svgIcon: (className = "w-6 h-6") => (
      <div className={`relative overflow-hidden rounded-full shrink-0 ${className}`}>
        <img
          src="/avatars/male-marcus.png"
          alt="Marcus"
          className="w-full h-full object-cover select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
      </div>
    ),
  },
  {
    id: "human-male-david",
    name: "David",
    title: "Compiler Specialist",
    gender: "male",
    category: "Compilers",
    gradient: "from-emerald-500 via-teal-600 to-cyan-700",
    accentHex: "#059669",
    bgHex: "#ecfdf5",
    imageSrc: "/avatars/male-david.png",
    svgIcon: (className = "w-6 h-6") => (
      <div className={`relative overflow-hidden rounded-full shrink-0 ${className}`}>
        <img
          src="/avatars/male-david.png"
          alt="David"
          className="w-full h-full object-cover select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
      </div>
    ),
  },
  {
    id: "human-male-ryan",
    name: "Ryan",
    title: "Embedded Developer",
    gender: "male",
    category: "Hardware",
    gradient: "from-violet-500 via-purple-600 to-indigo-700",
    accentHex: "#7c3aed",
    bgHex: "#f5f3ff",
    imageSrc: "/avatars/male-ryan.png",
    svgIcon: (className = "w-6 h-6") => (
      <div className={`relative overflow-hidden rounded-full shrink-0 ${className}`}>
        <img
          src="/avatars/male-ryan.png"
          alt="Ryan"
          className="w-full h-full object-cover select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
      </div>
    ),
  },

  // ==========================================
  // FEMALE PROFILES
  // ==========================================
  {
    id: "human-female-ava",
    name: "Ava",
    title: "Systems Engineer",
    gender: "female",
    category: "Systems",
    gradient: "from-sky-500 via-blue-600 to-indigo-600",
    accentHex: "#0284c7",
    bgHex: "#eff6ff",
    imageSrc: "/avatars/female-ava.png",
    svgIcon: (className = "w-6 h-6") => (
      <div className={`relative overflow-hidden rounded-full shrink-0 ${className}`}>
        <img
          src="/avatars/female-ava.png"
          alt="Ava"
          className="w-full h-full object-cover select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
      </div>
    ),
  },
  {
    id: "human-female-maya",
    name: "Maya",
    title: "Kernel Architect",
    gender: "female",
    category: "Architecture",
    gradient: "from-amber-500 via-orange-600 to-rose-600",
    accentHex: "#f97316",
    bgHex: "#fff7ed",
    imageSrc: "/avatars/female-maya.png",
    svgIcon: (className = "w-6 h-6") => (
      <div className={`relative overflow-hidden rounded-full shrink-0 ${className}`}>
        <img
          src="/avatars/female-maya.png"
          alt="Maya"
          className="w-full h-full object-cover select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
      </div>
    ),
  },
  {
    id: "human-female-sara",
    name: "Sara",
    title: "Compiler Specialist",
    gender: "female",
    category: "Compilers",
    gradient: "from-emerald-500 via-teal-600 to-cyan-700",
    accentHex: "#10b981",
    bgHex: "#f0fdf4",
    imageSrc: "/avatars/female-sara.png",
    svgIcon: (className = "w-6 h-6") => (
      <div className={`relative overflow-hidden rounded-full shrink-0 ${className}`}>
        <img
          src="/avatars/female-sara.png"
          alt="Sara"
          className="w-full h-full object-cover select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
      </div>
    ),
  },
  {
    id: "human-female-lily",
    name: "Lily",
    title: "Embedded Developer",
    gender: "female",
    category: "Hardware",
    gradient: "from-purple-500 via-violet-600 to-fuchsia-600",
    accentHex: "#a855f7",
    bgHex: "#faf5ff",
    imageSrc: "/avatars/female-lily.png",
    svgIcon: (className = "w-6 h-6") => (
      <div className={`relative overflow-hidden rounded-full shrink-0 ${className}`}>
        <img
          src="/avatars/female-lily.png"
          alt="Lily"
          className="w-full h-full object-cover select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
      </div>
    ),
  },
];

// Fallback ID mapping for legacy avatars
export const LEGACY_AVATAR_MAP: Record<string, string> = {
  "avatar-rustacean": "human-male-alex",
  "avatar-matrix": "human-male-marcus",
  "avatar-cosmic": "human-female-maya",
  "avatar-zen": "human-female-ava",
  "human-male-master": "human-male-alex",
  "human-female-master": "human-female-ava",
  "human-female-elena": "human-female-ava",
  "human-female-sophia": "human-female-sara",
  "human-female-chloe": "human-female-lily",
};

export const DEFAULT_GENDER: GenderOption = "male";
export const DEFAULT_AVATAR_ID = "human-male-alex";

const AVATAR_STORAGE_KEY = "reec_selected_avatar";
const GENDER_STORAGE_KEY = "reec_selected_gender";

export function resolveAvatarId(id?: string | null): string {
  if (!id) return DEFAULT_AVATAR_ID;
  if (LEGACY_AVATAR_MAP[id]) return LEGACY_AVATAR_MAP[id];
  const found = AVATAR_OPTIONS.find((a) => a.id === id);
  return found ? found.id : DEFAULT_AVATAR_ID;
}

export function getUserGender(): GenderOption {
  if (typeof window === "undefined") return DEFAULT_GENDER;
  try {
    const saved = localStorage.getItem(GENDER_STORAGE_KEY) as GenderOption | null;
    if (saved === "female" || saved === "male") return saved;
  } catch {}
  return DEFAULT_GENDER;
}

export function saveUserGender(gender: GenderOption): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GENDER_STORAGE_KEY, gender);
    window.dispatchEvent(new CustomEvent("reec_gender_changed", { detail: gender }));
  } catch {}
}

export function getSelectedAvatarId(): string {
  if (typeof window === "undefined") return DEFAULT_AVATAR_ID;
  try {
    const saved = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (saved) {
      return resolveAvatarId(saved);
    }
  } catch {}
  return DEFAULT_AVATAR_ID;
}

export function saveSelectedAvatarId(avatarId: string): void {
  if (typeof window === "undefined") return;
  try {
    const resolved = resolveAvatarId(avatarId);
    localStorage.setItem(AVATAR_STORAGE_KEY, resolved);
    window.dispatchEvent(new CustomEvent("reec_avatar_changed", { detail: resolved }));
  } catch {}
}

export function useUserAvatar(userMetadataAvatarId?: string, userMetadataGender?: string) {
  const [gender, setGender] = React.useState<GenderOption>(() => {
    if (userMetadataGender === "female" || userMetadataGender === "male") {
      return userMetadataGender;
    }
    return getUserGender();
  });

  const [avatarId, setAvatarId] = React.useState<string>(() => {
    return resolveAvatarId(userMetadataAvatarId || getSelectedAvatarId());
  });

  // Sync gender
  React.useEffect(() => {
    if (userMetadataGender === "female" || userMetadataGender === "male") {
      setGender(userMetadataGender);
      saveUserGender(userMetadataGender);
    }
  }, [userMetadataGender]);

  // Sync avatar
  React.useEffect(() => {
    if (userMetadataAvatarId) {
      const resolved = resolveAvatarId(userMetadataAvatarId);
      setAvatarId(resolved);
      saveSelectedAvatarId(resolved);
    }
  }, [userMetadataAvatarId]);

  // Listen for storage / cross-tab changes
  React.useEffect(() => {
    const onAvatarChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setAvatarId(resolveAvatarId(customEvent.detail));
      }
    };
    const onGenderChange = (e: Event) => {
      const customEvent = e as CustomEvent<GenderOption>;
      if (customEvent.detail) {
        setGender(customEvent.detail);
      }
    };
    window.addEventListener("reec_avatar_changed", onAvatarChange);
    window.addEventListener("reec_gender_changed", onGenderChange);
    return () => {
      window.removeEventListener("reec_avatar_changed", onAvatarChange);
      window.removeEventListener("reec_gender_changed", onGenderChange);
    };
  }, []);

  const selectAvatar = React.useCallback((id: string) => {
    const resolved = resolveAvatarId(id);
    setAvatarId(resolved);
    saveSelectedAvatarId(resolved);
  }, []);

  const selectGender = React.useCallback(
    (newGender: GenderOption) => {
      setGender(newGender);
      saveUserGender(newGender);
      // If current avatar is not from the selected gender, switch to default of that gender
      const current = AVATAR_OPTIONS.find((a) => a.id === avatarId);
      if (!current || current.gender !== newGender) {
        const nextDefault = newGender === "female" ? "human-female-ava" : "human-male-alex";
        setAvatarId(nextDefault);
        saveSelectedAvatarId(nextDefault);
      }
    },
    [avatarId]
  );

  const currentAvatar = React.useMemo(() => {
    return AVATAR_OPTIONS.find((a) => a.id === avatarId) || AVATAR_OPTIONS[0];
  }, [avatarId]);

  const genderFilteredAvatars = React.useMemo(() => {
    return AVATAR_OPTIONS.filter((a) => a.gender === gender);
  }, [gender]);

  return {
    avatarId,
    gender,
    currentAvatar,
    selectAvatar,
    selectGender,
    availableAvatars: AVATAR_OPTIONS,
    genderFilteredAvatars,
  };
}
