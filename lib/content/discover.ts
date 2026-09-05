/**
 * lib/content/discover.ts
 *
 * Automatic content discovery & high-performance delivery engine.
 *
 * CANONICAL ARCHITECTURE:
 *   1. Supabase content_files (Canonical production source of truth).
 *   2. Targeted Single-Lesson Query: One lesson = One targeted database lookup.
 *   3. Multi-tier In-Memory & Parsed Cache: Keyed by canonical slug + version + content_hash.
 *   4. Authoritative server-side markdown parsing: Zero client-side parsing penalty.
 *   5. Realtime targeted cache invalidation without requiring full curriculum re-parsing.
 *   6. Local filesystem /content (Development & bootstrap fallback).
 */

import fs from "fs";
import path from "path";
import { parseLesson } from "./parser";
import { CURRICULUM_ROADMAP, roadmapTitleForPhase, type RoadmapPhase } from "./roadmap";
import type { Lesson, PhaseSummary, NavLesson } from "./types";
import {
  getContentFileBySlug,
  getContentFileById,
  getAllContentFiles,
  getCurriculumMetadataIndex,
  type ContentFileRow,
} from "./supabase-content";
import { isServerSupabaseConfigured } from "@/lib/supabase/server";
import { lessonCache, logContentPerformance, type CurriculumIndexEntry } from "./lesson-cache";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const CACHE_TTL_MS = 60_000; // 60s cache TTL for bulk discovery

let bulkCache: {
  lessons: Lesson[];
  hiddenLessons: Lesson[];
  bySlug: Map<string, Lesson>;
  all: Lesson[];
  timestamp: number;
} | null = null;

/**
 * Invalidation trigger for Supabase Realtime events.
 * If slugOrId is provided, performs targeted invalidation of only the affected lesson.
 */
export function invalidateLessonCache(slugOrId?: string) {
  if (slugOrId) {
    lessonCache.invalidateTargeted(slugOrId);
  } else {
    lessonCache.invalidateAll();
  }
  bulkCache = null;
}

function walk(dir: string, base: string[] = []): string[][] {
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
  let out: string[][] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out = out.concat(walk(full, [...base, entry.name]));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const name = entry.name.replace(/\.md$/, "");
      out.push([...base, name]);
    }
  }
  return out;
}

/**
 * Loads and parses a local disk file fallback for a specific slug
 */
