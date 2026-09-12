/**
 * lib/rust/workspace-adapter.ts
 *
 * REEC Lesson → Code Workspace Source Adapter.
 *
 * Distinguishes LESSON SOURCE from WORKSPACE SOURCE:
 * - Lesson source: the pedagogical snippet authored for teaching (e.g. bare
 *   statements or borrow checking demonstrations). Never mutated for display.
 * - Workspace source: the complete, syntactically valid Rust program loaded
 *   into `src/main.rs` when the learner clicks Run / opens Code Workspace.
 *
 * This transformation:
 * 1. Inspects the AST of the snippet via the Rust syntax parser (@lezer/rust).
 * 2. If the snippet ALREADY contains a top-level `fn main()`, leaves it
 *    untouched (no double-wrapping).
 * 3. If the snippet contains statement-level constructs without `fn main()`,
 *    constructs a valid `fn main()` block containing the statements.
 * 4. Correctly partitions module-level items (`struct`, `enum`, `trait`,
 *    `impl`, `const`, `static`, `use`, helper `fn`, `macro_rules!`, `#![...]`)
 *    to remain at module scope, while statements live inside `main()`.
 * 5. NEVER alters the semantics or "fixes" intentional compiler errors
 *    (e.g., borrow-checker failures remain byte-for-byte identical in logic).
 * 6. Preserves comments, raw strings, format strings with braces, and blank lines.
 */

import { parser as rustParser } from "@lezer/rust";
import type { SyntaxNode } from "@lezer/common";

export interface LessonOriginContext {
  lessonId?: string;
  challengeId?: string;
  originalLessonSource?: string;
  generatedFromLesson?: boolean;
  executable?: boolean;
}

export interface WorkspaceAdapterResult {
  source: string;
  isWrapped: boolean;
  hasMain: boolean;
  origin?: LessonOriginContext;
}

export interface RustSnippetAnalysis {
  hasMain: boolean;
  hasStatements: boolean;
  hasModuleItems: boolean;
  innerAttributes: string[];
  moduleItems: string[];
  statements: string[];
}

const MODULE_ITEM_NODE_NAMES = new Set([
  "UseDeclaration",
  "ExternCrateDeclaration",
  "StructItem",
  "EnumItem",
  "UnionItem",
  "TraitItem",
  "ImplItem",
  "TypeItem",
  "ConstItem",
  "StaticItem",
  "ModItem",
  "ForeignModItem",
  "MacroDefinition",
]);

/**
 * Extracts the function name from a FunctionItem AST node.
 */
function getFunctionName(fnNode: SyntaxNode, code: string): string | null {
  const cursor = fnNode.cursor();
  if (cursor.firstChild()) {
    do {
      if (
        cursor.name === "BoundIdentifier" ||
        cursor.name === "Identifier" ||
        cursor.name === "Name"
      ) {
        return code.slice(cursor.from, cursor.to).trim();
      }
    } while (cursor.nextSibling());
  }
  return null;
}

/**
 * Checks if a top-level node represents an existing `fn main` function,
 * including async, pub, or decorated variants (e.g. `#[tokio::main] async fn main`).
 */
function isMainFunctionNode(node: SyntaxNode, code: string): boolean {
  if (node.name === "FunctionItem") {
    return getFunctionName(node, code) === "main";
  }

  if (node.name === "AttributeItem") {
    const cursor = node.cursor();
    if (cursor.firstChild()) {
      do {
        if (cursor.name === "FunctionItem") {
          return getFunctionName(cursor.node, code) === "main";
        }
      } while (cursor.nextSibling());
    }
  }

  return false;
}

/**
 * Checks if a node is an inner module attribute (`#![allow(...)]`).
 */
function isInnerAttributeNode(node: SyntaxNode): boolean {
  return node.name === "InnerAttribute";
}

/**
 * Checks if a top-level node belongs at module scope (outside `fn main`).
 */
