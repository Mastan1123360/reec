import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getRustBackend } from "../playground-adapter";
import { RustBackendException } from "../errors";
import type { RustExecutionRequest } from "../types";

function baseRequest(overrides: Partial<RustExecutionRequest> = {}): RustExecutionRequest {
  return {
    operation: "run",
    source: 'fn main() { println!("hi"); }',
    edition: "2021",
    channel: "stable",
    profile: "debug",
    ...overrides,
  };
}

describe("PlaygroundBackend request construction", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes 'run' to /execute with tests:false", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true, stdout: "hi\n", stderr: "" }), { status: 200 })
    );

    await getRustBackend().run(baseRequest({ operation: "run" }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/execute");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.tests).toBe(false);
  });

  it("routes 'test' to /execute with tests:true", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true, stdout: "", stderr: "" }), { status: 200 })
    );

    await getRustBackend().run(baseRequest({ operation: "test" }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/execute");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.tests).toBe(true);
  });

  it("routes 'check' to /compile with target:mir", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true, code: "", stdout: "", stderr: "" }), { status: 200 })
    );

    await getRustBackend().run(baseRequest({ operation: "check" }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/compile");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.target).toBe("mir");
  });

  it("routes 'build' to /compile with target:asm and surfaces the artifact", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true, code: "mov eax, 1", stdout: "", stderr: "" }), { status: 200 })
    );

    const result = await getRustBackend().run(baseRequest({ operation: "build" }));

    expect(result.artifact).toEqual({ kind: "asm", content: "mov eax, 1" });
  });

  it("routes 'format' to /format and populates formattedSource on success", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true, code: "fn main() {}\n", stdout: "", stderr: "" }), { status: 200 })
    );

    const result = await getRustBackend().run(baseRequest({ operation: "format" }));

    expect(result.formattedSource).toBe("fn main() {}\n");
  });

  it("parses diagnostics from stderr on a failed run", async () => {
    const stderr = `error[E0308]: mismatched types
 --> src/main.rs:1:1
  |
1 | fn main() -> i32 {}
  | ^^^^^^^^^^^^^^^^ expected \`i32\`, found \`()\`
`;
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false, stdout: "", stderr }), { status: 200 })
    );

    const result = await getRustBackend().run(baseRequest({ operation: "run" }));

    expect(result.success).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].code).toBe("E0308");
  });
});

describe("PlaygroundBackend error classification", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("classifies a non-200 upstream response as backend_error, not a crash", async () => {
    fetchMock.mockResolvedValue(new Response("Internal Server Error", { status: 500 }));

    await expect(getRustBackend().run(baseRequest())).rejects.toSatisfy((err: unknown) => {
      return err instanceof RustBackendException && err.kind === "backend_error";
    });
  });

  it("classifies HTTP 429 as rate_limit", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 429 }));

    await expect(getRustBackend().run(baseRequest())).rejects.toSatisfy((err: unknown) => {
      return err instanceof RustBackendException && err.kind === "rate_limit";
    });
  });

  it("classifies a thrown network error as network_error", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(getRustBackend().run(baseRequest())).rejects.toSatisfy((err: unknown) => {
      return err instanceof RustBackendException && err.kind === "network_error";
    });
  });

  it("preserves the verbatim upstream error body for diagnosability", async () => {
    fetchMock.mockResolvedValue(new Response('{"message":"whitelist only"}', { status: 403 }));

    try {
      await getRustBackend().run(baseRequest());
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RustBackendException);
      expect((err as RustBackendException).upstreamDetail).toContain("whitelist only");
    }
  });
});
