import { describe, it, expect } from "vitest";
import * as crypto from "crypto";
import matter from "gray-matter";
import { getContentFileById, getAllContentFiles } from "../supabase-content";
import { parseLesson } from "../parser";

function sha256(str: string): string {
  return crypto.createHash("sha256").update(str.replace(/\r\n/g, "\n"), "utf-8").digest("hex");
}

describe("Curriculum Content Integrity & Pipeline Preservation", () => {
  it("preserves 100% of P0-W1-D1 content, sections, and all 7 REEC blocks without loss", async () => {
    const row = await getContentFileById("P0-W1-D1");
    expect(row).toBeDefined();
    expect(row?.content).toBeDefined();

    const rawMarkdown = row!.content;
    expect(rawMarkdown.length).toBeGreaterThan(25000);

    const rawHash = sha256(rawMarkdown);
    expect(rawHash).toBe("3f0ac832c40d59f7bb3deb3c795b658104cf9bb2f5ecb62113eac55c4e2c195f");

    // Check frontmatter separation
    const fm = matter(rawMarkdown);
    expect(fm.data.id).toBe("P0-W1-D1");
    expect(fm.data.title).toBe("Computational Thinking: The Compilation Pipeline and Memory Layout");
    expect(fm.content.length).toBeGreaterThan(24000);

    // Parse the lesson through canonical REEC parser
    const lesson = await parseLesson(rawMarkdown, ["phase-00", "week-01", "day-01"]);
    expect(lesson.frontmatter.id).toBe("P0-W1-D1");
    expect(lesson.sections.length).toBe(9);
    expect(lesson.blocks.length).toBe(7);

    // Verify all 7 REEC blocks survived with full content
    const expectedBlockKinds = [
      "story",
      "mental-model",
      "engineering-note",
      "worked-example",
      "compiler-thinking",
      "mini-challenge",
      "reflection",
    ];
    const actualBlockKinds = lesson.blocks.map((b) => b.kind);
    expect(actualBlockKinds).toEqual(expectedBlockKinds);

    // Verify block contents are non-empty and rich
    for (const block of lesson.blocks) {
      expect(block.html.length).toBeGreaterThan(500);
      expect(block.markdown.length).toBeGreaterThan(500);
    }

    // Verify beginning, middle, and end content anchors
    // 1. Beginning anchor
    expect(rawMarkdown).toContain("The Program That Worked Until It Didn't");
    // 2. Middle anchor
    expect(rawMarkdown).toContain("The Stack");
    expect(rawMarkdown).toContain("The Heap");
    expect(rawMarkdown).toContain("The Static Regions: Data and BSS");
    // 3. End anchor
    expect(rawMarkdown).toContain("The engineering habit to carry forward");
    expect(rawMarkdown).toContain("Day 2 covers the Unix toolchain");

    // Verify all content nodes render into HTML
    let totalRenderableChars = 0;
    for (const section of lesson.sections) {
      for (const node of section.nodes) {
        if (node.type === "prose") totalRenderableChars += node.html.length;
        if (node.type === "block") totalRenderableChars += node.block.html.length;
        if (node.type === "code") totalRenderableChars += node.code.source.length;
      }
    }
    // Total renderable HTML + code exceeds original body due to semantic tags & syntax markup
    expect(totalRenderableChars).toBeGreaterThan(25000);
  });

  it("verifies all published curriculum lessons parse without body truncation", async () => {
    const rows = await getAllContentFiles({ publishedOnly: true });
    expect(rows.length).toBeGreaterThanOrEqual(40);

    for (const row of rows) {
      expect(row.content).toBeDefined();
      expect(row.content.length).toBeGreaterThan(1000);

      const fm = matter(row.content);
      expect(fm.content.length).toBeGreaterThan(200);

      const slugParts = row.slug ? row.slug.split("/") : [];
      const lesson = await parseLesson(row.content, slugParts);
      expect(lesson.sections.length).toBeGreaterThanOrEqual(1);
      expect(lesson.blocks.length).toBeGreaterThanOrEqual(2);
    }
  });
});
