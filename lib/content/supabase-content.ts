/**
 * lib/content/supabase-content.ts
 *
 * REEC Canonical Read-Only Content Service.
 * Interfaces with Supabase `content_files` and `content_file_versions` tables.
 *
 * Core Principles:
 *  1. Supabase `public.content_files` is the canonical production source of truth.
 *  2. Targeted Single-Lesson Queries: Selects only required columns for the requested slug.
 *  3. Lightweight Index Queries: Fetches metadata without transferring megabytes of raw Markdown.
 *  4. Markdown content is preserved as source; parser.ts remains authoritative for lesson parsing.
 *  5. Content identity is strictly separated from user progress.
 *  6. Graceful fallback to repository content when Supabase is unconfigured or offline.
 */

import crypto from "crypto";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type ContentFileRow = Database["public"]["Tables"]["content_files"]["Row"];
export type ContentFileInsert = Database["public"]["Tables"]["content_files"]["Insert"];
export type ContentFileVersionRow = Database["public"]["Tables"]["content_file_versions"]["Row"];

export type ContentFileMetadataRow = Pick<
  ContentFileRow,
  | "id"
  | "lesson_id"
  | "path"
  | "slug"
  | "filename"
  | "content_type"
  | "phase"
  | "week"
  | "day"
  | "title"
  | "subtitle"
  | "version"
  | "content_hash"
  | "is_published"
  | "is_hidden"
  | "metadata"
  | "created_at"
  | "updated_at"
>;

export interface ContentFileInput {
  rawContent: string;
  phase?: number;
  week?: number | null;
  day?: number | null;
  fileName?: string;
  authoredId?: string;
  title?: string;
  subtitle?: string | null;
  isPublished?: boolean;
  isHidden?: boolean;
  changeSummary?: string;
  metadata?: Record<string, unknown>;
}

