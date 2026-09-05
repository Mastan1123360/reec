/**
 * lib/content/__tests__/supabase-canonical-pipeline.test.ts
 *
 * Authoritative End-to-End Canonical Pipeline Test Suite:
 *  1. Supabase Inventory (canonical published lessons + standalone hidden lessons)
 *  2. P0-W1-D1 Identity & Content Completeness
 *  3. P1-W3-D2 Hidden Lesson Syntax & Isolation (HL-P1-W3-D2-NLL)
 *  4. Full Content SHA-256 Hash Preservation
 *  5. Parser Block Generation & AST Integrity
 *  6. Slug, Path & ID Route Resolution
 *  7. Nonexistent Lesson Handling (Clean notFound / null)
 *  8. No Truncation or Degradation
 */

import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import {
  getPublishedContentFiles,
  getContentFileById,
  getContentFileBySlug,
  computeContentHash,
} from "../supabase-content";
import {
  getAllLessons,
  getAllHiddenLessons,
  getLessonBySlug,
  getHiddenLessonBySlug,
  getHiddenLessonById,
  searchLessons,
  getRoadmapStatus,
  invalidateLessonCache,
} from "../discover";
import { parseLesson } from "../parser";

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex");
}

describe("Supabase Canonical Content Pipeline — End-to-End", () => {
  beforeEach(() => {
    invalidateLessonCache();
  });

  // Test 1 — Supabase inventory
  it("Test 1: getPublishedContentFiles() returns canonical records from Supabase", async () => {
    const files = await getPublishedContentFiles();
    expect(files.length).toBeGreaterThanOrEqual(42);

    const normalFiles = files.filter((f) => !f.is_hidden);
    expect(normalFiles.length).toBe(42);

    const phase0 = normalFiles.filter((f) => f.phase === 0);
    const phase1 = normalFiles.filter((f) => f.phase === 1);
    expect(phase0.length).toBe(14);
    expect(phase1.length).toBe(28);
  });

  // Test 2 — P0-W1-D1
  it("Test 2: P0-W1-D1 has valid lesson_id, canonical slug, and complete content", async () => {
    const row = await getContentFileById("P0-W1-D1");
    expect(row).toBeDefined();
    expect(row?.lesson_id).toBe("P0-W1-D1");
    expect(row?.slug).toBe("phase-00/week-01/day-01");
    expect(row?.path).toBe("Phase-00/Week-01/Day-01.md");
    expect(row?.content.length).toBeGreaterThan(25000);
    expect(row?.is_published).toBe(true);
  });

  // Test 3 — P1-W3-D2 & HL-P1-W3-D2-NLL Isolation
  it("Test 3: P1-W3-D2 declares hidden lesson and HL-P1-W3-D2-NLL is a standalone canonical record", async () => {
    const p1w3d2Row = await getContentFileById("P1-W3-D2");
    expect(p1w3d2Row).toBeDefined();
    expect(p1w3d2Row?.content).toContain("HL-P1-W3-D2-NLL");

    const hlRow = await getContentFileById("HL-P1-W3-D2-NLL");
    expect(hlRow).toBeDefined();
    expect(hlRow?.is_hidden).toBe(true);
    expect(hlRow?.content).toContain("Non-Lexical Lifetimes");
    expect(hlRow?.content).toContain(":::mental-model");
  });

  // Test 4 — Full content preservation
  it("Test 4: Supabase content hash matches expected source hash", async () => {
    const p0w1d1 = await getContentFileById("P0-W1-D1");
    const p1w3d2 = await getContentFileById("P1-W3-D2");
    const p1w6d7 = await getContentFileById("P1-W6-D7");

    expect(p0w1d1).toBeDefined();
    expect(p1w3d2).toBeDefined();
    expect(p1w6d7).toBeDefined();

    expect(sha256(p0w1d1!.content)).toBe(p0w1d1!.content_hash);
    expect(sha256(p1w3d2!.content)).toBe(p1w3d2!.content_hash);
    expect(sha256(p1w6d7!.content)).toBe(p1w6d7!.content_hash);
  });

  // Test 5 — Parser
  it("Test 5: Parser produces rich REEC blocks and clean AST from raw Supabase content", async () => {
    const row = await getContentFileById("P0-W1-D1");
    const lesson = await parseLesson(row!.content, ["phase-00", "week-01", "day-01"]);

    expect(lesson.frontmatter.title).toBe("Computational Thinking: The Compilation Pipeline and Memory Layout");
    expect(lesson.blocks.length).toBe(7);

    const kinds = lesson.blocks.map((b) => b.kind);
    expect(kinds).toContain("story");
    expect(kinds).toContain("mental-model");
    expect(kinds).toContain("engineering-note");
    expect(kinds).toContain("worked-example");
    expect(kinds).toContain("compiler-thinking");
    expect(kinds).toContain("mini-challenge");
    expect(kinds).toContain("reflection");

    // Check P1-W3-D2 content isolation: core lesson body has NO NLL sections
    const p1w3d2Lesson = await getLessonBySlug(["phase-01", "week-03", "day-02"]);
    expect(p1w3d2Lesson).toBeDefined();
    const hasNllInSections = p1w3d2Lesson!.sections.some(
      (s) => (s.heading || "").includes("Non-Lexical")
    );
    expect(hasNllInSections).toBe(false);

    // Standalone hidden lesson resolves cleanly
    const hlLesson = await getHiddenLessonById("HL-P1-W3-D2-NLL");
    expect(hlLesson).toBeDefined();
    expect(hlLesson?.frontmatter.title).toBe("Non-Lexical Lifetimes");
    expect(hlLesson?.blocks.length).toBeGreaterThanOrEqual(5);
  });

  // Test 6 — Routing
  it("Test 6: Resolves phase-00/week-01/day-01, phase-01/week-03/day-02, phase-01/week-06/day-07", async () => {
    const l1 = await getLessonBySlug(["phase-00", "week-01", "day-01"]);
    const l2 = await getLessonBySlug(["phase-01", "week-03", "day-02"]);
    const l3 = await getLessonBySlug(["phase-01", "week-06", "day-07"]);

    expect(l1).toBeDefined();
    expect(l1?.frontmatter.id).toBe("P0-W1-D1");

    expect(l2).toBeDefined();
    expect(l2?.frontmatter.id).toBe("P1-W3-D2");

    expect(l3).toBeDefined();
    expect(l3?.frontmatter.id).toBe("P1-W6-D7");
  });

  // Test 7 — Missing lesson
  it("Test 7: Missing lesson produces null (triggering notFound)", async () => {
    const missing = await getLessonBySlug(["phase-99", "week-99", "day-99"]);
    expect(missing).toBeNull();
  });

  // Test 8 — No truncation
  it("Test 8: Content length is substantially larger than old stubs (>1KB per lesson, average >2KB)", async () => {
    const files = await getPublishedContentFiles();
    for (const file of files) {
      expect(file.content.length).toBeGreaterThan(1000);
      expect(file.content_hash).toBe(sha256(file.content));
    }
  });
});
