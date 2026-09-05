/**
 * lib/semantic/ontology.ts
 *
 * A small, static concept ontology for the curriculum domain. This is the
 * "master chain" every lesson's Concept Map is positioned against — e.g.
 * Compilation → Machine Code → CPU → Memory → Ownership → Borrowing →
 * Lifetimes → Concurrency → ...
 *
 * This is intentionally NOT derived by an LLM at request time (that would
 * make the concept graph non-deterministic and slow); it's a curated,
 * versioned domain model, the same way a compiler's symbol table is
 * curated rather than guessed. Individual lessons are matched against it
 * via tags/keywords in `model.ts`. Extending the curriculum's conceptual
 * range (e.g. adding a Wayland/graphics arm) means adding entries here —
 * no lesson file needs to change.
 */

export interface ConceptNode {
  id: string;
  label: string;
  /** Keywords/tag-aliases that map a lesson to this concept node. */
  aliases: string[];
}

export interface ConceptEdge {
  from: string;
  to: string;
}

export const CONCEPT_CHAIN: ConceptNode[] = [
  { id: "binary", label: "Binary & Data", aliases: ["binary", "bytes", "data"] },
  { id: "memory", label: "Memory Layout", aliases: ["memory", "stack", "heap", "foundations"] },
  { id: "compilation", label: "Compilation", aliases: ["compilation", "compiler", "toolchain"] },
  { id: "cpu", label: "CPU & Execution", aliases: ["cpu", "execution", "process"] },
  { id: "ownership", label: "Ownership", aliases: ["ownership", "move-semantics", "rust"] },
  { id: "borrowing", label: "Borrowing", aliases: ["borrowing", "references", "borrow-checker"] },
  { id: "lifetimes", label: "Lifetimes", aliases: ["lifetimes", "lifetime"] },
  { id: "traits", label: "Traits & Generics", aliases: ["traits", "generics", "polymorphism"] },
  { id: "concurrency", label: "Concurrency", aliases: ["concurrency", "threads", "mutex", "channels"] },
  { id: "async", label: "Async Runtime", aliases: ["async", "await", "tokio", "futures"] },
  { id: "unsafe", label: "Unsafe & FFI", aliases: ["unsafe", "ffi", "raw-pointers"] },
  { id: "networking", label: "Networking & Protocols", aliases: ["networking", "protocols", "tcp", "http"] },
  { id: "security", label: "Cryptography & Security", aliases: ["cryptography", "security", "threat-modeling"] },
  { id: "rendering", label: "Graphics & Rendering", aliases: ["graphics", "rendering", "wayland", "compositor"] },
];

export const CONCEPT_EDGES: ConceptEdge[] = [
  { from: "binary", to: "memory" },
  { from: "memory", to: "compilation" },
  { from: "compilation", to: "cpu" },
  { from: "cpu", to: "ownership" },
  { from: "ownership", to: "borrowing" },
  { from: "borrowing", to: "lifetimes" },
  { from: "lifetimes", to: "traits" },
  { from: "traits", to: "concurrency" },
  { from: "concurrency", to: "async" },
  { from: "async", to: "unsafe" },
  { from: "unsafe", to: "networking" },
  { from: "networking", to: "security" },
  { from: "security", to: "rendering" },
];

/** Matches a lesson's tags/title/terminology against the ontology,
 * returning every concept node the lesson meaningfully touches. */
export function matchConcepts(haystack: string[]): ConceptNode[] {
  const normalized = haystack.map((h) => h.toLowerCase());
  return CONCEPT_CHAIN.filter((node) =>
    node.aliases.some((alias) => normalized.some((h) => h.includes(alias)))
  );
}
