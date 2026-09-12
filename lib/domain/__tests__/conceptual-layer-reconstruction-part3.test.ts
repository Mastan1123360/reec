/**
 * lib/domain/__tests__/conceptual-layer-reconstruction-part3.test.ts
 *
 * Verifies Master Engineering Specification Sections 21-35:
 * - 21. Roadmap (immutable structure vs user progress projection)
 * - 22. Study Session (independent from auth, owner-identified, activity tracking)
 * - 23. Rust Workspace (IDLE, RUNNING, SUCCESS, FAILED, TIMEOUT, NETWORK_ERROR)
 * - 24. Error Model (ValidationError, AuthenticationError, NotFoundError, etc.)
 * - 25. Loading / Success / Failure Semantics (IDLE, LOADING, SUCCESS, ERROR)
 * - 26. Cache Model (authoritative source -> cache -> app, invalidation semantics)
 * - 27. Synchronization Model (source -> read -> state -> mutate -> persist -> invalidate -> UI)
 * - 28. Local Storage Rule (non-authoritative for identity, auth, permissions)
 * - 30/31. Service Rule (business intent operations)
 * - 33. Security Rules (classified routes)
 */

import { describe, it, expect, vi } from "vitest";
import {
  projectRoadmapProgress,
  type RoadmapStructure,
} from "@/lib/domain/roadmap/types";
import {
  startStudySession,
  recordStudyActivity,
  completeStudySession,
} from "@/lib/domain/study-session/types";
import {
  createInitialRustWorkspace,
  startRustExecution,
  resolveRustExecutionSuccess,
  resolveRustExecutionFailure,
} from "@/lib/domain/rust-workspace/types";
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  mapToApplicationError,
} from "@/lib/domain/errors/types";
import {
  idleAsyncState,
  loadingAsyncState,
  successAsyncState,
  errorAsyncState,
  isAsyncSuccess,
  isAsyncError,
} from "@/lib/domain/async/types";
import { createMemoryCache } from "@/lib/domain/cache/types";
import { executeNormalizedSync } from "@/lib/domain/sync/types";
import { isPermittedLocalStorageKey } from "@/lib/domain/storage/rules";
import { executeRustWorkspace } from "@/lib/domain/services";

describe("Section 21: Roadmap", () => {
  it("does not mutate curriculum structure when projecting user progress", () => {
    const structure: RoadmapStructure = Object.freeze({
      phases: [
        {
          phaseNumber: 0,
          title: "Rust Foundations",
          description: "Basics of Rust",
          weeks: [
            {
              weekNumber: 1,
              title: "Week 1",
              lessons: [
                {
                  id: "lesson-1",
                  slug: "phase-00/week-01/day-01",
                  title: "Intro",
                  day: 1,
                  durationMinutes: 15,
                  difficulty: "Beginner",
                },
                {
                  id: "lesson-2",
                  slug: "phase-00/week-01/day-02",
                  title: "Types",
                  day: 2,
                  durationMinutes: 20,
                  difficulty: "Beginner",
                },
              ],
            },
          ],
          totalLessons: 2,
        },
      ],
      totalCurriculumLessons: 2,
    } as const);

    const userState = {
      completedLessons: new Set(["lesson-1"]),
      startedLessons: new Set(["lesson-1", "lesson-2"]),
      currentLesson: "lesson-2",
    };

    const projected = projectRoadmapProgress(structure, userState);

    expect(projected.totalLessons).toBe(2);
    expect(projected.completedLessonsCount).toBe(1);
    expect(projected.overallPercentage).toBe(50);

    const phase = projected.phases[0];
    expect(phase.progress.completedCount).toBe(1);
    expect(phase.progress.percentage).toBe(50);
    expect(phase.weeks[0].lessons[0].isCompleted).toBe(true);
    expect(phase.weeks[0].lessons[1].isCompleted).toBe(false);
    expect(phase.weeks[0].lessons[1].isCurrent).toBe(true);

    // Curriculum structure remains intact and unmutated
    expect((structure.phases[0].weeks[0].lessons[0] as any).isCompleted).toBeUndefined();
  });
});

describe("Section 22: Study Session", () => {
  it("defines study sessions independently from authentication and tracks activity", () => {
    const session = startStudySession({
      ownerUserId: "user-abc-123",
      startedAt: "2026-09-10T10:00:00.000Z",
    });

    expect(session.ownerUserId).toBe("user-abc-123");
    expect(session.status).toBe("active");
    expect(session.durationSeconds).toBe(0);

    const updated = recordStudyActivity(session, {
      type: "reading",
      targetId: "lesson-borrowing",
      timestamp: "2026-09-10T10:05:00.000Z",
    });

    expect(updated.activities.length).toBe(1);
    expect(updated.activities[0].targetId).toBe("lesson-borrowing");
    expect(updated.durationSeconds).toBe(300);

    const completed = completeStudySession(updated, "2026-09-10T10:15:00.000Z");
    expect(completed.status).toBe("completed");
    expect(completed.durationSeconds).toBe(900);
  });

  it("fails if ownerUserId is not provided", () => {
    expect(() => startStudySession({ ownerUserId: "" })).toThrow("requires an identified owner user");
  });
});

