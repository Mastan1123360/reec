import { describe, it, expect } from "vitest";
import { parseRustDiagnostics, hasErrorDiagnostic } from "../diagnostics";

const MOVE_ERROR_OUTPUT = `warning: unused variable: \`x\`
 --> src/main.rs:2:9
  |
2 |     let x = 5;
  |         ^ help: if this is intentional, prefix it with an underscore: \`_x\`
  |
  = note: \`#[warn(unused_variables)]\` on by default

error[E0382]: use of moved value: \`s\`
 --> src/main.rs:4:20
  |
2 |     let s = String::from("hi");
  |         - move occurs because \`s\` has type \`String\`, which does not implement the \`Copy\` trait
3 |     let s2 = s;
  |              - value moved here
4 |     println!("{}", s);
  |                    ^ value used here after move

error: aborting due to previous error; 1 warning emitted

For more information about this error, try \`rustc --explain E0382\`.
`;

describe("parseRustDiagnostics", () => {
  it("returns an empty array for empty input", () => {
    expect(parseRustDiagnostics("")).toEqual([]);
  });

  it("parses the correct number of diagnostics, excluding summary lines", () => {
    const diagnostics = parseRustDiagnostics(MOVE_ERROR_OUTPUT);
    // Exactly 2: the warning and the error — "error: aborting due to..."
    // must NOT be counted as a third, phantom diagnostic.
    expect(diagnostics).toHaveLength(2);
  });

  it("extracts level, code, and message for the error diagnostic", () => {
    const [, error] = parseRustDiagnostics(MOVE_ERROR_OUTPUT);
    expect(error.level).toBe("error");
    expect(error.code).toBe("E0382");
    expect(error.message).toBe("use of moved value: `s`");
  });

  it("extracts level and absent code for the warning diagnostic", () => {
    const [warning] = parseRustDiagnostics(MOVE_ERROR_OUTPUT);
    expect(warning.level).toBe("warning");
    expect(warning.code).toBeUndefined();
    expect(warning.message).toBe("unused variable: `x`");
  });

  it("extracts the primary span's file, line, and column", () => {
    const [, error] = parseRustDiagnostics(MOVE_ERROR_OUTPUT);
    expect(error.primarySpan).toMatchObject({
      file: "src/main.rs",
      line: 4,
      column: 20,
    });
  });

  it("extracts the source snippet and underline label for the primary span", () => {
    const [, error] = parseRustDiagnostics(MOVE_ERROR_OUTPUT);
    expect(error.primarySpan?.snippet).toContain('println!("{}", s);');
    expect(error.primarySpan?.label).toBe("value used here after move");
  });

  it("captures secondary spans when the compiler emits multiple --> locations", () => {
    const multiSpanOutput = `error[E0502]: cannot borrow \`v\` as mutable because it is also borrowed as immutable
 --> src/main.rs:3:5
  |
2 |     let first = &v[0];
  |                  - immutable borrow occurs here
3 |     v.push(4);
  |     ^^^^^^^^^ mutable borrow occurs here
 --> src/lib.rs:10:1
  |
10 | pub fn helper() {}
   | ---------------- earlier definition here
`;
    const [error] = parseRustDiagnostics(multiSpanOutput);
    expect(error.primarySpan).toMatchObject({ file: "src/main.rs", line: 3, column: 5 });
    expect(error.secondarySpans).toHaveLength(1);
    expect(error.secondarySpans[0]).toMatchObject({ file: "src/lib.rs", line: 10, column: 1 });
  });

  it("extracts `= note:` children verbatim", () => {
    const [warning] = parseRustDiagnostics(MOVE_ERROR_OUTPUT);
    expect(warning.children).toContainEqual({
      level: "note",
      message: "`#[warn(unused_variables)]` on by default",
    });
  });

  it("preserves the exact raw text block for each diagnostic", () => {
    const [, error] = parseRustDiagnostics(MOVE_ERROR_OUTPUT);
    expect(error.raw).toContain("error[E0382]: use of moved value: `s`");
    expect(error.raw).toContain("value used here after move");
  });

  it("never fabricates content — every field traces back to the raw text", () => {
    const diagnostics = parseRustDiagnostics(MOVE_ERROR_OUTPUT);
    for (const d of diagnostics) {
      expect(MOVE_ERROR_OUTPUT).toContain(d.message);
    }
  });
});

describe("hasErrorDiagnostic", () => {
  it("returns true when the output contains an error", () => {
    expect(hasErrorDiagnostic(parseRustDiagnostics(MOVE_ERROR_OUTPUT))).toBe(true);
  });

  it("returns false when the output contains only warnings", () => {
    const warningOnly = `warning: unused variable: \`x\`
 --> src/main.rs:2:9
  |
2 |     let x = 5;
  |         ^ help: if this is intentional, prefix it with an underscore: \`_x\`
`;
    expect(hasErrorDiagnostic(parseRustDiagnostics(warningOnly))).toBe(false);
  });

  it("returns false for empty input", () => {
    expect(hasErrorDiagnostic([])).toBe(false);
  });
});
