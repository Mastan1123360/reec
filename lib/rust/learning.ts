/**
 * lib/rust/learning.ts
 *
 * The compiler remains authoritative — this is an OPTIONAL explanation
 * layer over specific, well-known error codes, never a replacement for
 * or rewrite of what rustc actually said. Every entry here is
 * conservative: general, durable teaching content about what the error
 * class means and which concepts it touches, not a guess at what this
 * specific occurrence means (that would risk being wrong in a way the
 * compiler's own message never is). The UI (DiagnosticsPanel) always
 * renders rustc's message first and labels this content "REEC
 * explanation" so the two are never confused.
 */

export interface LearningEntry {
  code: string;
  whatHappened: string;
  concepts: string[];
}

const ENTRIES: LearningEntry[] = [
  {
    code: "E0382",
    whatHappened:
      "A value was used after ownership of it moved somewhere else. Once a non-Copy value is assigned, passed, or returned, the original binding is no longer valid — using it again is what this error catches.",
    concepts: ["Ownership", "Move semantics", "Copy vs. Clone"],
  },
  {
    code: "E0502",
    whatHappened:
      "A mutable borrow and a shared borrow of the same value were active at the same time. Rust allows either one mutable reference OR any number of shared references, never both — this prevents a class of data races and iterator-invalidation bugs at compile time.",
    concepts: ["Borrowing", "Mutable-XOR-shared rule", "Aliasing"],
  },
  {
    code: "E0499",
    whatHappened:
      "The same value was borrowed mutably more than once at the same time. Even two mutable borrows of the same value conflict with each other, for the same reason a mutable and shared borrow do.",
    concepts: ["Borrowing", "Mutable-XOR-shared rule"],
  },
  {
    code: "E0507",
    whatHappened:
      "Code tried to move a value out of something it only had a reference to (e.g. a field behind `&T`). A reference doesn't own what it points to, so moving out of it would leave the actual owner's data in an invalid state.",
    concepts: ["Ownership", "References", "std::mem::take / Option::take"],
  },
  {
    code: "E0106",
    whatHappened:
      "A type contains a reference but the compiler can't determine how long that reference is valid for. Lifetime parameters (`'a`) make that relationship explicit so the compiler can verify it.",
    concepts: ["Lifetimes", "Borrowing"],
  },
  {
    code: "E0308",
    whatHappened:
      "The type the compiler expected at this position doesn't match the type actually provided. This is Rust's static type system doing its job — catching a mismatch here rather than at runtime.",
    concepts: ["Type system", "Type inference"],
  },
  {
    code: "E0433",
    whatHappened:
      "A path (module, type, or item) couldn't be resolved — usually a missing `use` statement, a typo, or an item that isn't actually public from where it's being referenced.",
    concepts: ["Modules", "Visibility", "Paths"],
  },
  {
    code: "E0425",
    whatHappened:
      "A name was used that isn't defined in the current scope — a variable, function, or constant the compiler can't find, often a typo or something defined after where it's used.",
    concepts: ["Scoping", "Name resolution"],
  },
];

const BY_CODE = new Map(ENTRIES.map((e) => [e.code, e]));

export function getLearningEntry(code: string | undefined): LearningEntry | undefined {
  if (!code) return undefined;
  return BY_CODE.get(code.toUpperCase());
}
