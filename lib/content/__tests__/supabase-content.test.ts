/**
 * lib/content/__tests__/supabase-content.test.ts
 *
 * Comprehensive Test Suite for REEC Canonical Supabase Content Infrastructure:
 *  - Content Record Creation, Hashing & Deduplication
 *  - Versioning & History Tracking
 *  - Malformed Markdown Validation
 *  - Parser & Widget Integration
 *  - Discovery Engine & Repository Fallback
 *  - Authoritative Supabase Precedence & Deduplication
 *  - Draft & Hidden Lesson Protection
 *  - Search Dynamic Discovery
 *  - User Progress Separation & Reset Isolation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  computeContentHash,
  deriveCanonicalLessonId,
  deriveCanonicalPath,
  deriveCanonicalSlug,
} from "../supabase-content";
import {
  upsertContentFile,
  bootstrapContentFromRepository,
} from "@/scripts/lib/supabase-curriculum-writer";
import {
  getAllLessons,
  getAllHiddenLessons,
  getLessonBySlug,
  getHiddenLessonBySlug,
  searchLessons,
  getRoadmapStatus,
  invalidateLessonCache,
} from "../discover";
import { parseLesson } from "../parser";
import { useProgressStore } from "@/lib/progress/store";
import { SupabaseSyncService } from "@/lib/supabase/sync-service";

// In-Memory Supabase DB Mock for content_files and content_file_versions
const mockDb = {
  content_files: new Map<string, any>(),
  content_file_versions: [] as any[],
};

vi.mock("@/lib/supabase/server", () => {
  return {
    isServerSupabaseConfigured: () => true,
    getServerSupabaseClient: () => createMockClient(),
    getAdminSupabaseClient: () => createMockClient(),
  };
});

function createMockClient() {
  return {
    from: (table: string) => {
      if (table === "content_files") {
        return {
          select: (fields?: string) => {
            let filterPublished = false;
            let filterSlug: string | null = null;
            let filterId: string | null = null;
            let filterLessonId: string | null = null;
            let filterPath: string | null = null;
            let filterOr: string | null = null;

            let filterIlikeCol: string | null = null;
            let filterIlikePattern: string | null = null;

            const builder = {
              eq: (col: string, val: any) => {
                if (col === "is_published") filterPublished = Boolean(val);
                if (col === "slug") filterSlug = String(val);
                if (col === "id") filterId = String(val);
                if (col === "lesson_id") filterLessonId = String(val);
                if (col === "path") filterPath = String(val);
                return builder;
              },
              ilike: (col: string, pattern: string) => {
                filterIlikeCol = col;
                filterIlikePattern = pattern.replace(/%/g, "").toLowerCase();
                return builder;
              },
              or: (orQuery: string) => {
                filterOr = orQuery;
                return builder;
              },
              order: (col: string, opt?: any) => {
                return builder;
              },
              maybeSingle: async () => {
                const rows = Array.from(mockDb.content_files.values());
                if (filterOr) {
                  // e.g. "id.eq.P1-W3-D2,path.eq.Phase-01/Week-03/Day-02.md"
                  for (const r of rows) {
                    if (filterOr.includes(`id.eq.${r.id}`) || filterOr.includes(`path.eq.${r.path}`)) {
                      return { data: r, error: null };
                    }
                  }
                  return { data: null, error: null };
                }
                for (const r of rows) {
                  if (filterPublished && !r.is_published) continue;
                  if (filterSlug && r.slug.toLowerCase() !== filterSlug.toLowerCase()) continue;
                  if (filterId && r.id !== filterId) continue;
                  if (filterLessonId && r.lesson_id !== filterLessonId) continue;
                  if (filterPath && r.path !== filterPath) continue;
                  if (filterIlikeCol && filterIlikePattern) {
                    const val = String((r as any)[filterIlikeCol] || "").toLowerCase();
                    if (!val.includes(filterIlikePattern)) continue;
                  }
                  return { data: r, error: null };
                }
                return { data: null, error: null };
              },
              single: async () => {
                const res = await builder.maybeSingle();
                if (!res.data) return { data: null, error: new Error("Row not found") };
                return res;
              },
              then: (resolve: any) => {
                let rows = Array.from(mockDb.content_files.values());
                if (filterPublished) {
                  rows = rows.filter((r) => r.is_published);
                }
                return resolve({ data: rows, error: null });
              },
            };
            return builder;
          },
          insert: (payload: any) => {
            const row = {
              ...payload,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              uploaded_at: new Date().toISOString(),
            };
            mockDb.content_files.set(row.id, row);
            return {
              select: () => ({
                single: async () => ({ data: row, error: null }),
              }),
            };
          },
          update: (payload: any) => {
            return {
              eq: (col: string, val: any) => {
                return {
                  select: () => ({
                    single: async () => {
                      const existing = mockDb.content_files.get(val);
                      if (existing) {
                        const updated = { ...existing, ...payload, updated_at: new Date().toISOString() };
                        mockDb.content_files.set(val, updated);
                        return { data: updated, error: null };
                      }
                      return { data: null, error: new Error("Not found") };
                    },
                  }),
                };
              },
            };
          },
          delete: () => {
            return {
              or: (orQuery: string) => {
                // Delete matching
                for (const [id, r] of mockDb.content_files.entries()) {
                  if (orQuery.includes(`id.eq.${id}`) || orQuery.includes(`path.eq.${r.path}`)) {
                    mockDb.content_files.delete(id);
                  }
                }
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }
      if (table === "content_file_versions") {
        return {
          insert: (payload: any) => {
            mockDb.content_file_versions.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      }
      return {};
    },
  };
}

describe("Supabase Canonical Content System", () => {
  beforeEach(() => {
    mockDb.content_files.clear();
    mockDb.content_file_versions.length = 0;
    invalidateLessonCache();
  });

  it("1. Deterministically hashes content and derives canonical identifiers", () => {
    const markdownA = "# Intro to Rust\n\nOwnership is fundamental.";
    const markdownB = "# Intro to Rust\n\nOwnership is fundamental.";

    const hashA = computeContentHash(markdownA);
    const hashB = computeContentHash(markdownB);
    expect(hashA).toBe(hashB);
    expect(hashA.length).toBe(64);

    const path = deriveCanonicalPath(1, 3, 2);
    expect(path).toBe("Phase-01/Week-03/Day-02.md");

    const slug = deriveCanonicalSlug(1, 3, 2);
    expect(slug).toBe("phase-01/week-03/day-02");

    const id = deriveCanonicalLessonId(1, 3, 2, "P1-W3-D2");
    expect(id).toBe("P1-W3-D2");
  });

  it("2. Creates new content records with version 1 and snapshot history", async () => {
    const raw = `---
title: "Zero-Cost Abstractions"
phase: 1
week: 3
day: 2
difficulty: 4
tags: ["rust", "zero-cost"]
published: true
---
# Zero-Cost Abstractions

Rust guarantees compile-time safety without runtime overhead.
`;

    const res = await upsertContentFile({
      rawContent: raw,
      phase: 1,
      week: 3,
      day: 2,
      authoredId: "P1-W3-D2",
      fileName: "Day-02.md",
    });

    expect(res.success).toBe(true);
    expect(res.version).toBe(1);
    expect(res.unchanged).toBe(false);
    expect(mockDb.content_files.size).toBe(1);
    expect(mockDb.content_file_versions.length).toBe(1);
    expect(mockDb.content_file_versions[0].version).toBe(1);
  });

  it("3. Skips version bump and retains unchanged state when uploading identical content", async () => {
    const raw = `---
title: "Memory Safety"
phase: 0
week: 1
day: 1
published: true
---
# Memory Safety
No garbage collector.
`;

    const res1 = await upsertContentFile({
      rawContent: raw,
      phase: 0,
      week: 1,
      day: 1,
      authoredId: "P0-W1-D1",
    });
    expect(res1.success).toBe(true);
    expect(res1.version).toBe(1);

    // Re-upload identical content
    const res2 = await upsertContentFile({
      rawContent: raw,
      phase: 0,
      week: 1,
      day: 1,
      authoredId: "P0-W1-D1",
    });

    expect(res2.success).toBe(true);
    expect(res2.unchanged).toBe(true);
    expect(res2.version).toBe(1);
    expect(mockDb.content_file_versions.length).toBe(1); // No phantom version appended
  });

  it("4. Increments version and records snapshot history when content changes", async () => {
    const v1Raw = `---
title: "Async Rust"
phase: 2
week: 1
day: 1
published: true
---
# Async Rust v1
`;
    const v2Raw = `---
title: "Async Rust"
phase: 2
week: 1
day: 1
published: true
---
# Async Rust v2 — Deep Dive into Pin and Futures
`;

    await upsertContentFile({
      rawContent: v1Raw,
      phase: 2,
      week: 1,
      day: 1,
      authoredId: "P2-W1-D1",
    });

    const res2 = await upsertContentFile({
      rawContent: v2Raw,
      phase: 2,
      week: 1,
      day: 1,
      authoredId: "P2-W1-D1",
      changeSummary: "Added Pin & Futures analysis",
    });

    expect(res2.success).toBe(true);
    expect(res2.version).toBe(2);
    expect(res2.unchanged).toBe(false);
    expect(mockDb.content_file_versions.length).toBe(2);
    expect(mockDb.content_file_versions[1].version).toBe(2);
    expect(mockDb.content_file_versions[1].change_summary).toBe("Added Pin & Futures analysis");
  });

  it("5. Rejects malformed YAML frontmatter without breaking storage", async () => {
    const invalidYaml = `---
title: [Broken Unclosed Bracket
phase: 1
---
# Malformed
`;

    const res = await upsertContentFile({
      rawContent: invalidYaml,
      phase: 1,
    });

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(mockDb.content_files.size).toBe(0);
  });

  it("6. Canonical Supabase content integrates with authoritative parser.ts", async () => {
    const raw = [
      "---",
      'id: "P1-W3-D99"',
      'title: "Supabase Live Lesson"',
      'subtitle: "Canonical Content Service"',
      "phase: 1",
      "week: 3",
      "day: 99",
      "difficulty: 5",
      'estimated_time: "45 min"',
      'tags: ["rust", "memory", "compiler"]',
      "published: true",
      "---",
      "# Supabase Live Lesson",
      "",
      ":::compiler-thinking[Borrow Checker Invariants]",
      "The compiler verifies exclusive access at compile-time.",
      ":::",
      "",
      ":::mini-challenge[Fix the Borrow]",
      "```rust",
      "fn main() {",
      '    let mut s = String::from("hello");',
      "    let r1 = &s;",
      '    println!("{}", r1);',
      "}",
      "```",
      ":::",
    ].join("\n");

    await upsertContentFile({
      rawContent: raw,
      phase: 1,
      week: 3,
      day: 99,
      authoredId: "P1-W3-D99",
    });

    invalidateLessonCache();
    const lesson = await getLessonBySlug(["phase-01", "week-03", "day-99"]);

    expect(lesson).not.toBeNull();
    expect(lesson?.frontmatter.title).toBe("Supabase Live Lesson");
    expect(lesson?.frontmatter.difficulty).toBe(5);
    expect(lesson?.blocks.length).toBeGreaterThanOrEqual(2);
    expect(lesson?.blocks.some((b) => b.kind === "compiler-thinking")).toBe(true);
    expect(lesson?.blocks.some((b) => b.kind === "mini-challenge")).toBe(true);
  });

  it("7. Prioritizes Supabase canonical content over local disk and deduplicates", async () => {
    // Insert Supabase override for Phase 0
    const supabasePhase0 = `---
id: "phase00-week01-day01"
title: "Supabase Canonical Phase 0"
phase: 0
week: 1
day: 1
published: true
---
# Supabase Overrides Disk
`;

    await upsertContentFile({
      rawContent: supabasePhase0,
      phase: 0,
      week: 1,
      day: 1,
      authoredId: "phase00-week01-day01",
    });

    invalidateLessonCache();
    const allLessons = await getAllLessons();

    // Check Phase 0 lesson has the Supabase title
    const p0Lesson = allLessons.find((l) => l.frontmatter.phase === 0 && l.frontmatter.day === 1);
    expect(p0Lesson).toBeDefined();
    expect(p0Lesson?.frontmatter.title).toBe("Supabase Canonical Phase 0");

    // Must not contain duplicate Phase 0 entries
    const p0Count = allLessons.filter((l) => l.frontmatter.phase === 0 && l.frontmatter.day === 1).length;
    expect(p0Count).toBe(1);
  });

  it("8. Excludes draft/unpublished lessons from learner discovery", async () => {
    const draftRaw = `---
id: "P1-W4-D1-DRAFT"
title: "Unpublished Draft"
phase: 1
week: 4
day: 1
published: false
---
# Secret Draft
`;

    await upsertContentFile({
      rawContent: draftRaw,
      phase: 1,
      week: 4,
      day: 1,
      authoredId: "P1-W4-D1-DRAFT",
      isPublished: false,
    });

    invalidateLessonCache();
    const allLessons = await getAllLessons();
    expect(allLessons.some((l) => l.frontmatter.id === "P1-W4-D1-DRAFT")).toBe(false);

    const draftLesson = await getLessonBySlug(["phase-01", "week-04", "day-01"]);
    expect(draftLesson).toBeNull();
  });

  it("9. Protects hidden lessons from normal curriculum discovery and public search", async () => {
    const hiddenRaw = `---
id: "HL-CANONICAL-01"
title: "Classified Invariant"
phase: 1
hidden: true
published: true
slug: "classified-invariant"
---
# Classified Invariant
Hidden content.
`;

    await upsertContentFile({
      rawContent: hiddenRaw,
      phase: 1,
      authoredId: "HL-CANONICAL-01",
      isHidden: true,
    });

    invalidateLessonCache();
    const allNormal = await getAllLessons();
    expect(allNormal.some((l) => l.frontmatter.id === "HL-CANONICAL-01")).toBe(false);

    // Cannot be opened via normal lesson routing
    const normalRoute = await getLessonBySlug(["hidden-lessons", "classified-invariant"]);
    expect(normalRoute).toBeNull();

    // Hidden lessons are accessible via getHiddenLessonBySlug
    const hl = await getHiddenLessonBySlug("classified-invariant");
    expect(hl).not.toBeNull();
    expect(hl?.frontmatter.id).toBe("HL-CANONICAL-01");

    // Public search does not leak locked hidden lesson
    const searchLocked = await searchLessons("Classified Invariant", []);
    expect(searchLocked.length).toBe(0);

    // Unlocked user search retrieves it safely
    const searchUnlocked = await searchLessons("Classified Invariant", ["HL-CANONICAL-01"]);
    expect(searchUnlocked.length).toBe(1);
    expect(searchUnlocked[0].frontmatter.title).toBe("Classified Invariant");
  });

  it("10. Updates roadmap status dynamically when a new phase module is added to Supabase", async () => {
    // Add lesson for Phase 5 (which may be empty initially)
    const p5Raw = `---
id: "P5-W1-D1"
title: "Production Systems"
phase: 5
week: 1
day: 1
published: true
---
# Production Systems in Rust
`;

    await upsertContentFile({
      rawContent: p5Raw,
      phase: 5,
      week: 1,
      day: 1,
      authoredId: "P5-W1-D1",
    });

    invalidateLessonCache();
    const roadmap = await getRoadmapStatus();
    const phase5 = roadmap.find((p) => p.phase === 5);

    expect(phase5).toBeDefined();
    expect(phase5?.hasContent).toBe(true);
    expect(phase5?.lessonCount).toBeGreaterThanOrEqual(1);
  });

  it("11. Strict User-Progress Separation: Reset All Progress never touches curriculum tables", async () => {
    // Upload curriculum lesson
    await upsertContentFile({
      rawContent: `---
id: "P1-W1-D1"
title: "Core Rust"
phase: 1
week: 1
day: 1
published: true
---
# Core Rust
`,
      phase: 1,
      week: 1,
      day: 1,
      authoredId: "P1-W1-D1",
    });

    expect(mockDb.content_files.size).toBe(1);

    // Mark lesson completed in user progress store
    useProgressStore.getState().toggleLesson("/lesson/phase-01/week-01/day-01", "Core Rust", 1);
    expect(useProgressStore.getState().completedLessons.has("/lesson/phase-01/week-01/day-01")).toBe(true);

    // Reset progress
    useProgressStore.getState().resetAllProgress();
    expect(useProgressStore.getState().completedLessons.size).toBe(0);

    // Curriculum files in Supabase remain completely untouched and intact!
    expect(mockDb.content_files.size).toBe(1);
    expect(mockDb.content_files.get("P1-W1-D1")).toBeDefined();
  });
});
