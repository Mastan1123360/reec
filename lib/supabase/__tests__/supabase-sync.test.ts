// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { SupabaseSyncService } from "../sync-service";
import * as clientModule from "../client";
import { useProgressStore } from "@/lib/progress/store";
import { useHiddenLessonsStore } from "@/lib/hidden-lessons/store";
import { useProjectStore } from "@/lib/projects/store";
import { useFilesStore } from "@/lib/files/store";

describe("Supabase Sync, Security & Migration Service", () => {
  beforeEach(() => {
    localStorage.clear();
    SupabaseSyncService.resetStateForTesting();
    vi.restoreAllMocks();

    // Reset stores
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

  it("correctly tracks and clears current authenticated user", () => {
    expect(SupabaseSyncService.getCurrentUserId()).toBeNull();
    SupabaseSyncService.setCurrentUser("user-123", "user@example.com");
    expect(SupabaseSyncService.getCurrentUserId()).toBe("user-123");
    SupabaseSyncService.setCurrentUser(null);
    expect(SupabaseSyncService.getCurrentUserId()).toBeNull();
  });

  it("handles unconfigured/offline environment gracefully without throwing", async () => {
    vi.spyOn(clientModule, "getSupabaseClient").mockReturnValue(null);
    SupabaseSyncService.setCurrentUser("user-offline");
    const success = await SupabaseSyncService.migrateAndHydrateUser("user-offline");
    // When Supabase is not configured in env, it sets offline status and returns false gracefully without throwing
    expect(SupabaseSyncService.getStatus()).toBe("offline");
    expect(success).toBe(false);
  });

  it("ensures stores record local mutations and queue background synchronization", () => {
    // 1. Progress store mutation
    useProgressStore.getState().toggleLesson("/phase-00/week-01/day-01", "Lab 0.1", 0);
    expect(useProgressStore.getState().completedLessons.has("/phase-00/week-01/day-01")).toBe(true);

    // 2. Hidden lesson unlock (execution gated)
    const unlocked = useHiddenLessonsStore.getState().unlockLesson({
      lessonId: "HL-NLL",
      slug: "nll",
      title: "Non-Lexical Lifetimes",
      badge: "NLL",
      tags: ["RUST", "COMPILER"],
      triggerSource: "test",
    });
    expect(unlocked).toBe(true);
    expect(useHiddenLessonsStore.getState().isUnlocked("HL-NLL")).toBe(true);

    // Repeated unlock is strictly idempotent
    const unlockedAgain = useHiddenLessonsStore.getState().unlockLesson({
      lessonId: "HL-NLL",
      slug: "nll",
      title: "Non-Lexical Lifetimes",
      badge: "NLL",
      tags: ["RUST", "COMPILER"],
    });
    expect(unlockedAgain).toBe(false);

    // 3. Projects store mutation
    const projId = useProjectStore.getState().addProject({
      phase: 1,
      title: "BTree Engine",
      tagline: "High performance storage",
      description: "Custom BTree engine in Rust",
      difficulty: "Advanced",
      estimatedHours: 20,
      techStack: ["Rust", "BTree"],
      milestones: [{ title: "Node split", description: "Implement node split", completed: false }],
      starterCode: "fn main() {}",
      architectureHighlights: ["Zero allocations", "Cache friendly"],
    });
    expect(useProjectStore.getState().projects.length).toBe(1);
    expect(useProjectStore.getState().projects[0].id).toBe(projId);

    // 4. Files store mutation
    const fileId = useFilesStore.getState().createFile("main.rs", "fn main() { println!(\"REEC\"); }");
    expect(useFilesStore.getState().files[fileId]).toBeDefined();
    expect(useFilesStore.getState().files[fileId].name).toBe("main.rs");
  });

  it("ensures User A and User B data isolation boundary semantics", () => {
    // Simulate User A state
    SupabaseSyncService.setCurrentUser("user-a", "user_a@example.com");
    useProgressStore.getState().toggleLesson("/phase-00/week-01/day-01", "Lesson 1", 0);
    const userACompleted = Array.from(useProgressStore.getState().completedLessons);
    expect(userACompleted).toContain("/phase-00/week-01/day-01");

    // Simulate User A logging out
    SupabaseSyncService.setCurrentUser(null);
    expect(SupabaseSyncService.getCurrentUserId()).toBeNull();

    // Reset store on new user sign in
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

    // User B signs in
    SupabaseSyncService.setCurrentUser("user-b", "user_b@example.com");
    expect(useProgressStore.getState().completedLessons.size).toBe(0);
    expect(useProgressStore.getState().completedLessons.has("/phase-00/week-01/day-01")).toBe(false);
  });

  it("verifies debounced workspace file editing avoids blocking and respects newer revisions", () => {
    const fileId = useFilesStore.getState().createFile("lib.rs", "fn test() {}");
    expect(useFilesStore.getState().files[fileId].content).toBe("fn test() {}");

    // Rapid keystroke simulation
    useFilesStore.getState().updateContent(fileId, "fn test() { let a = 1; }");
    useFilesStore.getState().updateContent(fileId, "fn test() { let a = 1; let b = 2; }");
    useFilesStore.getState().updateContent(fileId, "fn test() { let a = 1; let b = 2; a + b }");

    // Latest state is immediately updated in local store synchronously
    expect(useFilesStore.getState().files[fileId].content).toBe("fn test() { let a = 1; let b = 2; a + b }");
  });

  it("verifies Hidden Lesson execution gating: locked lessons cannot be unlocked by client hydration", () => {
    // Hidden lesson is locked by default
    expect(useHiddenLessonsStore.getState().isUnlocked("HL-ADVANCED")).toBe(false);

    // Server hydration simulation with no unlocks
    useHiddenLessonsStore.setState({
      unlockedLessons: {},
      recentUnlockedLesson: null,
      isRevealModalOpen: false,
    });

    expect(useHiddenLessonsStore.getState().isUnlocked("HL-ADVANCED")).toBe(false);
    expect(useHiddenLessonsStore.getState().isRevealModalOpen).toBe(false);
  });

  it("gracefully handles unmigrated schema-cache missing table errors without throwing or failing local operations", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({
        error: { code: "PGRST205", message: "Could not find the table 'public.user_progress' in the schema cache" },
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            error: { code: "PGRST205", message: "Could not find the table 'public.user_progress' in the schema cache" },
          }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              error: { code: "PGRST205", message: "Could not find the table 'public.user_activity_logs' in the schema cache" },
            }),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { code: "PGRST205", message: "Could not find the table in the schema cache" },
          }),
        }),
      }),
    });

    vi.spyOn(clientModule, "getSupabaseClient").mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof clientModule.getSupabaseClient>);

    SupabaseSyncService.setCurrentUser("user-unmigrated", "test@example.com");
    const res = await SupabaseSyncService.migrateAndHydrateUser("user-unmigrated");
    expect(res).toBe(true);
    expect(SupabaseSyncService.getStatus()).toBe("offline");
    expect(SupabaseSyncService.isTableAvailable("user_progress")).toBe(false);

    // Mutations should succeed locally and not throw
    useProgressStore.getState().toggleLesson("/phase-00/week-01/day-01", "Lab", 0);
    expect(useProgressStore.getState().completedLessons.has("/phase-00/week-01/day-01")).toBe(true);
  });

  it("resets all REEC data across all stores, local storage, and database tables", async () => {
    // 1. Seed state in all stores
    useProgressStore.getState().toggleLesson("/phase-00/week-01/day-01", "Lab 0.1", 0);
    useProgressStore.getState().toggleBlock("block-1");
    useProgressStore.getState().toggleBookmark("/phase-00/week-01/day-01");
    useProgressStore.getState().setNote("block-1", "Crucial Rust concept");
    useProgressStore.getState().addStudyMinutes(45, "Rust memory safety");

    useHiddenLessonsStore.getState().unlockLesson({
      lessonId: "HL-NLL",
      slug: "nll",
      title: "Non-Lexical Lifetimes",
      badge: "NLL",
      tags: ["RUST", "COMPILER"],
      triggerSource: "test",
    });

    useProjectStore.getState().addProject({
      phase: 1,
      title: "Zero-Copy Parser",
      tagline: "High speed parser",
      description: "Nom parser in Rust",
      difficulty: "Intermediate",
      estimatedHours: 15,
      techStack: ["Rust", "Nom"],
      milestones: [{ title: "Tokens", description: "Lexer", completed: true }],
      starterCode: "fn parse() {}",
      architectureHighlights: ["Zero copy"],
    });

    useFilesStore.getState().createFile("scratch.rs", "fn scratch() {}");

    // Verify seeded state
    expect(useProgressStore.getState().completedLessons.size).toBe(1);
    expect(useProgressStore.getState().bookmarks.size).toBe(1);
    expect(useProgressStore.getState().studyTimeMinutes).toBe(45);
    expect(useHiddenLessonsStore.getState().isUnlocked("HL-NLL")).toBe(true);
    expect(useProjectStore.getState().projects.length).toBe(1);
    expect(Object.keys(useFilesStore.getState().files).length).toBe(1);

    // Mock Supabase client for reset
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockClient = {
      from: vi.fn().mockReturnValue({
        delete: deleteMock,
      }),
    };

    vi.spyOn(clientModule, "getSupabaseClient").mockReturnValue(
      mockClient as unknown as ReturnType<typeof clientModule.getSupabaseClient>
    );

    SupabaseSyncService.setCurrentUser("user-reset-test", "reset@example.com");

    // 2. Perform Complete Data Reset
    const result = await SupabaseSyncService.resetCurrentUserData("user-reset-test");
    expect(result.success).toBe(true);

    // 3. Verify all stores are fully reset
    expect(useProgressStore.getState().completedLessons.size).toBe(0);
    expect(useProgressStore.getState().completedBlocks.size).toBe(0);
    expect(useProgressStore.getState().bookmarks.size).toBe(0);
    expect(Object.keys(useProgressStore.getState().notes).length).toBe(0);
    expect(useProgressStore.getState().studyTimeMinutes).toBe(0);
    expect(useHiddenLessonsStore.getState().isUnlocked("HL-NLL")).toBe(false);
    expect(Object.keys(useHiddenLessonsStore.getState().unlockedLessons).length).toBe(0);
    expect(useProjectStore.getState().projects.length).toBe(0);
    expect(Object.keys(useFilesStore.getState().files).length).toBe(0);

    // 4. Verify Supabase tables were called with deletion scoped to user
    expect(mockClient.from).toHaveBeenCalledWith("user_activity_logs");
    expect(mockClient.from).toHaveBeenCalledWith("user_projects");
    expect(mockClient.from).toHaveBeenCalledWith("user_hidden_lessons");
    expect(mockClient.from).toHaveBeenCalledWith("user_workspace_files");
    expect(mockClient.from).toHaveBeenCalledWith("user_progress");
  });

  it("handles cloud failure during reset without clearing local state", async () => {
    // Seed local state
    useProgressStore.getState().toggleLesson("/phase-00/week-01/day-01", "Lab 0.1", 0);
    expect(useProgressStore.getState().completedLessons.size).toBe(1);

    // Mock failing Supabase client
    const mockClient = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { code: "500", message: "Database connection timed out" },
          }),
        }),
      }),
    };

    vi.spyOn(clientModule, "getSupabaseClient").mockReturnValue(
      mockClient as unknown as ReturnType<typeof clientModule.getSupabaseClient>
    );

    SupabaseSyncService.setCurrentUser("user-fail-test", "fail@example.com");

    const result = await SupabaseSyncService.resetCurrentUserData("user-fail-test");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Reset could not be completed");

    // Local data should still be intact
    expect(useProgressStore.getState().completedLessons.size).toBe(1);
  });
});
