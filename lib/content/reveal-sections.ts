/**
 * lib/content/reveal-sections.ts
 *
 * Curriculum content already uses a consistent authoring convention for
 * progressive hints and solutions — paragraphs starting with "**Hint:**",
 * "*Weakest hint:*", "**Solution:**", "**Answer:**", etc. (see the
 * original REEC Failure Lab chapters). Rather than invent a new markdown
 * syntax authors would have to learn, this transform recognizes that
 * existing convention directly: any rendered `<p>` whose text begins
 * with one of these labels gets wrapped in a native `<details>` /
 * `<summary>` pair, collapsed by default. Native `<details>` gives real
 * expand/collapse interactivity for free — no JS state, no hydration
 * mismatch risk — which is exactly proportionate to what a single
 * paragraph-level reveal needs.
 *
 * Pure string transform (server- or client-safe) operating on already-
 * rendered block HTML, applied by MiniChallenge and CompilerThinking.
 */

const LABEL_RE =
  /^<p>(?:<strong>|<em>)?\s*((?:weakest |weaker |stronger |strongest |first |second |third )?hint\s*\d?|solution(?:\s+walkthrough)?|answer)\s*[:.]?\s*(?:<\/strong>|<\/em>)?\s*/i;

export function wrapRevealSections(html: string): string {
  return html.replace(/<p>[\s\S]*?<\/p>/g, (paragraph) => {
    const match = paragraph.match(LABEL_RE);
    if (!match) return paragraph;

    const label = match[1].replace(/\s+/g, " ").trim();
    const rest = paragraph.slice(match[0].length, -"</p>".length);
    const isSolution = /solution|answer/i.test(label);

    return `<details class="reveal-section"><summary>${capitalize(label)}${
      isSolution ? "" : " — click to reveal"
    }</summary><p>${rest}</p></details>`;
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
