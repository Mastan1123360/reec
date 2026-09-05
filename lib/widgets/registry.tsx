/**
 * lib/widgets/registry.tsx
 *
 * The Widget Engine's plugin registry.
 *
 * Every REEC block kind (":::story", ":::mental-model", ...) — and every
 * future standalone widget (an Ownership Visualizer, a Borrow Timeline) —
 * registers itself here under a string key. The Lesson Renderer never
 * imports widget components directly; it looks them up by key. This is
 * what makes the widget system "plugin-based": adding a new visualizer is
 * exactly one `registerWidget(...)` call in a new file, imported once from
 * `lib/widgets/index.ts` — no changes to the parser, the renderer, or any
 * lesson file are required.
 *
 * Contract:
 *   - Every widget receives `ReecBlock` (kind/title/markdown/html/id) plus
 *     any explicit `props` declared in front matter (for standalone
 *     widgets that aren't tied to a body block, `block` may be undefined).
 *   - A widget MUST render *something* reasonable even if `html` is empty
 *     (e.g. a pure interactive widget driven only by `props`).
 *   - Unregistered kinds fall back to `UnknownBlock`, which renders the
 *     raw block plainly rather than crashing the page — lesson authoring
 *     should never be blocked by a missing widget implementation.
 */

import type { ComponentType } from "react";
import type { ReecBlock } from "@/lib/content/types";

export interface WidgetProps {
  block?: ReecBlock;
  title?: string;
  props?: Record<string, unknown>;
}

export type WidgetComponent = ComponentType<WidgetProps>;

interface WidgetDefinition {
  key: string;
  label: string;
  component: WidgetComponent;
  /** Icon name from lucide-react, used in the widget's chrome */
  icon?: string;
}

class WidgetRegistry {
  private widgets = new Map<string, WidgetDefinition>();

  register(def: WidgetDefinition) {
    if (this.widgets.has(def.key)) {
      const existing = this.widgets.get(def.key);
      if (existing && existing.component !== def.component && process.env.NODE_ENV === "development" && process.env.DEBUG_WIDGETS) {
        console.warn(`[widget-registry] overriding existing widget: ${def.key}`);
      }
    }
    this.widgets.set(def.key, def);
    return this;
  }

  get(key: string): WidgetDefinition | undefined {
    return this.widgets.get(key);
  }

  has(key: string): boolean {
    return this.widgets.has(key);
  }

  keys(): string[] {
    return [...this.widgets.keys()];
  }

  all(): WidgetDefinition[] {
    return [...this.widgets.values()];
  }
}

export const widgetRegistry = new WidgetRegistry();

export function registerWidget(def: WidgetDefinition) {
  widgetRegistry.register(def);
}
