/**
 * lib/rust/types.ts
 *
 * REEC's domain model. Rust is not "a language option" — these types
 * name Rust concepts directly (RustProject, RustDiagnostic,
 * RustCompilation) rather than routing through a generic
 * `language: string` abstraction designed for arbitrary languages.
 *
 * This file has zero dependencies on the execution backend (Playground)
 * or on React — it's the vocabulary every other layer (the adapter, the
 * API routes, the state machine, the UI) shares.
 */

// ---------------------------------------------------------------------
// Project model
// ---------------------------------------------------------------------

export type RustFileKind = "main" | "lib" | "module" | "test" | "manifest";

/** True when a file is a Rust source file (i.e. a legitimate target for
 * check/build/run/test/format). `Cargo.toml` is part of the project but
 * is a manifest, not a translation unit, so the execution layer must
 * never send it to the compiler as `source`. */
export function isRustSourceKind(kind: RustFileKind): boolean {
  return kind !== "manifest";
}

export interface RustFile {
  id: string;
  /** Path relative to the project root, e.g. "src/main.rs". */
  path: string;
  kind: RustFileKind;
  content: string;
  /** True once edited since the last save point (for autosave/dirty UI). */
  dirty: boolean;
}

/**
 * A minimal but real Cargo-shaped project — not a bare string. The
 * architecture intentionally supports more than one file today (even
 * though the execution backend currently only compiles a single
 * translation unit) so multi-file projects are additive later, not a
 * redesign. See RustProject.toSingleFileSource in playground-adapter.ts
 * for how a project currently collapses to what the backend accepts.
 */
export interface RustProject {
  id: string;
  name: string;
  edition: RustEdition;
  files: RustFile[];
  /** id of the file currently open/focused in the editor. */
  activeFileId: string;
  /** Origin metadata if seeded from an executable lesson or challenge */
  origin?: LessonOriginContext;
}

export interface LessonOriginContext {
  lessonId?: string;
  challengeId?: string;
  blockId?: string;
  triggerId?: string;
  originalLessonSource?: string;
  generatedFromLesson?: boolean;
  executable?: boolean;
}

export type RustEdition = "2015" | "2018" | "2021" | "2024";
export type RustChannel = "stable" | "beta" | "nightly";
export type RustProfile = "debug" | "release";

// ---------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------

export type DiagnosticLevel = "error" | "warning" | "note" | "help";

export interface SourceSpan {
  file: string;
  line: number;
  column: number;
  /** The exact source text this span underlines, when the compiler
   * output includes the annotated source line (best-effort — only
   * populated when the parser could confidently extract it). */
  snippet?: string;
  /** The caret/label text rustc prints under the source line, e.g.
   * "value moved here". */
  label?: string;
}

export interface RustDiagnostic {
  id: string;
  level: DiagnosticLevel;
  /** rustc's error code, e.g. "E0382" — absent for notes/help/lint
   * warnings that don't carry one. */
  code?: string;
  /** The one-line summary, e.g. "use of moved value: `s`". */
  message: string;
  primarySpan?: SourceSpan;
  secondarySpans: SourceSpan[];
  /** Any "help: ..." / "note: ..." sub-messages rustc attached,
   * verbatim — never rewritten. */
  children: { level: DiagnosticLevel; message: string }[];
  /** The exact rustc text block this diagnostic was parsed from —
   * always available as a fallback so nothing is ever lost even if
   * structured extraction above is partial. */
  raw: string;
}

// ---------------------------------------------------------------------
// Compilation / execution
// ---------------------------------------------------------------------

export type RustOperation = "check" | "build" | "run" | "test" | "format";

export interface RustExecutionRequest {
  operation: RustOperation;
  source: string;
  edition: RustEdition;
  channel: RustChannel;
  profile: RustProfile;
}

export interface RustArtifact {
  /** What the artifact actually is — REEC never fabricates a binary
   * download; "asm"/"llvm-ir" are the only codegen products the
   * backend can currently produce for inspection. */
  kind: "asm" | "llvm-ir";
  content: string;
}

export interface RustExecutionResult {
  operation: RustOperation;
  success: boolean;
  stdout: string;
  stderr: string;
  diagnostics: RustDiagnostic[];
  artifact?: RustArtifact;
  /** Only populated for operation:"format" — the rustfmt-formatted
   * source. Kept as a distinct field rather than overloading stdout,
   * since "the program's console output" and "the reformatted source
   * code" are different kinds of thing and the UI treats them
   * differently. */
  formattedSource?: string;
  durationMs: number;
}

// ---------------------------------------------------------------------
// Errors — distinguishing "your code failed" from "we couldn't reach
// the compiler" is a first-class product requirement, not an
// afterthought (see lib/rust/errors.ts for the taxonomy).
// ---------------------------------------------------------------------

export type RustBackendErrorKind =
  | "network_error"
  | "timeout"
  | "backend_error"
  | "rate_limit"
  | "invalid_request"
  | "unsupported_operation";

export interface RustBackendError {
  kind: RustBackendErrorKind;
  message: string;
  /** Verbatim upstream response body, when available — never
   * fabricated, always shown alongside the friendly message. */
  upstreamDetail?: string;
}
