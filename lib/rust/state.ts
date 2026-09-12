"use client";

/**
 * lib/rust/state.ts
 *
 * The compiler is modeled as an explicit state machine, not scattered
 * booleans (isLoading/isRunning/isBuilding/...). At any moment the UI
 * asks one question — "what is `phase.status`" — and gets an
 * unambiguous answer, including which specific operation is in flight
 * and, on completion, whether the user's code succeeded, failed to
 * compile/run, or REEC itself couldn't reach the backend at all.
 *
 * This also owns the minimal RustProject/RustFile model — real enough
 * that a multi-file project is additive later (add files, wire the
 * backend to accept them) rather than a redesign, without pretending
 * today's single-file execution is more than it is.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isRustSourceKind } from "./types";
import { runRustOperation } from "./client";
import type {
  LessonOriginContext,
  RustBackendError,
  RustEdition,
  RustExecutionResult,
  RustFile,
  RustOperation,
  RustProfile,
  RustProject,
} from "./types";
import { transformRustSnippetToWorkspaceSource } from "./workspace-adapter";
import { HiddenLessonTriggerService } from "@/lib/hidden-lessons/service";
import { useProgressStore } from "@/lib/progress/store";

export type CompilerPhase =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "building" }
  | { status: "running" }
  | { status: "testing" }
  | { status: "formatting" }
  | { status: "success"; operation: RustOperation; result: RustExecutionResult }
  | { status: "failed"; operation: RustOperation; result: RustExecutionResult }
  | { status: "cancelled"; operation: RustOperation }
  | { status: "backend_error"; operation: RustOperation; error: RustBackendError };

const STARTER_SOURCE = `fn main() {\n    println!("Hello, Rust!");\n}\n`;

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const STARTER_CARGO_TOML = `[package]
name = "reec-playground"
version = "0.1.0"
edition = "2021"

[dependencies]
`;

/** The file the compiler actually receives. Cargo.toml is part of the
 * project but is a manifest, not a translation unit, so execution never
 * sends it as `source` — if the user is looking at Cargo.toml, compile
 * operations fall back to the crate's entry point (src/main.rs). */
function compileTarget(project: RustProject): RustFile | undefined {
  const active = project.files.find((f) => f.id === project.activeFileId);
  if (active && isRustSourceKind(active.kind)) return active;
  return (
    project.files.find((f) => f.kind === "main") ??
    project.files.find((f) => isRustSourceKind(f.kind))
  );
}

function defaultProject(): RustProject {
  const manifestId = makeId("file");
  const mainId = makeId("file");
  return {
    id: makeId("proj"),
    name: "reec-playground",
    edition: "2021",
    files: [
      { id: manifestId, path: "Cargo.toml", kind: "manifest", content: STARTER_CARGO_TOML, dirty: false },
      { id: mainId, path: "src/main.rs", kind: "main", content: STARTER_SOURCE, dirty: false },
    ],
    activeFileId: mainId,
  };
}

interface RustWorkspaceState {
  project: RustProject;
  profile: RustProfile;
  phase: CompilerPhase;
  /** Present only while an operation is in flight — lets the UI offer
   * a real Cancel action instead of a decorative spinner. */
  activeAbortController: AbortController | null;

  /** Panel-visibility state for the lesson-triggered slide-in surface
   * (components/rust-ide/RustWorkspacePanel.tsx). Deliberately part of
   * this same store rather than a separate one — it's workspace UI
   * state, not compiler domain state, but splitting it out would mean
   * two stores every lesson-triggered consumer has to wire through for
   * no real separation-of-concerns benefit. */
  isPanelOpen: boolean;
  lessonVisible: boolean;
  panelTitle: string;
  originContext: LessonOriginContext | null;

