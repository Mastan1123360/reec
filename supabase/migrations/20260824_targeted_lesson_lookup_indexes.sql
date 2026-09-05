-- ==============================================================================
-- REEC ACADEMY — TARGETED LESSON LOOKUP INDEXES
-- Optimizes single-lesson targeted queries on (slug, is_published) and (lesson_id, is_published)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_content_files_slug_published
  ON public.content_files(slug, is_published);

CREATE INDEX IF NOT EXISTS idx_content_files_lesson_id_published
  ON public.content_files(lesson_id, is_published);

CREATE INDEX IF NOT EXISTS idx_content_files_published_phase_week_day
  ON public.content_files(is_published, phase, week, day);
