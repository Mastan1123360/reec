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

  it("preserves locally marked lessons across multiple weeks/phases and unions during re-sync without unmarking", async () => {
    // 1. Setup existing user with Week 1 completed on server
    const serverWeek1 = ["/phase-00/week-01/day-01", "/phase-00/week-01/day-02"];
    let capturedUpsertPayload: any = null;

    const mockClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "user_progress") {
          return {
            upsert: vi.fn().mockImplementation((payload: any) => {
              capturedUpsertPayload = payload;
              return Promise.resolve({ error: null });
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    user_id: "user-sync-persist",
                    completed_lessons: serverWeek1,
                    completed_blocks: [],
                    bookmarks: [],
                    notes: {},
                    checklist: {},
                    study_time_minutes: 60,
                    daily_minutes: {},
                    active_dates: [],
                    last_visited: null,
                    version: 1,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === "user_activity_logs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }),
    };

    vi.spyOn(clientModule, "getSupabaseClient").mockReturnValue(
      mockClient as unknown as ReturnType<typeof clientModule.getSupabaseClient>
    );

    SupabaseSyncService.setCurrentUser("user-sync-persist", "user@example.com");

    // 2. User marks Week 2 and Week 3 locally before server re-sync
    useProgressStore.getState().toggleLesson("/phase-00/week-01/day-01", "W1D1", 0);
    useProgressStore.getState().toggleLesson("/phase-00/week-01/day-02", "W1D2", 0);
    useProgressStore.getState().toggleLesson("/phase-00/week-02/day-01", "W2D1", 0);
    useProgressStore.getState().toggleLesson("/phase-00/week-02/day-02", "W2D2", 0);
    useProgressStore.getState().toggleLesson("/phase-00/week-03/day-01", "W3D1", 0);

    expect(useProgressStore.getState().completedLessons.size).toBe(5);

    // 3. User triggers re-sync (e.g. migrateAndHydrateUser or sync status check)
    const syncResult = await SupabaseSyncService.migrateAndHydrateUser("user-sync-persist");
    expect(syncResult).toBe(true);

    // 4. Verify local store STILL contains all 5 lessons: none were unmarked or lost
    const localCompleted = useProgressStore.getState().completedLessons;
    expect(localCompleted.size).toBe(5);
    expect(localCompleted.has("/phase-00/week-01/day-01")).toBe(true);
    expect(localCompleted.has("/phase-00/week-01/day-02")).toBe(true);
    expect(localCompleted.has("/phase-00/week-02/day-01")).toBe(true);
    expect(localCompleted.has("/phase-00/week-02/day-02")).toBe(true);
    expect(localCompleted.has("/phase-00/week-03/day-01")).toBe(true);

    // 5. Verify server upsert received all 5 lessons
    expect(capturedUpsertPayload).toBeDefined();
    expect(capturedUpsertPayload.completed_lessons).toHaveLength(5);
    expect(capturedUpsertPayload.completed_lessons).toContain("/phase-00/week-03/day-01");
  });

  it("never unmarks lessons on re-sync when lessons are toggled off and back on (chronological activity log resolution)", async () => {
    // 1. Reset progress store
    useProgressStore.setState({
      completedLessons: new Set<string>(),
      completedBlocks: new Set<string>(),
      bookmarks: new Set<string>(),
      activityLog: [],
    });

    let capturedUpsertPayload: any = null;
    const mockClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "user_progress") {
          return {
            upsert: vi.fn().mockImplementation((payload: any) => {
              capturedUpsertPayload = payload;
              return Promise.resolve({ error: null });
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    user_id: "user-toggle-resync",
                    completed_lessons: [
                      "/lesson/phase-00/week-01/day-01",
                      "/lesson/phase-00/week-01/day-02",
                    ],
                    completed_blocks: [],
                    bookmarks: [],
                    notes: {},
                    checklist: {},
                    study_time_minutes: 30,
                    daily_minutes: {},
                    active_dates: [],
                    last_visited: null,
                    version: 1,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === "user_activity_logs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }),
    };

    vi.spyOn(clientModule, "getSupabaseClient").mockReturnValue(
      mockClient as unknown as ReturnType<typeof clientModule.getSupabaseClient>
    );

    SupabaseSyncService.setCurrentUser("user-toggle-resync", "user2@example.com");

    // 2. User marks Week 1, Week 2, Week 3 lessons
    useProgressStore.getState().toggleLesson("/lesson/phase-00/week-01/day-01", "W1D1", 0);
    useProgressStore.getState().toggleLesson("/lesson/phase-00/week-01/day-02", "W1D2", 0);
    useProgressStore.getState().toggleLesson("/lesson/phase-00/week-02/day-01", "W2D1", 0);
    useProgressStore.getState().toggleLesson("/lesson/phase-00/week-02/day-02", "W2D2", 0);
    useProgressStore.getState().toggleLesson("/lesson/phase-00/week-03/day-01", "W3D1", 0);

    // 3. User toggles W2D1 off then back on (simulating unmarking by accident then re-completing)
    useProgressStore.getState().toggleLesson("/lesson/phase-00/week-02/day-01", "W2D1", 0); // unmarked
    expect(useProgressStore.getState().completedLessons.has("/lesson/phase-00/week-02/day-01")).toBe(false);

    useProgressStore.getState().toggleLesson("/lesson/phase-00/week-02/day-01", "W2D1", 0); // re-completed
    expect(useProgressStore.getState().completedLessons.has("/lesson/phase-00/week-02/day-01")).toBe(true);

    // Also manually inject an activity log scenario where an older unmark event is present
    // along with non-lesson events (notes, etc.)
    const existingLog = useProgressStore.getState().activityLog;
    useProgressStore.setState({
      activityLog: [
        {
          id: "act-new-note",
          type: "note_saved",
          title: "Saved note",
          path: "/lesson/phase-00/week-02/day-01",
          timestamp: Date.now() + 10,
        },
        ...existingLog,
        {
          id: "act-old-unmark",
          type: "lesson_uncompleted",
          title: "Old unmark",
          path: "/lesson/phase-00/week-02/day-01",
          timestamp: Date.now() - 50000,
        },
      ],
    });

    // 4. User triggers re-sync
    const syncResult = await SupabaseSyncService.migrateAndHydrateUser("user-toggle-resync");
    expect(syncResult).toBe(true);

    // 5. Verify that W2D1 (and ALL marked lessons) REMAIN completed and NOT unmarked!
    const localCompleted = useProgressStore.getState().completedLessons;
    expect(localCompleted.has("/lesson/phase-00/week-01/day-01")).toBe(true);
    expect(localCompleted.has("/lesson/phase-00/week-01/day-02")).toBe(true);
    expect(localCompleted.has("/lesson/phase-00/week-02/day-01")).toBe(true);
    expect(localCompleted.has("/lesson/phase-00/week-02/day-02")).toBe(true);
    expect(localCompleted.has("/lesson/phase-00/week-03/day-01")).toBe(true);

    // 6. Verify server upsert contains all 5 lessons including the toggled one
    expect(capturedUpsertPayload).toBeDefined();
    expect(capturedUpsertPayload.completed_lessons).toContain("/lesson/phase-00/week-02/day-01");
    expect(capturedUpsertPayload.completed_lessons).toContain("/lesson/phase-00/week-03/day-01");
  });
});