export interface UpsertContentResult {
  success: boolean;
  record?: ContentFileRow;
  version?: number;
  unchanged?: boolean;
  error?: string;
  validationErrors?: string[];
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Required columns for full single-lesson rendering
 */
const LESSON_COLUMNS = "id, lesson_id, path, slug, filename, content, content_type, phase, week, day, title, subtitle, version, content_hash, is_published, is_hidden, metadata, created_at, updated_at";

/**
 * Lightweight columns for curriculum index, roadmap, and search
 */
const METADATA_COLUMNS = "id, lesson_id, path, slug, filename, content_type, phase, week, day, title, subtitle, version, content_hash, is_published, is_hidden, metadata, created_at, updated_at";

/**
 * Computes deterministic SHA-256 hash of markdown content
 */
export function computeContentHash(content: string): string {
  return crypto.createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex");
}

/**
 * Derives canonical path (e.g. Phase-01/Week-03/Day-02.md)
 */
export function deriveCanonicalPath(
  phase: number,
  week?: number | null,
  day?: number | null,
  fileName?: string
): string {
  if (fileName && (fileName.toLowerCase().includes("failure lab") || fileName.toLowerCase().includes("failure-lab"))) {
    const safe = fileName.replace(/[^a-zA-Z0-9_\-. —]/g, "_");
    return `Failure-Labs/${safe}`;
  }
  if (fileName && fileName.toLowerCase().startsWith("hidden-lessons/")) {
    return fileName;
  }
  if (week != null && day != null) {
    return `Phase-${pad2(phase)}/Week-${pad2(week)}/Day-${pad2(day)}.md`;
  }
  if (fileName) {
    return `Phase-${pad2(phase)}/${fileName}`;
  }
  return `Phase-${pad2(phase)}/Module-01.md`;
}

/**
 * Derives canonical slug (e.g. phase-01/week-03/day-02)
 */
export function deriveCanonicalSlug(
  phase: number,
  week?: number | null,
  day?: number | null,
  fileName?: string
): string {
  if (fileName && (fileName.toLowerCase().includes("failure lab") || fileName.toLowerCase().includes("failure-lab"))) {
    const base = fileName.replace(/\.md$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return `failure-labs/${base}`;
  }
  if (fileName && fileName.toLowerCase().startsWith("hidden-lessons/")) {
    return fileName.replace(/\.md$/i, "").toLowerCase();
  }
  if (week != null && day != null) {
    return `phase-${pad2(phase)}/week-${pad2(week)}/day-${pad2(day)}`;
  }
  return `phase-${pad2(phase)}`;
}

/**
 * Derives stable canonical lesson ID
 */
export function deriveCanonicalLessonId(
  phase: number,
  week?: number | null,
  day?: number | null,
  authoredId?: string
): string {
  if (authoredId && authoredId.trim().length > 0) {
    return authoredId.trim();
  }
  if (week != null && day != null) {
    return `P${phase}-W${week}-D${day}`;
  }
  return `P${phase}-M1`;
}

/**
 * Targeted Single-Lesson Query: Fetch single published content file by slug.
 * Executes a targeted SELECT on indexed fields without fetching other lessons.
 */
export async function getContentFileBySlug(slug: string): Promise<ContentFileRow | null> {
  const supabase = getServerSupabaseClient();
  if (!supabase) return null;

  const normalized = slug.toLowerCase().replace(/^\/+|\/+$/g, "").replace(/\.md$/i, "");
  try {
    // 1. Direct indexed slug match (Primary Fast Path)
    const { data: direct, error: directErr } = await supabase
      .from("content_files")
      .select(LESSON_COLUMNS)
      .eq("slug", normalized)
      .eq("is_published", true)
      .maybeSingle();

    if (!directErr && direct) return direct as ContentFileRow;

    // 2. Try canonical phase-00/week-01/day-01 normalization
    const match = normalized.match(
      /(?:p(?:hase)?[-_]?)?0*(\d+)[-_/](?:w(?:eek)?[-_]?)?0*(\d+)[-_/](?:d(?:ay)?[-_]?)?0*(\d+)/i
    );
    if (match) {
      const p = String(Number(match[1])).padStart(2, "0");
      const w = String(Number(match[2])).padStart(2, "0");
      const d = String(Number(match[3])).padStart(2, "0");
      const canonicalSlug = `phase-${p}/week-${w}/day-${d}`;

      const { data: byCanonical } = await supabase
        .from("content_files")
        .select(LESSON_COLUMNS)
        .eq("slug", canonicalSlug)
        .eq("is_published", true)
        .maybeSingle();

      if (byCanonical) return byCanonical as ContentFileRow;
    }

    // 3. Fallback: try matching lesson_id on indexed column
    const { data: byId } = await supabase
      .from("content_files")
      .select(LESSON_COLUMNS)
      .eq("lesson_id", normalized.toUpperCase())
      .eq("is_published", true)
      .maybeSingle();

    if (byId) return byId as ContentFileRow;

    // 4. Secondary fallback for path match
    const { data: byPath } = await supabase
      .from("content_files")
      .select(LESSON_COLUMNS)
      .ilike("path", `%${normalized}%`)
      .eq("is_published", true)
      .maybeSingle();

    if (byPath) return byPath as ContentFileRow;

    return null;
  } catch (err) {
    console.warn(`[Supabase Content] Error in getContentFileBySlug("${slug}"):`, (err as Error).message);
    return null;
  }
}

/**
 * Fetch single content file by canonical lesson ID or path
 */
export async function getContentFileById(idOrPath: string): Promise<ContentFileRow | null> {
  const supabase = getServerSupabaseClient();
  if (!supabase) return null;

  const normalized = idOrPath.trim();
  try {
    // 1. Try lesson_id on indexed column
    const { data: byLessonId } = await supabase
      .from("content_files")
      .select(LESSON_COLUMNS)
      .eq("lesson_id", normalized)
      .maybeSingle();

    if (byLessonId) return byLessonId as ContentFileRow;

    // 2. Try primary key id
    const { data: byId } = await supabase
      .from("content_files")
      .select(LESSON_COLUMNS)
      .eq("id", normalized)
      .maybeSingle();

    if (byId) return byId as ContentFileRow;

    // 3. Try path
    const { data: byPath } = await supabase
      .from("content_files")
      .select(LESSON_COLUMNS)
      .eq("path", normalized)
      .maybeSingle();

    if (byPath) return byPath as ContentFileRow;

    // 4. Try slug
    const { data: bySlug } = await supabase
      .from("content_files")
      .select(LESSON_COLUMNS)
      .eq("slug", normalized.toLowerCase())
      .maybeSingle();

    return (bySlug || null) as ContentFileRow | null;
  } catch (err) {
    console.warn(`[Supabase Content] Error in getContentFileById("${idOrPath}"):`, (err as Error).message);
    return null;
  }
}

/**
 * Fetch lightweight curriculum metadata for roadmap/phase views (avoids transferring raw Markdown content)
 */
export async function getCurriculumMetadataIndex(): Promise<ContentFileMetadataRow[]> {
  const supabase = getServerSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("content_files")
      .select(METADATA_COLUMNS)
      .eq("is_published", true)
      .order("phase", { ascending: true })
      .order("week", { ascending: true, nullsFirst: false })
      .order("day", { ascending: true, nullsFirst: false });

    if (error) {
      console.warn("[Supabase Content] Error fetching curriculum metadata index:", error.message);
      return [];
    }

    return (data || []) as ContentFileMetadataRow[];
  } catch (err) {
    console.warn("[Supabase Content] Unexpected error in getCurriculumMetadataIndex:", (err as Error).message);
    return [];
  }
}

/**
 * Fetch all published content files from Supabase (Canonical Production Read Path)
 */
export async function getPublishedContentFiles(): Promise<ContentFileRow[]> {
  const supabase = getServerSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("content_files")
      .select(LESSON_COLUMNS)
      .eq("is_published", true)
      .order("phase", { ascending: true })
      .order("week", { ascending: true, nullsFirst: false })
      .order("day", { ascending: true, nullsFirst: false });

    if (error) {
      console.warn("[Supabase Content] Error fetching published content files:", error.message);
      return [];
    }

    return (data || []) as ContentFileRow[];
  } catch (err) {
    console.warn("[Supabase Content] Unexpected error fetching content files:", (err as Error).message);
    return [];
  }
}

/**
 * Fetch all content files (published only by default for web safety)
 */
export async function getAllContentFiles(options?: {
  publishedOnly?: boolean;
  phase?: number;
}): Promise<ContentFileRow[]> {
  const supabase = getServerSupabaseClient();
  if (!supabase) return [];

  try {
    let query = supabase
      .from("content_files")
      .select(LESSON_COLUMNS)
      .order("phase", { ascending: true })
      .order("week", { ascending: true, nullsFirst: false })
      .order("day", { ascending: true, nullsFirst: false });

    if (options?.publishedOnly !== false) {
      query = query.eq("is_published", true);
    }
    if (options?.phase !== undefined) {
      query = query.eq("phase", options.phase);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("[Supabase Content] Error fetching content files:", error.message);
      return [];
    }
    return (data || []) as ContentFileRow[];
  } catch (err) {
    console.warn("[Supabase Content] Unexpected error in getAllContentFiles:", (err as Error).message);
    return [];
  }
}
