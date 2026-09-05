/**
 * lib/rust/errors.ts
 *
 * "Your Rust code failed" and "REEC couldn't reach the compiler" are
 * fundamentally different failures, and the product requires the user
 * always be able to tell which one happened. A compile/run that
 * completes with `success: false` and real diagnostics is the FIRST
 * kind — that's not an error from REEC's point of view, it's the
 * compiler doing its job. Everything in this file is the SECOND kind:
 * REEC itself failed to get an answer at all.
 */

import type { RustBackendError, RustBackendErrorKind } from "./types";

export class RustBackendException extends Error {
  readonly kind: RustBackendErrorKind;
  readonly upstreamDetail?: string;

  constructor(error: RustBackendError) {
    super(error.message);
    this.name = "RustBackendException";
    this.kind = error.kind;
    this.upstreamDetail = error.upstreamDetail;
  }

  toJSON(): RustBackendError {
    return { kind: this.kind, message: this.message, upstreamDetail: this.upstreamDetail };
  }
}

const FRIENDLY_MESSAGE: Record<RustBackendErrorKind, string> = {
  network_error: "Couldn't reach the Rust compiler service. Check your connection and try again.",
  timeout: "The compiler didn't respond in time. Your code may be too slow, or the service may be under load.",
  backend_error: "The Rust compiler service returned an unexpected response.",
  rate_limit: "You're sending requests faster than the compiler service allows — wait a moment and try again.",
  invalid_request: "That request couldn't be sent to the compiler — this is a REEC bug, not your code.",
  unsupported_operation: "This operation isn't available from the current backend.",
};

export function backendError(kind: RustBackendErrorKind, upstreamDetail?: string): RustBackendError {
  return { kind, message: FRIENDLY_MESSAGE[kind], upstreamDetail };
}