  activeFile: () => RustFile;
  setActiveFile: (fileId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;
  addFile: (path: string, kind: RustFile["kind"]) => void;
  removeFile: (fileId: string) => void;
  saveFile: (fileId: string) => void;
  setEdition: (edition: RustEdition) => void;
  setProfile: (profile: RustProfile) => void;

  runOperation: (operation: RustOperation) => Promise<void>;
  cancel: () => void;
  reset: () => void;

  openPanel: (source: string, title: string, origin?: LessonOriginContext) => void;
  setOriginContext: (origin: LessonOriginContext | null) => void;
  closePanel: () => void;
  toggleLessonVisible: () => void;
}

type InProgressStatus = "checking" | "building" | "running" | "testing" | "formatting";

const PHASE_BY_OPERATION: Record<RustOperation, InProgressStatus> = {
  check: "checking",
  build: "building",
  run: "running",
  test: "testing",
  format: "formatting",
};

export const useRustWorkspace = create<RustWorkspaceState>()(
  persist(
    (set, get) => ({
      project: defaultProject(),
      profile: "debug",
      phase: { status: "idle" },
      activeAbortController: null,
      isPanelOpen: false,
      lessonVisible: false,
      panelTitle: "",
      originContext: null,

      activeFile: () => {
        const { project } = get();
        return project.files.find((f) => f.id === project.activeFileId) ?? project.files[0];
      },

      setActiveFile: (fileId) =>
        set((s) => ({ project: { ...s.project, activeFileId: fileId } })),

      updateFileContent: (fileId, content) =>
        set((s) => ({
          project: {
            ...s.project,
            files: s.project.files.map((f) => (f.id === fileId ? { ...f, content, dirty: true } : f)),
          },
        })),

      addFile: (path, kind) =>
        set((s) => {
          const id = makeId("file");
          const starter = kind === "test" ? `#[test]\nfn it_works() {\n    assert_eq!(2 + 2, 4);\n}\n` : "";
          return {
            project: {
              ...s.project,
              files: [...s.project.files, { id, path, kind, content: starter, dirty: false }],
              activeFileId: id,
            },
          };
        }),

      removeFile: (fileId) =>
        set((s) => {
          const files = s.project.files.filter((f) => f.id !== fileId);
          const activeFileId = s.project.activeFileId === fileId ? files[0]?.id ?? "" : s.project.activeFileId;
          return { project: { ...s.project, files, activeFileId } };
        }),

      saveFile: (fileId) =>
        set((s) => ({
          project: {
            ...s.project,
            files: s.project.files.map((f) => (f.id === fileId ? { ...f, dirty: false } : f)),
          },
        })),

      setEdition: (edition) => set((s) => ({ project: { ...s.project, edition } })),
      setProfile: (profile) => set({ profile }),

      runOperation: async (operation) => {
        const { project, profile, activeAbortController } = get();
        activeAbortController?.abort();

        const controller = new AbortController();
        set({ phase: { status: PHASE_BY_OPERATION[operation] }, activeAbortController: controller });

        // Single-translation-unit execution today: the backend compiles
        // one Rust source file. The project model is Cargo-shaped (it owns
        // Cargo.toml + src/main.rs and supports more files), but the wire
        // format currently carries one `source` — multi-file execution
        // stays additive later, and the manifest is never sent as source.
        const target = compileTarget(project);
        if (!target) {
          set({
            phase: {
              status: "backend_error",
              operation,
              error: { kind: "invalid_request", message: "No Rust source file to compile." },
            },
            activeAbortController: null,
          });
          return;
        }

        try {
          const outcome = await runRustOperation(operation, target.content, project.edition, profile, controller.signal);

          if (!outcome.ok) {
            set({ phase: { status: "backend_error", operation, error: outcome.error }, activeAbortController: null });
            return;
          }

          const { result } = outcome;

          if (operation === "format" && result.success && result.formattedSource) {
            set((s) => ({
              project: {
                ...s.project,
                files: s.project.files.map((f) =>
                  f.id === target.id ? { ...f, content: result.formattedSource!, dirty: true } : f
                ),
              },
            }));
          }

          set({
            phase: { status: result.success ? "success" : "failed", operation, result },
            activeAbortController: null,
          });

          // Emit structured execution event to evaluate hidden lesson discovery triggers
          // with a 3-second delay after program execution before showing the hidden lesson
          const { originContext } = get();

          // Log real-time activity for workspace runs
          const opLabel = operation.charAt(0).toUpperCase() + operation.slice(1);
          useProgressStore.getState().logActivity({
            type: "workspace_practice",
            title: `Rust ${opLabel}: ${result.success ? "Passed" : "Errors found"}`,
            subtitle: originContext?.lessonId
              ? `Lesson: ${originContext.lessonId}`
              : `Workspace: ${target.path}`,
            path: originContext?.lessonId ? `/lesson/${originContext.lessonId}` : "/workspace",
            iconType: "code",
          });

          HiddenLessonTriggerService.scheduleExecutionEvent(
            {
              operation,
              attemptId: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              status: result.success ? "success" : "error",
              language: "rust",
              lessonId: originContext?.lessonId,
              challengeId: originContext?.challengeId,
              blockId: originContext?.blockId,
              triggerId: originContext?.triggerId,
              source: target.content,
              timestamp: Date.now(),
              hasCompilerError: !result.success,
            },
            3000
          );
        } catch (err) {
          if ((err as Error).name === "AbortError") {
            set({ phase: { status: "cancelled", operation }, activeAbortController: null });
            return;
          }
          set({
            phase: {
              status: "backend_error",
              operation,
              error: { kind: "backend_error", message: "An unexpected error occurred." },
            },
            activeAbortController: null,
          });
        }
      },

      cancel: () => {
        get().activeAbortController?.abort();
      },

      reset: () =>
        set({
          project: defaultProject(),
          phase: { status: "idle" },
          originContext: null,
        }),

      setOriginContext: (origin) => set({ originContext: origin }),

      openPanel: (source, title, origin) =>
        set((s) => {
          const target =
            s.project.files.find((f) => f.kind === "main") ??
            s.project.files.find((f) => isRustSourceKind(f.kind));
          if (!target) {
            return {
              isPanelOpen: true,
              lessonVisible: false,
              panelTitle: title,
              phase: { status: "idle" },
              originContext: origin ?? null,
            };
          }

          // Transform the pedagogical lesson snippet into a complete,
          // syntactically valid Rust program for src/main.rs.
          const workspaceSource = transformRustSnippetToWorkspaceSource(source);

          const fullOrigin: LessonOriginContext = origin
            ? {
                ...origin,
                originalLessonSource: source,
                generatedFromLesson: true,
                executable: true,
              }
            : {
                originalLessonSource: source,
                generatedFromLesson: true,
                executable: true,
              };

          return {
            isPanelOpen: true,
            lessonVisible: false,
            panelTitle: title,
            phase: { status: "idle" },
            originContext: fullOrigin,
            project: {
              ...s.project,
              activeFileId: target.id,
              origin: fullOrigin,
              files: s.project.files.map((f) =>
                f.id === target.id ? { ...f, content: workspaceSource, dirty: false } : f
              ),
            },
          };
        }),

      closePanel: () => set({ isPanelOpen: false, lessonVisible: false, phase: { status: "idle" } }),

      toggleLessonVisible: () => set((s) => ({ lessonVisible: !s.lessonVisible })),
    }),
    {
      // v2: the project model gained a Cargo.toml manifest, so bumping
      // the storage key abandons any pre-manifest workspace state rather
      // than hydrating a manifest-less project over the new default.
      name: "reec-rust-workspace-v2",
      partialize: (s) => ({ project: s.project, profile: s.profile }),
    }
  )
);
