/**
 * lib/widgets/index.ts
 *
 * Single import point that registers every built-in widget and educational visualizer.
 * The app root layout imports this module once (for its side effects) before any
 * lesson renders.
 */

import { registerWidget } from "./registry";
import { StoryCard } from "./components/StoryCard";
import { MentalModelCard } from "./components/MentalModelCard";
import { EngineeringNote } from "./components/EngineeringNote";
import { ProductionNote } from "./components/ProductionNote";
import { HistoricalContext } from "./components/HistoricalContext";
import { WorkedExample } from "./components/WorkedExample";
import { CompilerThinking } from "./components/CompilerThinking";
import { MiniChallenge } from "./components/MiniChallenge";
import { Reflection } from "./components/Reflection";
import { ProjectBlock } from "./components/ProjectBlock";
import { ReadingBlock } from "./components/ReadingBlock";

// Interactive Educational Visualizers
import { MemoryViewer } from "@/components/visualizers/MemoryViewer";
import { OwnershipTimeline } from "@/components/visualizers/OwnershipTimeline";
import { MoveDropAnimation } from "@/components/visualizers/MoveDropAnimation";
import { BorrowCheckerSimulation } from "@/components/visualizers/BorrowCheckerSimulation";
import { ReferenceGraph } from "@/components/visualizers/ReferenceGraph";
import { NllTimeline } from "@/components/visualizers/NllTimeline";

registerWidget({ key: "story", label: "Story", component: StoryCard, icon: "BookOpen" });
registerWidget({ key: "mental-model", label: "Mental Model", component: MentalModelCard, icon: "Brain" });
registerWidget({ key: "engineering-note", label: "Engineering Note", component: EngineeringNote, icon: "NotebookPen" });
registerWidget({ key: "production-note", label: "Production Note", component: ProductionNote, icon: "PackageSearch" });
registerWidget({ key: "historical-context", label: "Historical Context", component: HistoricalContext, icon: "Landmark" });
registerWidget({ key: "worked-example", label: "Worked Example", component: WorkedExample, icon: "Code2" });
registerWidget({ key: "compiler-thinking", label: "Compiler Thinking", component: CompilerThinking, icon: "Cpu" });
registerWidget({ key: "mini-challenge", label: "Mini Challenge", component: MiniChallenge, icon: "Swords" });
registerWidget({ key: "reflection", label: "Reflection", component: Reflection, icon: "PenSquare" });
registerWidget({ key: "project", label: "Project", component: ProjectBlock, icon: "Hammer" });
registerWidget({ key: "reading", label: "Reading", component: ReadingBlock, icon: "Library" });

// Educational Visualizers
registerWidget({ key: "memory-viewer", label: "Memory Viewer", component: MemoryViewer, icon: "Cpu" });
registerWidget({ key: "ownership-timeline", label: "Ownership Timeline", component: OwnershipTimeline, icon: "Shield" });
registerWidget({ key: "ownership-visualizer", label: "Ownership Visualizer", component: OwnershipTimeline, icon: "Shield" });
registerWidget({ key: "move-drop-animation", label: "Move / Drop Animation", component: MoveDropAnimation, icon: "Sparkles" });
registerWidget({ key: "borrow-checker-simulation", label: "Borrow Checker Simulation", component: BorrowCheckerSimulation, icon: "Scale" });
registerWidget({ key: "borrow-timeline", label: "Borrow Timeline", component: BorrowCheckerSimulation, icon: "Scale" });
registerWidget({ key: "reference-graph", label: "Reference Graph", component: ReferenceGraph, icon: "Network" });
registerWidget({ key: "nll-timeline", label: "NLL Timeline", component: NllTimeline, icon: "Zap" });
registerWidget({ key: "lifetime-visualizer", label: "Lifetime Visualizer", component: NllTimeline, icon: "Zap" });

/**
 * Placeholder registrations for remaining future plugins.
 */
import { registerFuturePlugins } from "./future-plugins";
registerFuturePlugins();

export { widgetRegistry } from "./registry";
