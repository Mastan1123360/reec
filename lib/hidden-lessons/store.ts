import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HiddenLessonStateItem } from "./types";
import { SupabaseSyncService } from "@/lib/supabase/sync-service";

interface HiddenLessonsStoreState {
  unlockedLessons: Record<string, HiddenLessonStateItem>;
  recentUnlockedLesson: HiddenLessonStateItem | null;
  isRevealModalOpen: boolean;

  /**
   * Idempotent unlock. Returns true only if transitioning from locked -> unlocked_unopened.
   */
  unlockLesson: (
    item: Omit<HiddenLessonStateItem, "status" | "unlockedAt" | "openedAt"> & {
      triggerExecutionId?: string;
      triggerSource?: string;
    }
  ) => boolean;

  hydrateUnlockedLessons: (items: Record<string, HiddenLessonStateItem>) => void;
  markAsOpened: (lessonIdOrSlug: string) => void;
  openRevealModal: (item?: HiddenLessonStateItem) => void;
  closeRevealModal: () => void;
  isUnlocked: (lessonIdOrSlug: string) => boolean;
  isUnopened: (lessonIdOrSlug: string) => boolean;
  getUnlockedList: () => HiddenLessonStateItem[];
}

export const useHiddenLessonsStore = create<HiddenLessonsStoreState>()(
  persist(
    (set, get) => ({
      unlockedLessons: {},
      recentUnlockedLesson: null,
      isRevealModalOpen: false,

      unlockLesson: (item) => {
        const { unlockedLessons } = get();
        // Check if already unlocked by lessonId or slug
        const existing =
          unlockedLessons[item.lessonId] ||
          Object.values(unlockedLessons).find((l) => l.slug === item.slug);

        if (existing) {
          // Already unlocked — strictly idempotent.
          return false;
        }

        const now = Date.now();
        const newItem: HiddenLessonStateItem = {
          lessonId: item.lessonId,
          slug: item.slug,
          title: item.title,
          subtitle: item.subtitle ?? null,
          description: item.description ?? null,
          badge: item.badge ?? "NLL",
          tags: item.tags ?? ["RUST", "COMPILER THINKING", "ADVANCED"],
          status: "unlocked_unopened",
          unlockedAt: now,
          openedAt: null,
          sourceLessonId: item.sourceLessonId ?? null,
          triggerSource: item.triggerSource,
          triggerExecutionId: item.triggerExecutionId,
          triggerType: item.triggerType ?? "code_execution",
          triggerDescription: item.triggerDescription ?? null,
        };

        set({
          unlockedLessons: {
            ...unlockedLessons,
            [item.lessonId]: newItem,
          },
          recentUnlockedLesson: newItem,
          isRevealModalOpen: true,
        });

        SupabaseSyncService.syncHiddenLesson(newItem);

        return true;
      },

      hydrateUnlockedLessons: (items) => {
        const current = get().unlockedLessons;
        set({
          unlockedLessons: {
            ...current,
            ...items,
          },
        });
      },

      markAsOpened: (lessonIdOrSlug) => {
        const { unlockedLessons } = get();
        const key = Object.keys(unlockedLessons).find(
          (k) =>
            k === lessonIdOrSlug ||
            unlockedLessons[k].slug === lessonIdOrSlug ||
            unlockedLessons[k].lessonId === lessonIdOrSlug
        );

        if (!key) return;

        const current = unlockedLessons[key];
        if (current.status === "opened") return;

        const updated: HiddenLessonStateItem = {
          ...current,
          status: "opened",
          openedAt: Date.now(),
        };

        set({
          unlockedLessons: {
            ...unlockedLessons,
            [key]: updated,
          },
        });

        SupabaseSyncService.syncHiddenLesson(updated);
      },

      openRevealModal: (item) => {
        if (item) {
          set({ recentUnlockedLesson: item, isRevealModalOpen: true });
        } else {
          set({ isRevealModalOpen: true });
        }
      },

      closeRevealModal: () => {
        set({ isRevealModalOpen: false });
      },

      isUnlocked: (lessonIdOrSlug) => {
        const { unlockedLessons } = get();
        const normalized = lessonIdOrSlug.toLowerCase();
        return Object.values(unlockedLessons).some(
          (l) =>
            l.lessonId.toLowerCase() === normalized ||
            l.slug.toLowerCase() === normalized
        );
      },

      isUnopened: (lessonIdOrSlug) => {
        const { unlockedLessons } = get();
        const normalized = lessonIdOrSlug.toLowerCase();
        const found = Object.values(unlockedLessons).find(
          (l) =>
            l.lessonId.toLowerCase() === normalized ||
            l.slug.toLowerCase() === normalized
        );
        return found ? found.status === "unlocked_unopened" : false;
      },

      getUnlockedList: () => {
        return Object.values(get().unlockedLessons);
      },
    }),
    {
      name: "reec-hidden-lessons-v1",
      partialize: (state) => ({
        unlockedLessons: state.unlockedLessons,
      }),
    }
  )
);
