/**
 * lib/progress/store.ts
 *
 * Client-side progress tracking. Persistent in localStorage.
 * Handles true user learning progress:
 * - Completed lessons and interactive blocks
 * - Bookmarks and notes
 * - Real daily active streak calculation
 * - Real time-spent tracking (minutes/seconds per day & total)
 * - Real activity history feed
 */
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SupabaseSyncService } from "@/lib/supabase/sync-service";

export interface ActivityItem {
  id: string;
  type:
    | "lesson_completed"
    | "lesson_uncompleted"
    | "lesson_started"
    | "workspace_practice"
    | "bookmark_added"
    | "bookmark_removed"
    | "study_session"
    | "block_completed";
  title: string;
  subtitle?: string;
  timestamp: number;
  path?: string;
  iconType?: "check" | "code" | "bookmark" | "time";
}

export interface DayStudyRecord {
  date: string; // YYYY-MM-DD
  minutes: number;
}

interface ProgressState {
  completedLessons: Set<string>;
  completedBlocks: Set<string>;
  bookmarks: Set<string>;
  notes: Record<string, string>;
  checklist: Record<string, boolean>;
  lastVisited: string | null;
  activityLog: ActivityItem[];
  
  // Real study time tracking
  studyTimeMinutes: number;
  dailyMinutes: Record<string, number>; // YYYY-MM-DD -> minutes
  activeDates: string[]; // List of YYYY-MM-DD
  currentSessionSeconds: number;
  isSessionActive: boolean;

  // Actions
  toggleLesson: (lessonPath: string, lessonTitle?: string, phaseNumber?: number) => void;
  setLessonCompleted: (lessonPath: string, completed: boolean, lessonTitle?: string) => void;
  toggleBlock: (blockId: string, blockTitle?: string) => void;
  toggleBookmark: (lessonPath: string, lessonTitle?: string) => void;
  setNote: (blockId: string, value: string) => void;
  toggleChecklistItem: (key: string) => void;
  setLastVisited: (path: string, lessonTitle?: string) => void;
  
  // Time and Streak Actions
  recordStudySeconds: (seconds: number) => void;
  addStudyMinutes: (minutes: number, note?: string) => void;
  markTodayActive: () => void;
  setSessionActive: (active: boolean) => void;
  resetSessionSeconds: () => void;
  logActivity: (activity: Omit<ActivityItem, "id" | "timestamp">) => void;
  clearActivityLog: () => void;
  resetAllProgress: () => void;

  // Computed helper queries
  progressForPhase: (lessonPaths: string[]) => number;
  getStreak: () => { current: number; best: number; daysStatus: boolean[]; todayActive: boolean };
  getWeekDailyMinutes: () => Array<{ label: string; date: string; minutes: number; isToday: boolean }>;
  getMonthWeeklyMinutes: () => Array<{ label: string; minutes: number; isCurrentWeek: boolean }>;
  getTodayMinutes: () => number;
}

type PersistedShape = {
  completedLessons: string[];
  completedBlocks: string[];
  bookmarks: string[];
  notes: Record<string, string>;
  checklist: Record<string, boolean>;
  lastVisited: string | null;
  activityLog?: ActivityItem[];
  studyTimeMinutes?: number;
  dailyMinutes?: Record<string, number>;
  activeDates?: string[];
};