async function loadLocalLessonBySlug(slugParts: string[]): Promise<Lesson | null> {
  if (!fs.existsSync(CONTENT_ROOT)) return null;

  // Try direct path
  const directPath = path.join(CONTENT_ROOT, ...slugParts) + ".md";
  if (fs.existsSync(directPath)) {
    try {
      const raw = fs.readFileSync(directPath, "utf-8");
      return await parseLesson(raw, slugParts);
    } catch {
      return null;
    }
  }

  // Try walking and finding matching slug
  const allSlugs = walk(CONTENT_ROOT);
  const normalizedTarget = slugParts.join("/").toLowerCase();
  for (const s of allSlugs) {
    if (s.join("/").toLowerCase() === normalizedTarget) {
      const p = path.join(CONTENT_ROOT, ...s) + ".md";
      try {
        const raw = fs.readFileSync(p, "utf-8");
        return await parseLesson(raw, s);
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Bulk curriculum loader for roadmap, phase, and search index operations
 */
async function loadAll(): Promise<{ lessons: Lesson[]; hiddenLessons: Lesson[]; all: Lesson[] }> {
  const lessons: Lesson[] = [];
  const hiddenLessonMap = new Map<string, Lesson>();
  const seenLessonIds = new Set<string>();
  const seenSlugs = new Set<string>();

  const registerHiddenLesson = (hl: Lesson) => {
    const key = (hl.frontmatter.id || hl.frontmatter.slug || hl.slug.join("/")).toLowerCase();
    if (!hiddenLessonMap.has(key)) {
      hiddenLessonMap.set(key, hl);
    }
  };

  // 1. SUPABASE CANONICAL CONTENT (Published only for discovery)
  if (isServerSupabaseConfigured()) {
    try {
      const supabaseFiles = await getAllContentFiles({ publishedOnly: true });
      for (const row of supabaseFiles) {
        if (!row.content || typeof row.content !== "string") continue;

        const slugParts = row.slug
          ? row.slug.split("/").map((s) => s.trim().toLowerCase())
          : [
              `phase-${String(row.phase).padStart(2, "0")}`,
              `week-${String(row.week ?? 1).padStart(2, "0")}`,
              `day-${String(row.day ?? 1).padStart(2, "0")}`,
            ];

        const authoredId = (row.lesson_id || row.id || "").toLowerCase();
        const normalizedSlug = slugParts.join("/");
        if (authoredId) seenLessonIds.add(authoredId);
        seenSlugs.add(normalizedSlug);

        // Check if we already have this lesson parsed in the tier 1 cache
        let lesson: Lesson | null = null;
        const cached = lessonCache.getByHash(normalizedSlug, row.version, row.content_hash);
        if (cached) {
          lesson = cached.lesson;
        } else {
          try {
            lesson = await parseLesson(row.content, slugParts);
            if (row.is_hidden) {
              lesson.frontmatter.hidden = true;
            }
            lessonCache.set(normalizedSlug, lesson, row.version, row.content_hash);
          } catch (err) {
            console.warn(`[Content Discovery] Failed to parse Supabase content file [${row.path}]:`, (err as Error).message);
          }
        }

        if (lesson && lesson.frontmatter.published) {
          if (lesson.frontmatter.id) seenLessonIds.add(lesson.frontmatter.id.toLowerCase());

          if (lesson.frontmatter.hidden || row.is_hidden) {
            lesson.frontmatter.hidden = true;
            if (!lesson.path.startsWith("/hidden-lessons/")) {
              lesson.path =
                "/hidden-lessons/" + (lesson.frontmatter.slug || slugParts[slugParts.length - 1] || "nll").toLowerCase();
            }
            registerHiddenLesson(lesson);
          } else {
            lessons.push(lesson);
            if (lesson.hiddenLessons && lesson.hiddenLessons.length > 0) {
              for (const hl of lesson.hiddenLessons) {
                registerHiddenLesson(hl);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("[Content Discovery] Could not load Supabase content files, using fallback:", (err as Error).message);
    }
  }

  // 2. LOCAL REPOSITORY FALLBACK & DEDUPLICATION
  if (fs.existsSync(CONTENT_ROOT)) {
    const slugs = walk(CONTENT_ROOT);

    for (const slugParts of slugs) {
      const filePath = path.join(CONTENT_ROOT, ...slugParts) + ".md";
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const lesson = await parseLesson(raw, slugParts);
        if (!lesson.frontmatter.published) continue;

        const authoredId = (lesson.frontmatter.id || "").toLowerCase();
        const normalizedSlug = slugParts.map((s) => s.toLowerCase()).join("/");

        if (authoredId && seenLessonIds.has(authoredId)) continue;
        if (seenSlugs.has(normalizedSlug)) continue;

        if (lesson.frontmatter.hidden) {
          registerHiddenLesson(lesson);
        } else {
          lessons.push(lesson);
          if (authoredId) seenLessonIds.add(authoredId);
          seenSlugs.add(normalizedSlug);

          if (lesson.hiddenLessons && lesson.hiddenLessons.length > 0) {
            for (const hl of lesson.hiddenLessons) {
              registerHiddenLesson(hl);
            }
          }
        }
      } catch (err) {
        console.warn(`[Content Discovery] Error reading local lesson ${filePath}:`, (err as Error).message);
      }
    }
  }

  const hiddenLessons = Array.from(hiddenLessonMap.values());

  lessons.sort((a, b) => {
    if (a.frontmatter.phase !== b.frontmatter.phase) return a.frontmatter.phase - b.frontmatter.phase;
    if ((a.frontmatter.week ?? 0) !== (b.frontmatter.week ?? 0))
      return (a.frontmatter.week ?? 0) - (b.frontmatter.week ?? 0);
    return (a.frontmatter.day ?? 0) - (b.frontmatter.day ?? 0);
  });

  return { lessons, hiddenLessons, all: [...lessons, ...hiddenLessons] };
}

async function getBulkCache() {
  if (bulkCache && Date.now() - bulkCache.timestamp < CACHE_TTL_MS) return bulkCache;
  const { lessons, hiddenLessons, all } = await loadAll();
  const bySlug = new Map<string, Lesson>();

  for (const lesson of lessons) {
    const canonicalSlugStr = lesson.slug.map((s) => s.toLowerCase().replace(/\.md$/i, "")).join("/");
    bySlug.set(canonicalSlugStr, lesson);

    const p = lesson.frontmatter.phase;
    const w = lesson.frontmatter.week;
    const d = lesson.frontmatter.day;
    if (p !== undefined && w !== null && d !== null && w !== undefined && d !== undefined) {
      const pNum = Number(p);
      const wNum = Number(w);
      const dNum = Number(d);
      const p2 = String(pNum).padStart(2, "0");
      const w2 = String(wNum).padStart(2, "0");
      const d2 = String(dNum).padStart(2, "0");

      bySlug.set(`phase-${pNum}/week-${wNum}/day-${dNum}`, lesson);
      bySlug.set(`phase-${p2}/week-${w2}/day-${d2}`, lesson);
      bySlug.set(`p${pNum}-w${wNum}-d${dNum}`, lesson);
      bySlug.set(`p${p2}-w${w2}-d${d2}`, lesson);
      bySlug.set(`${pNum}/${wNum}/${dNum}`, lesson);
      bySlug.set(`${p2}/${w2}/${d2}`, lesson);
    }

    if (lesson.frontmatter.id) {
      const id = lesson.frontmatter.id.toLowerCase().replace(/\.md$/i, "");
      bySlug.set(id, lesson);
      bySlug.set(id.replace(/-/g, "/"), lesson);
    }
  }

  for (const hiddenLesson of hiddenLessons) {
    if (hiddenLesson.frontmatter.slug) {
      const s = hiddenLesson.frontmatter.slug.toLowerCase().replace(/\.md$/i, "");
      bySlug.set(`hidden-lessons/${s}`, hiddenLesson);
    }
    if (hiddenLesson.frontmatter.id) {
      const id = hiddenLesson.frontmatter.id.toLowerCase().replace(/\.md$/i, "");
      bySlug.set(`hidden-lessons/${id}`, hiddenLesson);
    }
  }

  bulkCache = { lessons, hiddenLessons, bySlug, all, timestamp: Date.now() };
  if (process.env.NODE_ENV !== "test") {
    console.log(
      `[CONTENT DIAGNOSTIC]\nCONTENT SOURCE: ${isServerSupabaseConfigured() ? "SUPABASE" : "LOCAL"}\nLESSON COUNT: ${lessons.length}`
    );
  }
  return bulkCache;
}

/**
 * HIGH-PERFORMANCE TARGETED LESSON QUERY:
 *
 * One Lesson = One Targeted Query + Tier 1 Parsed Server Cache.
 * Does NOT fetch the entire curriculum to retrieve one lesson.
 */
export async function getLessonBySlug(slugParts?: string[] | string): Promise<Lesson | null> {
  const startTime = Date.now();
  if (!slugParts) return null;
  const parts = (
    Array.isArray(slugParts)
      ? slugParts.flatMap((s) => (typeof s === "string" ? s.split("/") : []))
      : typeof slugParts === "string"
      ? slugParts.split("/")
      : []
  ).filter(Boolean);
  if (parts.length === 0) return null;

  const normalizedKey = parts
    .map((s) => decodeURIComponent(s).toLowerCase().trim().replace(/\.md$/i, ""))
    .join("/");

  // Determine canonical slug if this matches phase/week/day pattern
  let canonicalSlug: string | null = null;
  const match = normalizedKey.match(
    /(?:p(?:hase)?[-_/]?)?0*(\d+)[-_/](?:w(?:eek)?[-_/]?)?0*(\d+)[-_/](?:d(?:ay)?[-_/]?)?0*(\d+)/i
  );
  if (match) {
    const p = String(Number(match[1])).padStart(2, "0");
    const w = String(Number(match[2])).padStart(2, "0");
    const d = String(Number(match[3])).padStart(2, "0");
    canonicalSlug = `phase-${p}/week-${w}/day-${d}`;
  }

  // ---------------------------------------------------------------------------
  // STEP 1: FAST PATH — CHECK TIER 1 PARSED SERVER CACHE
  // ---------------------------------------------------------------------------
  const cached =
    lessonCache.getBySlug(normalizedKey) ||
    (canonicalSlug ? lessonCache.getBySlug(canonicalSlug) : null);
  if (cached) {
    logContentPerformance({
      slug: normalizedKey,
      cache: "HIT",
      fetchTimeMs: 0,
      parseTimeMs: 0,
      totalTimeMs: Date.now() - startTime,
      source: isServerSupabaseConfigured() ? "SUPABASE" : "LOCAL_DISK",
    });
    if (cached.lesson.frontmatter.hidden) return null;
    return cached.lesson;
  }

  // Also check bulkCache if already loaded in memory
  if (bulkCache) {
    const memoryHit =
      bulkCache.bySlug.get(normalizedKey) ||
      (canonicalSlug ? bulkCache.bySlug.get(canonicalSlug) : null);
    if (memoryHit) {
      if (memoryHit.frontmatter.hidden) return null;
      return memoryHit;
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 2: TARGETED SUPABASE QUERY (One row only: WHERE slug = ? LIMIT 1)
  // ---------------------------------------------------------------------------
  if (isServerSupabaseConfigured()) {
    const fetchStart = Date.now();
    let row: ContentFileRow | null = null;
    try {
      row = await getContentFileBySlug(normalizedKey);
      if (!row && canonicalSlug) {
        row = await getContentFileBySlug(canonicalSlug);
      }
      if (!row) {
        row = await getContentFileById(normalizedKey);
      }
      if (!row && match) {
        row = await getContentFileById(`P${Number(match[1])}-W${Number(match[2])}-D${Number(match[3])}`);
      }
    } catch {
      row = null;
    }
    const fetchTimeMs = Date.now() - fetchStart;

    if (row && row.content && row.is_published) {
      // Check if we have a parsed version for this exact content hash
      const hashHit =
        lessonCache.getByHash(normalizedKey, row.version, row.content_hash) ||
        (canonicalSlug ? lessonCache.getByHash(canonicalSlug, row.version, row.content_hash) : null);
      if (hashHit) {
        logContentPerformance({
          slug: normalizedKey,
          cache: "PARSED_HIT",
          fetchTimeMs,
          parseTimeMs: 0,
          totalTimeMs: Date.now() - startTime,
          source: "SUPABASE",
        });
        if (hashHit.lesson.frontmatter.hidden) return null;
        return hashHit.lesson;
      }

      // Parse only when necessary
      const parseStart = Date.now();
      const rowSlugParts = row.slug
        ? row.slug.split("/").map((s) => s.trim().toLowerCase())
        : parts;
      try {
        const parsed = await parseLesson(row.content, rowSlugParts);
        const parseTimeMs = Date.now() - parseStart;

        // Cache the parsed representation keyed by slug, ID, and version/hash
        lessonCache.set(normalizedKey, parsed, row.version, row.content_hash);
        if (canonicalSlug) {
          lessonCache.set(canonicalSlug, parsed, row.version, row.content_hash);
        }
        if (row.slug && row.slug.toLowerCase() !== normalizedKey) {
          lessonCache.set(row.slug.toLowerCase(), parsed, row.version, row.content_hash);
        }

        logContentPerformance({
          slug: normalizedKey,
          cache: "MISS",
          fetchTimeMs,
          parseTimeMs,
          totalTimeMs: Date.now() - startTime,
          source: "SUPABASE",
        });

        if (parsed.frontmatter.hidden || row.is_hidden) return null;
        return parsed;
      } catch (err) {
        console.warn(`[Content Discovery] Parse error for targeted lesson [${normalizedKey}]:`, err);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 3: LOCAL DISK FALLBACK (Targeted single file)
  // ---------------------------------------------------------------------------
  const parseStart = Date.now();
  const localLesson = await loadLocalLessonBySlug(parts);
  if (localLesson && localLesson.frontmatter.published) {
    const parseTimeMs = Date.now() - parseStart;
    lessonCache.set(normalizedKey, localLesson, 1, localLesson.contentHash);
    logContentPerformance({
      slug: normalizedKey,
      cache: "MISS",
      fetchTimeMs: 0,
      parseTimeMs,
      totalTimeMs: Date.now() - startTime,
      source: "LOCAL_DISK",
    });
    if (localLesson.frontmatter.hidden) return null;
    return localLesson;
  }

  return null;
}

/**
 * High-Performance Curriculum Metadata Index Loader:
 * Fetches lightweight metadata records directly from Supabase (NO megabytes of raw markdown transferred!).
 * Cached in Tier 2 in-memory cache to guarantee sub-millisecond retrieval.
 */
export async function getCurriculumIndex(): Promise<CurriculumIndexEntry[]> {
  const cached = lessonCache.getIndex();
  if (cached && cached.length > 0) return cached;

  if (isServerSupabaseConfigured()) {
    try {
      const rows = await getCurriculumMetadataIndex();
      if (rows && rows.length > 0) {
        const entries: CurriculumIndexEntry[] = rows.map((row) => {
          const slugParts = row.slug
            ? row.slug.split("/").map((s) => s.trim().toLowerCase())
            : [
                `phase-${String(row.phase).padStart(2, "0")}`,
                `week-${String(row.week ?? 1).padStart(2, "0")}`,
                `day-${String(row.day ?? 1).padStart(2, "0")}`,
              ];
          const path = `/lesson/${slugParts.join("/")}`;
          const meta = (row.metadata as Record<string, unknown>) || {};
          const tags = Array.isArray(meta.tags) ? (meta.tags as string[]) : [];
          const estTime =
            typeof meta.estimated_time === "string"
              ? meta.estimated_time
              : typeof meta.estimatedTime === "string"
              ? meta.estimatedTime
              : typeof meta.readingTimeMinutes === "number"
              ? `${meta.readingTimeMinutes} min`
              : "30 min";
          const parsedEst = parseInt(estTime, 10);
          const readingMins =
            !isNaN(parsedEst) && parsedEst > 0
              ? parsedEst
              : typeof meta.readingTimeMinutes === "number"
              ? meta.readingTimeMinutes
              : 15;

          return {
            id: row.id,
            lesson_id: row.lesson_id || row.id,
            path,
            slug: slugParts.join("/"),
            title: row.title || "Untitled Lesson",
            subtitle: row.subtitle,
            phase: row.phase,
            week: row.week,
            day: row.day,
            readingTimeMinutes: readingMins,
            estimated_time: estTime,
            is_published: row.is_published,
            is_hidden: row.is_hidden,
            tags,
            contentHash: row.content_hash || "",
            version: row.version || 1,
          };
        });

        // Filter out hidden lessons and sort monotonically by phase, week, day
        const publishedCurriculum = entries.filter((e) => e.is_published && !e.is_hidden);
        publishedCurriculum.sort((a, b) => {
          if (a.phase !== b.phase) return a.phase - b.phase;
          if ((a.week ?? 0) !== (b.week ?? 0)) return (a.week ?? 0) - (b.week ?? 0);
          return (a.day ?? 0) - (b.day ?? 0);
        });

        lessonCache.setIndex(publishedCurriculum);
        return publishedCurriculum;
      }
    } catch (err) {
      console.warn("[Content Discovery] Failed to fetch Supabase curriculum index:", (err as Error).message);
    }
  }

  // Fallback: load through bulk discovery
  const { lessons } = await getBulkCache();
  const entries: CurriculumIndexEntry[] = lessons.map((l) => {
    const estParsed = l.frontmatter.estimated_time
      ? parseInt(String(l.frontmatter.estimated_time), 10)
      : NaN;
    const readingMins =
      !isNaN(estParsed) && estParsed > 0 ? estParsed : l.readingTimeMinutes || 15;
    const estTimeStr = l.frontmatter.estimated_time || `${readingMins} min`;

    return {
      id: l.frontmatter.id || l.path,
      lesson_id: l.frontmatter.id || l.path,
      path: l.path,
      slug: l.slug.join("/"),
      title: l.frontmatter.title,
      subtitle: l.frontmatter.subtitle ?? null,
      phase: l.frontmatter.phase,
      week: l.frontmatter.week ?? null,
      day: l.frontmatter.day ?? null,
      readingTimeMinutes: readingMins,
      estimated_time: estTimeStr,
      is_published: l.frontmatter.published !== false,
      is_hidden: !!l.frontmatter.hidden,
      tags: l.frontmatter.tags || [],
      contentHash: l.contentHash || "",
      version: 1,
    };
  });

  lessonCache.setIndex(entries);
  return entries;
}

/**
 * Returns lightweight NavLesson records for sidebars, roadmaps, and phase navigators.
 * Eliminates serializing megabytes of markdown into client component bundles.
 */
export async function getCurriculumNavLessons(): Promise<NavLesson[]> {
  const index = await getCurriculumIndex();
  return index.map((entry) => ({
    id: entry.lesson_id,
    path: entry.path,
    slug: entry.slug.split("/"),
    frontmatter: {
      id: entry.lesson_id,
      phase: entry.phase,
      week: entry.week,
      day: entry.day,
      title: entry.title,
      subtitle: entry.subtitle,
      description: entry.subtitle ?? undefined,
      estimated_time: entry.estimated_time,
      tags: entry.tags,
      published: entry.is_published,
      hidden: entry.is_hidden,
    },
    readingTimeMinutes: entry.readingTimeMinutes,
  }));
}

/**
 * Calculates previous and next lessons from the curriculum index in <1ms.
 * Avoids executing getAllLessons() and parsing every markdown file.
 */
export async function getCurriculumNavigation(
  currentPath: string,
  currentLessonId?: string
): Promise<{
  prevLesson: { path: string; title: string } | null;
  nextLesson: { path: string; title: string; subtitle?: string | null; readingTimeMinutes?: string | number | null } | null;
}> {
  const index = await getCurriculumIndex();
  const normPath = currentPath.toLowerCase().replace(/^\/+/, "/");
  const normId = currentLessonId ? currentLessonId.toLowerCase() : null;

  const currentIndex = index.findIndex(
    (item) =>
      item.path.toLowerCase() === normPath ||
      (normId && (item.lesson_id.toLowerCase() === normId || item.id.toLowerCase() === normId))
  );

  const prev = currentIndex > 0 ? index[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < index.length - 1 ? index[currentIndex + 1] : null;

  return {
    prevLesson: prev ? { path: prev.path, title: prev.title } : null,
    nextLesson: next
      ? {
          path: next.path,
          title: next.title,
          subtitle: next.subtitle,
          readingTimeMinutes: next.estimated_time || `${next.readingTimeMinutes} min`,
        }
      : null,
  };
}

export async function getAllLessons(): Promise<Lesson[]> {
  const { lessons } = await getBulkCache();
  return lessons;
}

export async function getAllHiddenLessons(): Promise<Lesson[]> {
  const { hiddenLessons } = await getBulkCache();
  return hiddenLessons;
}

export async function getHiddenLessonById(id: string): Promise<Lesson | null> {
  const hiddenLessons = await getAllHiddenLessons();
  return hiddenLessons.find((l) => l.frontmatter.id === id) ?? null;
}

export async function getHiddenLessonBySlug(slug: string): Promise<Lesson | null> {
  const hiddenLessons = await getAllHiddenLessons();
  const normalized = slug.toLowerCase().replace(/^\/+|\/+$/g, "").replace(/\.md$/i, "");

  const directMatch = hiddenLessons.find(
    (l) =>
      (l.frontmatter.id && l.frontmatter.id.toLowerCase() === normalized) ||
      (l.frontmatter.slug && l.frontmatter.slug.toLowerCase() === normalized) ||
      l.slug.map((s) => s.toLowerCase()).join("/") === normalized ||
      l.slug[l.slug.length - 1]?.toLowerCase() === normalized ||
      l.path.toLowerCase().replace(/^\/+/, "") === normalized ||
      l.path.toLowerCase().replace(/^\/hidden-lessons\//, "") === normalized
  );
  if (directMatch) return directMatch;

  if (
    normalized === "nll" ||
    normalized === "hl-nll" ||
    normalized.endsWith("/nll") ||
    normalized.includes("non-lexical") ||
    normalized.includes("borrow-split") ||
    normalized.includes("aliasing") ||
    normalized.includes("unsafe-cell") ||
    normalized.includes("hl-p1-w3-d2")
  ) {
    const nllLesson = hiddenLessons.find(
      (l) =>
        (l.frontmatter.id && l.frontmatter.id.toLowerCase().includes("nll")) ||
        (l.frontmatter.slug && l.frontmatter.slug.toLowerCase().includes("nll")) ||
        l.slug.some((s) => s.toLowerCase().includes("nll"))
    );
    if (nllLesson) return nllLesson;
  }

  return null;
}

export interface HiddenLessonTriggerRegistryEntry {
  hiddenLessonId: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  badge?: string | null;
  tags: string[];
  sourceLessonId?: string | null;
  trigger: NonNullable<Lesson["frontmatter"]["trigger"]>;
}

export async function getHiddenLessonTriggers(): Promise<HiddenLessonTriggerRegistryEntry[]> {
  const { lessons, hiddenLessons } = await getBulkCache();
  const triggerMap = new Map<string, HiddenLessonTriggerRegistryEntry>();

  for (const lesson of hiddenLessons) {
    if (lesson.frontmatter.trigger) {
      const id = lesson.frontmatter.id;
      if (!triggerMap.has(id)) {
        triggerMap.set(id, {
          hiddenLessonId: id,
          slug: lesson.frontmatter.slug || lesson.slug[lesson.slug.length - 1] || "nll",
          title: lesson.frontmatter.title,
          subtitle: lesson.frontmatter.subtitle,
          description: lesson.frontmatter.description,
          badge: lesson.frontmatter.badge || "NLL",
          tags: lesson.frontmatter.tags,
          sourceLessonId: lesson.frontmatter.trigger.lessonId || null,
          trigger: lesson.frontmatter.trigger,
        });
      }
    }
  }

  for (const coreLesson of lessons) {
    const rawHl = coreLesson.frontmatter.hidden_lessons;
    if (Array.isArray(rawHl)) {
      for (const decl of rawHl) {
        if (decl && decl.id) {
          const id = decl.id;
          const existing = triggerMap.get(id);
          if (decl.trigger) {
            const normalizedTrig = {
              type: decl.trigger.type || "code_execution",
              challengeId: decl.trigger.challengeId || decl.trigger.challenge_id,
              blockId: decl.trigger.blockId || decl.trigger.block_id || decl.trigger.executable_block_id,
              lessonId: decl.trigger.lessonId || decl.trigger.lesson_id || coreLesson.frontmatter.id,
              executionRequirement: decl.trigger.executionRequirement || decl.trigger.requirement || "execution_attempt",
            };

            triggerMap.set(id, {
              hiddenLessonId: id,
              slug: decl.slug || existing?.slug || id.split("-").pop()?.toLowerCase() || "nll",
              title: decl.title || existing?.title || "Hidden Lesson",
              subtitle: decl.subtitle ?? existing?.subtitle ?? null,
              description: decl.description ?? existing?.description ?? null,
              badge: decl.badge || existing?.badge || id.split("-").pop() || "NLL",
              tags: decl.tags || existing?.tags || coreLesson.frontmatter.tags,
              sourceLessonId: coreLesson.frontmatter.id,
              trigger: normalizedTrig,
            });
          } else if (existing && !existing.sourceLessonId) {
            existing.sourceLessonId = coreLesson.frontmatter.id;
          }
        }
      }
    }
  }

  return Array.from(triggerMap.values());
}

export async function getAllLessonSlugs(): Promise<string[][]> {
  const index = await getCurriculumIndex();
  return index.map((l) => l.slug.split("/"));
}

export async function getPhaseSummaries(): Promise<PhaseSummary[]> {
  const index = await getCurriculumIndex();
  const map = new Map<number, PhaseSummary>();
  for (const lesson of index) {
    const p = lesson.phase;
    if (!map.has(p)) {
      map.set(p, { phase: p, title: roadmapTitleForPhase(p), lessonCount: 0, weeks: [] });
    }
    const summary = map.get(p)!;
    summary.lessonCount += 1;
    if (lesson.week && !summary.weeks.includes(lesson.week)) {
      summary.weeks.push(lesson.week);
    }
  }
  return [...map.values()].sort((a, b) => a.phase - b.phase);
}

export interface RoadmapStatus extends RoadmapPhase {
  lessonCount: number;
  weeks: number[];
  hasContent: boolean;
}

export async function getRoadmapStatus(): Promise<RoadmapStatus[]> {
  const index = await getCurriculumIndex();
  return CURRICULUM_ROADMAP.map((entry) => {
    const phaseLessons = index.filter((l) => l.phase === entry.phase);
    const weeks = [...new Set(phaseLessons.map((l) => l.week).filter((w): w is number => !!w))];
    return { ...entry, lessonCount: phaseLessons.length, weeks, hasContent: phaseLessons.length > 0 };
  });
}

export async function isCurriculumComplete(): Promise<boolean> {
  const status = await getRoadmapStatus();
  return status.every((p) => p.hasContent);
}

export async function searchLessons(query: string, unlockedHiddenIds: string[] = []): Promise<Lesson[]> {
  const { lessons, hiddenLessons } = await getBulkCache();
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const pool = [...lessons];
  if (unlockedHiddenIds.length > 0) {
    const normalizedUnlocked = new Set(unlockedHiddenIds.map((id) => id.toLowerCase()));
    for (const h of hiddenLessons) {
      if (
        normalizedUnlocked.has(h.frontmatter.id.toLowerCase()) ||
        (h.frontmatter.slug && normalizedUnlocked.has(h.frontmatter.slug.toLowerCase()))
      ) {
        pool.push(h);
      }
    }
  }

  return pool.filter((l) => {
    const haystack = [
      l.frontmatter.id,
      l.frontmatter.title,
      l.frontmatter.subtitle ?? "",
      l.frontmatter.category ?? "",
      l.excerpt,
      l.path,
      ...l.slug,
      ...(l.frontmatter.tags || []),
      ...(l.frontmatter.key_terms || []),
      ...(l.frontmatter.learning_objectives || []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
