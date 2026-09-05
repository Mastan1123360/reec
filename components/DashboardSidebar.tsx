"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  GitFork,
  Briefcase,
  Terminal,
  Bookmark,
  Settings,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Check,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReecLogo } from "@/components/ReecLogo";
import { SPRINGS } from "@/lib/motion";
import { useHiddenLessonsStore } from "@/lib/hidden-lessons/store";
import { useAuth } from "@/lib/supabase/auth-context";
import { useUserAvatar } from "@/lib/avatars";

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function DashboardSidebar({
  collapsed,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user, username } = useAuth();
  const { currentAvatar } = useUserAvatar(user?.user_metadata?.avatar_id);
  const displayName = user ? (username || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User") : "guest";
  const userInitial = user ? (displayName.charAt(0).toUpperCase() || "U") : "g";

  const unlockedLessonsMap = useHiddenLessonsStore((s) => s.unlockedLessons);
  const unlockedLessons = React.useMemo(() => Object.values(unlockedLessonsMap), [unlockedLessonsMap]);
  const hasHiddenLessons = unlockedLessons.length > 0;
  const hasUnopenedHidden = unlockedLessons.some((l) => l.status === "unlocked_unopened");

  const primaryNavItems = [
    {
      name: "Overview",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      name: "Roadmap",
      href: "/roadmap",
      icon: GitFork,
      isActive:
        pathname === "/roadmap" ||
        pathname.startsWith("/roadmap") ||
        pathname.startsWith("/phase") ||
        pathname.startsWith("/lesson"),
    },
    {
      name: "Projects",
      href: "/projects",
      icon: Briefcase,
      isActive: pathname.startsWith("/projects"),
    },
  ];

  const secondaryNavItems = [
    {
      name: "Analytics",
      href: "/progress",
      icon: Activity,
      isActive: pathname.startsWith("/progress"),
    },
    {
      name: "Code Workspace",
      href: "/workspace",
      icon: Terminal,
      isActive: pathname.startsWith("/workspace") || pathname.startsWith("/hello-reec"),
    },
    {
      name: "Bookmarks",
      href: "/bookmarks",
      icon: Bookmark,
      isActive: pathname.startsWith("/bookmarks"),
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      isActive: pathname.startsWith("/settings"),
    },
  ];

  return (
    <aside
      className={cn(
        "relative hidden lg:flex flex-col shrink-0 h-dvh top-0 bottom-0 left-0 transition-[width] duration-200 ease-out z-30 select-none",
        "border-r border-slate-900/[0.06] dark:border-white/[0.07]",
        "bg-white/55 dark:bg-[#070914]/40 backdrop-blur-[42px] backdrop-saturate-[145%]",
        collapsed ? "w-20 items-center" : "w-[250px]"
      )}
      style={{
        boxShadow: "var(--glass-specular)",
      }}
    >
      {/* 1. Top Brand Header: [R logo] REEC */}
      <div
        className={cn(
          "h-14 lg:h-16 flex items-center shrink-0 w-full transition-all",
          collapsed ? "justify-center px-2" : "px-5"
        )}
      >
        <Link href="/" className="group flex items-center">
          <ReecLogo size="md" showText={!collapsed} />
        </Link>
      </div>

      {/* Top Divider below brand */}
      <div className="w-full px-4 shrink-0">
        <div className="border-b border-slate-900/[0.05] dark:border-white/[0.06]" />
      </div>

      {/* 2. Main Navigation Rails */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden scrollbar-none py-3 space-y-1 w-full",
          collapsed ? "px-2" : "px-3"
        )}
      >
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "group relative flex items-center rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                collapsed
                  ? "h-10 w-10 justify-center mx-auto"
                  : "px-3.5 py-2.5 gap-3",
                isActive
                  ? "text-blue-700 dark:text-blue-200 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-white/[0.05] font-medium"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-sidebar-pill-primary"
                  transition={SPRINGS.snappy}
                  className="absolute inset-0 rounded-xl glass-nav-active"
                />
              )}
              <Icon
                size={17}
                className={cn(
                  "relative z-10 shrink-0 transition-colors",
                  isActive
                    ? "text-blue-600 dark:text-blue-300"
                    : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200"
                )}
              />
              {!collapsed && (
                <span className="relative z-10 text-xs tracking-tight truncate flex-1">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}

        {/* Divider between Primary Nav and Tools */}
        <div className="py-2">
          <div className="border-b border-slate-900/[0.05] dark:border-white/[0.06]" />
        </div>

        {/* 3. Secondary Tools Navigation */}
        {secondaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "group relative flex items-center rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                collapsed
                  ? "h-10 w-10 justify-center mx-auto"
                  : "px-3.5 py-2.5 gap-3",
                isActive
                  ? "text-blue-700 dark:text-blue-200 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-white/[0.05] font-medium"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-sidebar-pill-secondary"
                  transition={SPRINGS.snappy}
                  className="absolute inset-0 rounded-xl glass-nav-active"
                />
              )}
              <Icon
                size={17}
                className={cn(
                  "relative z-10 shrink-0 transition-colors",
                  isActive
                    ? "text-blue-600 dark:text-blue-300"
                    : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200"
                )}
              />
              {!collapsed && (
                <>
                  <span className="relative z-10 text-xs tracking-tight truncate flex-1">
                    {item.name}
                  </span>
                  {item.href === "/workspace" && (
                    <ChevronRight
                      size={14}
                      className={cn(
                        "relative z-10 transition-transform group-hover:translate-x-0.5",
                        isActive ? "text-white/80" : "text-slate-400 dark:text-slate-500"
                      )}
                    />
                  )}
                </>
              )}
            </Link>
          );
        })}

        {/* 4. Execution-Gated Hidden Lessons Section (Only renders if at least one hidden lesson is unlocked) */}
        {hasHiddenLessons && (
          <div className="pt-2">
            <div className="border-b border-slate-900/[0.05] dark:border-white/[0.06] mb-3" />
            <div
              className={cn(
                "rounded-2xl transition-all duration-300",
                collapsed ? "p-1" : "p-2",
                hasUnopenedHidden
                  ? "border border-blue-500/35 bg-blue-500/[0.07] dark:bg-blue-500/[0.1] shadow-[0_0_16px_rgba(59,130,246,0.18)]"
                  : "border border-slate-200/60 dark:border-white/[0.06] bg-slate-100/40 dark:bg-white/[0.02]"
              )}
              style={{
                boxShadow: hasUnopenedHidden
                  ? "0 0 16px rgba(59, 130, 246, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.25)"
                  : "var(--glass-inner-highlight)",
              }}
            >
              {/* Section Header */}
              <div
                className={cn(
                  "flex items-center justify-between pb-1.5 px-1.5",
                  collapsed && "justify-center"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles
                    size={14}
                    className="shrink-0 text-blue-500"
                  />
                  {!collapsed && (
                    <span className="text-[11px] font-bold tracking-tight text-slate-800 dark:text-slate-200">
                      Hidden Lessons
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <span className="inline-flex items-center justify-center h-4 px-1.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                    {unlockedLessons.length}
                  </span>
                )}
              </div>

              {/* List of Unlocked Hidden Lessons */}
              <div className="space-y-1 mt-1">
                {unlockedLessons.map((item) => {
                  const isItemActive = pathname === `/hidden-lessons/${item.slug}`;
                  const isUnopened = item.status === "unlocked_unopened";

                  return (
                    <Link
                      key={item.lessonId}
                      href={`/hidden-lessons/${item.slug}`}
                      title={collapsed ? item.title : undefined}
                      className={cn(
                        "group flex items-center rounded-xl transition-all text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                        collapsed ? "h-9 w-9 justify-center mx-auto" : "px-2 py-1.5 gap-2",
                        isItemActive
                          ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold border border-blue-500/30"
                          : "text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-slate-100"
                      )}
                    >
                      {/* Unopened vs Opened Indicator */}
                      {isUnopened ? (
                        <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400/60" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                        </span>
                      ) : (
                        <Check size={12} className="text-emerald-500 shrink-0" />
                      )}

                      {!collapsed && (
                        <span className="truncate flex-1 font-medium">
                          {item.title}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Ambient background glow near bottom */}
      <div className="pointer-events-none absolute bottom-20 left-2 right-2 h-28 rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-2xl" />

      {/* 4. Bottom User Profile Card & Collapse Control */}
      <div className="p-3 w-full shrink-0 flex flex-col gap-2 border-t border-slate-900/[0.05] dark:border-white/[0.06]">
        <Link
          href="/settings"
          className={cn(
            "group flex items-center rounded-xl transition-all duration-200 glass-elevated",
            "hover:border-slate-300 dark:hover:border-white/20",
            collapsed ? "justify-center p-2" : "px-3 py-2.5 gap-2.5"
          )}
          title={collapsed ? `${displayName} - Keep building.` : undefined}
        >
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white font-black text-xs shadow-xs",
              user ? `bg-gradient-to-br ${currentAvatar.gradient}` : "bg-gradient-to-br from-blue-500 to-blue-700"
            )}
            style={{
              boxShadow: user ? `0 2px 8px -1px ${currentAvatar.accentHex}40` : undefined,
            }}
          >
            {user ? currentAvatar.svgIcon("w-4 h-4 text-white") : "g"}
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {displayName}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Keep building.
                </div>
              </div>
              <ChevronRight
                size={14}
                className="text-slate-400 dark:text-slate-500 transition-transform group-hover:translate-x-0.5 shrink-0"
              />
            </>
          )}
        </Link>

        {/* Collapse button row */}
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between px-1")}>
          {!collapsed && (
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
              v1.0 • REEC Platform
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            className="flex h-7 w-7 items-center justify-center rounded-lg glass-control text-slate-400 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-white/20 transition-all active:scale-95 cursor-pointer"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
          </button>
        </div>
      </div>
    </aside>
  );
}

export const AppSidebar = DashboardSidebar;
