/**
 * lib/domain/__tests__/conceptual-layer-reconstruction-part2.test.ts
 *
 * Master Engineering Specification: Instructions 11-20 Test Suite.
 */

import { describe, it, expect, vi } from "vitest";
import { authenticateServerRequest } from "../server-identity/guard";
import { createREECProfile } from "../profile/types";
import { projectSupabaseSession } from "../session/types";
import { createInitialLearningState } from "../learning/types";
import {
  createInitialLessonLifecycleState,
  isLessonExists,
  isLessonLoaded,
  isLessonViewed,
  isLessonStarted,
  isLessonCompleted,
} from "../lesson/types";
import {
  createLessonStartedEvent,
  createLessonCompletedEvent,
  createProjectCompletedEvent,
  createMilestoneReachedEvent,
} from "../progress/events";
import { evaluateProgressRules } from "../progress/rules";
import { createBookmark } from "../bookmarks/types";
import { evaluateProjectCompletion } from "../projects/types";

describe("11. SERVER IDENTITY RULE", () => {
  it("rejects unauthenticated requests without authorization header", async () => {
    const req = new Request("http://localhost:3000/api/auth/username", {
      method: "POST",
      body: JSON.stringify({ username: "test_dev", userId: "spoofed-user-id" }),
    });

    const result = await authenticateServerRequest(req);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
      const data = await result.response.json();
      expect(data.error).toContain("Missing or invalid Authorization header");
    }
  });

  it("rejects requests with empty Bearer token", async () => {
    const req = new Request("http://localhost:3000/api/auth/username", {
      method: "POST",
      headers: { Authorization: "Bearer " },
      body: JSON.stringify({ username: "test_dev" }),
    });

    const result = await authenticateServerRequest(req);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
    }
  });
});

describe("12. PROFILE MODEL", () => {
  it("enforces that profile belongs to exactly one Supabase userId identity", () => {
    expect(() =>
      createREECProfile({
        userId: "",
        username: "rust_coder",
      })
    ).toThrow(/Profile must belong to exactly one Supabase userId/);

    const profile = createREECProfile({
      userId: "usr-auth-777",
      username: "Rust_Coder",
      displayName: "Ferris",
      avatar: "avatar-1",
      metadata: { rustExperienceLevel: "advanced" },
    });

    expect(profile.userId).toBe("usr-auth-777");
    expect(profile.username).toBe("rust_coder");
    expect(profile.displayName).toBe("Ferris");
    expect(profile.metadata.rustExperienceLevel).toBe("advanced");
  });
});

describe("13. SESSION MODEL", () => {
  it("projects raw Supabase session to CanonicalSession without manual token fragmentation", () => {
    const rawSession = {
      access_token: "mock-access-token-xyz",
      refresh_token: "mock-refresh-token-xyz",
      expires_at: 1780000000,
      token_type: "bearer",
      user: {
        id: "usr-sb-100",
        email: "dev@reec.academy",
        email_confirmed_at: "2026-09-01T00:00:00Z",
      },
    };

    const canonical = projectSupabaseSession(rawSession as any);
    expect(canonical.accessToken).toBe("mock-access-token-xyz");
    expect(canonical.refreshToken).toBe("mock-refresh-token-xyz");
    expect(canonical.identity.id).toBe("usr-sb-100");
    expect(canonical.identity.emailConfirmed).toBe(true);
  });
});

