/**
 * scripts/lib/supabase-curriculum-writer.ts
 *
 * Isolated Administrative Curriculum Writer Tooling for Supabase.
 * Strictly separated from the learner-facing read-only web application.
 *
 * Used exclusively by repository-side CLI scripts and historical migrations.
 * Never imported into app/ or components/.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getServerSupabaseClient, getAdminSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import {
  computeContentHash,
  deriveCanonicalPath,
  deriveCanonicalSlug,
  deriveCanonicalLessonId,
  type ContentFileRow,
  type ContentFileInput,
  type UpsertContentResult,
} from "@/lib/content/supabase-content";

/**
 * Upserts a content file into Supabase with SHA-256 deduplication and versioning.
 * Used exclusively by administrative scripts.
 */
export async function upsertContentFile(input: ContentFileInput): Promise<UpsertContentResult> {
  const adminClient = getAdminSupabaseClient() || getServerSupabaseClient();
  if (!adminClient) {
    return {
      success: false,
      error: "Supabase client is unconfigured or unavailable.",
    };
  }

  const { rawContent, changeSummary } = input;
  if (!rawContent || typeof rawContent !== "string") {
    return {
      success: false,
      error: "Raw markdown content is required.",
    };
  }

  // 1. Parse frontmatter defensively
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(rawContent);
  } catch (err) {
    return {
      success: false,
      error: `Invalid frontmatter YAML syntax: ${(err as Error).message}`,
      validationErrors: [(err as Error).message],
    };
  }

  const fmData = parsed.data || {};
  const phase = input.phase !== undefined ? input.phase : Number(fmData.phase ?? 0);
  const week = input.week !== undefined ? input.week : (fmData.week != null ? Number(fmData.week) : null);
  const day = input.day !== undefined ? input.day : (fmData.day != null ? Number(fmData.day) : null);
  const authoredId = String(input.authoredId || fmData.id || "").trim();
  const title = String(input.title || fmData.title || "").trim() || `Phase ${phase} Module`;
  const subtitle = (input.subtitle || fmData.subtitle || null) as string | null;
  const isHidden = input.isHidden !== undefined ? input.isHidden : Boolean(fmData.hidden);
  const isPublished = input.isPublished !== undefined ? input.isPublished : (fmData.published !== false);

  const lessonId = deriveCanonicalLessonId(phase, week, day, authoredId);
  const canonicalPath = deriveCanonicalPath(phase, week, day, input.fileName);
  const canonicalSlug = deriveCanonicalSlug(phase, week, day, input.fileName);
  const fileName = input.fileName || path.basename(canonicalPath);
  const contentHash = computeContentHash(rawContent);

  // 2. Check if identical content already exists
  try {
    const { data: existing } = await adminClient
      .from("content_files")
      .select("*")
      .or(`id.eq.${lessonId},path.eq.${canonicalPath}`)
      .maybeSingle();

    if (existing) {
      const existingRow = existing as ContentFileRow;
      // Content hash is identical — idempotent no-op!
      if (existingRow.content_hash === contentHash && existingRow.is_published === isPublished) {
        return {
          success: true,
          record: existingRow,
          version: existingRow.version,
          unchanged: true,
        };
      }

      // Existing record has changed — calculate next version
      const nextVersion = (existingRow.version || 1) + 1;
      const nowIso = new Date().toISOString();

      const updatePayload: Partial<ContentFileRow> = {
        lesson_id: lessonId,
        path: canonicalPath,
        slug: canonicalSlug,
        filename: fileName,
        content: rawContent,
        phase,
        week,
        day,
        title,
        subtitle,
        version: nextVersion,
        content_hash: contentHash,
        is_published: isPublished,
        is_hidden: isHidden,
        metadata: (input.metadata || fmData) as Database["public"]["Tables"]["content_files"]["Row"]["metadata"],
        updated_at: nowIso,
      };

      const { data: updated, error: updateErr } = await adminClient
        .from("content_files")
        .update(updatePayload)
        .eq("id", existingRow.id)
        .select()
        .single();

      if (updateErr) {
        return {
          success: false,
          error: `Failed to update content_files in Supabase: ${updateErr.message}`,
        };
      }

      // Record version snapshot in content_file_versions
      await adminClient.from("content_file_versions").insert({
        content_file_id: existingRow.id,
        lesson_id: lessonId,
        version: nextVersion,
        content: rawContent,
        content_hash: contentHash,
        change_summary: changeSummary || `Updated to version ${nextVersion}`,
      });

      return {
        success: true,
        record: updated as ContentFileRow,
        version: nextVersion,
        unchanged: false,
      };
    }

    // 3. New Record Insertion
    const insertPayload: Database["public"]["Tables"]["content_files"]["Insert"] = {
      id: lessonId,
      lesson_id: lessonId,
      path: canonicalPath,
      slug: canonicalSlug,
      filename: fileName,
      content: rawContent,
      content_type: canonicalPath.includes("Failure-Labs") ? "failure_lab" : "lesson",
      phase,
      week,
      day,
      title,
      subtitle,
      version: 1,
      content_hash: contentHash,
      is_published: isPublished,
      is_hidden: isHidden,
      metadata: (input.metadata || fmData) as Database["public"]["Tables"]["content_files"]["Insert"]["metadata"],
    };

    const { data: inserted, error: insertErr } = await adminClient
      .from("content_files")
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr) {
      return {
        success: false,
        error: `Failed to insert content_file in Supabase: ${insertErr.message}`,
      };
    }

    // Insert version 1 snapshot
    await adminClient.from("content_file_versions").insert({
      content_file_id: lessonId,
      lesson_id: lessonId,
      version: 1,
      content: rawContent,
      content_hash: contentHash,
      change_summary: changeSummary || "Initial version authored",
    });

    return {
      success: true,
      record: inserted as ContentFileRow,
      version: 1,
      unchanged: false,
    };
  } catch (err) {
    return {
      success: false,
      error: `Unexpected error during content upsert: ${(err as Error).message}`,
    };
  }
}