function isModuleLevelItemNode(node: SyntaxNode, code: string): boolean {
  if (isInnerAttributeNode(node)) return true;
  if (MODULE_ITEM_NODE_NAMES.has(node.name)) return true;

  if (node.name === "FunctionItem") {
    // Non-main functions are helper functions at module scope
    return getFunctionName(node, code) !== "main";
  }

  if (node.name === "AttributeItem") {
    const cursor = node.cursor();
    if (cursor.firstChild()) {
      do {
        if (MODULE_ITEM_NODE_NAMES.has(cursor.name) || cursor.name === "FunctionItem") {
          return true;
        }
      } while (cursor.nextSibling());
    }
    return true;
  }

  return false;
}

/**
 * Indents non-empty lines by `spaces` count.
 */
function indentLines(codeStr: string, spaces = 4): string {
  const pad = " ".repeat(spaces);
  return codeStr
    .split("\n")
    .map((line) => (line.trim().length > 0 ? pad + line : ""))
    .join("\n");
}

/**
 * Analyzes a Rust source snippet and breaks it down into module items vs statements.
 */
export function analyzeRustSnippet(rawSnippet: string): RustSnippetAnalysis {
  const snippet = rawSnippet.trim();
  if (!snippet) {
    return {
      hasMain: false,
      hasStatements: false,
      hasModuleItems: false,
      innerAttributes: [],
      moduleItems: [],
      statements: [],
    };
  }

  let tree;
  try {
    tree = rustParser.parse(snippet);
  } catch (err) {
    // Graceful fallback on syntax parse error
    return {
      hasMain: false,
      hasStatements: true,
      hasModuleItems: false,
      innerAttributes: [],
      moduleItems: [],
      statements: [snippet],
    };
  }

  let hasMain = false;
  const topNodes: { name: string; from: number; to: number; node: SyntaxNode }[] = [];
  const cursor = tree.cursor();

  if (cursor.firstChild()) {
    do {
      const node = cursor.node;
      topNodes.push({ name: node.name, from: node.from, to: node.to, node });
      if (isMainFunctionNode(node, snippet)) {
        hasMain = true;
      }
    } while (cursor.nextSibling());
  }

  if (hasMain) {
    return {
      hasMain: true,
      hasStatements: false,
      hasModuleItems: false,
      innerAttributes: [],
      moduleItems: [],
      statements: [],
    };
  }

  type GroupKind = "inner_attr" | "item" | "statement";
  const groups: { kind: GroupKind; text: string }[] = [];

  let currentKind: GroupKind | null = null;
  let currentStart = 0;
  let currentEnd = 0;
  let pendingCommentStart: number | null = null;

  for (let i = 0; i < topNodes.length; i++) {
    const item = topNodes[i];
    const isComment = item.name === "LineComment" || item.name === "BlockComment";

    if (isComment) {
      if (pendingCommentStart === null) {
        pendingCommentStart = item.from;
      }
      continue;
    }

    let kind: GroupKind = "statement";
    if (isInnerAttributeNode(item.node)) {
      kind = "inner_attr";
    } else if (isModuleLevelItemNode(item.node, snippet)) {
      kind = "item";
    }

    const startPos = pendingCommentStart !== null ? pendingCommentStart : item.from;
    pendingCommentStart = null;

    if (currentKind === kind) {
      currentEnd = item.to;
    } else {
      if (currentKind !== null) {
        groups.push({
          kind: currentKind,
          text: snippet.slice(currentStart, currentEnd).trim(),
        });
      }
      currentKind = kind;
      currentStart = startPos;
      currentEnd = item.to;
    }
  }

  if (currentKind !== null) {
    if (pendingCommentStart !== null) {
      currentEnd = snippet.length;
    }
    groups.push({
      kind: currentKind,
      text: snippet.slice(currentStart, currentEnd).trim(),
    });
  } else if (pendingCommentStart !== null) {
    const commentText = snippet.slice(pendingCommentStart).trim();
    return {
      hasMain: false,
      hasStatements: true,
      hasModuleItems: false,
      innerAttributes: [],
      moduleItems: [],
      statements: [commentText],
    };
  }

  const innerAttributes = groups.filter((g) => g.kind === "inner_attr").map((g) => g.text);
  const moduleItems = groups.filter((g) => g.kind === "item").map((g) => g.text);
  const statements = groups.filter((g) => g.kind === "statement").map((g) => g.text);

  return {
    hasMain: false,
    hasStatements: statements.length > 0,
    hasModuleItems: moduleItems.length > 0,
    innerAttributes,
    moduleItems,
    statements,
  };
}

