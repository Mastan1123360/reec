/**
 * lib/rust/diagnostics.ts
 *
 * rustc's stable, human-readable diagnostic format has looked like this
 * for years and is extensively documented — this parser extracts
 * structure from it (level, error code, message, file/line/column,
 * source snippet, the underline label, and any `= note:`/`= help:`
 * children) without ever inventing or rewriting what rustc actually
 * said. `RustDiagnostic.raw` always retains the exact original text
 * block, so even where structured extraction is partial, nothing is
 * lost — the UI can always fall back to showing rustc's own words
 * verbatim, per the product requirement that the compiler stays
 * authoritative.
 *
 * Example input this parses:
 *
 *   error[E0382]: use of moved value: `s`
 *    --> src/main.rs:4:20
 *     |
 *   3 |     let s2 = s;
 *     |              - value moved here
 *   4 |     println!("{}", s);
 *     |                    ^ value used here after move
 *     |
 *     = note: move occurs because `s` has type `String`
 */

import type { DiagnosticLevel, RustDiagnostic, SourceSpan } from "./types";

const HEADER_RE = /^(error|warning)(\[([A-Za-z0-9]+)\])?:\s*(.*)$/;
const LOCATION_RE = /^\s*-->\s*(.+):(\d+):(\d+)\s*$/;
const CHILD_RE = /^\s*=\s*(note|help)(\[[^\]]*\])?:\s*(.*)$/;
const SOURCE_LINE_RE = /^\s*\d+\s*\|\s?(.*)$/;
const UNDERLINE_RE = /^\s*\|\s*[\^\-]+\s*(.*)$/;

/** Summary lines rustc prints at the end of a compile ("error: aborting
 * due to 2 previous errors", "For more information about this error,
 * try...") look like a top-level diagnostic header but carry no
 * location — excluded so they don't show up as a phantom, span-less
 * "error" in the diagnostics list. The raw text is still preserved in
 * the overall stderr output, just not double-represented as a card. */
function isSummaryLine(message: string): boolean {
  return /aborting due to|warnings? emitted|generated \d+ warnings?|for more information about this error/i.test(
    message
  );
}

export function parseRustDiagnostics(stderr: string): RustDiagnostic[] {
  if (!stderr) return [];

  const lines = stderr.split("\n");
  const diagnostics: RustDiagnostic[] = [];

  let i = 0;
  let counter = 0;

  while (i < lines.length) {
    const headerMatch = lines[i].match(HEADER_RE);

    if (!headerMatch) {
      i++;
      continue;
    }

    const [, levelWord, , code, message] = headerMatch;
    const level = levelWord as DiagnosticLevel;

    if (isSummaryLine(message)) {
      i++;
      continue;
    }

    const blockStart = i;
    i++;

    const spans: SourceSpan[] = [];
    const children: { level: DiagnosticLevel; message: string }[] = [];
    let pendingSnippet: string | undefined;

    // Consume lines belonging to this diagnostic until the next
    // top-level header or a blank line followed by another header.
    while (i < lines.length && !HEADER_RE.test(lines[i])) {
      const line = lines[i];

      const locMatch = line.match(LOCATION_RE);
      if (locMatch) {
        spans.push({
          file: locMatch[1],
          line: Number(locMatch[2]),
          column: Number(locMatch[3]),
        });
        i++;
        continue;
      }

      const sourceMatch = line.match(SOURCE_LINE_RE);
      if (sourceMatch && spans.length > 0) {
        pendingSnippet = sourceMatch[1];
        i++;
        continue;
      }

      const underlineMatch = line.match(UNDERLINE_RE);
      if (underlineMatch && spans.length > 0) {
        const target = spans[spans.length - 1];
        target.snippet = pendingSnippet;
        target.label = underlineMatch[1].trim() || undefined;
        i++;
        continue;
      }

      const childMatch = line.match(CHILD_RE);
      if (childMatch) {
        children.push({
          level: childMatch[1] as DiagnosticLevel,
          message: childMatch[3].trim(),
        });
        i++;
        continue;
      }

      i++;
    }

    const raw = lines.slice(blockStart, i).join("\n");
    counter += 1;

    diagnostics.push({
      id: `diag-${counter}`,
      level,
      code: code || undefined,
      message: message.trim(),
      primarySpan: spans[0],
      secondarySpans: spans.slice(1),
      children,
      raw,
    });
  }

  return diagnostics;
}

/** True if any parsed diagnostic is an error (as opposed to only
 * warnings) — used to decide whether a compile genuinely failed versus
 * succeeded-with-warnings. */
export function hasErrorDiagnostic(diagnostics: RustDiagnostic[]): boolean {
  return diagnostics.some((d) => d.level === "error");
}