export function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedLessons: new Set<string>(),
      completedBlocks: new Set<string>(),
      bookmarks: new Set<string>(),
      notes: {},
      checklist: {},
      lastVisited: null,
      activityLog: [],
      studyTimeMinutes: 0,
      dailyMinutes: {},
      activeDates: [],
      currentSessionSeconds: 0,
      isSessionActive: true,

      toggleLesson: (lessonPath, lessonTitle, phaseNumber) => {
        set((state) => {
          const next = new Set(state.completedLessons);
          const wasCompleted = next.has(lessonPath);
          const today = getTodayString();

          if (wasCompleted) {
            next.delete(lessonPath);
          } else {
            next.add(lessonPath);
          }

          const currentActiveDates = Array.isArray(state.activeDates) ? state.activeDates : [];
          const activeDates = currentActiveDates.includes(today) ? currentActiveDates : [today, ...currentActiveDates];

          const newActivities = Array.isArray(state.activityLog) ? [...state.activityLog] : [];
          newActivities.unshift({
            id: `act-${Date.now()}`,
            type: wasCompleted ? "lesson_uncompleted" : "lesson_completed",
            title: wasCompleted
              ? `Unmarked: ${lessonTitle ?? lessonPath.split("/").pop() ?? "Lesson"}`
              : `Completed: ${lessonTitle ?? lessonPath.split("/").pop() ?? "Lesson"}`,
            subtitle: phaseNumber !== undefined ? `Phase ${String(phaseNumber).padStart(2, "0")}` : undefined,
            path: lessonPath,
            timestamp: Date.now(),
            iconType: wasCompleted ? "code" : "check",
          });

          return {
            completedLessons: next,
            activeDates,
            activityLog: newActivities.slice(0, 50),
          };
        });
      },

      setLessonCompleted: (lessonPath, completed, lessonTitle) => {
        set((state) => {
          const next = new Set(state.completedLessons);
          const isCurrentlyDone = next.has(lessonPath);
          if (completed === isCurrentlyDone) return {};

          if (completed) {
            next.add(lessonPath);
          } else {
            next.delete(lessonPath);
          }

          const today = getTodayString();
          const currentActiveDates = Array.isArray(state.activeDates) ? state.activeDates : [];
          const activeDates = currentActiveDates.includes(today) ? currentActiveDates : [today, ...currentActiveDates];

          const newActivities = Array.isArray(state.activityLog) ? [...state.activityLog] : [];
          newActivities.unshift({
            id: `act-${Date.now()}`,
            type: completed ? "lesson_completed" : "lesson_uncompleted",
            title: completed
              ? `Completed: ${lessonTitle ?? lessonPath.split("/").pop() ?? "Lesson"}`
              : `Unmarked: ${lessonTitle ?? lessonPath.split("/").pop() ?? "Lesson"}`,
            path: lessonPath,
            timestamp: Date.now(),
            iconType: completed ? "check" : "code",
          });

          return {
            completedLessons: next,
            activeDates,
            activityLog: newActivities.slice(0, 50),
          };
        });
      },

      toggleBlock: (blockId, blockTitle) =>
        set((state) => {
          const next = new Set(state.completedBlocks);
          const wasCompleted = next.has(blockId);
          if (wasCompleted) {
            next.delete(blockId);
          } else {
            next.add(blockId);
          }

          const newActivities = Array.isArray(state.activityLog) ? [...state.activityLog] : [];
          if (!wasCompleted) {
            newActivities.unshift({
              id: `act-${Date.now()}`,
              type: "block_completed",
              title: `Solved: ${blockTitle ?? "Knowledge Check"}`,
              subtitle: "Self-check challenge solved",
              timestamp: Date.now(),
              iconType: "check",
            });
          }

          return { completedBlocks: next, activityLog: newActivities.slice(0, 50) };
        }),

      toggleBookmark: (lessonPath, lessonTitle) =>
        set((state) => {
          const next = new Set(state.bookmarks);
          const wasBookmarked = next.has(lessonPath);
          if (wasBookmarked) {
            next.delete(lessonPath);
          } else {
            next.add(lessonPath);
          }

          const newActivities = Array.isArray(state.activityLog) ? [...state.activityLog] : [];
          newActivities.unshift({
            id: `act-${Date.now()}`,
            type: wasBookmarked ? "bookmark_removed" : "bookmark_added",
            title: wasBookmarked
              ? `Removed Bookmark: ${lessonTitle ?? lessonPath.split("/").pop() ?? "Lesson"}`
              : `Bookmarked: ${lessonTitle ?? lessonPath.split("/").pop() ?? "Lesson"}`,
            path: lessonPath,
            timestamp: Date.now(),
            iconType: "bookmark",
          });

          return { bookmarks: next, activityLog: newActivities.slice(0, 50) };
        }),

      setNote: (blockId, value) =>
        set((state) => ({ notes: { ...state.notes, [blockId]: value } })),

      toggleChecklistItem: (key) =>
        set((state) => ({ checklist: { ...state.checklist, [key]: !state.checklist[key] } })),

      setLastVisited: (path, lessonTitle) =>
        set((state) => {
          const today = getTodayString();
          const currentActiveDates = Array.isArray(state.activeDates) ? state.activeDates : [];
          const activeDates = currentActiveDates.includes(today) ? currentActiveDates : [today, ...currentActiveDates];
          const newActivities = Array.isArray(state.activityLog) ? [...state.activityLog] : [];
          
          if (path && path !== state.lastVisited) {
            newActivities.unshift({
              id: `act-${Date.now()}`,
              type: "lesson_started",
              title: `Studying: ${lessonTitle ?? path.split("/").pop() ?? "Lesson"}`,
              path,
              timestamp: Date.now(),
              iconType: "code",
            });
          }

          return {
            lastVisited: path,
            activeDates,
            activityLog: newActivities.slice(0, 50),
          };
        }),

      recordStudySeconds: (seconds) => {
        if (seconds <= 0) return;
        set((state) => {
          const today = getTodayString();
          const currentDaily = state.dailyMinutes ?? {};
          const currentDayMins = currentDaily[today] ?? 0;
          const addedMinutes = seconds / 60;
          const newDayMins = Math.round((currentDayMins + addedMinutes) * 10) / 10;
          
          const newTotalMins = Math.round(((state.studyTimeMinutes ?? 0) + addedMinutes) * 10) / 10;
          const currentActiveDates = Array.isArray(state.activeDates) ? state.activeDates : [];
          const activeDates = currentActiveDates.includes(today) ? currentActiveDates : [today, ...currentActiveDates];

          return {
            studyTimeMinutes: newTotalMins,
            dailyMinutes: {
              ...currentDaily,
              [today]: newDayMins,
            },
            activeDates,
            currentSessionSeconds: state.currentSessionSeconds + seconds,
          };
        });
      },

      addStudyMinutes: (minutes, note) => {
        if (minutes <= 0) return;
        set((state) => {
          const today = getTodayString();
          const currentDaily = state.dailyMinutes ?? {};
          const currentDayMins = currentDaily[today] ?? 0;
          const newDayMins = currentDayMins + minutes;
          const newTotalMins = (state.studyTimeMinutes ?? 0) + minutes;

          const currentActiveDates = Array.isArray(state.activeDates) ? state.activeDates : [];
          const activeDates = currentActiveDates.includes(today) ? currentActiveDates : [today, ...currentActiveDates];

          const newActivities = Array.isArray(state.activityLog) ? [...state.activityLog] : [];
          newActivities.unshift({
            id: `act-${Date.now()}`,
            type: "study_session",
            title: `Logged +${minutes}m study time`,
            subtitle: note || "Manual focus session",
            timestamp: Date.now(),
            iconType: "time",
          });

          return {
            studyTimeMinutes: newTotalMins,
            dailyMinutes: {
              ...currentDaily,
              [today]: newDayMins,
            },
            activeDates,
            activityLog: newActivities.slice(0, 50),
          };
        });
      },

      markTodayActive: () => {
        const today = getTodayString();
        set((state) => {
          const currentActiveDates = Array.isArray(state.activeDates) ? state.activeDates : [];
          if (currentActiveDates.includes(today)) return {};

          const activeDates = [today, ...currentActiveDates];
          const newActivities = Array.isArray(state.activityLog) ? [...state.activityLog] : [];
          newActivities.unshift({
            id: `act-${Date.now()}`,
            type: "study_session",
            title: "Logged daily streak check-in",
            subtitle: "Daily habit active",
            timestamp: Date.now(),
            iconType: "time",
          });

          return {
            activeDates,
            activityLog: newActivities.slice(0, 50),
          };
        });
      },

      setSessionActive: (active) => set({ isSessionActive: active }),
      resetSessionSeconds: () => set({ currentSessionSeconds: 0 }),

      logActivity: (activity) =>
        set((state) => ({
          activityLog: [
            {
              ...activity,
              id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: Date.now(),
            },
            ...(Array.isArray(state.activityLog) ? state.activityLog : []),
          ].slice(0, 50),
        })),

      clearActivityLog: () => set({ activityLog: [] }),

      resetAllProgress: () => {
        set({
          completedLessons: new Set<string>(),
          completedBlocks: new Set<string>(),
          bookmarks: new Set<string>(),
          notes: {},
          checklist: {},
          lastVisited: null,
          activityLog: [],
          studyTimeMinutes: 0,
          dailyMinutes: {},
          activeDates: [],
          currentSessionSeconds: 0,
        });
      },

      progressForPhase: (lessonPaths) => {
        const { completedLessons } = get();
        if (!lessonPaths || lessonPaths.length === 0) return 0;
        const done = lessonPaths.filter((p) => completedLessons?.has(p)).length;
        return Math.round((done / lessonPaths.length) * 100);
      },

      getStreak: () => {
        const { activeDates } = get();
        const safeActiveDates = Array.isArray(activeDates) ? activeDates : [];
        const dateSet = new Set(safeActiveDates);
        const todayStr = getTodayString();
        const todayActive = dateSet.has(todayStr);

        let current = 0;
        const checkDate = new Date();

        if (todayActive) {
          current = 1;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // Check if active yesterday
          const yest = new Date();
          yest.setDate(yest.getDate() - 1);
          const yestStr = formatDateKey(yest);
          if (dateSet.has(yestStr)) {
            current = 1;
            checkDate.setDate(checkDate.getDate() - 2);
          }
        }

        // Count consecutive days backward
        if (current > 0) {
          while (current < 365) {
            const dateStr = formatDateKey(checkDate);
            if (dateSet.has(dateStr)) {
              current++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
        }

        // Calculate all-time best streak
        let best = current;
        if (safeActiveDates.length > 0) {
          const sorted = Array.from(new Set(safeActiveDates)).sort();
          let run = 0;
          let prevDate: Date | null = null;
          for (const dStr of sorted) {
            const [y, m, d] = dStr.split("-").map(Number);
            const thisDate = new Date(y, m - 1, d);
            if (prevDate) {
              const diffDays = Math.round((thisDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays === 1) {
                run++;
              } else if (diffDays > 1) {
                run = 1;
              }
            } else {
              run = 1;
            }
            prevDate = thisDate;
            if (run > best) best = run;
          }
        }

        // Generate past 7 days (left to right: from 6 days ago to today)
        const daysStatus: boolean[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dStr = formatDateKey(d);
          daysStatus.push(dateSet.has(dStr));
        }

        return { current, best: Math.max(best, current), daysStatus, todayActive };
      },

      getWeekDailyMinutes: () => {
        const { dailyMinutes } = get();
        const safeDaily = dailyMinutes ?? {};
        const now = new Date();
        const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
        const dayDistanceToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

        const monday = new Date(now);
        monday.setDate(now.getDate() - dayDistanceToMonday);

        const labels = ["M", "T", "W", "T", "F", "S", "S"];
        const todayStr = getTodayString();

        return labels.map((label, index) => {
          const date = new Date(monday);
          date.setDate(monday.getDate() + index);
          const dateKey = formatDateKey(date);
          return {
            label,
            date: dateKey,
            minutes: safeDaily[dateKey] ?? 0,
            isToday: dateKey === todayStr,
          };
        });
      },

      getMonthWeeklyMinutes: () => {
        const { dailyMinutes } = get();
        const safeDaily = dailyMinutes ?? {};
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // 4 weeks summary
        const weeks = [
          { label: "W1", start: 1, end: 7 },
          { label: "W2", start: 8, end: 14 },
          { label: "W3", start: 15, end: 21 },
          { label: "W4", start: 22, end: 31 },
        ];

        const todayDay = now.getDate();

        return weeks.map((w, idx) => {
          let total = 0;
          for (let day = w.start; day <= w.end; day++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            total += safeDaily[dateStr] ?? 0;
          }
          const isCurrentWeek = todayDay >= w.start && todayDay <= w.end;
          return {
            label: w.label,
            minutes: Math.round(total),
            isCurrentWeek,
          };
        });
      },

      getTodayMinutes: () => {
        const { dailyMinutes } = get();
        const todayStr = getTodayString();
        return Math.round(dailyMinutes?.[todayStr] ?? 0);
      },
    }),
    {
      name: "reec-academy-user-progress",
      partialize: (state): PersistedShape => ({
        completedLessons: [...(state.completedLessons ?? [])],
        completedBlocks: [...(state.completedBlocks ?? [])],
        bookmarks: [...(state.bookmarks ?? [])],
        notes: state.notes ?? {},
        checklist: state.checklist ?? {},
        lastVisited: state.lastVisited ?? null,
        activityLog: state.activityLog ?? [],
        studyTimeMinutes: state.studyTimeMinutes ?? 0,
        dailyMinutes: state.dailyMinutes ?? {},
        activeDates: state.activeDates ?? [],
      }),
      merge: (persisted, current) => {
        const p = persisted as PersistedShape | undefined;
        if (!p) return current;

        // Gracefully sanitize legacy entries without crashing and strip out any dummy/sample items
        const sanitizedActivities: ActivityItem[] = Array.isArray(p.activityLog)
          ? p.activityLog
              .filter(
                (act) =>
                  act &&
                  !act.path?.startsWith("/labs") &&
                  act.id !== "act-welcome" &&
                  !act.id.startsWith("init-")
              )
              .map((act) => ({
                ...act,
                iconType: (act.iconType as string) === "lab" ? ("code" as const) : act.iconType,
              }))
          : current.activityLog;

        return {
          ...current,
          completedLessons: new Set<string>(Array.isArray(p.completedLessons) ? p.completedLessons : []),
          completedBlocks: new Set<string>(Array.isArray(p.completedBlocks) ? p.completedBlocks : []),
          bookmarks: new Set<string>(Array.isArray(p.bookmarks) ? p.bookmarks : []),
          notes: p.notes ?? {},
          checklist: p.checklist ?? {},
          lastVisited: p.lastVisited && !p.lastVisited.startsWith("/labs") ? p.lastVisited : null,
          activityLog: sanitizedActivities,
          studyTimeMinutes: typeof p.studyTimeMinutes === "number" ? p.studyTimeMinutes : 0,
          dailyMinutes: p.dailyMinutes ?? {},
          activeDates: Array.isArray(p.activeDates) ? p.activeDates : [],
        };
      },
    }
  )
);

// Auto-sync store updates to Supabase
if (typeof window !== "undefined") {
  useProgressStore.subscribe((state, prevState) => {
    if (
      state.completedLessons !== prevState.completedLessons ||
      state.completedBlocks !== prevState.completedBlocks ||
      state.bookmarks !== prevState.bookmarks ||
      state.notes !== prevState.notes ||
      state.checklist !== prevState.checklist ||
      state.studyTimeMinutes !== prevState.studyTimeMinutes ||
      state.dailyMinutes !== prevState.dailyMinutes ||
      state.activeDates !== prevState.activeDates ||
      state.lastVisited !== prevState.lastVisited
    ) {
      SupabaseSyncService.queueProgressSync();
    }
  });
}