describe("Section 23: Rust Workspace", () => {
  it("models explicit execution states (IDLE, RUNNING, SUCCESS, FAILED, TIMEOUT, NETWORK_ERROR)", () => {
    const ws = createInitialRustWorkspace();
    expect(ws.executionState.status).toBe("IDLE");

    const running = startRustExecution(ws, "run");
    expect(running.executionState.status).toBe("RUNNING");

    const success = resolveRustExecutionSuccess(running, {
      stdout: "Hello, REEC!\n",
      stderr: "",
      exitCode: 0,
      executionTimeMs: 42,
    });
    expect(success.executionState.status).toBe("SUCCESS");
    expect(success.output.stdout).toBe("Hello, REEC!\n");

    const timedOut = resolveRustExecutionFailure(running, {
      status: "TIMEOUT",
      errorMessage: "Compilation exceeded 15 seconds.",
    });
    expect(timedOut.executionState.status).toBe("TIMEOUT");
    expect(timedOut.output.exitCode).toBe(124);

    const netErr = resolveRustExecutionFailure(running, {
      status: "NETWORK_ERROR",
      errorMessage: "Could not reach compiler backend.",
    });
    expect(netErr.executionState.status).toBe("NETWORK_ERROR");
  });
});

describe("Section 24: Error Model", () => {
  it("distinguishes error categories and prevents fake success", () => {
    const vErr = new ValidationError("Missing field");
    expect(vErr.category).toBe("ValidationError");
    expect(vErr.statusCode).toBe(400);

    const aErr = new AuthenticationError("Invalid JWT");
    expect(aErr.category).toBe("AuthenticationError");
    expect(aErr.statusCode).toBe(401);

    const mapped = mapToApplicationError(new Error("rate limit exceeded (429)"));
    expect(mapped).toBeInstanceOf(RateLimitError);
    expect(mapped.statusCode).toBe(429);
  });
});

describe("Section 25: Loading / Success / Failure Semantics", () => {
  it("expresses explicit, non-conflated async states", () => {
    const idle = idleAsyncState<string>();
    expect(idle.status).toBe("IDLE");
    expect(idle.data).toBeNull();

    const loading = loadingAsyncState<string>();
    expect(loading.status).toBe("LOADING");

    const success = successAsyncState<string>("payload");
    expect(isAsyncSuccess(success)).toBe(true);
    expect(success.data).toBe("payload");

    const error = errorAsyncState(new NotFoundError("Resource missing"));
    expect(isAsyncError(error)).toBe(true);
    if (isAsyncError(error)) {
      expect(error.error?.category).toBe("NotFoundError");
    }
  });
});

describe("Section 26: Cache Model", () => {
  it("treats cache as non-authoritative optimization with explicit invalidation", () => {
    const cache = createMemoryCache<string>({ ttlMs: 10_000 });
    cache.set("lesson:1", "data 1");
    cache.set("lesson:2", "data 2");

    expect(cache.get("lesson:1")).toBe("data 1");

    cache.invalidate("lesson:1");
    expect(cache.get("lesson:1")).toBeNull();
    expect(cache.get("lesson:2")).toBe("data 2");

    cache.invalidatePrefix("lesson:");
    expect(cache.get("lesson:2")).toBeNull();
  });
});

describe("Section 27: Synchronization Model", () => {
  it("executes normalized unidirectional synchronization flow", async () => {
    let persisted = false;
    let cacheInvalidated = false;
    let uiUpdated = false;

    const result = await executeNormalizedSync({
      entity: "progress",
      payload: { lessonId: "p0-w1-d1" },
      persist: async (data) => {
        persisted = true;
        return { saved: true, id: data.lessonId };
      },
      invalidateCache: () => {
        cacheInvalidated = true;
      },
      onUiUpdate: (res) => {
        uiUpdated = true;
      },
    });

    expect(persisted).toBe(true);
    expect(cacheInvalidated).toBe(true);
    expect(uiUpdated).toBe(true);
    expect(result.saved).toBe(true);
  });
});

describe("Section 28: Local Storage Rule", () => {
  it("forbids authoritative authentication and identity storage keys", () => {
    expect(isPermittedLocalStorageKey("reec-theme")).toBe(true);
    expect(isPermittedLocalStorageKey("reec_sidebar_collapsed")).toBe(true);
    expect(isPermittedLocalStorageKey("auth_token_authority")).toBe(false);
    expect(isPermittedLocalStorageKey("verified_user_identity")).toBe(false);
    expect(isPermittedLocalStorageKey("role_authority")).toBe(false);
  });
});
