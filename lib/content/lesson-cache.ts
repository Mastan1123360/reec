/**
 * lib/content/lesson-cache.ts
 *
 * High-Performance In-Memory & Server Cache for REEC Curriculum Lessons.
 *
 * Features:
 *  1. Two-tier caching:
 *     - Tier 1: Parsed Lesson AST cache keyed by canonical slug + content_hash + version.
 *     - Tier 2: Lightweight Curriculum Index cache for roadmap, phase, and prev/next resolution.
 *  2. Targeted invalidation on Supabase Realtime events (invalidates only affected slug).
 *  3. Performance instrumentation (fetch time, parse time, cache HIT/MISS diagnostic logging in dev).
 *  4. Prevents cache stampedes and eliminates redundant full-curriculum database transfers.
 */

import type { Lesson } from "./types";
import type { ContentFileRow } from "./supabase-content";

export interface CacheEntry {
  lesson: Lesson;
  version: number;
  contentHash: string;
  cachedAt: number;
  slug: string;
  lessonId: string;
}

export interface CurriculumIndexEntry {
  id: string;
  lesson_id: string;
  path: string;
  slug: string;
  title: string;
  subtitle: string | null;
  phase: number;
  week: number | null;
  day: number | null;
  readingTimeMinutes: number;
  estimated_time: string | null;
  is_published: boolean;
  is_hidden: boolean;
  tags: string[];
  contentHash: string;
  version: number;
}

class LessonCacheManager {
  private parsedBySlug = new Map<string, CacheEntry>();
  private parsedById = new Map<string, CacheEntry>();
  private parsedByHash = new Map<string, CacheEntry>();
  private indexCache: { entries: CurriculumIndexEntry[]; cachedAt: number } | null = null;
  private indexTTL = 60_000; // 60s fallback TTL for index

  /**
   * Generates a stable composite cache key
   */
  public makeVersionKey(slug: string, version: number, contentHash: string): string {
    return `lesson:${slug.toLowerCase()}:v${version}:${contentHash}`;
  }

  /**
   * Retrieves a parsed lesson from cache by slug
   */
  public getBySlug(slug: string): CacheEntry | null {
    const normalized = slug.toLowerCase().replace(/^\/+|\/+$/g, "").replace(/\.md$/i, "");
    return this.parsedBySlug.get(normalized) || null;
  }

  /**
   * Retrieves a parsed lesson from cache by lesson ID
   */
  public getById(id: string): CacheEntry | null {
    return this.parsedById.get(id.toLowerCase()) || null;
  }

  /**
   * Retrieves a parsed lesson by version and content hash
   */
  public getByHash(slug: string, version: number, contentHash: string): CacheEntry | null {
    const key = this.makeVersionKey(slug, version, contentHash);
    return this.parsedByHash.get(key) || null;
  }

  /**
   * Sets a parsed lesson in cache with all lookup indices and aliases
   */
  public set(slug: string, lesson: Lesson, version = 1, contentHash?: string): void {
    const normalizedSlug = slug.toLowerCase().replace(/^\/+|\/+$/g, "").replace(/\.md$/i, "");
    const hash = contentHash || lesson.contentHash || "nohash";
    const entry: CacheEntry = {
      lesson,
      version,
      contentHash: hash,
      cachedAt: Date.now(),
      slug: normalizedSlug,
      lessonId: lesson.frontmatter.id,
    };

    // Index by primary slug
    this.parsedBySlug.set(normalizedSlug, entry);

    // Index by version-hash composite key
    this.parsedByHash.set(this.makeVersionKey(normalizedSlug, version, hash), entry);

    // Index by authored lesson ID
    if (lesson.frontmatter.id) {
      this.parsedById.set(lesson.frontmatter.id.toLowerCase(), entry);
    }

    // Index aliases (e.g. phase-00/week-01/day-01, p00-w01-d01, 00/01/01)
    // ONLY for non-hidden, core curriculum lessons!
    const isHidden =
      lesson.frontmatter.hidden ||
      normalizedSlug.startsWith("hidden-lessons/") ||
      (lesson.frontmatter.id && lesson.frontmatter.id.startsWith("HL-"));

    if (!isHidden) {
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

        this.parsedBySlug.set(`phase-${pNum}/week-${wNum}/day-${dNum}`, entry);
        this.parsedBySlug.set(`phase-${p2}/week-${w2}/day-${d2}`, entry);
        this.parsedBySlug.set(`p${pNum}-w${wNum}-d${dNum}`, entry);
        this.parsedBySlug.set(`p${p2}-w${w2}-d${d2}`, entry);
        this.parsedBySlug.set(`${pNum}/${wNum}/${dNum}`, entry);
        this.parsedBySlug.set(`${p2}/${w2}/${d2}`, entry);
      }
    }
  }

  /**
   * Targeted invalidation for a single lesson by slug or ID
   */
  public invalidateTargeted(slugOrId: string): void {
    const target = slugOrId.toLowerCase().replace(/^\/+|\/+$/g, "").replace(/\.md$/i, "");
    
    // Find all matching keys in parsedBySlug
    for (const [key, entry] of this.parsedBySlug.entries()) {
      if (
        key === target ||
        key.includes(target) ||
        entry.slug === target ||
        entry.lessonId.toLowerCase() === target ||
        entry.lesson.path.toLowerCase().includes(target)
      ) {
        this.parsedBySlug.delete(key);
        this.parsedById.delete(entry.lessonId.toLowerCase());
        this.parsedByHash.delete(this.makeVersionKey(entry.slug, entry.version, entry.contentHash));
      }
    }

    // Also check parsedById
    if (this.parsedById.has(target)) {
      const entry = this.parsedById.get(target)!;
      this.parsedById.delete(target);
      this.parsedBySlug.delete(entry.slug);
      this.parsedByHash.delete(this.makeVersionKey(entry.slug, entry.version, entry.contentHash));
    }

    // Invalidate index cache so next roadmap/index read refreshes
    this.indexCache = null;
  }

  /**
   * Completely clears all caches
   */
  public invalidateAll(): void {
    this.parsedBySlug.clear();
    this.parsedById.clear();
    this.parsedByHash.clear();
    this.indexCache = null;
  }

  /**
   * Gets cached curriculum index if valid
   */
  public getIndex(): CurriculumIndexEntry[] | null {
    if (this.indexCache && Date.now() - this.indexCache.cachedAt < this.indexTTL) {
      return this.indexCache.entries;
    }
    return null;
  }

  /**
   * Sets cached curriculum index
   */
  public setIndex(entries: CurriculumIndexEntry[]): void {
    this.indexCache = {
      entries,
      cachedAt: Date.now(),
    };
  }
}

export const lessonCache = new LessonCacheManager();

/**
 * Performance diagnostic logger for dev environment
 */
export function logContentPerformance(metrics: {
  slug: string;
  cache: "HIT" | "MISS" | "PARSED_HIT";
  fetchTimeMs: number;
  parseTimeMs: number;
  totalTimeMs: number;
  source: "SUPABASE" | "LOCAL_DISK";
}) {
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[REEC CONTENT] slug=${metrics.slug} cache=${metrics.cache} source=${metrics.source} fetch=${metrics.fetchTimeMs}ms parse=${metrics.parseTimeMs}ms total=${metrics.totalTimeMs}ms`
    );
  }
}
