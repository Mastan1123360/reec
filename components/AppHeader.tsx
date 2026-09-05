"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, Search } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { ReecLogo } from "./ReecLogo";
import { UserMenu } from "./auth/UserMenu";
import * as React from "react";
import { DURATION, EASING } from "@/lib/motion";

export function HeaderControls({
  onSearchOpen,
}: {
  onSearchOpen: () => void;
}) {
  const { theme, toggle } = useTheme();

  return (
    <div className="flex items-center gap-2 sm:gap-2.5">
      {/* Search Pill Input with Apple Glass */}
      <button
        onClick={onSearchOpen}
        className="group flex w-28 sm:w-48 md:w-56 lg:w-60 items-center gap-1.5 sm:gap-2 rounded-xl glass-control px-2.5 sm:px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 transition-all hover:border-blue-500/40 dark:hover:border-white/20 hover:text-slate-800 dark:hover:text-slate-200 active:scale-[0.98] shrink-0 cursor-pointer"
      >
        <Search
          size={13}
          className="shrink-0 text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors"
        />
        <span className="text-left font-normal text-[11px] sm:text-xs truncate">Search...</span>
        <kbd className="ml-auto hidden rounded-md bg-slate-200/50 dark:bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-mono text-slate-500 dark:text-slate-400 sm:inline-block border border-slate-900/[0.06] dark:border-white/[0.06]">
          ⌘K
        </kbd>
      </button>

      {/* Theme Toggle (Moon / Sun) */}
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="relative flex h-8 w-8 items-center justify-center rounded-xl glass-control text-slate-600 dark:text-slate-300 transition-all hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-white/20 active:scale-95 overflow-hidden cursor-pointer"
      >
        <AnimatePresence mode="wait" initial={false}>
          {theme === "dark" ? (
            <motion.div
              key="sun"
              initial={{ rotate: -45, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 45, opacity: 0, scale: 0.7 }}
              transition={{ duration: DURATION.quick, ease: EASING.easeOut }}
              className="flex items-center justify-center"
            >
              <Sun size={14} className="text-slate-200" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ rotate: -45, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 45, opacity: 0, scale: 0.7 }}
              transition={{ duration: DURATION.quick, ease: EASING.easeOut }}
              className="flex items-center justify-center"
            >
              <Moon size={14} className="text-slate-700" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Cloud Account & Supabase Sync Status */}
      <UserMenu />
    </div>
  );
}

function getRouteLabel(pathname: string): { title: string; subtitle?: string } {
  if (pathname === "/") return { title: "Overview", subtitle: "Curriculum Dashboard" };
  if (pathname.startsWith("/progress")) return { title: "Learning Analytics", subtitle: "Real-time 30-Day Activity & Usage Telemetry" };
  if (pathname.startsWith("/roadmap")) return { title: "Curriculum Roadmap", subtitle: "Nine-Phase Navigator" };
  if (pathname.startsWith("/phase")) return { title: "Curriculum Phase", subtitle: "Phase Overview" };
  if (pathname.startsWith("/lesson")) return { title: "Lesson Experience", subtitle: "Interactive Study" };
  if (pathname.startsWith("/projects")) return { title: "Systems Projects", subtitle: "User-Authored Engineering Systems" };
  if (pathname.startsWith("/workspace")) return { title: "Code Workspace", subtitle: "Native Rust Toolchain IDE" };
  if (pathname.startsWith("/bookmarks")) return { title: "Bookmarked Modules", subtitle: "Saved for Later" };
  if (pathname.startsWith("/settings")) return { title: "Account Settings", subtitle: "Preferences & Learning Data" };
  if (pathname.startsWith("/hello-reec")) return { title: "Hello REEC", subtitle: "Rust Scratchpad" };
  return { title: "REEC Academy", subtitle: "Rust Engineering Curriculum" };
}

export function AppHeader({
  onSearchOpen,
}: {
  onSearchOpen: () => void;
}) {
  const pathname = usePathname();
  const route = getRouteLabel(pathname);

  return (
    <header
      className="h-14 lg:h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-slate-900/[0.06] dark:border-white/[0.05] bg-white/40 dark:bg-[#070914]/25 backdrop-blur-[25px] backdrop-saturate-[150%] z-20"
      style={{
        boxShadow: "var(--glass-specular)",
      }}
    >
      {/* Mobile Brand / Desktop Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile-only logo */}
        <div className="lg:hidden">
          <Link href="/" className="flex items-center">
            <ReecLogo size="sm" showText={true} />
          </Link>
        </div>

        {/* Desktop Route Title Badge */}
        <div className="hidden lg:flex items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            REEC
          </span>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            {route.title}
          </span>
          {route.subtitle && (
            <span className="hidden xl:inline-block text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">
              — {route.subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <HeaderControls
        onSearchOpen={onSearchOpen}
      />
    </header>
  );
}
