/**
 * lib/content/roadmap.ts
 *
 * The curriculum's fixed phase roadmap — 9 phases, always shown on the
 * dashboard whether or not content has been authored for them yet. This
 * is intentionally NOT derived from what's in /content (that's what the
 * old dynamic-only dashboard did); it's the map, and content fills it in
 * over time. A phase with zero lessons still gets a card, marked
 * "Coming Soon" instead of not existing.
 */

export interface RoadmapPhase {
  phase: number;
  title: string;
  description: string;
}

export const CURRICULUM_ROADMAP: RoadmapPhase[] = [
  { phase: 0, title: "Computational Thinking & Engineering Foundations", description: "Binary, memory, the compilation pipeline, and the Unix/Git toolchain — before any Rust syntax." },
  { phase: 1, title: "Rust Foundations", description: "Ownership, borrowing, lifetimes, pattern matching, and idiomatic error handling." },
  { phase: 2, title: "Professional Rust", description: "Workspaces, iterators, smart pointers, and concurrency basics." },
  { phase: 3, title: "Backend Engineering", description: "HTTP from first principles, async/await, REST APIs, and authentication." },
  { phase: 4, title: "Systems Programming", description: "Memory layout, unsafe Rust, FFI, and syscalls." },
  { phase: 5, title: "Cryptography & Security", description: "Hashing, symmetric/asymmetric crypto, and threat modeling." },
  { phase: 6, title: "Web3 Engineering", description: "Blockchain data structures, Merkle trees, and wallets." },
  { phase: 7, title: "Cloud & DevOps", description: "Containers, observability, and Kubernetes basics." },
  { phase: 8, title: "Advanced Rust", description: "Procedural macros, async internals, and binary protocol design." },
];

export function roadmapTitleForPhase(phase: number): string {
  return CURRICULUM_ROADMAP.find((p) => p.phase === phase)?.title ?? `Phase ${phase}`;
}
