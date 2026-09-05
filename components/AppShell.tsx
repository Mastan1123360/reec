"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { AppHeader } from "@/components/AppHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SearchDialog } from "@/components/SearchDialog";
import { FocusBackdrop } from "@/components/rust-ide/FocusBackdrop";
import { RustWorkspacePanel } from "@/components/rust-ide/RustWorkspacePanel";
import { StudySessionTracker } from "@/components/StudySessionTracker";
import { GrandUnlockModal } from "@/components/hidden-lessons/GrandUnlockModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { HiddenLessonTriggerService } from "@/lib/hidden-lessons/service";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [customWallpaper, setCustomWallpaper] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("reec_custom_wallpaper");
      if (saved) setCustomWallpaper(saved);
    } catch {}
    const handleWallpaperChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) setCustomWallpaper(customEvent.detail);
    };
    window.addEventListener("reec_wallpaper_changed", handleWallpaperChange);
    return () => window.removeEventListener("reec_wallpaper_changed", handleWallpaperChange);
  }, []);

  // Initialize collapse state and sync hidden lesson triggers once mounted
  React.useEffect(() => {
    HiddenLessonTriggerService.syncWithServer().catch(() => {});
    try {
      const saved = localStorage.getItem("reec_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleCollapse = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("reec_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Global Keyboard shortcut for search (⌘K / Ctrl+K)
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Track cursor position for subtle glass refraction highlight
  React.useEffect(() => {
    function handlePointerMove(e: PointerEvent) {
      const root = document.documentElement;
      root.style.setProperty("--mouse-x", `${e.clientX}px`);
      root.style.setProperty("--mouse-y", `${e.clientY}px`);
    }
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return (
    <div className="relative h-dvh w-dvw overflow-hidden flex flex-row font-sans selection:bg-blue-500/20 bg-transparent dark:bg-[#070914] text-slate-900 dark:text-slate-100">
      {/* 0. Ambient Background Layer (Apple Spatial Lighting Architecture) */}
      <div className="ambient-background pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
        {/* Light Mode Wallpaper - Exactly wallpaperL.png provided by user */}
        <div className="absolute inset-0 dark:hidden overflow-hidden">
          <img
            src={customWallpaper || "/wallpaperL.png"}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src.includes("/wallpaperL.png")) {
                target.src = "/wallpaper-light.png";
              }
            }}
            alt="Site Background"
            className="w-full h-full object-cover pointer-events-none select-none"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Dark Mode Wallpaper - Exactly wallpaperD.png provided by user */}
        <div className="absolute inset-0 hidden dark:block overflow-hidden">
          <img
            src="/wallpaperD.png"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src.includes("/wallpaperD.png")) {
                target.src = "/wallpaper-dark.png";
              }
            }}
            alt="Site Background"
            className="w-full h-full object-cover pointer-events-none select-none"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Microscopic Grain Overlay to eliminate color-banding */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.045] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <StudySessionTracker />

      {/* 1. PERSISTENT APPLICATION CHROME: LEFT SIDEBAR (100dvh) */}
      <DashboardSidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* 2. RIGHT SIDE: PERSISTENT HEADER + DYNAMIC CONTENT AREA */}
      <div className="relative z-10 flex-1 min-w-0 h-dvh flex flex-col overflow-hidden">
        {/* Persistent Top Header (Spans remaining width) */}
        <AppHeader
          onSearchOpen={() => setSearchOpen(true)}
        />

        {/* Dynamic Route Content Area (Changes on route navigation) */}
        <main className="flex-1 min-h-0 min-w-0 relative overflow-hidden flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: "transform, opacity" }}
            className="flex-1 min-h-0 min-w-0 flex flex-col h-full overflow-hidden"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* 3. MOBILE FLOATING BOTTOM NAVIGATION CAPSULE (No hamburger) */}
      <MobileBottomNav />

      {/* 4. PERSISTENT GLOBAL DIALOGS AND OVERLAYS */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <FocusBackdrop />
      <RustWorkspacePanel />
      <GrandUnlockModal />
      <AuthModal />
    </div>
  );
}
