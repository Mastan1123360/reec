/**
 * lib/content/isolate-fences.ts
 *
 * Markdown treats consecutive non-blank lines as ONE paragraph. If a lesson
 * author writes:
 *
 *   :::story
 *   When you write a program...
 *   :::
 *
 * with no blank lines, remark-parse merges all three lines into a single
 * paragraph (joined by soft breaks) — there is no separate paragraph node
 * for the ":::story" line, so remarkReecBlocks (which matches whole
 * paragraphs) never sees it as an isolated fence.
 *
 * Rather than force every author to remember blank-line discipline around
 * every fence (a common, easy-to-forget authoring mistake), we normalize
 * the raw markdown BEFORE parsing: any line that is, by itself, a
 * ":::kind[Title]" opener or a bare ":::" closer gets blank lines forced
 * around it. Fenced code blocks (``` ... ```) are tracked and left
 * completely untouched, so a literal ":::" appearing inside example code
 * is never mistaken for a directive.
 */

const OPEN_RE = /^:::([a-z-]+)(?:\[.*\])?\s*$/;
const CLOSE_RE = /^:::\s*$/;
const CODE_FENCE_RE = /^(`{3,}|~{3,})/;

export function isolateReecFences(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let inCodeFence = false;

  const prevIsBlank = () => out.length === 0 || out[out.length - 1].trim() === "";
  const ensureBlankBefore = () => {
    if (!prevIsBlank()) out.push("");
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (CODE_FENCE_RE.test(trimmed)) {
      inCodeFence = !inCodeFence;
      out.push(line);
      continue;
    }

    if (inCodeFence) {
      out.push(line);
      continue;
    }

    const isOpen = OPEN_RE.test(trimmed);
    const isClose = !isOpen && CLOSE_RE.test(trimmed);

    if (isOpen || isClose) {
      ensureBlankBefore();
      out.push(line);
      const next = lines[i + 1];
      const nextIsBlank = next === undefined || next.trim() === "";
      if (!nextIsBlank) out.push("");
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}