/**
 * Soft unpublish or delete a content file (admin script utility)
 */
export async function deleteContentFile(
  idOrPath: string,
  hardDelete: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const adminClient = getAdminSupabaseClient() || getServerSupabaseClient();
  if (!adminClient) {
    return { success: false, error: "Supabase unconfigured." };
  }

  try {
    if (hardDelete) {
      const { error } = await adminClient
        .from("content_files")
        .delete()
        .or(`id.eq.${idOrPath},path.eq.${idOrPath}`);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    // Soft unpublish
    const { error } = await adminClient
      .from("content_files")
      .update({ is_published: false, updated_at: new Date().toISOString() })
      .or(`id.eq.${idOrPath},path.eq.${idOrPath}`);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Bootstrap / Seed existing local markdown files from content/ into Supabase content_files.
 * CLI script tooling only.
 */
export async function bootstrapContentFromRepository(): Promise<{
  scanned: number;
  inserted: number;
  updated: number;
  unchanged: number;
  errors: string[];
}> {
  const CONTENT_ROOT = path.join(process.cwd(), "content");
  const stats = { scanned: 0, inserted: 0, updated: 0, unchanged: 0, errors: [] as string[] };

  if (!fs.existsSync(CONTENT_ROOT)) {
    return stats;
  }

  function walk(dir: string, base: string[] = []): string[] {
    let out: string[] = [];
    const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        out = out.concat(walk(full, [...base, entry.name]));
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        out.push(path.join(...base, entry.name));
      }
    }
    return out;
  }

  const relativePaths = walk(CONTENT_ROOT);
  stats.scanned = relativePaths.length;

  for (const relPath of relativePaths) {
    const fullPath = path.join(CONTENT_ROOT, relPath);
    try {
      const raw = fs.readFileSync(fullPath, "utf-8");
      const res = await upsertContentFile({
        rawContent: raw,
        fileName: relPath,
        changeSummary: "Repository bootstrap sync",
      });

      if (res.unchanged) {
        stats.unchanged += 1;
      } else if (res.success) {
        if (res.version === 1) stats.inserted += 1;
        else stats.updated += 1;
      } else if (res.error) {
        stats.errors.push(`${relPath}: ${res.error}`);
      }
    } catch (err) {
      stats.errors.push(`${relPath}: ${(err as Error).message}`);
    }
  }

  return stats;
}
