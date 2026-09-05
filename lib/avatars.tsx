"use client";

import React from "react";

export interface AvatarOption {
  id: string;
  name: string;
  title: string;
  category: string;
  gradient: string;
  accentHex: string;
  bgHex: string;
  svgIcon: (className?: string) => React.ReactNode;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: "avatar-rustacean",
    name: "Ferris Architect",
    title: "Rust Systems & Compilers",
    category: "Systems",
    gradient: "from-amber-500 via-orange-600 to-red-600",
    accentHex: "#ea580c",
    bgHex: "#fff7ed",
    svgIcon: (className = "w-6 h-6") => (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Outer Hexagon */}
        <path
          d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
          className="opacity-60"
        />
        {/* Core Gear / Turbine */}
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
        <path d="M12 4.5V7M12 17V19.5M4.5 12H7M17 12H19.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M6.8 6.8L8.6 8.6M15.4 15.4L17.2 17.2M6.8 17.2L8.6 15.4M15.4 8.6L17.2 6.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "avatar-matrix",
    name: "Kernel Operator",
    title: "Low-Level & Concurrency",
    category: "Security",
    gradient: "from-emerald-400 via-teal-600 to-cyan-700",
    accentHex: "#059669",
    bgHex: "#ecfdf5",
    svgIcon: (className = "w-6 h-6") => (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Terminal Window frame */}
        <rect x="3" y="4" width="18" height="16" rx="3.5" stroke="currentColor" strokeWidth="1.8" />
        {/* Prompt chevron */}
        <path d="M7 10L10.5 12.5L7 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Cursor underscore */}
        <path d="M12.5 15H17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        {/* Top window dots */}
        <circle cx="6" cy="7" r="0.75" fill="currentColor" />
        <circle cx="8" cy="7" r="0.75" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "avatar-cosmic",
    name: "Cosmic Synthesist",
    title: "Distributed Architectures",
    category: "Cloud",
    gradient: "from-purple-500 via-indigo-600 to-blue-700",
    accentHex: "#6366f1",
    bgHex: "#eef2ff",
    svgIcon: (className = "w-6 h-6") => (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Orbit Rings */}
        <ellipse cx="12" cy="12" rx="9" ry="4" stroke="currentColor" strokeWidth="1.6" transform="rotate(-30 12 12)" className="opacity-70" />
        <ellipse cx="12" cy="12" rx="9" ry="4" stroke="currentColor" strokeWidth="1.6" transform="rotate(30 12 12)" className="opacity-70" />
        {/* Celestial Core Sphere */}
        <circle cx="12" cy="12" r="3.2" fill="currentColor" />
        {/* Sparkling satellite nodes */}
        <circle cx="19" cy="8" r="1.2" fill="currentColor" />
        <circle cx="5" cy="16" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "avatar-zen",
    name: "Prism Polymath",
    title: "Algorithms & Verification",
    category: "Algorithms",
    gradient: "from-cyan-400 via-blue-600 to-violet-600",
    accentHex: "#0284c7",
    bgHex: "#f0f9ff",
    svgIcon: (className = "w-6 h-6") => (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Prism Triangle */}
        <path d="M12 3L21 19H3L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        {/* Refracted spectrum beams */}
        <path d="M12 3L12 19" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 2" className="opacity-60" />
        <path d="M8 19L12 11L16 19" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="12" cy="11" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
];

const AVATAR_STORAGE_KEY = "reec_selected_avatar";

export function getSelectedAvatarId(): string {
  if (typeof window === "undefined") return AVATAR_OPTIONS[0].id;
  try {
    const saved = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (saved && AVATAR_OPTIONS.some((a) => a.id === saved)) {
      return saved;
    }
  } catch {}
  return AVATAR_OPTIONS[0].id;
}

export function saveSelectedAvatarId(avatarId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, avatarId);
    window.dispatchEvent(new CustomEvent("reec_avatar_changed", { detail: avatarId }));
  } catch {}
}

export function useUserAvatar(userMetadataAvatarId?: string) {
  const [avatarId, setAvatarId] = React.useState<string>(() => {
    return userMetadataAvatarId || getSelectedAvatarId();
  });

  React.useEffect(() => {
    if (userMetadataAvatarId && AVATAR_OPTIONS.some((a) => a.id === userMetadataAvatarId)) {
      setAvatarId(userMetadataAvatarId);
      saveSelectedAvatarId(userMetadataAvatarId);
    }
  }, [userMetadataAvatarId]);

  React.useEffect(() => {
    const onAvatarChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setAvatarId(customEvent.detail);
      }
    };
    window.addEventListener("reec_avatar_changed", onAvatarChange);
    return () => window.removeEventListener("reec_avatar_changed", onAvatarChange);
  }, []);

  const selectAvatar = React.useCallback((id: string) => {
    setAvatarId(id);
    saveSelectedAvatarId(id);
  }, []);

  const currentAvatar = React.useMemo(() => {
    return AVATAR_OPTIONS.find((a) => a.id === avatarId) || AVATAR_OPTIONS[0];
  }, [avatarId]);

  return {
    avatarId,
    currentAvatar,
    selectAvatar,
    availableAvatars: AVATAR_OPTIONS,
  };
}
