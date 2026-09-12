/**
 * lib/content/remark-reec-blocks.ts
 *
 * A remark plugin that recognizes fenced ":::" directive blocks:
 *
 *   :::mental-model[Ownership]
 *   > "Every value has exactly one owner..."
 *   :::
 *
 * These are REEC's semantic teaching blocks. This plugin never treats them
 * as raw HTML — it walks the markdown AST, finds paragraph-level lines that
 * open/close a ":::kind[Title]" fence, and re-parents everything between
 * them into a custom `reecBlock` mdast node carrying:
 *   - kind:  the block type (maps 1:1 to a widget in the registry)
 *   - title: optional bracketed label
 *   - children: the original mdast children, untouched, so any nested
 *     markdown (code fences, lists, blockquotes) still renders normally.
 *
 * Because this operates on the AST (not a regex-over-HTML pass), nested
 * markdown inside a block — including further code blocks — parses
 * correctly and blocks can never "leak" into surrounding HTML.
 */

import type { Root, Content, Paragraph } from "mdast";
import { visit } from "unist-util-visit";
import { toString as mdastToString } from "mdast-util-to-string";

export const REEC_BLOCK_KINDS = [
  "story",
  "mental-model",
  "engineering-note",
  "production-note",
  "historical-context",
  "worked-example",
  "compiler-thinking",
  "mini-challenge",
  "reflection",
  "project",
  "reading",
] as const;

export type ReecBlockKind = (typeof REEC_BLOCK_KINDS)[number];

const OPEN_RE = /^:::([a-z-]+)(?:\[(.*)\])?\s*$/;
const CLOSE_RE = /^:::\s*$/;

interface ReecBlockNode {
  type: "reecBlock";
  kind: string;
  title?: string;
  children: Content[];
  data: {
    hName: "div";
    hProperties: { "data-reec-block": string; "data-reec-title"?: string };
  };
}

/** Extracts the paragraph's plain-text content regardless of inline
 * formatting (inline code, emphasis, etc. all collapse to their text). A
 * fence line like `:::compiler-thinking[Where does \`x\` live?]` parses
 * into multiple mdast children (text + inlineCode + text) — we still need
 * to recognize it as a fence, so we flatten via mdast-util-to-string
 * rather than requiring a single bare text node. */
function paragraphText(node: Content): string | null {
  if (node.type !== "paragraph") return null;
  return mdastToString(node as Paragraph).trim();
}

export function remarkReecBlocks() {
  return (tree: Root) => {
    // We only need to transform direct children of the root — REEC blocks
    // are a document-level construct, not something nested inside lists,
    // by design (keeps the authoring format unambiguous).
    const out: Content[] = [];
    let cursor = 0;
    const children = tree.children as Content[];

    while (cursor < children.length) {
      const node = children[cursor];
      const text = paragraphText(node);
      const openMatch = text ? OPEN_RE.exec(text) : null;

      if (!openMatch) {
        out.push(node);
        cursor++;
        continue;
      }

      const kind = openMatch[1];
      if (kind === "hidden-lesson") {
        // hidden-lesson is a document-level content boundary extracted before remark,
        // and must never be treated as a widget block.
        out.push(node);
        cursor++;
        continue;
      }
      const title = openMatch[2];
      const inner: Content[] = [];
      let j = cursor + 1;
      let closed = false;

      while (j < children.length) {
        const innerText = paragraphText(children[j]);
        if (innerText && CLOSE_RE.test(innerText)) {
          closed = true;
          break;
        }
        inner.push(children[j]);
        j++;
      }

      if (!closed) {
        // Unterminated block — degrade gracefully, emit as-is rather than
        // silently swallowing the rest of the document.
        out.push(node);
        cursor++;
        continue;
      }

      const blockNode: ReecBlockNode = {
        type: "reecBlock",
        kind,
        title,
        children: inner,
        data: {
          hName: "div",
          hProperties: {
            "data-reec-block": kind,
            ...(title ? { "data-reec-title": title } : {}),
          },
        },
      };

      // @ts-expect-error — reecBlock is a custom mdast node type
      out.push(blockNode);
      cursor = j + 1;
    }

    tree.children = out as Root["children"];

    // Also normalize any reecBlock nodes' hChildren so rehype knows to
    // recurse into them (handled automatically since children are real
    // mdast nodes and mdast-util-to-hast processes children by default).
    visit(tree, "reecBlock", () => {
      /* no-op: presence confirms transform ran; kept for future hooks */
    });
  };
}
