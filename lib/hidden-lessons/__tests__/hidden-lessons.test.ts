import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import { parseLesson } from "@/lib/content/parser";
import { getAllHiddenLessons, getHiddenLessonTriggers, searchLessons } from "@/lib/content/discover";
import { buildSemanticModel } from "@/lib/semantic/model";
import { interpretLesson } from "@/lib/semantic/interpreter";
import { HiddenLessonTriggerService } from "../service";
import { useHiddenLessonsStore } from "../store";

describe("Hidden Lesson System & Formatter Integration", () => {
  beforeEach(() => {
    // Reset store before each test
    useHiddenLessonsStore.setState({
      unlockedLessons: {},
      recentUnlockedLesson: null,
      isRevealModalOpen: false,
    });

    HiddenLessonTriggerService.clearRegistry();

    // Register canonical test trigger
    HiddenLessonTriggerService.register({
      hiddenLessonId: "HL-P1-W3-D2-NLL",
      slug: "nll",
      title: "Non-Lexical Lifetimes",
      subtitle: "The Borrow Checker, Reconsidered.",
      description: "A deeper look into how Rust's borrow checking is evolving.",
      badge: "NLL",
      tags: ["RUST", "COMPILER THINKING", "ADVANCED"],
      trigger: {
        type: "code_execution",
        lessonId: "P1-W3-D2",
        challengeId: "challenge-3",
        blockId: "challenge-3-executable",
        executionRequirement: "execution_attempt",
      },
    });
  });

  describe("File Format & Parser Integration (Same REEC Pipeline)", () => {
    it("parses the hidden lesson markdown using standard REEC parseLesson", async () => {
      const raw = `---
id: "HL-P1-W3-D2-NLL"
title: "Non-Lexical Lifetimes"
subtitle: "The Borrow Checker, Reconsidered."
slug: "nll"
badge: "NLL"
category: "Lifetimes & References"
difficulty: "Advanced"
estimatedMinutes: 25
phase: 1
week: 3
day: 2
hidden: true
published: true
tags:
  - "RUST"
  - "COMPILER THINKING"
  - "ADVANCED"
learning_objectives:
  - "Understand how AST control-flow graphs replaced strict lexical scopes."
  - "Diagnose early drop behavior."
  - "Trace variable liveness dynamically."
trigger:
  challengeId: "challenge-3"
  blockId: "challenge-3-executable"
  lessonId: "P1-W3-D2"
  type: "code_execution"
  executionRequirement: "execution_attempt"
---

# Non-Lexical Lifetimes

:::story
In Rust 2015, borrows lived until the enclosing curly brace. Rust 2018 introduced NLL.
:::

:::mental-model
Think of lifetimes as span of points in the Control Flow Graph rather than syntactic braces.
:::

:::worked-example
\`\`\`rust
fn main() {
    let mut data = vec![1, 2, 3];
    let slice = &data[0..2];
    println!("{:?}", slice);
    data.push(4); // Valid in NLL!
}
\`\`\`
:::

:::compiler-thinking
The borrow checker analyzes Point(Liveness) <= Point(End of Use).
:::

:::engineering-note
Do not rely on drop order if you need side effects to happen at scope exit.
:::

:::mini-challenge
Modify a slice borrow before mutating the vector.
:::

:::reflection
How does CFG liveness transform API design in Rust?
:::
`;
      const lesson = await parseLesson(raw, ["hidden-lessons", "nll"]);

      // 1. Validate normalized frontmatter
      expect(lesson.frontmatter.id).toBe("HL-P1-W3-D2-NLL");
      expect(lesson.frontmatter.title).toBe("Non-Lexical Lifetimes");
      expect(lesson.frontmatter.hidden).toBe(true);
      expect(lesson.frontmatter.learning_objectives.length).toBeGreaterThanOrEqual(3);
      expect(lesson.frontmatter.trigger).toBeDefined();
      expect(lesson.frontmatter.trigger?.challengeId).toBe("challenge-3");
      expect(lesson.frontmatter.trigger?.blockId).toBe("challenge-3-executable");
      expect(lesson.frontmatter.trigger?.lessonId).toBe("P1-W3-D2");

      // 2. Validate standard REEC blocks and widgets
      const blockKinds = lesson.blocks.map((b) => b.kind);
      expect(blockKinds).toContain("story");
      expect(blockKinds).toContain("mental-model");
      expect(blockKinds).toContain("worked-example");
      expect(blockKinds).toContain("compiler-thinking");
      expect(blockKinds).toContain("engineering-note");
      expect(blockKinds).toContain("mini-challenge");
      expect(blockKinds).toContain("reflection");

      // 3. Validate semantic model generation
      const model = buildSemanticModel(lesson);
      expect(model.title).toBe("Non-Lexical Lifetimes");
      expect(model.hasCompilerThinking).toBe(true);
      expect(model.hasEngineeringNotes).toBe(true);
      expect(model.hasReflection).toBe(true);

      // 4. Validate experience plan generation
      const plan = interpretLesson(model);
      expect(plan.modules).toContain("mission");
      expect(plan.missionTitle).toBe("Non-Lexical Lifetimes");
    });

    it("verifies Day 01 AST completely excludes co-located hidden lesson content", async () => {
      const raw = `---
id: "P0-W1-D1"
title: "Computational Thinking"
phase: 0
week: 1
day: 1
published: true
hidden_lessons:
  - id: "HL-P1-W3-D2-NLL"
    title: "Non-Lexical Lifetimes"
    trigger:
      challengeId: "challenge-3"
      blockId: "challenge-3-executable"
      lessonId: "P1-W3-D2"
---

# Computational Thinking

:::story
Understanding system execution.
:::

\`\`\`rust [challengeId="challenge-3" blockId="challenge-3-executable"]
fn main() {
    println!("Challenge 3 Code");
}
\`\`\`

:::hidden-lesson id="HL-P1-W3-D2-NLL"
## The Borrow Checker That Learned to Be Precise

:::mental-model
Lexical Scope vs. Actual Borrow Usage
:::
:::
`;
      const lesson = await parseLesson(raw, ["phase-00", "week-01", "day-01"]);

      // 1. Normal lesson must NOT contain hidden-lesson in blocks
      const blockKinds = lesson.blocks.map((b) => b.kind);
      expect(blockKinds).not.toContain("hidden-lesson");

      // 2. Normal lesson sections must NOT contain any hidden-lesson nodes or NLL headings
      const sectionHeadings = lesson.sections.map((s) => s.heading);
      expect(sectionHeadings).not.toContain("The Borrow Checker That Learned to Be Precise");
      expect(sectionHeadings).not.toContain("Lexical Scope vs. Actual Borrow Usage");

      // 3. Normal lesson excerpt and text must NOT contain hidden lesson text
      expect(lesson.excerpt).not.toContain("Non-Lexical Lifetimes");

      // 4. Co-located hidden lesson MUST be extracted cleanly into lesson.hiddenLessons
      expect(lesson.hiddenLessons).toBeDefined();
      expect(lesson.hiddenLessons?.length).toBeGreaterThanOrEqual(1);
      const nllHidden = lesson.hiddenLessons?.find((h) => h.frontmatter.id === "HL-P1-W3-D2-NLL");
      expect(nllHidden).toBeDefined();
      expect(nllHidden?.frontmatter.title).toBe("Non-Lexical Lifetimes");
      expect(nllHidden?.blocks.map((b) => b.kind)).toContain("mental-model");
    });

    it("verifies Day 01 contains Challenge 3 with the matching trigger block ID", async () => {
      const raw = `---
id: "P0-W1-D1"
title: "Computational Thinking"
phase: 0
week: 1
day: 1
published: true
---

# Computational Thinking

\`\`\`rust [challengeId="challenge-3" blockId="challenge-3-executable"]
fn main() {
    println!("Challenge 3 Code");
}
\`\`\`
`;
      const lesson = await parseLesson(raw, ["phase-00", "week-01", "day-01"]);

      const allCodeNodes = lesson.sections.flatMap((s) =>
        s.nodes
          .filter((n): n is { type: "code"; code: any } => n.type === "code")
          .map((n) => n.code)
      );
      const c3Block = allCodeNodes.find(
        (c) => c.blockId === "challenge-3-executable" || c.triggerId === "challenge-3-executable" || c.id === "challenge-3-executable"
      );
      expect(c3Block).toBeDefined();
      expect(c3Block?.challengeId).toBe("challenge-3");
    });
  });

  describe("Access Gating & Search Integration", () => {
    it("hides hidden lessons from default search results, reveals them when unlocked", async () => {
      // Before unlock: searching for "Lifetimes" does not include hidden lesson
      const defaultResults = await searchLessons("Non-Lexical Lifetimes");
      const foundBefore = defaultResults.some((l) => l.frontmatter.id === "HL-P1-W3-D2-NLL");
      expect(foundBefore).toBe(false);

      // When unlocked: searching with unlocked ID includes the hidden lesson
      const unlockedResults = await searchLessons("Non-Lexical Lifetimes", ["HL-P1-W3-D2-NLL"]);
      const foundAfter = unlockedResults.some((l) => l.frontmatter.id === "HL-P1-W3-D2-NLL");
      expect(foundAfter).toBe(true);
    });
  });

  describe("Trigger Match Strictness & Identity Verification", () => {
    // 1. lessonId=P1-W3-D2, challengeId=challenge-3, blockId=challenge-3-executable, run, success -> unlock
    it("unlocks when lessonId, challengeId, blockId match and operation is run (success)", () => {
      const result = HiddenLessonTriggerService.handleExecutionEvent({
        operation: "run",
        attemptId: "test-run-c3-success",
        status: "success",
        language: "rust",
        lessonId: "P1-W3-D2",
        challengeId: "challenge-3",
        blockId: "challenge-3-executable",
        source: "fn main() { let mut v = vec![1, 2, 3]; }",
        timestamp: Date.now(),
        hasCompilerError: false,
      });

      expect(result).toBe(true);
      const store = useHiddenLessonsStore.getState();
      expect(store.isUnlocked("HL-P1-W3-D2-NLL")).toBe(true);
      expect(store.isRevealModalOpen).toBe(true);
    });

    // 2. Same event with status=error. Because requirement is execution_attempt, MUST unlock
    it("unlocks on status='error' when trigger requirement is 'execution_attempt'", () => {
      const result = HiddenLessonTriggerService.handleExecutionEvent({
        operation: "run",
        attemptId: "test-run-c3-error",
        status: "error",
        language: "rust",
        lessonId: "P1-W3-D2",
        challengeId: "challenge-3",
        blockId: "challenge-3-executable",
        source: "fn main() { broken }",
        timestamp: Date.now(),
        hasCompilerError: true,
      });

      expect(result).toBe(true);
      const store = useHiddenLessonsStore.getState();
      expect(store.isUnlocked("HL-P1-W3-D2-NLL")).toBe(true);
    });

    // 3. challengeId=mini-challenge-7 -> MUST NOT match
    it("MUST NOT match when challengeId is mini-challenge-7 (internal block id)", () => {
      const result = HiddenLessonTriggerService.handleExecutionEvent({
        operation: "run",
        attemptId: "test-run-internal-id",
        status: "success",
        language: "rust",
        lessonId: "P1-W3-D2",
        challengeId: "mini-challenge-7",
        blockId: "challenge-3-executable",
        source: "fn main() {}",
        timestamp: Date.now(),
      });

      expect(result).toBe(false);
      expect(useHiddenLessonsStore.getState().isUnlocked("HL-P1-W3-D2-NLL")).toBe(false);
    });

    // 4. blockId=wrong-block -> MUST NOT match
    it("MUST NOT match when blockId is wrong-block", () => {
      const result = HiddenLessonTriggerService.handleExecutionEvent({
        operation: "run",
        attemptId: "test-run-wrong-block",
        status: "success",
        language: "rust",
        lessonId: "P1-W3-D2",
        challengeId: "challenge-3",
        blockId: "wrong-block",
        source: "fn main() {}",
        timestamp: Date.now(),
      });

      expect(result).toBe(false);
      expect(useHiddenLessonsStore.getState().isUnlocked("HL-P1-W3-D2-NLL")).toBe(false);
    });

    // 5. Correct event fired before trigger registry initialization completes -> must wait and match
    it("awaits initialization without dropping the execution event", async () => {
      HiddenLessonTriggerService.clearRegistry();

      // Mock global fetch for triggers API
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          triggers: [
            {
              hiddenLessonId: "HL-P1-W3-D2-NLL",
              slug: "nll",
              title: "Non-Lexical Lifetimes",
              trigger: {
                type: "code_execution",
                lessonId: "P1-W3-D2",
                challengeId: "challenge-3",
                blockId: "challenge-3-executable",
                executionRequirement: "execution_attempt",
              },
            },
          ],
        }),
      });

      const originalFetch = global.fetch;
      // @ts-ignore
      global.fetch = fetchMock;

      try {
        vi.useFakeTimers();

        const timer = await HiddenLessonTriggerService.scheduleExecutionEvent(
          {
            operation: "run",
            attemptId: "test-async-init",
            status: "success",
            language: "rust",
            lessonId: "P1-W3-D2",
            challengeId: "challenge-3",
            blockId: "challenge-3-executable",
            source: "fn main() {}",
            timestamp: Date.now(),
          },
          3000
        );

        expect(timer).not.toBeNull();

        // Advance timers by 3000ms to fire the delayed reveal
        vi.advanceTimersByTime(3000);

        expect(useHiddenLessonsStore.getState().isUnlocked("HL-P1-W3-D2-NLL")).toBe(true);
        expect(useHiddenLessonsStore.getState().isRevealModalOpen).toBe(true);
      } finally {
        vi.useRealTimers();
        global.fetch = originalFetch;
      }
    });

    // 6. Duplicate execution after unlock -> idempotent
    it("MUST be strictly idempotent on repeated execution", () => {
      // First execution -> unlocks
      const first = HiddenLessonTriggerService.handleExecutionEvent({
        operation: "run",
        attemptId: "exec-1",
        status: "success",
        language: "rust",
        lessonId: "P1-W3-D2",
        challengeId: "challenge-3",
        blockId: "challenge-3-executable",
        source: "fn main() {}",
        timestamp: Date.now(),
      });
      expect(first).toBe(true);

      const unlockedKey = useHiddenLessonsStore.getState().getUnlockedList()[0].lessonId;

      // User opens lesson
      useHiddenLessonsStore.getState().markAsOpened(unlockedKey);
      expect(useHiddenLessonsStore.getState().isUnopened(unlockedKey)).toBe(false);
      expect(useHiddenLessonsStore.getState().unlockedLessons[unlockedKey].status).toBe("opened");

      // Close modal
      useHiddenLessonsStore.getState().closeRevealModal();

      // Second execution -> must NOT re-unlock, must NOT reset status to unopened, must NOT reopen modal
      const second = HiddenLessonTriggerService.handleExecutionEvent({
        operation: "run",
        attemptId: "exec-2",
        status: "success",
        language: "rust",
        lessonId: "P1-W3-D2",
        challengeId: "challenge-3",
        blockId: "challenge-3-executable",
        source: "fn main() {}",
        timestamp: Date.now(),
      });
      expect(second).toBe(false);
      expect(useHiddenLessonsStore.getState().unlockedLessons[unlockedKey].status).toBe("opened");
      expect(useHiddenLessonsStore.getState().isRevealModalOpen).toBe(false);
    });

    // 7. Duplicate manifest definitions for the same hidden lesson ID -> registry contains exactly one entry
    it("deduplicates triggers and ensures single authoritative manifest entry", async () => {
      const triggers = await getHiddenLessonTriggers();
      const nllTriggers = triggers.filter((t) => t.hiddenLessonId === "HL-P1-W3-D2-NLL");
      expect(nllTriggers.length).toBe(1);
      expect(nllTriggers[0].trigger.challengeId).toBe("challenge-3");
      expect(nllTriggers[0].trigger.blockId).toBe("challenge-3-executable");
      expect(nllTriggers[0].trigger.executionRequirement).toBe("execution_attempt");
    });

    // 8. Unknown executable block -> no crash, no accidental unlock
    it("handles unknown executable block gracefully without accidental unlock", () => {
      const result = HiddenLessonTriggerService.handleExecutionEvent({
        operation: "run",
        attemptId: "unknown-exec-1",
        status: "success",
        language: "rust",
        lessonId: "Unknown-Lesson-99",
        challengeId: "unknown-challenge-xyz",
        blockId: "unknown-block-abc",
        source: "fn main() { println!(\"unknown\"); }",
        timestamp: Date.now(),
      });

      expect(result).toBe(false);
      expect(useHiddenLessonsStore.getState().isUnlocked("HL-P1-W3-D2-NLL")).toBe(false);
    });

    // Operation strictness checks
    it("MUST NOT unlock on 'check', 'build', 'test', or 'format' operations", () => {
      for (const op of ["check", "build", "test", "format"] as const) {
        const result = HiddenLessonTriggerService.handleExecutionEvent({
          operation: op,
          attemptId: `test-${op}`,
          status: "success",
          language: "rust",
          lessonId: "P1-W3-D2",
          challengeId: "challenge-3",
          blockId: "challenge-3-executable",
          source: "fn main() {}",
          timestamp: Date.now(),
        });
        expect(result).toBe(false);
        expect(useHiddenLessonsStore.getState().isUnlocked("HL-P1-W3-D2-NLL")).toBe(false);
      }
    });

    it("verifies successful_run requirement semantics", () => {
      HiddenLessonTriggerService.register({
        hiddenLessonId: "HL-STRICT-SUCCESS",
        slug: "strict-success",
        title: "Strict Success Lesson",
        tags: ["RUST"],
        trigger: {
          type: "code_execution",
          lessonId: "P1-W3-D2",
          challengeId: "challenge-4",
          blockId: "challenge-4-executable",
          executionRequirement: "successful_run",
        },
      });

      // 1. Run with compiler error -> should NOT unlock
      const failedRun = HiddenLessonTriggerService.handleExecutionEvent({
        operation: "run",
        attemptId: "test-failed-run",
        status: "error",
        hasCompilerError: true,
        language: "rust",
        lessonId: "P1-W3-D2",
        challengeId: "challenge-4",
        blockId: "challenge-4-executable",
        source: "fn main() { broken }",
        timestamp: Date.now(),
      });
      expect(failedRun).toBe(false);
      expect(useHiddenLessonsStore.getState().isUnlocked("HL-STRICT-SUCCESS")).toBe(false);

      // 2. Run with success -> should unlock
      const successRun = HiddenLessonTriggerService.handleExecutionEvent({
        operation: "run",
        attemptId: "test-success-run",
        status: "success",
        hasCompilerError: false,
        language: "rust",
        lessonId: "P1-W3-D2",
        challengeId: "challenge-4",
        blockId: "challenge-4-executable",
        source: "fn main() { println!(\"ok\"); }",
        timestamp: Date.now(),
      });
      expect(successRun).toBe(true);
      expect(useHiddenLessonsStore.getState().isUnlocked("HL-STRICT-SUCCESS")).toBe(true);
    });
  });

  describe("Store State & Status Transitions", () => {
    it("handles unlock -> opened transition correctly", () => {
      const store = useHiddenLessonsStore.getState();
      expect(store.isUnlocked("HL-P1-W3-D2-NLL")).toBe(false);

      store.unlockLesson({
        lessonId: "HL-P1-W3-D2-NLL",
        slug: "nll",
        title: "Non-Lexical Lifetimes",
        subtitle: "When Rust learned to reason about actual reference usage",
        badge: "NLL",
      });

      expect(useHiddenLessonsStore.getState().isUnlocked("HL-P1-W3-D2-NLL")).toBe(true);
      expect(useHiddenLessonsStore.getState().isUnopened("HL-P1-W3-D2-NLL")).toBe(true);
      expect(useHiddenLessonsStore.getState().getUnlockedList().length).toBe(1);

      useHiddenLessonsStore.getState().markAsOpened("nll");
      expect(useHiddenLessonsStore.getState().isUnlocked("HL-P1-W3-D2-NLL")).toBe(true);
      expect(useHiddenLessonsStore.getState().isUnopened("HL-P1-W3-D2-NLL")).toBe(false);
      expect(useHiddenLessonsStore.getState().unlockedLessons["HL-P1-W3-D2-NLL"].openedAt).toBeTypeOf("number");
    });
  });

  describe("Adversarial Search Leak Test", () => {
    it("MUST NOT leak any hidden lesson terms in search before unlock", async () => {
      const searchTerms = [
        "NLL",
        "Non-Lexical Lifetimes",
        "Borrow Checker That Learned to Be Precise",
        "HL-P1-W3-D2-NLL",
      ];

      for (const term of searchTerms) {
        const results = await searchLessons(term, []);
        const leaked = results.some(
          (r) =>
            r.frontmatter.id === "HL-P1-W3-D2-NLL" ||
            r.frontmatter.slug === "nll" ||
            r.slug.includes("hidden-lessons") ||
            r.frontmatter.title === "Non-Lexical Lifetimes"
        );
        expect(leaked).toBe(false);
      }
    });

    it("reveals the hidden lesson in search only when explicitly unlocked", async () => {
      const unlockedResults = await searchLessons("Non-Lexical Lifetimes", ["HL-P1-W3-D2-NLL"]);
      expect(unlockedResults.length).toBeGreaterThanOrEqual(1);
      expect(unlockedResults[0].frontmatter.id).toBe("HL-P1-W3-D2-NLL");
    });
  });

  describe("Parser Adversarial & Frontmatter Fallback Hardening", () => {
    it("gracefully handles malformed YAML frontmatter without crashing", async () => {
      const malformedYaml = `---
id: [invalid yaml syntax : : ::
title: broken
---
# Normal Content
Some normal text here.
`;
      const lesson = await parseLesson(malformedYaml, ["phase-00", "test"]);
      expect(lesson).toBeDefined();
      expect(lesson.frontmatter.id).toBe("malformed-anonymous-phase-00-test");
      expect(lesson.sections.length).toBeGreaterThanOrEqual(1);
    });

    it("generates deterministic, collision-free identities for multiple malformed files with missing IDs", async () => {
      const file1 = `---
title: "Malformed File One"
---
# Section 1
Content 1
`;
      const file2 = `---
title: "Malformed File Two"
---
# Section 2
Content 2
`;

      const lesson1 = await parseLesson(file1, ["phase-01", "week-01", "day-01"]);
      const lesson2 = await parseLesson(file2, ["phase-02", "week-03", "day-02"]);

      expect(lesson1).toBeDefined();
      expect(lesson2).toBeDefined();
      expect(lesson1.frontmatter.id).toBe("malformed-anonymous-phase-01-week-01-day-01");
      expect(lesson2.frontmatter.id).toBe("malformed-anonymous-phase-02-week-03-day-02");
      expect(lesson1.frontmatter.id).not.toBe(lesson2.frontmatter.id);
    });

    it("ensures authored valid IDs remain authoritative alongside malformed files", async () => {
      const validFile = `---
id: P0-W1-D1
title: "Valid Lesson"
phase: 0
published: true
---
# Valid Section
Valid content
`;
      const malformedFile = `---
title: "Missing ID Lesson"
phase: 0
published: true
---
# Malformed Section
Content
`;

      const validLesson = await parseLesson(validFile, ["phase-00", "week-01", "day-01"]);
      const malformedLesson = await parseLesson(malformedFile, ["phase-00", "week-01", "day-02"]);

      expect(validLesson.frontmatter.id).toBe("P0-W1-D1");
      expect(malformedLesson.frontmatter.id).toBe("malformed-anonymous-phase-00-week-01-day-02");
      expect(malformedLesson.frontmatter.id).not.toBe(validLesson.frontmatter.id);
    });

    it("gracefully handles unclosed :::hidden-lesson without crashing or corrupting normal lesson", async () => {
      const unclosedHidden = `---
id: P0-TEST
title: Normal Lesson
published: true
---

# Real Normal Heading

Normal text before hidden block.

:::hidden-lesson
id: HL-UNCLOSED

:::story
Hidden unclosed story
:::
`;
      const lesson = await parseLesson(unclosedHidden, ["phase-00", "test-unclosed"]);
      expect(lesson).toBeDefined();
      expect(lesson.excerpt).not.toContain("Hidden unclosed story");
      expect(lesson.sections.some((s) => s.heading === "Real Normal Heading")).toBe(true);
      expect(lesson.hiddenLessons?.length).toBe(1);
      expect(lesson.hiddenLessons?.[0].frontmatter.id).toBe("HL-UNCLOSED");
    });
  });

  describe("Multiple Hidden Lessons and Robust Nesting", () => {
    it("handles multiple hidden lessons in a single file with nested blocks", async () => {
      const syntheticMarkdown = `---
id: P0-W1-D1
phase: 0
week: 1
day: 1
title: "Normal Lesson Title"
published: true
hidden_lessons:
  - id: HL-ONE
    title: "Hidden Lesson One"
    difficulty: 3
  - id: HL-TWO
    title: "Hidden Lesson Two"
    difficulty: 4
---

:::story
Normal story content
:::

## Normal Section

Normal prose here.

:::hidden-lesson
id: HL-ONE

:::story
Hidden story inside HL-ONE
:::

:::mental-model
Hidden mental model inside HL-ONE
:::

:::

:::hidden-lesson
id: HL-TWO

:::compiler-thinking
Hidden compiler thinking inside HL-TWO
:::

:::
`;

      const parsed = await parseLesson(syntheticMarkdown, ["phase-00", "week-01", "day-01"]);

      expect(parsed.blocks.length).toBe(1);
      expect(parsed.blocks[0].kind).toBe("story");
      expect(parsed.sections.some((s) => s.heading === "Normal Section")).toBe(true);

      expect(parsed.hiddenLessons?.length).toBe(2);

      const hl1 = parsed.hiddenLessons?.find((h) => h.frontmatter.id === "HL-ONE");
      expect(hl1).toBeDefined();
      expect(hl1?.frontmatter.title).toBe("Hidden Lesson One");
      expect(hl1?.blocks.map((b) => b.kind)).toEqual(["story", "mental-model"]);

      const hl2 = parsed.hiddenLessons?.find((h) => h.frontmatter.id === "HL-TWO");
      expect(hl2).toBeDefined();
      expect(hl2?.frontmatter.title).toBe("Hidden Lesson Two");
      expect(hl2?.blocks.map((b) => b.kind)).toEqual(["compiler-thinking"]);
    });
  });
});
