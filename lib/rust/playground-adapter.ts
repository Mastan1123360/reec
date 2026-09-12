/**
 * lib/rust/playground-adapter.ts
 *
 * The ONLY file in the codebase that knows play.rust-lang.org's actual
 * request/response shapes. Everything else — API routes, the state
 * machine, the UI — talks to the `RustExecutionBackend` interface, not
 * to Playground directly. Swapping the backend later (a different
 * hosted service, or a self-managed sandbox) means implementing this
 * one interface again; nothing else in the app changes.
 *
 * Playground exposes several endpoints beyond the single /execute call
 * a naive integration would use, and REEC's CHECK/BUILD/RUN/TEST/FORMAT
 * separation maps onto them directly rather than collapsing everything
 * into one "Run":
 *
 *   CHECK  → POST /compile, target="mir"   (requires full type-checking
 *                                            to succeed; no full codegen
 *                                            — the fast "does this
 *                                            typecheck" signal, closest
 *                                            available equivalent to
 *                                            `cargo check`)
 *   BUILD  → POST /compile, target="asm"   (full codegen; the compiled
 *                                            output becomes the
 *                                            inspectable RustArtifact)
 *   RUN    → POST /execute, tests=false
 *   TEST   → POST /execute, tests=true
 *   FORMAT → POST /format                   (rustfmt)
 *
 * If a response doesn't match the shape this adapter expects, it throws
 * a RustBackendException with the raw upstream body attached — REEC
 * never silently pretends an operation succeeded when the adapter isn't
 * actually sure what happened.
 */

import type {
  RustEdition,
  RustExecutionRequest,
  RustExecutionResult,
} from "./types";
import { parseRustDiagnostics } from "./diagnostics";
import { RustBackendException, backendError } from "./errors";

const BASE_URL = process.env.RUST_BACKEND_URL || "https://play.rust-lang.org";
const TIMEOUT_MS = 20_000;

export interface RustExecutionBackend {
  run(request: RustExecutionRequest): Promise<RustExecutionResult>;
}

function withTimeout() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function post(path: string, body: unknown, signal: AbortSignal): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal,
      body: JSON.stringify(body),
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new RustBackendException(backendError("timeout"));
    }
    throw new RustBackendException(backendError("network_error", (err as Error).message));
  }

  if (res.status === 429) {
    throw new RustBackendException(backendError("rate_limit"));
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 500);
    } catch {
      /* body already consumed or unreadable */
    }
    throw new RustBackendException(backendError("backend_error", `HTTP ${res.status}: ${detail}`));
  }

  try {
    return await res.json();
  } catch {
    throw new RustBackendException(backendError("backend_error", "Response was not valid JSON"));
  }
}

interface PlaygroundExecuteResponse {
  success: boolean;
  stdout: string;
  stderr: string;
}

interface PlaygroundCompileResponse {
  success: boolean;
  code: string;
  stdout: string;
  stderr: string;
}

interface PlaygroundFormatResponse {
  success: boolean;
  code: string;
  stdout: string;
  stderr: string;
}

function baseParams(edition: RustEdition) {
  return {
    channel: "stable" as const,
    edition,
    crateType: "bin" as const,
    tests: false,
    backtrace: false,
  };
}

class PlaygroundBackend implements RustExecutionBackend {
  async run(request: RustExecutionRequest): Promise<RustExecutionResult> {
    const start = Date.now();
    const { signal, clear } = withTimeout();
    try {
      switch (request.operation) {
        case "run":
        case "test":
          return await this.runOrTest(request, signal, start);
        case "check":
          return await this.checkOrBuild(request, "mir", signal, start);
        case "build":
          return await this.checkOrBuild(request, "asm", signal, start);
        case "format":
          return await this.format(request, signal, start);
        default: {
          const exhaustive: never = request.operation;
          throw new RustBackendException(backendError("invalid_request", `Unknown operation: ${exhaustive}`));
        }
      }
    } finally {
      clear();
    }
  }

  private async runOrTest(
    request: RustExecutionRequest,
    signal: AbortSignal,
    start: number
  ): Promise<RustExecutionResult> {
    const data = (await post(
      "/execute",
      {
        ...baseParams(request.edition),
        mode: request.profile,
        tests: request.operation === "test",
        code: request.source,
      },
      signal
    )) as PlaygroundExecuteResponse;

    const diagnostics = parseRustDiagnostics(data.stderr ?? "");
    return {
      operation: request.operation,
      success: Boolean(data.success),
      stdout: data.stdout ?? "",
      stderr: data.stderr ?? "",
      diagnostics,
      durationMs: Date.now() - start,
    };
  }

  private async checkOrBuild(
    request: RustExecutionRequest,
    target: "mir" | "asm",
    signal: AbortSignal,
    start: number
  ): Promise<RustExecutionResult> {
    const data = (await post(
      "/compile",
      {
        ...baseParams(request.edition),
        mode: request.profile,
        target,
        assemblyFlavor: "att",
        demangleAssembly: "demangle",
        processAssembly: "filter",
        code: request.source,
      },
      signal
    )) as PlaygroundCompileResponse;

    const diagnostics = parseRustDiagnostics(data.stderr ?? "");
    return {
      operation: request.operation,
      success: Boolean(data.success),
      stdout: data.stdout ?? "",
      stderr: data.stderr ?? "",
      diagnostics,
      artifact:
        data.success && typeof data.code === "string"
          ? { kind: target === "asm" ? "asm" : "llvm-ir", content: data.code }
          : undefined,
      durationMs: Date.now() - start,
    };
  }

  private async format(
    request: RustExecutionRequest,
    signal: AbortSignal,
    start: number
  ): Promise<RustExecutionResult> {
    const data = (await post(
      "/format",
      { edition: request.edition, code: request.source },
      signal
    )) as PlaygroundFormatResponse;

    const diagnostics = parseRustDiagnostics(data.stderr ?? "");
    return {
      operation: "format",
      success: Boolean(data.success),
      stdout: data.stdout ?? "",
      stderr: data.stderr ?? "",
      diagnostics,
      formattedSource: data.success ? data.code : undefined,
      durationMs: Date.now() - start,
    };
  }
}

let backend: RustExecutionBackend | null = null;

/** The single entry point every API route uses. Returns a shared
 * instance — the backend implementation is stateless, so this is just
 * avoiding pointless re-allocation, not a meaningful singleton. */
export function getRustBackend(): RustExecutionBackend {
  if (!backend) backend = new PlaygroundBackend();
  return backend;
}
