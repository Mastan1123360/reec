"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, Search } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { SearchDialog } from "./SearchDialog";
import { ReecLogo } from "./ReecLogo";
import * as React from "react";
import { cn } from "@/lib/utils";

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
        className="group flex w-44 sm:w-56 lg:w-64 items-center gap-2 rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.05] px-3 py-1.5 text-xs text-slate-400 dark:text-slate-400 shadow-xs backdrop-blur-xl transition-all hover:border-blue-500/40 hover:bg-white dark:hover:bg-white/[0.09] hover:text-slate-700 dark:hover:text-slate-200"
        style={{
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.45)",
        }}
      >
        <Search
          size={13}
          className="shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors"
        />
        <span className="text-left font-normal text-[11px] sm:text-xs">Search...</span>
        <kbd className="ml-auto hidden rounded-md bg-slate-100/90 dark:bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-mono text-slate-400 dark:text-slate-400 sm:inline-block border border-slate-200/50 dark:border-white/[0.06]">
          ⌘K
        </kbd>
      </button>

      {/* Theme Toggle (Moon / Sun) */}
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.05] text-slate-600 dark:text-slate-400 shadow-xs backdrop-blur-xl transition-all hover:text-slate-900 dark:hover:text-slate-100 hover:border-blue-500/40 active:scale-95"
        style={{
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.45)",
        }}
      >
        {theme === "dark" ? (
          <Sun size={14} className="text-amber-400" />
        ) : (
          <Moon size={14} className="text-slate-700" />
        )}
      </button>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const isDashboard = pathname === "/";

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-30 w-full bg-white/70 dark:bg-[#080d19]/75 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/[0.06] transition-colors",
          isDashboard ? "lg:hidden" : ""
        )}
      >
        <div className="mx-auto flex h-14 max-w-[1700px] items-center justify-between gap-4 px-4 sm:px-6">
          {/* Top Left: [R] REEC | brand mark */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center group">
              <ReecLogo size="sm" showText={true} />
            </Link>
          </div>

          {/* Right Action Bar */}
          <HeaderControls
            onSearchOpen={() => setSearchOpen(true)}
          />
        </div>
      </header>

      {/* Dialogs */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
