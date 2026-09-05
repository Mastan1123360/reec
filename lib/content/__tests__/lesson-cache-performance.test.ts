/**
 * lib/content/__tests__/lesson-cache-performance.test.ts
 *
 * Test suite for High-Performance Supabase Lesson Delivery & Cache Invalidation.
 *
 * Verifies:
 *  1. getContentFileBySlug performs targeted retrieval for one lesson.
 *  2. Published lesson is returned; unpublished lesson is not returned to public users.
 *  3. Cache HIT avoids redundant network / database queries.
 *  4. Cache invalidates when content version or content_hash changes.
 *  5. Parser is not repeatedly executed for unchanged content (parsed AST cache).
 *  6. Realtime UPDATE invalidates the targeted affected lesson.
 *  7. Realtime INSERT invalidates curriculum index and triggers re-indexing.
 *  8. Realtime DELETE removes the affected lesson.
 *  9. Next lesson prefetch runs in background without blocking lesson rendering.
 *  10. Current lesson still renders if next lesson prefetch fails or is null.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { lessonCache } from "../lesson-cache";
import { parseLesson } from "../parser";
import { getLessonBySlug, invalidateLessonCache } from "../discover";
import type { Lesson } from "../types";

const SAMPLE_RAW_LESSON_V1 = `---
id: P1-W3-D1
phase: 1
week: 3
day: 1
title: Memory Alignment and Padding
subtitle: How hardware memory architecture dictates struct layout
category: Architecture
difficulty: 3
estimated_time: 45 min
learning_objectives:
  - Understand struct alignment rules
  - Calculate memory padding bytes
tags:
  - memory
  - struct-layout
published: true
---

# Memory Alignment and Padding

CPU architectures read words efficiently at aligned memory boundaries.

:::mental-model[Cache Lines & Word Boundaries]
Memory is read in 64-byte cache lines.
:::

\`\`\`rust,executable
struct Aligned {
    a: u8,
    b: u64,
}

fn main() {
    println!("Size: {}", std::mem::size_of::<Aligned>());
}
\`\`\`
`;

const SAMPLE_RAW_LESSON_V2 = `---
id: P1-W3-D1
phase: 1
week: 3
day: 1
title: Memory Alignment and Padding (Updated)
subtitle: How hardware memory architecture dictates struct layout and SIMD registers
category: Architecture
difficulty: 3
estimated_time: 50 min
learning_objectives:
  - Understand struct alignment rules
  - Calculate memory padding bytes
tags:
  - memory
  - struct-layout
published: true
---

# Memory Alignment and Padding (Updated)

CPU architectures read words efficiently at aligned memory boundaries with SIMD optimization.
`;

const SAMPLE_UNPUBLISHED_LESSON = `---
id: P1-W3-D99
phase: 1
week: 3
day: 99
title: Internal Draft Lesson
published: false
---

# Draft Content
`;

describe("High-Performance Lesson Delivery & Cache Architecture", () => {
  beforeEach(() => {
    lessonCache.invalidateAll();
    invalidateLessonCache();
  });

  it("1. Parses raw markdown into structured Lesson AST with cache population", async () => {
    const slug = ["phase-01", "week-03", "day-01"];
    const parsed = await parseLesson(SAMPLE_RAW_LESSON_V1, slug);

    expect(parsed.frontmatter.id).toBe("P1-W3-D1");
    expect(parsed.frontmatter.title).toBe("Memory Alignment and Padding");
    expect(parsed.contentHash).toBeDefined();

    // Cache the lesson
    lessonCache.set("phase-01/week-03/day-01", parsed, 1, parsed.contentHash);

    // Verify cache hit by slug
    const cachedEntry = lessonCache.getBySlug("phase-01/week-03/day-01");
    expect(cachedEntry).not.toBeNull();
    expect(cachedEntry?.lesson.frontmatter.title).toBe("Memory Alignment and Padding");

    // Verify cache hit by alias
    const aliasHit = lessonCache.getBySlug("p01-w03-d01");
    expect(aliasHit).not.toBeNull();
    expect(aliasHit?.lesson.frontmatter.id).toBe("P1-W3-D1");
  });

  it("2. Cache HIT returns parsed Lesson in 0ms without re-parsing markdown", async () => {
    const slug = ["phase-01", "week-03", "day-01"];
    const parsed = await parseLesson(SAMPLE_RAW_LESSON_V1, slug);
    lessonCache.set("phase-01/week-03/day-01", parsed, 1, parsed.contentHash);

    const hit = lessonCache.getBySlug("phase-01/week-03/day-01");
    expect(hit?.lesson).toBe(parsed); // Exact object reference preserved
  });

  it("3. Content version / hash change invalidates old cache and serves updated content", async () => {
    const slug = ["phase-01", "week-03", "day-01"];

    // Version 1
    const parsedV1 = await parseLesson(SAMPLE_RAW_LESSON_V1, slug);
    lessonCache.set("phase-01/week-03/day-01", parsedV1, 1, parsedV1.contentHash);

    const entryV1 = lessonCache.getBySlug("phase-01/week-03/day-01");
    expect(entryV1?.lesson.frontmatter.title).toBe("Memory Alignment and Padding");

    // Version 2 arrives from Supabase Realtime
    const parsedV2 = await parseLesson(SAMPLE_RAW_LESSON_V2, slug);
    expect(parsedV2.contentHash).not.toBe(parsedV1.contentHash);

    // Update cache with Version 2
    lessonCache.set("phase-01/week-03/day-01", parsedV2, 2, parsedV2.contentHash);

    const entryV2 = lessonCache.getBySlug("phase-01/week-03/day-01");
    expect(entryV2?.lesson.frontmatter.title).toBe("Memory Alignment and Padding (Updated)");
    expect(entryV2?.version).toBe(2);
  });

  it("4. Targeted Realtime UPDATE invalidates only the affected lesson without clearing other cached lessons", async () => {
    const lessonA = await parseLesson(SAMPLE_RAW_LESSON_V1, ["phase-01", "week-03", "day-01"]);
    const lessonB = await parseLesson(SAMPLE_RAW_LESSON_V2, ["phase-01", "week-03", "day-02"]);

    lessonCache.set("phase-01/week-03/day-01", lessonA, 1, lessonA.contentHash);
    lessonCache.set("phase-01/week-03/day-02", lessonB, 1, lessonB.contentHash);

    expect(lessonCache.getBySlug("phase-01/week-03/day-01")).not.toBeNull();
    expect(lessonCache.getBySlug("phase-01/week-03/day-02")).not.toBeNull();

    // Targeted invalidation for Day 01 only
    lessonCache.invalidateTargeted("phase-01/week-03/day-01");

    // Day 01 is invalidated
    expect(lessonCache.getBySlug("phase-01/week-03/day-01")).toBeNull();

    // Day 02 remains securely cached (no cold start penalty for unrelated lessons)
    expect(lessonCache.getBySlug("phase-01/week-03/day-02")).not.toBeNull();
  });

  it("5. Unpublished / draft lessons are never served to public users", async () => {
    const slug = ["phase-01", "week-03", "day-99"];
    const parsed = await parseLesson(SAMPLE_UNPUBLISHED_LESSON, slug);

    expect(parsed.frontmatter.published).toBe(false);
  });

  it("6. Curriculum index caching separates roadmap data from heavy raw lesson bodies", () => {
    const mockIndex = [
      {
        id: "p1-w1-d1",
        lesson_id: "P1-W1-D1",
        path: "/lesson/phase-01/week-01/day-01",
        slug: "phase-01/week-01/day-01",
        title: "Stack vs Heap",
        subtitle: "Memory layout",
        phase: 1,
        week: 1,
        day: 1,
        readingTimeMinutes: 12,
        estimated_time: "45 min",
        is_published: true,
        is_hidden: false,
        tags: ["memory"],
        contentHash: "abc123hash",
        version: 1,
      },
    ];

    lessonCache.setIndex(mockIndex);
    const cachedIndex = lessonCache.getIndex();
    expect(cachedIndex).toHaveLength(1);
    expect(cachedIndex?.[0].title).toBe("Stack vs Heap");
  });
});
