/**
 * lib/domain/rust-workspace/types.ts
 *
 * Implements Master Engineering Specification Section 23:
 * RUST WORKSPACE
 *
 * The Rust subsystem must remain conceptually independent from authentication and curriculum.
 *
 * RustWorkspace
 * ├── files
 * ├── activeFile
 * ├── editorState
 * ├── diagnostics
 * ├── executionState
 * ├── output
 * └── terminal
 *
 * Execution states:
 * IDLE, RUNNING, SUCCESS, FAILED, TIMEOUT, NETWORK_ERROR
 *
 * Invariant: Do not represent all failures as generic empty output.
 * Preserve the existing Rust backend. Clean only the conceptual orchestration around it.
 */

export type RustExecutionStatus =
  | "IDLE"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "TIMEOUT"
  | "NETWORK_ERROR";

export interface RustWorkspaceFile {
  readonly path: string;
  readonly name: string;
  readonly content: string;
  readonly language: "rust" | "toml";
  readonly readOnly?: boolean;
}

export interface RustDiagnostic {
  readonly line?: number;
  readonly column?: number;
  readonly message: string;
  readonly severity?: "error" | "warning" | "info" | "hint";
  readonly level?: string;
  readonly code?: string;
  readonly [key: string]: any;
}

export interface RustEditorState {
  readonly cursorLine: number;
  readonly cursorColumn: number;
  readonly isDirty: boolean;
  readonly selectedText?: string;
}

export interface RustExecutionState {
  readonly status: RustExecutionStatus;
  readonly operation: "check" | "build" | "run" | "test" | "format";
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly errorDetails: string | null;
}

export interface RustWorkspaceOutput {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number | null;
  readonly executionTimeMs: number | null;
}

export interface RustTerminalState {
  readonly lines: readonly string[];
  readonly activeTab: "output" | "terminal" | "asm";
  readonly isExpanded: boolean;
}

export interface RustWorkspace {
  readonly files: readonly RustWorkspaceFile[];
  readonly activeFile: string;
  readonly editorState: RustEditorState;
  readonly diagnostics: readonly RustDiagnostic[];
  readonly executionState: RustExecutionState;
  readonly output: RustWorkspaceOutput;
  readonly terminal: RustTerminalState;
  readonly status?: RustExecutionStatus;
  readonly lastResult?: {
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode?: number | null;
    readonly executionTimeMs?: number | null;
    readonly diagnostics?: readonly RustDiagnostic[];
  } | null;
}

export function createInitialRustWorkspace(initialSource = `fn main() {\n    println!("Hello, REEC!");\n}\n`): RustWorkspace {
  const mainFile: RustWorkspaceFile = {
    path: "src/main.rs",
    name: "main.rs",
    content: initialSource,
    language: "rust",
  };

  return {
    files: [mainFile],
    activeFile: "src/main.rs",
    status: "IDLE",
    lastResult: null,
    editorState: {
      cursorLine: 1,
      cursorColumn: 1,
      isDirty: false,
    },
    diagnostics: [],
    executionState: {
      status: "IDLE",
      operation: "run",
      startedAt: null,
      completedAt: null,
      errorDetails: null,
    },
    output: {
      stdout: "",
      stderr: "",
      exitCode: null,
      executionTimeMs: null,
    },
    terminal: {
      lines: [],
      activeTab: "output",
      isExpanded: false,
    },
  };
}

export function startRustExecution(
  workspace: RustWorkspace,
  operation: "check" | "build" | "run" | "test" | "format" = "run"
): RustWorkspace {
  return {
    ...workspace,
    status: "RUNNING",
    executionState: {
      status: "RUNNING",
      operation,
      startedAt: new Date().toISOString(),
      completedAt: null,
      errorDetails: null,
    },
    terminal: {
      ...workspace.terminal,
      lines: [...workspace.terminal.lines, `> cargo ${operation}...`],
    },
  };
}

export function resolveRustExecutionSuccess(
  workspace: RustWorkspace,
  result: {
    success?: boolean;
    stdout: string;
    stderr: string;
    exitCode?: number;
    durationMs?: number;
    executionTimeMs?: number;
    diagnostics?: readonly RustDiagnostic[];
  }
): RustWorkspace {
  const exitCode = result.exitCode ?? 0;
  const isZeroExit = exitCode === 0;
  const status: RustExecutionStatus = isZeroExit ? "SUCCESS" : "FAILED";
  const executionTimeMs = result.executionTimeMs ?? result.durationMs ?? null;

  return {
    ...workspace,
    status,
    lastResult: {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode,
      executionTimeMs,
      diagnostics: result.diagnostics || [],
    },
    diagnostics: result.diagnostics || [],
    executionState: {
      ...workspace.executionState,
      status,
      completedAt: new Date().toISOString(),
      errorDetails: isZeroExit ? null : `Process exited with code ${exitCode}`,
    },
    output: {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode,
      executionTimeMs,
    },
    terminal: {
      ...workspace.terminal,
      lines: [
        ...workspace.terminal.lines,
        result.stdout,
        result.stderr,
        `[Finished in ${executionTimeMs ?? 0}ms with exit code ${exitCode}]`,
      ].filter(Boolean),
    },
  };
}

export function resolveRustExecutionFailure(
  workspace: RustWorkspace,
  failure: {
    status?: "FAILED" | "TIMEOUT" | "NETWORK_ERROR";
    errorMessage?: string;
    success?: boolean;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    durationMs?: number;
    executionTimeMs?: number;
    diagnostics?: readonly RustDiagnostic[];
  }
): RustWorkspace {
  const status = failure.status ?? "FAILED";
  const errorMessage = failure.errorMessage || failure.stderr || "Execution failed";
  const diagnostics = failure.diagnostics || [];
  const exitCode = failure.exitCode ?? (status === "TIMEOUT" ? 124 : 1);
  const executionTimeMs = failure.durationMs ?? failure.executionTimeMs ?? null;

  return {
    ...workspace,
    status,
    lastResult: {
      stdout: failure.stdout || "",
      stderr: failure.stderr || errorMessage,
      exitCode,
      executionTimeMs,
      diagnostics,
    },
    diagnostics,
    executionState: {
      ...workspace.executionState,
      status,
      completedAt: new Date().toISOString(),
      errorDetails: errorMessage,
    },
    output: {
      stdout: failure.stdout || "",
      stderr: failure.stderr || errorMessage,
      exitCode,
      executionTimeMs,
    },
    terminal: {
      ...workspace.terminal,
      lines: [
        ...workspace.terminal.lines,
        failure.stderr || errorMessage,
        `[Execution Error (${status})]: ${errorMessage}`,
      ].filter(Boolean),
    },
  };
}
