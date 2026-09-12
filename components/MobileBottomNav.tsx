"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, GitFork, Briefcase, Terminal, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPRINGS } from "@/lib/motion";

export function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
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
    {
      name: "Code",
      href: "/workspace",
      icon: Terminal,
      isActive: pathname.startsWith("/workspace") || pathname.startsWith("/hello-reec"),
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      isActive: pathname.startsWith("/settings"),
    },
  ];

  return (
    <div
      className="fixed inset-x-2 z-40 lg:hidden pointer-events-none"
      style={{
        bottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))",
      }}
    >
      <nav
        aria-label="Mobile Navigation"
        className="pointer-events-auto mx-auto max-w-md flex items-center justify-between rounded-3xl glass-surface px-1.5 py-1.5 shadow-2xl"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-1 px-1 rounded-2xl transition-colors duration-150 relative min-w-[48px] min-h-[44px] touch-manipulation",
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <div className="relative flex h-7 w-7 items-center justify-center rounded-xl">
                {isActive && (
                  <motion.div
                    layoutId="active-mobile-pill"
                    transition={SPRINGS.snappy}
                    className="absolute inset-0 rounded-xl bg-blue-500/15 border border-blue-500/35 dark:border-blue-400/30"
                    style={{
                      boxShadow: "var(--glass-inner-highlight)",
                      willChange: "transform, opacity",
                    }}
                  />
                )}
                <Icon
                  size={15}
                  className={cn(
                    "relative z-10 transition-colors",
                    isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
                  )}
                />
              </div>
              <span className="relative z-10 text-[10px] mt-0.5 tracking-tight font-medium">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
