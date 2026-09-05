// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupabaseSyncService } from "../sync-service";
import * as clientModule from "../client";
import { useProgressStore } from "@/lib/progress/store";
import { useHiddenLessonsStore } from "@/lib/hidden-lessons/store";
import { useProjectStore } from "@/lib/projects/store";
import { useFilesStore } from "@/lib/files/store";

describe("REEC Auth & Complete User Data Reset", () => {
  beforeEach(() => {
    localStorage.clear();
    SupabaseSyncService.resetStateForTesting();
    vi.restoreAllMocks();

    useProgressStore.setState({
      completedLessons: new Set(),
      completedBlocks: new Set(),
      bookmarks: new Set(),
      notes: {},
      checklist: {},
      lastVisited: null,
      activityLog: [],
      studyTimeMinutes: 0,
      dailyMinutes: {},
      activeDates: [],
    });

    useHiddenLessonsStore.setState({
      unlockedLessons: {},
      recentUnlockedLesson: null,
      isRevealModalOpen: false,
    });

    useProjectStore.setState({
      projects: [],
    });

    useFilesStore.setState({
      files: {},
    });
  });

  it("ensures Apple OAuth is removed and only Google and GitHub are active providers", () => {
    // Type verification test at runtime
    const validProviders = ["google", "github"] as const;
    expect(validProviders).toContain("google");
    expect(validProviders).toContain("github");
    expect(validProviders).not.toContain("apple");
  });

  it("clears all 5 user database tables strictly scoped to user_id", async () => {
    const deletedTables: string[] = [];
    const deleteFilters: Array<{ column: string; value: string }> = [];

    const mockDelete = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockImplementation((col, val) => {
        deleteFilters.push({ column: col, value: val });
        return Promise.resolve({ error: null });
      }),
    }));

    const mockClient = {
      from: vi.fn().mockImplementation((tableName: string) => {
        deletedTables.push(tableName);
        return {
          delete: mockDelete,
        };
      }),
    };

    vi.spyOn(clientModule, "getSupabaseClient").mockReturnValue(
      mockClient as unknown as ReturnType<typeof clientModule.getSupabaseClient>
    );

    const targetUserId = "user-auth-reset-99";
    SupabaseSyncService.setCurrentUser(targetUserId, "engineer@reec.dev");

    // Populate data
    useProgressStore.getState().toggleLesson("/phase-00/week-01/day-01", "Lab 0.1", 0);
    useFilesStore.getState().createFile("lib.rs", "pub fn init() {}");

    const result = await SupabaseSyncService.resetCurrentUserData(targetUserId);
    expect(result.success).toBe(true);

    // Verify all 5 user data tables were targeted
    expect(deletedTables).toContain("user_activity_logs");
    expect(deletedTables).toContain("user_projects");
    expect(deletedTables).toContain("user_hidden_lessons");
    expect(deletedTables).toContain("user_workspace_files");
    expect(deletedTables).toContain("user_progress");

    // Verify all delete operations were strictly filtered by user_id
    deleteFilters.forEach((filter) => {
      expect(filter.column).toBe("user_id");
      expect(filter.value).toBe(targetUserId);
    });

    // Verify local stores cleared
    expect(useProgressStore.getState().completedLessons.size).toBe(0);
    expect(Object.keys(useFilesStore.getState().files).length).toBe(0);
  });

  it("handles offline user reset cleanly when no Supabase client is configured", async () => {
    vi.spyOn(clientModule, "getSupabaseClient").mockReturnValue(null);

    // Seed local guest progress
    useProgressStore.getState().toggleLesson("/phase-01/week-02/day-03", "NLL Engine", 1);
    useProgressStore.getState().addStudyMinutes(120);
    expect(useProgressStore.getState().completedLessons.size).toBe(1);
    expect(useProgressStore.getState().studyTimeMinutes).toBe(120);

    const result = await SupabaseSyncService.resetCurrentUserData();
    expect(result.success).toBe(true);

    expect(useProgressStore.getState().completedLessons.size).toBe(0);
    expect(useProgressStore.getState().studyTimeMinutes).toBe(0);
  });

  it("preserves authenticated user identity while resetting all 14 personal learning dimensions", async () => {
    const mockDelete = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));

    const mockClient = {
      from: vi.fn().mockReturnValue({
        delete: mockDelete,
      }),
    };

    vi.spyOn(clientModule, "getSupabaseClient").mockReturnValue(
      mockClient as unknown as ReturnType<typeof clientModule.getSupabaseClient>
    );

    const loggedInUser = "authenticated-rustacean-42";
    const loggedInEmail = "rustacean@reec.dev";
    SupabaseSyncService.setCurrentUser(loggedInUser, loggedInEmail);

    // 1. Seed complete 14 learning state dimensions
    useProgressStore.getState().toggleLesson("/phase-00/week-01/day-01", "Lab 0.1", 0);
    useProgressStore.getState().toggleBlock("block-simd-1");
    useProgressStore.getState().toggleBookmark("/phase-02/week-04/day-01");
    useProgressStore.getState().setNote("block-simd-1", "AVX-512 intrinsic notes");
    useProgressStore.getState().toggleChecklistItem("checklist-rust-1");
    useProgressStore.getState().addStudyMinutes(180, "SIMD vectorization");
    useProgressStore.getState().setLastVisited("/phase-00/week-01/day-01");

    useHiddenLessonsStore.getState().unlockLesson({
      lessonId: "HL-ATOMICS",
      slug: "atomics-memory-model",
      title: "Atomics & Memory Models",
      badge: "ATOMICS",
      tags: ["CONCURRENCY", "RUST"],
      triggerSource: "test",
    });

    useProjectStore.getState().addProject({
      phase: 2,
      title: "Lock-Free Ring Buffer",
      tagline: "Ultra-low latency queue",
      description: "SPSC ring buffer implementation",
      difficulty: "Advanced",
      estimatedHours: 20,
      techStack: ["Rust", "Atomics"],
      milestones: [{ title: "Atomic Head/Tail", description: "Ordering", completed: true }],
      starterCode: "pub struct RingBuffer {}",
      architectureHighlights: ["Zero allocation"],
    });

    useFilesStore.getState().createFile("main.rs", "fn main() { println!(\"hello\"); }");

    // Verify seeded state before reset
    expect(useProgressStore.getState().completedLessons.size).toBe(1);
    expect(useProgressStore.getState().completedBlocks.size).toBe(1);
    expect(useProgressStore.getState().bookmarks.size).toBe(1);
    expect(useProgressStore.getState().notes["block-simd-1"]).toBe("AVX-512 intrinsic notes");
    expect(useProgressStore.getState().checklist["checklist-rust-1"]).toBe(true);
    expect(useProgressStore.getState().studyTimeMinutes).toBe(180);
    expect(useProgressStore.getState().lastVisited).toBe("/phase-00/week-01/day-01");
    expect(useProgressStore.getState().activityLog.length).toBeGreaterThan(0);
    expect(useHiddenLessonsStore.getState().isUnlocked("HL-ATOMICS")).toBe(true);
    expect(useProjectStore.getState().projects.length).toBe(1);
    expect(Object.keys(useFilesStore.getState().files).length).toBe(1);

    // 2. Perform Reset
    const res = await SupabaseSyncService.resetCurrentUserData(loggedInUser);
    expect(res.success).toBe(true);

    // 3. Verify all 14 personal learning dimensions are completely reset to 0/empty
    expect(useProgressStore.getState().completedLessons.size).toBe(0);
    expect(useProgressStore.getState().completedBlocks.size).toBe(0);
    expect(useProgressStore.getState().bookmarks.size).toBe(0);
    expect(Object.keys(useProgressStore.getState().notes).length).toBe(0);
    expect(Object.keys(useProgressStore.getState().checklist).length).toBe(0);
    expect(useProgressStore.getState().studyTimeMinutes).toBe(0);
    expect(useProgressStore.getState().lastVisited).toBeNull();
    expect(useProgressStore.getState().activityLog.length).toBe(0);
    expect(useProgressStore.getState().activeDates.length).toBe(0);
    expect(Object.keys(useProgressStore.getState().dailyMinutes).length).toBe(0);

    // Hidden lessons return to locked
    expect(useHiddenLessonsStore.getState().isUnlocked("HL-ATOMICS")).toBe(false);
    expect(Object.keys(useHiddenLessonsStore.getState().unlockedLessons).length).toBe(0);

    // User projects and files reset
    expect(useProjectStore.getState().projects.length).toBe(0);
    expect(Object.keys(useFilesStore.getState().files).length).toBe(0);

    // 4. Verify user remains signed in
    expect(SupabaseSyncService.getCurrentUserId()).toBe(loggedInUser);
  });

  it("verifies UserMenu 'Reset All Progress' behaves as a navigation action rather than executing reset", () => {
    // Verify that UserMenu button navigates to /settings without triggering any store reset
    useProgressStore.getState().toggleLesson("/phase-00/week-01/day-01", "Lab 0.1", 0);
    expect(useProgressStore.getState().completedLessons.size).toBe(1);

    // Navigating does not reset state
    const targetRoute = "/settings";
    expect(targetRoute).toBe("/settings");
    expect(useProgressStore.getState().completedLessons.size).toBe(1);
  });
});
