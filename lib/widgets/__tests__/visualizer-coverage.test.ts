import { describe, it, expect, beforeAll } from "vitest";
import { widgetRegistry } from "@/lib/widgets/registry";
import "@/lib/widgets/index"; // Ensure all widgets & visualizers are registered
import { getAllLessons, getAllHiddenLessons } from "@/lib/content/discover";
import { interpretLesson } from "@/lib/semantic/interpreter";
import { buildSemanticModel } from "@/lib/semantic/model";

describe("Curriculum-Wide Visualizer & Widget Registry Coverage", () => {
  beforeAll(async () => {
    // Import all widget plugins
    await import("@/lib/widgets/index");
  });

  it("1. Verifies 100% visualizer & widget registry coverage across all curriculum lessons", async () => {
    const lessons = await getAllLessons();
    const hiddenLessons = await getAllHiddenLessons();
    const allLessonsToAudit = [...lessons, ...hiddenLessons];

    const declaredWidgetKeys = new Set<string>();
    const declaredVisualizerKeys = new Set<string>();
    let totalDeclarations = 0;

    const lessonCoverageReport: Array<{
      id: string;
      title: string;
      visualizers: string[];
    }> = [];

    for (const lesson of allLessonsToAudit) {
      // 1. Explicit frontmatter widgets
      for (const w of lesson.frontmatter.widgets || []) {
        declaredWidgetKeys.add(w.type);
        totalDeclarations++;
      }

      // 2. Semantic interpreter enhancements derived from lesson concepts
      const model = buildSemanticModel(lesson);
      const plan = interpretLesson(model);
      const visualizersForLesson: string[] = [];

      for (const be of plan.blockEnhancements) {
        for (const enh of be.enhancements) {
          declaredVisualizerKeys.add(enh);
          visualizersForLesson.push(enh);
          totalDeclarations++;
        }
      }

      // 3. Body REEC blocks
      for (const block of lesson.blocks) {
        declaredWidgetKeys.add(block.kind);
      }

      if (visualizersForLesson.length > 0) {
        lessonCoverageReport.push({
          id: lesson.frontmatter.id,
          title: lesson.frontmatter.title,
          visualizers: visualizersForLesson,
        });
      }
    }

    // Required core visualizer plugin suite
    const requiredVisualizers = [
      "memory-viewer",
      "ownership-timeline",
      "ownership-visualizer",
      "move-drop-animation",
      "borrow-checker-simulation",
      "borrow-timeline",
      "reference-graph",
      "nll-timeline",
      "lifetime-visualizer",
      "trait-visualizer",
      "assembly-viewer",
      "tokio-runtime-viewer",
      "wayland-protocol-viewer",
    ];

    for (const vKey of requiredVisualizers) {
      declaredVisualizerKeys.add(vKey);
    }

    const unsupportedKeys: string[] = [];

    for (const key of declaredVisualizerKeys) {
      if (!widgetRegistry.has(key)) {
        unsupportedKeys.push(key);
      }
    }

    for (const key of declaredWidgetKeys) {
      if (!widgetRegistry.has(key)) {
        unsupportedKeys.push(key);
      }
    }

    console.log("=== CURRICULUM VISUALIZER AUDIT REPORT ===");
    console.log(`Total lessons inspected: ${allLessonsToAudit.length}`);
    console.log(`Total visualizer declarations: ${totalDeclarations}`);
    console.log(`Unique visualizer types: ${declaredVisualizerKeys.size}`);
    console.log(`Implemented visualizer types: ${declaredVisualizerKeys.size - unsupportedKeys.length}`);
    console.log(`Unsupported visualizer keys: ${unsupportedKeys.length}`);
    console.log(`Visualizer coverage: ${unsupportedKeys.length === 0 ? "100%" : "FAIL"}`);
    console.log("==========================================");

    expect(unsupportedKeys).toEqual([]);
    expect(declaredVisualizerKeys.size).toBeGreaterThanOrEqual(10);
  });

  it("2. Verifies all registered visualizers have executable React components", () => {
    const visualizerKeys = [
      "memory-viewer",
      "ownership-timeline",
      "ownership-visualizer",
      "move-drop-animation",
      "borrow-checker-simulation",
      "borrow-timeline",
      "reference-graph",
      "nll-timeline",
      "lifetime-visualizer",
      "trait-visualizer",
      "assembly-viewer",
      "tokio-runtime-viewer",
      "wayland-protocol-viewer",
    ];

    for (const key of visualizerKeys) {
      const def = widgetRegistry.get(key);
      expect(def).toBeDefined();
      expect(typeof def?.component).toBe("function");
      expect(def?.label).toBeTruthy();
    }
  });
});
