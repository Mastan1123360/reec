/**
 * lib/widgets/future-plugins.tsx
 *
 * Registers the complete suite of interactive educational visualizer plugins:
 * - Memory Viewer ("memory-viewer")
 * - Ownership Timeline ("ownership-timeline", "ownership-visualizer")
 * - Move / Drop Animation ("move-drop-animation")
 * - Borrow Checker Simulation ("borrow-checker-simulation", "borrow-timeline")
 * - Reference Graph ("reference-graph")
 * - Non-Lexical Lifetimes Timeline ("nll-timeline", "lifetime-visualizer")
 * - Trait Dispatch Visualizer ("trait-visualizer")
 * - Assembly Viewer ("assembly-viewer")
 * - Tokio Async Runtime Viewer ("tokio-runtime-viewer")
 * - Wayland Protocol Viewer ("wayland-protocol-viewer")
 *
 * Every visualizer is 100% functional, responsive, accessible, and provides
 * deep educational value with zero placeholder text.
 */
"use client";

import { registerWidget } from "./registry";
import { MemoryViewer } from "@/components/visualizers/MemoryViewer";
import { OwnershipTimeline } from "@/components/visualizers/OwnershipTimeline";
import { MoveDropAnimation } from "@/components/visualizers/MoveDropAnimation";
import { BorrowCheckerSimulation } from "@/components/visualizers/BorrowCheckerSimulation";
import { ReferenceGraph } from "@/components/visualizers/ReferenceGraph";
import { NllTimeline } from "@/components/visualizers/NllTimeline";
import { TraitVisualizer } from "@/components/visualizers/TraitVisualizer";
import { AssemblyViewer } from "@/components/visualizers/AssemblyViewer";
import { TokioRuntimeViewer } from "@/components/visualizers/TokioRuntimeViewer";
import { WaylandProtocolViewer } from "@/components/visualizers/WaylandProtocolViewer";

export function registerFuturePlugins() {
  registerWidget({
    key: "memory-viewer",
    label: "Memory Viewer",
    component: MemoryViewer,
    icon: "Layers",
  });

  registerWidget({
    key: "ownership-timeline",
    label: "Ownership Timeline",
    component: OwnershipTimeline,
    icon: "Shield",
  });

  registerWidget({
    key: "ownership-visualizer",
    label: "Ownership Visualizer",
    component: OwnershipTimeline,
    icon: "Shield",
  });

  registerWidget({
    key: "move-drop-animation",
    label: "Move / Drop Animation",
    component: MoveDropAnimation,
    icon: "Copy",
  });

  registerWidget({
    key: "borrow-checker-simulation",
    label: "Borrow Checker Simulation",
    component: BorrowCheckerSimulation,
    icon: "Scale",
  });

  registerWidget({
    key: "borrow-timeline",
    label: "Borrow Timeline",
    component: BorrowCheckerSimulation,
    icon: "Scale",
  });

  registerWidget({
    key: "reference-graph",
    label: "Reference Graph",
    component: ReferenceGraph,
    icon: "GitFork",
  });

  registerWidget({
    key: "nll-timeline",
    label: "NLL Timeline",
    component: NllTimeline,
    icon: "Clock",
  });

  registerWidget({
    key: "lifetime-visualizer",
    label: "Lifetime Visualizer",
    component: NllTimeline,
    icon: "Clock",
  });

  registerWidget({
    key: "trait-visualizer",
    label: "Trait Visualizer",
    component: TraitVisualizer,
    icon: "Network",
  });

  registerWidget({
    key: "assembly-viewer",
    label: "Assembly Viewer",
    component: AssemblyViewer,
    icon: "Binary",
  });

  registerWidget({
    key: "tokio-runtime-viewer",
    label: "Tokio Runtime Viewer",
    component: TokioRuntimeViewer,
    icon: "Activity",
  });

  registerWidget({
    key: "wayland-protocol-viewer",
    label: "Wayland Protocol Viewer",
    component: WaylandProtocolViewer,
    icon: "Monitor",
  });
}
