"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, BookmarkX, ArrowRight, Clock, BookOpen } from "lucide-react";
import { useProgressStore } from "@/lib/progress/store";
import { Badge } from "@/components/ui/badge";

interface LessonSummary {
  path: string;
  title: string;
  subtitle: string | null;
  phase: number;
  readingTimeMinutes: number;
}

export default function BookmarksPage() {
  const bookmarks = useProgressStore((s) => s.bookmarks);
  const toggleBookmark = useProgressStore((s) => s.toggleBookmark);
  const [lessons, setLessons] = React.useState<LessonSummary[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/lessons/list")
      .then((r) => r.json())
      .then((data) => {
        setLessons(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const bookmarked = lessons.filter((l) => bookmarks.has(l.path));

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-6 py-8 lg:px-8 max-w-4xl mx-auto scroll-smooth w-full pb-28 sm:pb-32 lg:pb-10">
      {/* Header Glass Card */}
      <div
        className="mb-8 rounded-2xl glass-surface p-6 sm:p-8"
      >
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
          <Bookmark size={13} />
          <span>Saved for later</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Bookmarked Modules
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Modules you&rsquo;ve bookmarked for focused review, stored locally in your browser.
        </p>
      </div>

      {!loaded && (
        <div className="text-center py-12 text-sm text-slate-400 dark:text-slate-500 font-mono">
          Loading bookmarks...
        </div>
      )}

      {loaded && bookmarked.length === 0 && (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300/80 dark:border-white/[0.1] glass-surface p-12 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Bookmark size={22} />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">No bookmarks yet</div>
          <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Open any module in the curriculum and tap the Bookmark button to save it here for fast reference.
          </p>
          <Link
            href="/phase/0"
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl glass-control px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
          >
            <BookOpen size={14} /> Explore Curriculum
          </Link>
        </div>
      )}

      <ul className="space-y-3">
        {bookmarked.map((l) => (
          <li
            key={l.path}
            className="group flex items-center justify-between gap-4 rounded-xl glass-elevated p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5"
          >
            <Link href={l.path} className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="default" className="text-[10.5px]">Phase {l.phase}</Badge>
                <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  <Clock size={11} /> {l.readingTimeMinutes}m
                </span>
              </div>
              <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {l.title}
              </div>
              {l.subtitle && (
                <div className="truncate text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {l.subtitle}
                </div>
              )}
            </Link>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => toggleBookmark(l.path)}
                title="Remove bookmark"
                className="flex h-8 w-8 items-center justify-center rounded-xl glass-control text-slate-400 hover:text-red-500 hover:border-red-500/30 transition-all cursor-pointer"
              >
                <BookmarkX size={15} />
              </button>
              <Link
                href={l.path}
                className="flex h-8 w-8 items-center justify-center rounded-xl glass-control text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/40 transition-all"
              >
                <ArrowRight size={15} />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
