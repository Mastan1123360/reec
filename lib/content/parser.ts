/**
 * lib/content/parser.ts
 *
 * The Lesson Parser.
 *
 *   raw markdown file  --->  Lesson object
 *
 * Pipeline:
 *   1. gray-matter splits front matter from body, we validate/normalize it.
 *   2. remark-parse builds an mdast tree from the body.
 *   3. remarkReecBlocks walks the tree and re-parents ":::kind[...] ... :::"
 *      spans into `reecBlock` nodes.
 *   4. remark-rehype + rehype-raw + rehype-slug + rehype-stringify render
 *      the tree to HTML per top-level heading section, so the Lesson
 *      Viewer can interleave prose and widgets in document order without
 *      re-parsing markdown on the client.
 *
 * This module is server-only (uses gray-matter + node fs indirectly via
 * discover.ts) and is deliberately synchronous-friendly: `unified` runs
 * are async, so `parseLesson` is async and is always called from server
 * components / route handlers, never client components.
 */

import crypto from "crypto";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { rehypeShiki } from "./rehype-shiki";
import { toString as mdastToString } from "mdast-util-to-string";
import type { Root, Content, Heading } from "mdast";

import { remarkReecBlocks, REEC_BLOCK_KINDS } from "./remark-reec-blocks";
import { isolateReecFences } from "./isolate-fences";
import type {
  Lesson,
  LessonFrontmatter,
  LessonFrontmatterInput,
  LessonSection,
  ReecBlock,
  CodeNode,
  WidgetRef,
  HiddenLessonTrigger,
} from "./types";

const WORDS_PER_MINUTE = 220;

/** Normalizes raw YAML front matter into the fully-defaulted contract. */
/** YAML has a well-known gotcha: a list item containing an unquoted
 * colon — e.g. `- Explain: why this matters` — parses as a one-key
 * object (`{ Explain: "why this matters" }`), not a plain string. If
 * that object is later handed straight to React as a child, React
 * throws "Objects are not valid as a React child." Rather than crash
 * the whole lesson page over an authoring mistake in one list item, we
 * coerce every entry defensively: strings pass through unchanged;
 * single-key objects get flattened back into readable "Key: value"
 * text (recovering the author's actual intent); anything else falls
 * back to String(item) rather than ever reaching a renderer as a raw
 * object. */
function toStringArray(value: unknown): string[] {
  if (value == null) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .map((item): string => {
      if (typeof item === "string") return item;
      if (typeof item === "number" || typeof item === "boolean") return String(item);
      if (item && typeof item === "object") {
        const entries = Object.entries(item as Record<string, unknown>);
        if (entries.length === 0) return "";
        const [key, val] = entries[0];
        return val !== undefined && val !== null && val !== ""
          ? `${key}: ${val}`
          : String(key);
      }
      return "";
    })
    .map((s) => s.trim())
    .filter(Boolean);
}

const DIFFICULTY_WORD_MAP: Record<string, 1 | 2 | 3 | 4 | 5> = {
  beginner: 1,
  easy: 1,
  novice: 1,
  intermediate: 3,
  medium: 3,
  moderate: 3,
  advanced: 4,
  hard: 4,
  expert: 5,
  master: 5,
};

/** Accepts 1–5, a numeric string, or common difficulty words
 * ("Beginner", "Advanced", ...) — real-world lesson front matter mixes
 * all three, and a mismatch here shouldn't be a hard failure. */
function toDifficulty(value: unknown): 1 | 2 | 3 | 4 | 5 {
  if (typeof value === "number" && value >= 1 && value <= 5) {
    return Math.round(value) as 1 | 2 | 3 | 4 | 5;
  }
  if (typeof value === "string") {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && asNumber >= 1 && asNumber <= 5) {
      return Math.round(asNumber) as 1 | 2 | 3 | 4 | 5;
    }
    const mapped = DIFFICULTY_WORD_MAP[value.trim().toLowerCase()];
    if (mapped) return mapped;
  }
  return 1;
}

