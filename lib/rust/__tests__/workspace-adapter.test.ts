import { describe, it, expect } from "vitest";
import {
  transformRustSnippetToWorkspaceSource,
  analyzeRustSnippet,
  adaptLessonSnippetToWorkspace,
  isExecutableCodeBlock,
} from "../workspace-adapter";

describe("transformRustSnippetToWorkspaceSource (Unit Tests 1-13)", () => {
  it("TEST 1 — simple statements", () => {
    const input = `let x = 1;\nprintln!("{}", x);`;
    const result = transformRustSnippetToWorkspaceSource(input);

    expect(result).toBe(
      `fn main() {\n    let x = 1;\n    println!("{}", x);\n}\n`
    );
  });

  it("TEST 2 — existing main", () => {
    const input = `fn main() {\n    println!("hello");\n}`;
    const result = transformRustSnippetToWorkspaceSource(input);

    expect(result).toBe(input);
  });

  it("TEST 3 — intentional borrow-checker failure", () => {
    const input = `let mut v = vec![1, 2, 3];
let first = &v[0];
v.push(4);
println!("{}", first);`;

    const result = transformRustSnippetToWorkspaceSource(input);

    expect(result).toBe(
      `fn main() {\n    let mut v = vec![1, 2, 3];\n    let first = &v[0];\n    v.push(4);\n    println!("{}", first);\n}\n`
    );
    // Verbatim logic check: nothing is cloned or mutated or reordered
    expect(result).toContain("let first = &v[0];");
    expect(result).toContain("v.push(4);");
    expect(result).toContain('println!("{}", first);');
  });

  it("TEST 4 — struct + statements", () => {
    const input = `struct User {
    name: String,
}

let user = User {
    name: String::from("Ace"),
};

println!("{}", user.name);`;

    const result = transformRustSnippetToWorkspaceSource(input);

    expect(result).toBe(
      `struct User {\n    name: String,\n}\n\nfn main() {\n    let user = User {\n        name: String::from("Ace"),\n    };\n\n    println!("{}", user.name);\n}\n`
    );
  });

  it("TEST 5 — helper function + statements", () => {
    const input = `fn helper() {
    println!("helper");
}

let value = 10;
println!("{}", value);`;

    const result = transformRustSnippetToWorkspaceSource(input);

    expect(result).toBe(
      `fn helper() {\n    println!("helper");\n}\n\nfn main() {\n    let value = 10;\n    println!("{}", value);\n}\n`
    );
  });

  it("TEST 6 — comments", () => {
    const input = `// Initialize counter
let mut count = 0;
/* Increment count
   by one */
count += 1;
println!("{}", count);`;

    const result = transformRustSnippetToWorkspaceSource(input);

    expect(result).toContain("// Initialize counter");
    expect(result).toContain("/* Increment count");
    expect(result).toContain("by one */");
    expect(result).toContain("fn main() {");
  });

  it("TEST 7 — strings containing braces", () => {
    const input = `println!("fn main() {{ hello }}");`;
    const result = transformRustSnippetToWorkspaceSource(input);

    expect(result).toBe(`fn main() {\n    println!("fn main() {{ hello }}");\n}\n`);
  });

  it("TEST 8 — macros", () => {
    const input = `macro_rules! my_macro {
    () => {
        println!("macro");
    };
}

my_macro!();`;

    const result = transformRustSnippetToWorkspaceSource(input);

    expect(result).toBe(
      `macro_rules! my_macro {\n    () => {\n        println!("macro");\n    };\n}\n\nfn main() {\n    my_macro!();\n}\n`
    );
  });

  it("TEST 9 — existing complete program", () => {
    const input = `struct Config {
    port: u16,
}

fn main() {
    let c = Config { port: 8080 };
    println!("{}", c.port);
}`;

    const result = transformRustSnippetToWorkspaceSource(input);
    expect(result).toBe(input);
  });

  it("TEST 10 — empty executable block", () => {
    expect(transformRustSnippetToWorkspaceSource("")).toBe("fn main() {\n}\n");
    expect(transformRustSnippetToWorkspaceSource("   \n\t  \n")).toBe("fn main() {\n}\n");
  });

  it("TEST 11 — executable metadata", () => {
    expect(isExecutableCodeBlock("rust", "executable")).toBe(true);
    expect(isExecutableCodeBlock("rust", "executable=true")).toBe(true);
    expect(isExecutableCodeBlock("rust", "runnable")).toBe(true);
    expect(isExecutableCodeBlock("rust", "run")).toBe(true);
    expect(isExecutableCodeBlock("rust,executable", "")).toBe(true);
    expect(isExecutableCodeBlock("rs", "executable")).toBe(true);
  });

  it("TEST 12 — non-executable metadata", () => {
    expect(isExecutableCodeBlock("rust", "")).toBe(false);
    expect(isExecutableCodeBlock("rust", null)).toBe(false);
    expect(isExecutableCodeBlock("rust", "title=\"Example\"")).toBe(false);
    expect(isExecutableCodeBlock("rust", "executable=false")).toBe(false);
    expect(isExecutableCodeBlock("bash", "executable")).toBe(false);
  });

  it("TEST 13 — Challenge 3 exact source transformed correctly", () => {
    const challenge3Snippet = `let mut v = vec![1, 2, 3];
let first = &v[0];
let second = &v[1];
println!("{}, {}", first, second);
v.push(4);`;

    const result = transformRustSnippetToWorkspaceSource(challenge3Snippet);

    expect(result).toBe(
      `fn main() {\n    let mut v = vec![1, 2, 3];\n    let first = &v[0];\n    let second = &v[1];\n    println!("{}, {}", first, second);\n    v.push(4);\n}\n`
    );

    const adapted = adaptLessonSnippetToWorkspace(challenge3Snippet, {
      lessonId: "Phase-00/Week-01/Day-01",
      challengeId: "Phase-00-Week-01-Day-01-Challenge-03",
    });

    expect(adapted.isWrapped).toBe(true);
    expect(adapted.source).toBe(result);
    expect(adapted.origin?.lessonId).toBe("Phase-00/Week-01/Day-01");
    expect(adapted.origin?.challengeId).toBe("Phase-00-Week-01-Day-01-Challenge-03");
  });

  it("handles module-level inner attributes (#![allow(...)]) at the top", () => {
    const input = `#![allow(unused_variables)]

let x = 42;
println!("{}", x);`;

    const result = transformRustSnippetToWorkspaceSource(input);
    expect(result).toBe(
      `#![allow(unused_variables)]\n\nfn main() {\n    let x = 42;\n    println!("{}", x);\n}\n`
    );
  });

  it("handles use statements + structs + statements cleanly", () => {
    const input = `use std::collections::HashMap;

struct Cache {
    data: HashMap<String, String>,
}

let mut map = HashMap::new();
map.insert("a".into(), "b".into());
println!("{:?}", map);`;

    const result = transformRustSnippetToWorkspaceSource(input);
    expect(result).toContain("use std::collections::HashMap;");
    expect(result).toContain("struct Cache {");
    expect(result).toContain("fn main() {");
    expect(result).toContain('map.insert("a".into(), "b".into());');
  });

  it("handles async fn main or decorated main functions", () => {
    const input = `#[tokio::main]\nasync fn main() {\n    println!("async main");\n}`;
    const result = transformRustSnippetToWorkspaceSource(input);
    expect(result).toBe(input);
  });
});