/**
 * Transforms a pedagogical Rust snippet into a complete, executable Rust program
 * for `src/main.rs`.
 *
 * - If the snippet already has `fn main()`, returns it unchanged.
 * - If the snippet has statements, wraps them in `fn main() { ... }`.
 * - If the snippet has module-level items, keeps them outside `fn main()`.
 * - Preserves semantics, borrow-checker errors, comments, and strings.
 */
export function transformRustSnippetToWorkspaceSource(rawSnippet: string): string {
  if (!rawSnippet || !rawSnippet.trim()) {
    return "fn main() {\n}\n";
  }

  const snippet = rawSnippet.trim();
  const analysis = analyzeRustSnippet(snippet);

  if (analysis.hasMain) {
    return rawSnippet;
  }

  const parts: string[] = [];

  if (analysis.innerAttributes.length > 0) {
    parts.push(analysis.innerAttributes.join("\n"));
  }

  if (analysis.moduleItems.length > 0) {
    parts.push(analysis.moduleItems.join("\n\n"));
  }

  if (analysis.statements.length > 0) {
    const joinedStatements = analysis.statements.join("\n\n");
    parts.push(`fn main() {\n${indentLines(joinedStatements, 4)}\n}`);
  } else {
    parts.push("fn main() {\n}");
  }

  return parts.join("\n\n") + "\n";
}

/**
 * High-level lesson snippet to workspace adapter.
 */
export function adaptLessonSnippetToWorkspace(
  rawSnippet: string,
  origin?: LessonOriginContext
): WorkspaceAdapterResult {
  const transformedSource = transformRustSnippetToWorkspaceSource(rawSnippet);
  const analysis = analyzeRustSnippet(rawSnippet);

  return {
    source: transformedSource,
    isWrapped: !analysis.hasMain,
    hasMain: analysis.hasMain,
    origin: origin
      ? {
          ...origin,
          originalLessonSource: rawSnippet,
          generatedFromLesson: true,
          executable: true,
        }
      : {
          originalLessonSource: rawSnippet,
          generatedFromLesson: true,
          executable: true,
        },
  };
}

/**
 * Determines whether a code block should be marked as executable.
 */
export function isExecutableCodeBlock(
  lang: string,
  meta?: string | null,
  explicitExecutable?: boolean
): boolean {
  if (explicitExecutable !== undefined) {
    return explicitExecutable;
  }

  const normalizedLang = lang.toLowerCase().trim();
  const isRust =
    normalizedLang === "rust" ||
    normalizedLang === "rs" ||
    normalizedLang.startsWith("rust,") ||
    normalizedLang.startsWith("rs,");

  if (!isRust) return false;

  const metaLower = (meta ?? "").toLowerCase();
  if (
    /\bexecutable\s*=\s*(false|0|no)\b/.test(metaLower) ||
    /\brun\s*=\s*(false|0|no)\b/.test(metaLower)
  ) {
    return false;
  }

  const combined = `${normalizedLang} ${metaLower}`;
  return (
    combined.includes("executable") ||
    combined.includes("runnable") ||
    combined.includes("run") ||
    combined.includes("exec")
  );
}