/** estimated_time is documented as a string ("90 min") but authors
 * routinely write a bare number in YAML (`estimated_time: 75`), which
 * parses as a JS number, not a string — normalize both into the string
 * shape the rest of the app expects. */
function toEstimatedTimeString(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return `${value} min`;
  return String(value);
}

function toWidgets(value: unknown): WidgetRef[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((item) => {
    if (typeof item === "string") {
      return { type: item };
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      return {
        type: String(obj.type || obj.name || "unknown"),
        props: (obj.props as Record<string, unknown>) ?? undefined,
      };
    }
    return { type: String(item) };
  });
}

function toReadingRefs(value: unknown): any[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((item) => {
    if (typeof item === "string") {
      return { title: item };
    }
    return item;
  });
}

function normalizeTrigger(trigger: unknown): HiddenLessonTrigger | null {
  if (!trigger || typeof trigger !== "object") return null;
  const t = trigger as Record<string, unknown>;
  const type = String(t.type || "code_execution");
  const lessonId = t.lesson_id ? String(t.lesson_id) : t.lessonId ? String(t.lessonId) : undefined;
  const challengeId = t.challenge_id ? String(t.challenge_id) : t.challengeId ? String(t.challengeId) : undefined;
  const blockId = t.executable_block_id
    ? String(t.executable_block_id)
    : t.block_id
    ? String(t.block_id)
    : t.blockId
    ? String(t.blockId)
    : t.executableBlockId
    ? String(t.executableBlockId)
    : undefined;
  const executionRequirement = (
    t.requirement || t.execution_requirement || t.executionRequirement
      ? String(t.requirement || t.execution_requirement || t.executionRequirement)
      : undefined
  ) as "execution_attempt" | "successful_run" | undefined;

  return {
    type,
    lessonId,
    challengeId,
    blockId,
    executionRequirement,
  };
}

export function normalizeFrontmatter(
  raw: Partial<LessonFrontmatterInput> & Record<string, any>,
  sourceSlug?: string[]
): LessonFrontmatter {
  let id = typeof raw.id === "string" ? raw.id.trim() : "";
  if (!id) {
    const slugKey = sourceSlug && sourceSlug.length > 0 ? sourceSlug.join("-").toLowerCase() : "root";
    id = `malformed-anonymous-${slugKey}`;
    if (process.env.DEBUG_PARSER) {
      console.warn(
        `[REEC Parser] Lesson at [${sourceSlug ? sourceSlug.join("/") : "unknown"}] is missing frontmatter "id". Assigned deterministic diagnostic identity: "${id}".`
      );
    }
  }
  
  const hiddenVal = raw.hidden as any;
  const isHiddenLesson = Boolean(
    hiddenVal === true ||
    (hiddenVal && typeof hiddenVal === "object" && hiddenVal.enabled === true) ||
    raw.type === "hidden-lesson"
  );

  const phase = raw.phase !== undefined ? raw.phase : 0;
  const title = raw.title || (sourceSlug && sourceSlug.length > 0 ? `Untitled (${sourceSlug.join("/")})` : "Untitled Lesson");

  const normalizedTrigger = normalizeTrigger(raw.trigger);

  // Validate Hidden Lesson diagnostics if enabled
  if (isHiddenLesson && !normalizedTrigger && process.env.DEBUG_PARSER) {
    console.warn(`[REEC Warning] Hidden lesson "${id}" does not declare an execution trigger.`);
  }

  return {
    id,
    phase,
    week: raw.week ?? null,
    day: raw.day ?? null,
    title,
    subtitle: raw.subtitle ?? null,
    description: raw.description ?? null,
    category: raw.category ?? null,
    difficulty: toDifficulty(raw.difficulty),
    estimated_time: toEstimatedTimeString(raw.estimated_time),
    learning_objectives: toStringArray(raw.learning_objectives),
    prerequisites: toStringArray(raw.prerequisites),
    widgets: toWidgets(raw.widgets),
    project: raw.project
      ? Array.isArray(raw.project)
        ? { id: "p0", name: String(raw.project[0]), difficulty: 1 }
        : raw.project
      : null,
    failure_lab: raw.failure_lab ?? null,
    tags: toStringArray(raw.tags),
    key_terms: toStringArray(raw.key_terms),
    reading: toReadingRefs(raw.reading),
    next: raw.next ?? null,
    previous: raw.previous ?? null,
    published: raw.published ?? true,
    hidden: isHiddenLesson,
    badge: raw.badge ?? (id.startsWith("HL-") ? id.split("-").pop() || "HL" : null),
    slug: raw.slug ?? (id.startsWith("HL-") ? (id.split("-").pop()?.toLowerCase() || id.toLowerCase()) : null),
    trigger: normalizedTrigger,
    hidden_lessons: Array.isArray(raw.hidden_lessons) ? raw.hidden_lessons : undefined,
  };
}

