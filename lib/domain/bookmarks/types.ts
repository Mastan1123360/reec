/**
 * lib/domain/bookmarks/types.ts
 *
 * Implements Master Engineering Specification Section 19:
 * BOOKMARKS
 *
 * Bookmarks belong strictly to learning state.
 * They must not be mixed with:
 * - browser state
 * - authentication state
 * - lesson loading state
 * - arbitrary component state
 *
 * Define one conceptual bookmark model.
 */

export interface Bookmark {
  readonly id: string;
  readonly lessonId: string;
  readonly lessonPath: string;
  readonly lessonTitle: string;
  readonly createdAt: string;
  readonly notes?: string;
}

export function createBookmark(params: {
  id?: string;
  lessonId: string;
  lessonPath: string;
  lessonTitle: string;
  notes?: string;
  createdAt?: string;
}): Bookmark {
  if (!params.lessonPath || typeof params.lessonPath !== "string") {
    throw new Error("Bookmark invariant violation: lessonPath is required.");
  }
  if (!params.lessonTitle || typeof params.lessonTitle !== "string") {
    throw new Error("Bookmark invariant violation: lessonTitle is required.");
  }

  return {
    id: params.id || `bm_${params.lessonId || params.lessonPath.replace(/[^a-zA-Z0-9]/g, "_")}`,
    lessonId: params.lessonId || params.lessonPath,
    lessonPath: params.lessonPath,
    lessonTitle: params.lessonTitle,
    createdAt: params.createdAt || new Date().toISOString(),
    notes: params.notes,
  };
}