describe("15. PASSWORD RECOVERY MODEL", () => {
  it("rejects unauthenticated password reset requests without a valid session", async () => {
    // Calling POST /api/auth/reset-password directly without token
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const req = new Request("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "victim@domain.com", newPassword: "malicious-password-123" }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("authenticated Supabase recovery session");
  });
});

describe("16. LEARNING DOMAIN SEPARATION", () => {
  it("separates learning state from authentication state", () => {
    const learning = createInitialLearningState();
    expect(learning.currentLesson).toBeNull();
    expect(learning.startedLessons.size).toBe(0);
    expect(learning.completedLessons.size).toBe(0);
    expect(learning.progress.totalLessons).toBe(42);
    expect(learning.progress.completionPercentage).toBe(0);
    expect(learning.bookmarks).toHaveLength(0);
    expect(learning.projects).toHaveLength(0);
    expect(learning.activity).toHaveLength(0);
  });
});

describe("17. LESSON MODEL & DISTINCT CONCEPTUAL STATES", () => {
  it("strictly separates exists, loaded, viewed, started, and completed without overloading booleans", () => {
    const state = createInitialLessonLifecycleState({
      exists: true,
      loaded: true,
      viewed: true,
      started: false,
      completed: false,
    });

    expect(isLessonExists(state)).toBe(true);
    expect(isLessonLoaded(state)).toBe(true);
    expect(isLessonViewed(state)).toBe(true);
    expect(isLessonStarted(state)).toBe(false);
    expect(isLessonCompleted(state)).toBe(false);

    // Starting a lesson changes started, but does NOT prematurely mark it completed
    const startedState = { ...state, started: true };
    expect(isLessonStarted(startedState)).toBe(true);
    expect(isLessonCompleted(startedState)).toBe(false);

    // Explicitly completing it
    const completedState = { ...startedState, completed: true };
    expect(isLessonCompleted(completedState)).toBe(true);
  });
});

describe("18. PROGRESS MODEL FROM LEARNING EVENTS", () => {
  it("derives progress deterministically through defined learning events", () => {
    const events = [
      createLessonStartedEvent("P0-W1-D1"),
      createLessonStartedEvent("P0-W1-D2"),
      createLessonCompletedEvent("P0-W1-D1"),
      createLessonCompletedEvent("P0-W1-D1"), // Duplicate completed event
      createProjectCompletedEvent("proj-1", 1),
      createMilestoneReachedEvent("ms-basics", "Mastered syntax"),
    ];

    const progress = evaluateProgressRules(events, 42);
    expect(progress.startedCount).toBe(2); // D1 and D2
    expect(progress.completedCount).toBe(1); // D1 deduplicated
    expect(progress.completionPercentage).toBe(Math.round((1 / 42) * 100)); // ~2%
    expect(progress.completedProjects.has("proj-1")).toBe(true);
    expect(progress.reachedMilestones.has("ms-basics")).toBe(true);
  });
});

describe("19. BOOKMARKS MODEL", () => {
  it("creates pure learning-domain bookmarks without mixing with browser/auth state", () => {
    const bm = createBookmark({
      lessonId: "P1-W3-D2",
      lessonPath: "phase-01/week-03/day-02",
      lessonTitle: "Non-Lexical Lifetimes",
      notes: "Important reference for borrow checker rules",
    });

    expect(bm.lessonId).toBe("P1-W3-D2");
    expect(bm.lessonPath).toBe("phase-01/week-03/day-02");
    expect(bm.lessonTitle).toBe("Non-Lexical Lifetimes");
    expect(bm.notes).toBe("Important reference for borrow checker rules");
    expect(bm.createdAt).toBeDefined();
  });
});

describe("20. PROJECTS MODEL", () => {
  it("evaluates project completion authoritatively from milestone criteria, not UI state", () => {
    const milestones = [
      {
        id: "m1",
        title: "Atomic Head & Tail",
        description: "Implement ordering",
        isCompleted: true,
        requiredForCompletion: true,
        completedAt: "2026-09-01T12:00:00Z",
      },
      {
        id: "m2",
        title: "Zero-Allocation Buffer",
        description: "Ring buffer memory",
        isCompleted: false,
        requiredForCompletion: true,
      },
    ];

    // Incomplete when required milestone is false
    const eval1 = evaluateProjectCompletion(milestones);
    expect(eval1.isCompleted).toBe(false);
    expect(eval1.completedAt).toBeNull();

    // Complete when all required milestones are met
    const completeMilestones = [
      milestones[0],
      { ...milestones[1], isCompleted: true, completedAt: "2026-09-02T15:00:00Z" },
    ];
    const eval2 = evaluateProjectCompletion(completeMilestones);
    expect(eval2.isCompleted).toBe(true);
    expect(eval2.completedAt).toBe("2026-09-02T15:00:00Z");
  });
});