export interface ExtractedHiddenBlock {
  id: string;
  body: string;
}

/**
 * Extracts all :::hidden-lesson containers from the raw markdown content before
 * the document is handed to the remark parser.
 *
 * Guarantees:
 * 1. The returned normalContent contains ZERO lines from any :::hidden-lesson container.
 * 2. Nested REEC blocks inside :::hidden-lesson (:::mental-model, :::story, etc.)
 *    are preserved completely within the extracted hidden block body.
 * 3. The normal lesson AST will NEVER contain "hidden-lesson" nodes, IDs, or unregistered widgets.
 */
export function extractHiddenLessonBlocks(rawContent: string): {
  normalContent: string;
  hiddenBlocks: ExtractedHiddenBlock[];
} {
  const lines = rawContent.split("\n");
  const normalLines: string[] = [];
  const hiddenBlocks: ExtractedHiddenBlock[] = [];

  let inHiddenLesson = false;
  let currentId = "";
  let currentHiddenLines: string[] = [];
  let innerDirectiveDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!inHiddenLesson) {
      // Check for opening :::hidden-lesson
      const openMatch = /^:::hidden-lesson(?:\s+(?:id=)?["']?([A-Za-z0-9_-]+)["']?|\[([A-Za-z0-9_-]+)\])?\s*$/i.exec(trimmed);
      if (openMatch) {
        inHiddenLesson = true;
        currentId = openMatch[1] || openMatch[2] || "";
        currentHiddenLines = [];
        innerDirectiveDepth = 0;
        continue;
      }
      normalLines.push(line);
    } else {
      // Inside a hidden lesson container
      
      // If we don't have an ID yet, check if this line declares the ID
      if (!currentId) {
        const idLineMatch = /^\s*id\s*[:=]\s*["']?([A-Za-z0-9_-]+)["']?\s*$/i.exec(trimmed);
        if (idLineMatch) {
          currentId = idLineMatch[1];
          continue; // Omit the standalone id declaration line from the hidden lesson body
        }
      }

      // Check if this line is another :::hidden-lesson start (idempotent boundary)
      const anotherHiddenMatch = /^:::hidden-lesson(?:\s+(?:id=)?["']?([A-Za-z0-9_-]+)["']?|\[([A-Za-z0-9_-]+)\])?\s*$/i.exec(trimmed);
      if (anotherHiddenMatch) {
        if (currentId || currentHiddenLines.length > 0) {
          hiddenBlocks.push({ id: currentId, body: currentHiddenLines.join("\n").trim() });
        }
        currentId = anotherHiddenMatch[1] || anotherHiddenMatch[2] || "";
        currentHiddenLines = [];
        innerDirectiveDepth = 0;
        continue;
      }

      // Check if this line opens a nested REEC block like :::mental-model, :::story, :::compiler-thinking, etc.
      const nestedOpenMatch = /^:::([a-z-]+)(?:\[(.*)\])?\s*$/i.exec(trimmed);
      if (nestedOpenMatch && nestedOpenMatch[1].toLowerCase() !== "hidden-lesson") {
        innerDirectiveDepth++;
        currentHiddenLines.push(line);
        continue;
      }

      // Check if this line is a closing :::
      if (/^:::\s*$/.test(trimmed)) {
        if (innerDirectiveDepth > 0) {
          innerDirectiveDepth--;
          currentHiddenLines.push(line);
          continue;
        } else {
          // This closes the outer :::hidden-lesson container!
          hiddenBlocks.push({ id: currentId, body: currentHiddenLines.join("\n").trim() });
          inHiddenLesson = false;
          currentId = "";
          currentHiddenLines = [];
          innerDirectiveDepth = 0;
          continue;
        }
      }

      currentHiddenLines.push(line);
    }
  }

  if (inHiddenLesson && (currentId || currentHiddenLines.length > 0)) {
    hiddenBlocks.push({ id: currentId, body: currentHiddenLines.join("\n").trim() });
  }

  // Clean trailing separator lines or whitespace from normalLines
  let normalContent = normalLines.join("\n");
  normalContent = normalContent.replace(/(\n\s*---\s*)+\s*$/, "\n").trim();

  return { normalContent, hiddenBlocks };
}

async function renderNodesToHtml(nodes: Content[]): Promise<string> {
  if (nodes.length === 0) return "";
  const root: Root = { type: "root", children: nodes };
  const processor = unified()
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeShiki)
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeStringify, { allowDangerousHtml: true });
  const hast = await processor.run(root);
  return String(processor.stringify(hast as any));
}

function parseCodeFenceMeta(
  rawLang?: string | null,
  rawMeta?: string | null,
  sectionContext?: { heading?: string; lessonId?: string }
) {
  const metaStr = (rawMeta ?? "").trim();
  let langStr = (rawLang ?? "text").trim();
  
  let explicitExecutable: boolean | null = null;
  let challengeId: string | undefined;
  let blockId: string | undefined;
  let triggerId: string | undefined;

  // Check if lang has flags e.g. "rust,executable" or "rust executable"
  if (langStr.includes(",")) {
    const parts = langStr.split(",").map((p) => p.trim());
    langStr = parts[0];
    if (parts.slice(1).some((p) => ["executable", "runnable", "run", "exec"].includes(p.toLowerCase()))) {
      explicitExecutable = true;
    }
  } else if (langStr.includes(" ")) {
    const parts = langStr.split(/\s+/).map((p) => p.trim());
    langStr = parts[0];
    if (parts.slice(1).some((p) => ["executable", "runnable", "run", "exec"].includes(p.toLowerCase()))) {
      explicitExecutable = true;
    }
  }

  // Check meta string e.g. "executable", "executable=true", "executable=false", "challenge=challenge-3", "id=challenge-3-executable", "trigger=..."
  if (metaStr) {
    if (
      /\bexecutable\s*=\s*(false|0|no)\b/i.test(metaStr) ||
      /\brun\s*=\s*(false|0|no)\b/i.test(metaStr)
    ) {
      explicitExecutable = false;
    } else if (/\b(executable|runnable|run|exec)\b/i.test(metaStr)) {
      explicitExecutable = true;
    }
    const challengeMatch =
      /challenge=(?:"([^"]+)"|'([^']+)'|(\S+))/i.exec(metaStr);
    if (challengeMatch) {
      challengeId = challengeMatch[1] || challengeMatch[2] || challengeMatch[3];
      if (explicitExecutable === null) explicitExecutable = true;
    }

    const blockIdMatch =
      /\b(?:blockId|id)=(?:"([^"]+)"|'([^']+)'|(\S+))/i.exec(metaStr);
    if (blockIdMatch) {
      blockId = blockIdMatch[1] || blockIdMatch[2] || blockIdMatch[3];
    }

    const triggerMatch =
      /\b(?:trigger|hiddenLessonTrigger|hidden-lesson-trigger)=(?:"([^"]+)"|'([^']+)'|(\S+))/i.exec(metaStr);
    if (triggerMatch) {
      triggerId = triggerMatch[1] || triggerMatch[2] || triggerMatch[3];
    }
  }

  // Deterministic Bidirectional Convention:
  // If blockId ends with "-executable" (e.g. "challenge-3-executable") and no explicit challengeId is set,
  // derive challengeId as "challenge-3"
  if (blockId && !challengeId) {
    if (blockId.endsWith("-executable")) {
      challengeId = blockId.slice(0, -"-executable".length);
    }
  }

  // If challengeId is set and no blockId, derive blockId as `${challengeId}-executable`
  if (challengeId && !blockId) {
    blockId = `${challengeId}-executable`;
  }

  const isRust = ["rust", "rs"].includes(langStr.toLowerCase());

  let isExecutable = false;
  if (isRust) {
    if (explicitExecutable !== null) {
      isExecutable = explicitExecutable;
    } else if (blockId || challengeId) {
      isExecutable = true;
    } else if (sectionContext?.heading) {
      const headingLower = sectionContext.heading.toLowerCase();
      if (headingLower.includes("challenge")) {
        isExecutable = true;
        if (!challengeId) {
          const m = /challenge\s*(\d+)/i.exec(sectionContext.heading);
          if (m) {
            challengeId = `challenge-${m[1]}`;
          } else {
            challengeId = `${sectionContext.lessonId ? sectionContext.lessonId + "-" : ""}${slugify(sectionContext.heading)}`;
          }
          if (!blockId) {
            blockId = `${challengeId}-executable`;
          }
        }
      }
    }
  }

  if (!blockId && challengeId) {
    blockId = `${challengeId}-executable`;
  }

  return {
    lang: langStr || "text",
    meta: metaStr || undefined,
    executable: isExecutable,
    challengeId,
    blockId,
    triggerId,
  };
}

