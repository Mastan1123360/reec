/**
 * lib/content/rehype-shiki.ts
 *
 * A small rehype plugin that finds `<pre><code class="language-x">` nodes
 * produced by remark-rehype and replaces them with Shiki-highlighted HTML,
 * parsed back into hast nodes via rehype-raw's html-in-tree convention
 * (we mark the replacement node's `type: "raw"` and let rehype-raw, which
 * already runs later in the pipeline, parse it — this keeps the plugin
 * dependency-light and avoids pulling in a second HTML parser here).
 *
 * Shiki's highlighter is created once and cached (module-level), since
 * loading a theme/grammar per code block would be needlessly slow across
 * a whole curriculum's worth of lessons.
 */

import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";
import { toString as hastToString } from "hast-util-to-string";
import { getHighlighter, type Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

function getSharedHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = getHighlighter({
      themes: ["github-dark", "github-light"],
      langs: [
        "rust", "toml", "bash", "sql", "yaml", "json", "c", "dockerfile",
        "typescript", "javascript", "python", "diff", "markdown", "text",
      ],
    });
  }
  return highlighterPromise;
}

function languageFromClassName(className: unknown): string {
  if (!Array.isArray(className)) return "text";
  const cls = className.find((c) => typeof c === "string" && c.startsWith("language-"));
  if (typeof cls !== "string") return "text";
  return cls.replace("language-", "") || "text";
}

export function rehypeShiki() {
  return async (tree: Root) => {
    const highlighter = await getSharedHighlighter();
    const targets: Element[] = [];

    visit(tree, "element", (node: Element) => {
      if (node.tagName === "pre" && node.children[0] && (node.children[0] as Element).tagName === "code") {
        targets.push(node);
      }
    });

    for (const pre of targets) {
      const code = pre.children[0] as Element;
      const lang = languageFromClassName(code.properties?.className);
      const source = hastToString(code);
      let html: string;
      try {
        html = highlighter.codeToHtml(source, {
          lang: highlighter.getLoadedLanguages().includes(lang as any) ? lang : "text",
          themes: { light: "github-light", dark: "github-dark" },
          defaultColor: false,
        });
      } catch {
        continue; // leave the original <pre><code> untouched on any highlighting error
      }
      // Replace the pre node in-place with a raw HTML node; rehype-raw
      // (already in the pipeline) parses `type: "raw"` nodes into hast.
      (pre as unknown as { type: string; value: string }).type = "raw";
      (pre as unknown as { value: string }).value = html;
      (pre as unknown as { children?: unknown }).children = undefined;
      (pre as unknown as { tagName?: unknown }).tagName = undefined;
    }
  };
}
