"use client";

import React from "react";

export interface BadgeDefinition {
  id: string;
  name: string;
  category: "progression" | "streak" | "mastery" | "engineering";
  description: string;
  icon: string;
  accentColor: string;
  threshold: number;
  metric: "lessons" | "streak" | "minutes";
}

export interface UserRank {
  level: number;
  title: string;
  minLessons: number;
  maxLessons: number;
  accentColor: string;
  description: string;
}

export const USER_RANKS: UserRank[] = [
  {
    level: 1,
    title: "Systems Novice",
    minLessons: 0,
    maxLessons: 4,
    accentColor: "#38bdf8", // Sky blue
    description: "Beginning the journey through Rust syntax & semantics.",
  },
  {
    level: 2,
    title: "Apprentice Coder",
    minLessons: 5,
    maxLessons: 9,
    accentColor: "#34d399", // Emerald
    description: "Understanding ownership, lifetimes, and safety primitives.",
  },
  {
    level: 3,
    title: "Borrow-Checker Specialist",
    minLessons: 10,
    maxLessons: 19,
    accentColor: "#a855f7", // Purple
    description: "Mastering zero-cost abstractions & memory contracts.",
  },
  {
    level: 4,
    title: "Systems Engineer",
    minLessons: 20,
    maxLessons: 34,
    accentColor: "#f59e0b", // Amber
    description: "Architecting concurrent pipelines & low-level drivers.",
  },
  {
    level: 5,
    title: "Concurrency Master",
    minLessons: 35,
    maxLessons: 49,
    accentColor: "#f43f5e", // Rose
    description: "Executing lock-free data structures & async runtimes.",
  },
  {
    level: 6,
    title: "Rust Core Architect",
    minLessons: 50,
    maxLessons: 999,
    accentColor: "#6366f1", // Indigo
    description: "Master of language design, compilers, & bare-metal code.",
  },
];

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "badge_first_lesson",
    name: "First Footprint",
    category: "progression",
    description: "Completed your first interactive lesson.",
    icon: "🌟",
    accentColor: "#38bdf8",
    threshold: 1,
    metric: "lessons",
  },
  {
    id: "badge_streak_3",
    name: "Ignition Streak",
    category: "streak",
    description: "Maintained a 3-day continuous study habit.",
    icon: "🔥",
    accentColor: "#f97316",
    threshold: 3,
    metric: "streak",
  },
  {
    id: "badge_streak_7",
    name: "Hyper-Threader",
    category: "streak",
    description: "Maintained a 7-day rigorous engineering streak.",
    icon: "⚡",
    accentColor: "#eab308",
    threshold: 7,
    metric: "streak",
  },
  {
    id: "badge_lessons_5",
    name: "Memory Safe",
    category: "progression",
    description: "Completed 5 lessons in core memory & ownership.",
    icon: "🛡️",
    accentColor: "#10b981",
    threshold: 5,
    metric: "lessons",
  },
  {
    id: "badge_lessons_10",
    name: "Systems Vanguard",
    category: "mastery",
    description: "Completed 10 comprehensive curriculum lessons.",
    icon: "💻",
    accentColor: "#6366f1",
    threshold: 10,
    metric: "lessons",
  },
  {
    id: "badge_time_60",
    name: "Deep Diver",
    category: "engineering",
    description: "Dedicated 60+ minutes of focused code practice.",
    icon: "⏱️",
    accentColor: "#8b5cf6",
    threshold: 60,
    metric: "minutes",
  },
  {
    id: "badge_lessons_25",
    name: "Grand Architect",
    category: "mastery",
    description: "Completed 25 lessons across advanced concurrency.",
    icon: "👑",
    accentColor: "#ec4899",
    threshold: 25,
    metric: "lessons",
  },
];

export function calculateUserRank(completedLessonsCount: number): {
  currentRank: UserRank;
  nextRank: UserRank | null;
  progressPercent: number;
  lessonsToNext: number;
} {
  const currentRank =
    USER_RANKS.slice()
      .reverse()
      .find((r) => completedLessonsCount >= r.minLessons) || USER_RANKS[0];

  const nextRank =
    USER_RANKS.find((r) => r.level === currentRank.level + 1) || null;

  if (!nextRank) {
    return {
      currentRank,
      nextRank: null,
      progressPercent: 100,
      lessonsToNext: 0,
    };
  }

  const range = nextRank.minLessons - currentRank.minLessons;
  const earned = completedLessonsCount - currentRank.minLessons;
  const progressPercent = Math.min(100, Math.round((earned / range) * 100));
  const lessonsToNext = Math.max(0, nextRank.minLessons - completedLessonsCount);

  return {
    currentRank,
    nextRank,
    progressPercent,
    lessonsToNext,
  };
}

export const calculateRankFromLessons = calculateUserRank;

export function evaluateUnlockedBadges(
  lessonsCount: number,
  streakDays: number,
  studyTimeMinutes: number,
  coins?: number
): {
  unlocked: (BadgeDefinition & { unlocked: true })[];
  locked: (BadgeDefinition & { unlocked: false; current: number; percent: number })[];
  unlockedCount: number;
  totalCount: number;
} {
  const unlocked: (BadgeDefinition & { unlocked: true })[] = [];
  const locked: (BadgeDefinition & { unlocked: false; current: number; percent: number })[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    let currentVal = 0;
    if (badge.metric === "lessons") currentVal = lessonsCount;
    else if (badge.metric === "streak") currentVal = streakDays;
    else if (badge.metric === "minutes") currentVal = studyTimeMinutes;

    if (currentVal >= badge.threshold) {
      unlocked.push({ ...badge, unlocked: true });
    } else {
      const percent = Math.min(99, Math.round((currentVal / badge.threshold) * 100));
      locked.push({ ...badge, unlocked: false, current: currentVal, percent });
    }
  }

  return {
    unlocked,
    locked,
    unlockedCount: unlocked.length,
    totalCount: BADGE_DEFINITIONS.length,
  };
}

export function evaluateBadges(metrics: {
  lessonsCount: number;
  streakDays: number;
  studyMinutes: number;
  coinsBalance?: number;
}): Array<
  BadgeDefinition & {
    unlocked: boolean;
    currentProgress: number;
    progressPercent: number;
  }
> {
  const results = [];
  for (const badge of BADGE_DEFINITIONS) {
    let currentVal = 0;
    if (badge.metric === "lessons") currentVal = metrics.lessonsCount;
    else if (badge.metric === "streak") currentVal = metrics.streakDays;
    else if (badge.metric === "minutes") currentVal = metrics.studyMinutes;

    const isUnlocked = currentVal >= badge.threshold;
    const progressPercent = Math.min(100, Math.round((currentVal / badge.threshold) * 100));

    results.push({
      ...badge,
      unlocked: isUnlocked,
      currentProgress: currentVal,
      progressPercent,
    });
  }
  return results;
}