let blockCounter = 0;
function nextBlockId(kind: string) {
  blockCounter += 1;
  return `${kind}-${blockCounter}`;
}

/**
 * Parses raw lesson markdown body against a normalized frontmatter contract
 * and returns the full AST / section tree / block list.
 */
export async function parseLessonCore(
  markdownBody: string,
  frontmatter: LessonFrontmatter,
  slug: string[]
): Promise<Lesson> {
  const normalizedContent = isolateReecFences(markdownBody);

  const bodyProcessor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkReecBlocks);
  const parsedTree = bodyProcessor.parse(normalizedContent);
  const tree = (await bodyProcessor.run(parsedTree)) as Root;

  // Split the (post-block-transform) top-level nodes into sections keyed by
  // heading. A "section" starts at each heading node; content before the
  // first heading becomes an implicit "Overview" section.
  const sections: LessonSection[] = [];
  const blocks: ReecBlock[] = [];

  const sectionIdCounts = new Map<string, number>();
  function uniqueSectionId(rawHeading: string): string {
    const baseSlug = slugify(rawHeading) || "section";
    const count = sectionIdCounts.get(baseSlug) || 0;
    sectionIdCounts.set(baseSlug, count + 1);
    return count === 0 ? baseSlug : `${baseSlug}-${count}`;
  }

  let current: LessonSection = {
    id: "overview",
    heading: frontmatter.title,
    depth: 1,
    nodes: [],
  };
  let currentProse: Content[] = [];

  const flushProse = async () => {
    if (currentProse.length === 0) return;
    const html = await renderNodesToHtml(currentProse);
    if (html.trim().length > 0) {
      current.nodes.push({ type: "prose", html });
    }
    currentProse = [];
  };

  for (const node of tree.children as Content[]) {
    if (node.type === "heading") {
      await flushProse();
      if (current.nodes.length > 0 || sections.length === 0) {
        sections.push(current);
      }
      const heading = node as Heading;
      const text = mdastToString(heading);
      current = {
        id: uniqueSectionId(text),
        heading: text,
        depth: heading.depth,
        nodes: [],
      };
      continue;
    }

    // @ts-expect-error reecBlock is our custom node type
    if (node.type === "reecBlock") {
      await flushProse();
      const anyNode = node as unknown as {
        kind: string;
        title?: string;
        children: Content[];
      };
      const html = await renderNodesToHtml(anyNode.children);
      const markdown = anyNode.children.map((c) => mdastToString(c)).join("\n\n");
      const firstCode = anyNode.children.find(
        (c): c is Content & { lang?: string | null; meta?: string | null; value: string } => c.type === "code"
      );
      const codeInfo = firstCode
        ? parseCodeFenceMeta(firstCode.lang, firstCode.meta, {
            heading: current.heading,
            lessonId: frontmatter.id,
          })
        : null;
      const block: ReecBlock = {
        kind: anyNode.kind,
        title: anyNode.title,
        markdown,
        html,
        id: nextBlockId(anyNode.kind),
        codeSource: firstCode?.value,
        codeLang: codeInfo?.lang,
        codeExecutable: codeInfo?.executable ?? (anyNode.kind === "mini-challenge" || anyNode.kind === "worked-example"),
        challengeId: codeInfo?.challengeId,
        lessonId: frontmatter.id,
        blockId: codeInfo?.blockId,
        triggerId: codeInfo?.triggerId,
      };
      blocks.push(block);
      current.nodes.push({ type: "block", block });
      continue;
    }

    if (node.type === "code") {
      await flushProse();
      const rawCode = node as { lang?: string | null; meta?: string | null; value: string };
      const codeInfo = parseCodeFenceMeta(rawCode.lang, rawCode.meta, {
        heading: current.heading,
        lessonId: frontmatter.id,
      });
      const html = await renderNodesToHtml([node]);
      const codeNode: CodeNode = {
        id: nextBlockId("code"),
        lang: codeInfo.lang,
        source: rawCode.value,
        html,
        executable: codeInfo.executable,
        meta: codeInfo.meta,
        challengeId: codeInfo.challengeId,
        lessonId: frontmatter.id,
        blockId: codeInfo.blockId,
        triggerId: codeInfo.triggerId,
      };
      current.nodes.push({ type: "code", code: codeNode });
      continue;
    }

    currentProse.push(node);
  }

  await flushProse();
  if (current.nodes.length > 0) sections.push(current);

  const plainText = mdastToString(tree);
  const rawWordCount = plainText.split(/\s+/).filter(Boolean).length;
  const wordCalculatedTime = Math.max(1, Math.round(rawWordCount / WORDS_PER_MINUTE));
  const parsedEst =
    frontmatter.estimated_time != null
      ? parseInt(String(frontmatter.estimated_time), 10)
      : NaN;
  const readingTimeMinutes =
    !isNaN(parsedEst) && parsedEst > 0 ? parsedEst : wordCalculatedTime;
  if (!frontmatter.estimated_time) {
    frontmatter.estimated_time = `${readingTimeMinutes} min`;
  }
  const excerpt = plainText.slice(0, 220).trim();

  const path = frontmatter.hidden
    ? "/hidden-lessons/" + (frontmatter.slug || slug[slug.length - 1] || "lesson").toLowerCase()
    : "/lesson/" + slug.map((s) => s.toLowerCase()).join("/");

  const contentHash = crypto.createHash("sha256").update(markdownBody.replace(/\r\n/g, "\n")).digest("hex");

  return {
    frontmatter,
    slug,
    path,
    sections,
    blocks,
    readingTimeMinutes,
    excerpt,
    rawWordCount,
    rawContent: markdownBody,
    contentHash,
  };
}

