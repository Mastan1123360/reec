"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { User } from "lucide-react";
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
import { DashboardProfileCard } from "@/components/dashboard/DashboardProfileCard";
import { ProfileDetailsModal } from "@/components/auth/ProfileDetailsModal";
import type { DashboardPhase, DashboardLesson } from "./types";
import { staggerContainerVariants, cardEntranceVariants } from "@/lib/motion";
import { useAuth } from "@/lib/supabase/auth-context";
import { getDynamicGreeting, getFallbackGreeting } from "@/lib/greeting";

interface DashboardShellProps {
  phases: DashboardPhase[];
  allLessons: DashboardLesson[];
}

export function DashboardShell({
  phases,
  allLessons,
}: DashboardShellProps) {
  const { user, username, profile } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const handleOpenProfile = () => setIsProfileModalOpen(true);
    window.addEventListener("reec:open-dashboard-profile", handleOpenProfile);
    return () => {
      window.removeEventListener("reec:open-dashboard-profile", handleOpenProfile);
    };
  }, []);

  const effectiveDisplayName = profile?.displayName || "";

  const dynamicGreeting = React.useMemo(() => {
    if (!mounted) {
      return getFallbackGreeting(effectiveDisplayName, Boolean(user));
    }
    return getDynamicGreeting(Boolean(user), effectiveDisplayName, user?.id);
  }, [mounted, user, effectiveDisplayName]);

  return (
    <div className="flex-1 min-h-0 h-full w-full overflow-y-auto overflow-x-hidden">
      <motion.div
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
        className="w-full max-w-[1600px] mx-auto p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 pb-20 sm:pb-24 flex flex-col gap-3.5 sm:gap-4 lg:gap-5"
      >
        {/* 0. Top Hero Welcome Banner with Dynamic Greeting */}
        <motion.div
          variants={cardEntranceVariants}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 px-1"
        >
          <div className="flex flex-col">
            <h1
              id="dashboard-hero-dynamic-heading"
              suppressHydrationWarning
              className="text-xl sm:text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight"
            >
              <span suppressHydrationWarning>{dynamicGreeting.greeting}</span>{" "}
              <span
                suppressHydrationWarning
                className="text-blue-600 dark:text-blue-400"
              >
                {dynamicGreeting.targetName}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Track your progress. Learn consistently. Become unstoppable.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Philosophy Quote Pill / Callout */}
            <div
              id="dashboard-philosophy-quote"
              className="hidden md:flex items-center gap-2.5 select-none text-left shrink-0 pl-4 border-l border-slate-900/[0.06] dark:border-white/[0.08]"
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
          </div>
        </motion.div>

        {/* 1. Top Metrics Row:
             - Mobile (< sm:): 2 columns
             - Tablet & Desktop (md:+): 4 columns
        */}
        <motion.div
          variants={cardEntranceVariants}
          className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-3.5 shrink-0"
        >
          <OverallProgressCard allLessons={allLessons} />
          <CurrentStreakCard />
          <TimeInvestedCard />
          <TotalLessonsCard allLessons={allLessons} phasesCount={phases.length} />
        </motion.div>

        {/* Mobile & Tablet Compact Profile Card (< lg: 1024px) */}
        <motion.div
          id="dashboard-profile-mobile-section"
          variants={cardEntranceVariants}
          className="block lg:hidden w-full min-w-0 shrink-0"
        >
          <DashboardProfileCard
            variant="compact"
            onOpenDetails={() => setIsProfileModalOpen(true)}
          />
        </motion.div>

        {/* 2. Main Responsive Content Grid:
             - Mobile / Tablet (< lg:): Single vertical flow
             - Desktop (lg:+): 12-column layout (8 cols left + 4 cols right)
        */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 lg:gap-4 xl:gap-5 items-start">
          {/* LEFT COLUMN: Continue Learning + Curriculum Stepper + Recent Activity */}
          <div className="lg:col-span-8 flex flex-col gap-3.5 sm:gap-4 lg:gap-5">
            {/* Primary Hero Mission */}
            <motion.div variants={cardEntranceVariants}>
              <ContinueLearningCard allLessons={allLessons} />
            </motion.div>

            {/* Curriculum Stepper Carousel */}
            <motion.div variants={cardEntranceVariants}>
              <RoadmapStepperCard phases={phases} />
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={cardEntranceVariants}>
              <RecentActivityCard />
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Learner Profile + Learning Analytics + Upcoming Milestones + Philosophy Quote */}
          <div className="lg:col-span-4 flex flex-col gap-3.5 sm:gap-4 lg:gap-5">
            {/* 1. Learner Profile & Details Card on desktop only */}
            <motion.div variants={cardEntranceVariants} className="hidden lg:block">
              <DashboardProfileCard
                variant="standard"
                onOpenDetails={() => setIsProfileModalOpen(true)}
              />
            </motion.div>

            {/* 2. Learning Analytics */}
            <motion.div variants={cardEntranceVariants}>
              <LearningAnalyticsCard />
            </motion.div>

            {/* 3. Upcoming Milestones */}
            <motion.div variants={cardEntranceVariants}>
              <UpcomingMilestonesCard phases={phases} allLessons={allLessons} />
            </motion.div>

            {/* 4. REEC Philosophy Quote Widget */}
            <motion.div variants={cardEntranceVariants}>
              <PhilosophyQuoteWidget />
            </motion.div>
          </div>
        </div>

        {/* Learner Profile Details Modal displayed in front of dashboard */}
        <ProfileDetailsModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      </motion.div>
    </div>
  );
}
