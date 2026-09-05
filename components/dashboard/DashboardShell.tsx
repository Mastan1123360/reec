"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  OverallProgressCard,
  CurrentStreakCard,
  TimeInvestedCard,
  TotalLessonsCard,
} from "@/components/dashboard/TopMetricsRow";
import { RoadmapStepperCard } from "@/components/dashboard/RoadmapStepperCard";
import { ContinueLearningCard } from "@/components/dashboard/ContinueLearningCard";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { LearningAnalyticsCard } from "@/components/dashboard/LearningAnalyticsCard";
import { UpcomingMilestonesCard } from "@/components/dashboard/UpcomingMilestonesCard";
import { PhilosophyQuoteWidget } from "@/components/dashboard/PhilosophyQuoteWidget";
import type { DashboardPhase, DashboardLesson } from "./types";
import { staggerContainerVariants, cardEntranceVariants } from "@/lib/motion";
import { useAuth } from "@/lib/supabase/auth-context";

interface DashboardShellProps {
  phases: DashboardPhase[];
  allLessons: DashboardLesson[];
}

export function DashboardShell({
  phases,
  allLessons,
}: DashboardShellProps) {
  const { user, username } = useAuth();
  const displayName = user ? (username || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User") : "guest";

  return (
    <div className="flex-1 min-h-0 h-full w-full overflow-hidden flex flex-col justify-start">
      {/* ========================================================================= */}
      {/* DESKTOP LAYOUT (lg:flex) — Compact, Non-scrollable Viewport-fitting       */}
      {/* ========================================================================= */}
      <motion.div
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
        className="hidden lg:flex flex-col flex-1 h-full min-h-0 p-3.5 xl:p-4 gap-3 xl:gap-3.5 overflow-hidden justify-between"
      >
        {/* 0. Top Hero Welcome Banner */}
        <motion.div
          variants={cardEntranceVariants}
          className="flex items-center justify-between shrink-0 px-1"
        >
          <div className="flex flex-col">
            <h1 className="text-xl xl:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Good to see you back, <span className="text-blue-600 dark:text-blue-400">{displayName}</span>
            </h1>
            <p className="text-[11.5px] xl:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Track your progress. Learn consistently. Become unstoppable.
            </p>
          </div>

          {/* Top Right Philosophy Quote - Plain Text, no card styling */}
          <div
            id="desktop-philosophy-quote"
            className="hidden md:flex items-center gap-2.5 select-none text-left"
          >
            <span className="text-2xl font-serif text-blue-600 dark:text-blue-400 font-black leading-none shrink-0 opacity-80">
              “
            </span>
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                Understand the machine.
                <br />
                Then make it yours.
              </div>
              <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                — REEC Philosophy
              </div>
            </div>
          </div>
        </motion.div>

        {/* 1. Top Metric Row: 4 Equal Cards across full width */}
        <motion.div
          variants={cardEntranceVariants}
          className="grid grid-cols-4 gap-3 xl:gap-3.5 shrink-0"
        >
          <OverallProgressCard allLessons={allLessons} />
          <CurrentStreakCard />
          <TimeInvestedCard />
          <TotalLessonsCard allLessons={allLessons} phasesCount={phases.length} />
        </motion.div>

        {/* 2. Main 2-Column Content Grid: 8 Cols Left + 4 Cols Right */}
        <div className="grid grid-cols-12 gap-3 xl:gap-3.5 flex-1 min-h-0 items-stretch">
          {/* LEFT COLUMN: Curriculum Carousel + Continue Learning + Recent Activity */}
          <div className="col-span-8 flex flex-col justify-between gap-3 xl:gap-3.5 h-full min-h-0">
            {/* Your Curriculum Carousel */}
            <motion.div variants={cardEntranceVariants} className="shrink-0">
              <RoadmapStepperCard phases={phases} />
            </motion.div>

            {/* Continue Learning - Compact size */}
            <motion.div variants={cardEntranceVariants} className="shrink-0">
              <ContinueLearningCard allLessons={allLessons} />
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={cardEntranceVariants} className="shrink-0">
              <RecentActivityCard />
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Learning Analytics + Upcoming Milestones + Philosophy Quote */}
          <div className="col-span-4 flex flex-col justify-between gap-3 xl:gap-3.5 h-full min-h-0">
            {/* Learning Analytics */}
            <motion.div variants={cardEntranceVariants} className="shrink-0">
              <LearningAnalyticsCard />
            </motion.div>

            {/* Upcoming Milestones */}
            <motion.div variants={cardEntranceVariants} className="shrink-0">
              <UpcomingMilestonesCard phases={phases} allLessons={allLessons} />
            </motion.div>

            {/* REEC Philosophy Quote */}
            <motion.div variants={cardEntranceVariants} className="shrink-0">
              <PhilosophyQuoteWidget />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ========================================================================= */}
      {/* MOBILE / TABLET LAYOUT (< lg:) — Responsive Scrollable                   */}
      {/* ========================================================================= */}
      <motion.div
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
        className="flex lg:hidden flex-col space-y-3.5 p-3 sm:p-4 overflow-y-auto pb-28 sm:pb-32"
      >
        {/* Top Metric Cards: 2-cols on mobile, 4-cols on tablet (md:) */}
        <motion.div
          variants={cardEntranceVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3"
        >
          <OverallProgressCard allLessons={allLessons} />
          <CurrentStreakCard />
          <TimeInvestedCard />
          <TotalLessonsCard allLessons={allLessons} phasesCount={phases.length} />
        </motion.div>

        {/* 2-Column Grid on Tablet / 1-Column on Mobile */}
        <div className="flex flex-col md:grid md:grid-cols-12 gap-3.5 items-start">
          {/* Main Left Column */}
          <div className="w-full md:col-span-7 flex flex-col space-y-3.5">
            <motion.div variants={cardEntranceVariants}>
              <RoadmapStepperCard phases={phases} />
            </motion.div>

            <motion.div variants={cardEntranceVariants}>
              <ContinueLearningCard allLessons={allLessons} />
            </motion.div>

            <motion.div variants={cardEntranceVariants}>
              <RecentActivityCard />
            </motion.div>
          </div>

          {/* Side Right Column */}
          <div className="w-full md:col-span-5 flex flex-col space-y-3.5">
            <motion.div variants={cardEntranceVariants}>
              <LearningAnalyticsCard />
            </motion.div>

            <motion.div variants={cardEntranceVariants}>
              <UpcomingMilestonesCard phases={phases} allLessons={allLessons} />
            </motion.div>

            <motion.div variants={cardEntranceVariants}>
              <PhilosophyQuoteWidget />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
