/**
 * lib/rust/client.ts
 *
 * The single client-side entry point for talking to REEC's own
 * /api/rust/[operation] route. Both the workspace store (lib/rust/state.ts)
 * and the personal directory page (app/hello-reec/page.tsx) go through
 * this one function, so the wire protocol — request shape, response
 * shape, and the mapping of non-2xx / network failures to a classified
 * RustBackendError — lives in exactly one place.
 *
 * This module never talks to the external Rust backend directly; it only
 * ever calls REEC's own API route, which is what keeps backend details
 * and credentials out of the browser.
 */

import type {
  RustBackendError,
  RustEdition,
  RustExecutionResult,
  RustOperation,
  RustProfile,
} from "./types";

export type RustClientOutcome =
  | { ok: true; result: RustExecutionResult }
  | { ok: false; error: RustBackendError };

/** AbortError is rethrown (not converted to a backend error) so callers
 * can distinguish a user-initiated cancel from a real failure. */
export async function runRustOperation(
  operation: RustOperation,
  source: string,
  edition: RustEdition,
  profile: RustProfile,
  signal?: AbortSignal
): Promise<RustClientOutcome> {
  try {
    const res = await fetch(`/api/rust/${operation}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal,
      body: JSON.stringify({ source, edition, profile }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data as RustBackendError };
    }
    return { ok: true, result: data as RustExecutionResult };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw err;
    }
    return {
      ok: false,
      error: { kind: "network_error", message: "Couldn't reach REEC's own server. Check your connection." },
    };
  }
}
