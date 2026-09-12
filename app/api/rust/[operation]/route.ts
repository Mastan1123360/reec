/**
 * app/api/rust/[operation]/route.ts
 *
 * The single HTTP surface for every Rust operation (check/build/run/
 * test/format) — a thin translation layer between the wire (JSON in,
 * JSON out) and the domain (RustExecutionRequest/Result). All the real
 * logic lives in lib/rust/playground-adapter.ts; this route's only job
 * is validating the incoming request shape and mapping
 * RustBackendException to the right HTTP status, so a network failure,
 * a timeout, and a malformed request are distinguishable by the client
 * without it needing to parse error text.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRustBackend } from "@/lib/rust/playground-adapter";
import { RustBackendException } from "@/lib/rust/errors";
import type { RustEdition, RustOperation, RustProfile } from "@/lib/rust/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_OPERATIONS: RustOperation[] = ["check", "build", "run", "test", "format"];
const VALID_EDITIONS: RustEdition[] = ["2015", "2018", "2021", "2024"];
const MAX_SOURCE_CHARS = 40_000;

const STATUS_BY_ERROR_KIND: Record<string, number> = {
  network_error: 502,
  timeout: 504,
  backend_error: 502,
  rate_limit: 429,
  invalid_request: 400,
  unsupported_operation: 501,
};

export async function POST(req: NextRequest, { params }: { params: { operation: string } }) {
  const operation = params.operation as RustOperation;
  if (!VALID_OPERATIONS.includes(operation)) {
    return NextResponse.json({ error: `Unknown operation: ${params.operation}` }, { status: 404 });
  }

  let body: { source?: string; edition?: string; profile?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const source = (body.source ?? "").toString();
  if (!source.trim()) {
    return NextResponse.json({ error: "No source code to compile." }, { status: 400 });
  }
  if (source.length > MAX_SOURCE_CHARS) {
    return NextResponse.json(
      { error: `Source too large (max ${MAX_SOURCE_CHARS.toLocaleString()} characters).` },
      { status: 400 }
    );
  }

  const edition: RustEdition = VALID_EDITIONS.includes(body.edition as RustEdition)
    ? (body.edition as RustEdition)
    : "2021";
  const profile: RustProfile = body.profile === "release" ? "release" : "debug";

  try {
    const backend = getRustBackend();
    const result = await backend.run({ operation, source, edition, channel: "stable", profile });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof RustBackendException) {
      return NextResponse.json(err.toJSON(), { status: STATUS_BY_ERROR_KIND[err.kind] ?? 500 });
    }
    // An unexpected exception is a REEC bug, not a classified backend
    // failure — sanitized in the response, logged in full server-side
    // for diagnosability without leaking internals to the client.
    console.error("[api/rust] unexpected error", err);
    return NextResponse.json(
      { error: "An unexpected error occurred.", kind: "unknown_error" },
      { status: 500 }
    );
  }
}