/**
 * Parses a lesson's raw markdown (including front matter) into a fully
 * structured Lesson object: normalized metadata, section tree with
 * interleaved prose/widget nodes, a flat block list, and derived stats.
 *
 * Automatically separates co-located :::hidden-lesson content into isolated
 * Lesson objects, keeping the normal lesson's render AST 100% clean and free
 * of hidden lesson content, IDs, or unregistered widgets.
 */
export async function parseLesson(
  rawFile: string,
  slug: string[]
): Promise<Lesson> {
  let matterResult;
  try {
    matterResult = matter(rawFile);
  } catch (err) {
    console.warn(`[REEC Parser] YAML frontmatter syntax error in ${slug.join("/")}:`, err);
    matterResult = { data: {}, content: rawFile };
  }
  const { data, content } = matterResult;
  const frontmatter = normalizeFrontmatter(data as LessonFrontmatterInput, slug);

  if (frontmatter.hidden) {
    return parseLessonCore(content, frontmatter, slug);
  }

  // 1. Separate co-located hidden lesson containers from normal lesson markdown
  const { normalContent, hiddenBlocks } = extractHiddenLessonBlocks(content);

  // 2. Parse the pure normal lesson
  const normalLesson = await parseLessonCore(normalContent, frontmatter, slug);

  // 3. Parse each extracted hidden lesson container into an independent Lesson AST
  const hiddenLessons: Lesson[] = [];
  const rawData = data as Record<string, any>;
  const frontmatterHiddenList = Array.isArray(rawData.hidden_lessons) ? rawData.hidden_lessons : [];

  for (const block of hiddenBlocks) {
    const decl = frontmatterHiddenList.find((h: any) => h.id === block.id);
    if (!decl && block.id && process.env.DEBUG_PARSER) {
      console.warn(
        `[REEC Parser] Content block :::hidden-lesson references ID "${block.id}" in ${slug.join(
          "/"
        )} but no matching entry exists in frontmatter hidden_lessons.`
      );
    }

    const hlData: LessonFrontmatterInput = {
      ...(decl || {}),
      id: block.id || decl?.id || `${frontmatter.id}-HL`,
      phase: decl?.phase !== undefined ? decl.phase : frontmatter.phase,
      week: decl?.week !== undefined ? decl.week : frontmatter.week ?? undefined,
      day: decl?.day !== undefined ? decl.day : frontmatter.day ?? undefined,
      title: decl?.title || "Hidden Lesson",
      subtitle: decl?.subtitle,
      description: decl?.description,
      difficulty: decl?.difficulty,
      estimated_time: decl?.estimated_time ? String(decl.estimated_time) : undefined,
      learning_objectives: decl?.learning_objectives,
      widgets: decl?.widgets,
      tags: decl?.tags || frontmatter.tags,
      hidden: true,
      trigger: decl?.trigger ? (normalizeTrigger(decl.trigger) ?? undefined) : (frontmatter.trigger ?? undefined),
      badge: decl?.badge || (block.id.startsWith("HL-") ? block.id.split("-").pop() || "HL" : "HL"),
      slug: decl?.slug || (block.id.startsWith("HL-") ? block.id.split("-").pop()?.toLowerCase() || block.id.toLowerCase() : block.id.toLowerCase()),
      published: true,
    };

    const hlSlug = ["hidden-lessons", (hlData.slug || block.id || "hl").toLowerCase()];
    const hlFrontmatter = normalizeFrontmatter(hlData, hlSlug);
    const hlLesson = await parseLessonCore(block.body, hlFrontmatter, hlSlug);
    hiddenLessons.push(hlLesson);
  }

  normalLesson.hiddenLessons = hiddenLessons;
  normalLesson.rawContent = rawFile;
  normalLesson.contentHash = crypto.createHash("sha256").update(rawFile.replace(/\r\n/g, "\n")).digest("hex");
  return normalLesson;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function isKnownBlockKind(kind: string): boolean {
  return (REEC_BLOCK_KINDS as readonly string[]).includes(kind);
}

export function collectWidgetRefs(lesson: Lesson): WidgetRef[] {
  // Explicit widget refs from front matter (for standalone / plugin
  // widgets not tied to a REEC block, e.g. an Ownership Visualizer
  // embedded ad hoc) plus one implicit ref per REEC block found in body.
  const implicit: WidgetRef[] = lesson.blocks.map((b) => ({
    type: b.kind,
    props: { blockId: b.id },
  }));
  return [...lesson.frontmatter.widgets, ...implicit];
}
