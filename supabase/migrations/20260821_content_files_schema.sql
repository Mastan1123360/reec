-- ==============================================================================
-- REEC ACADEMY — CANONICAL CONTENT FILES & VERSIONING SCHEMA
-- Dedicated curriculum/content storage separate from user learning data.
-- Supports live publishing, content hashing, version history, and Realtime events.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.content_files (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'lesson',
  phase INTEGER NOT NULL,
  week INTEGER,
  day INTEGER,
  title TEXT NOT NULL,
  subtitle TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  content_hash TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.content_file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_file_id TEXT NOT NULL REFERENCES public.content_files(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT content_file_version_unique UNIQUE (content_file_id, version)
);

-- Indexes for lightning-fast queries by phase, slug, and lesson_id
CREATE INDEX IF NOT EXISTS idx_content_files_phase_week_day
  ON public.content_files(phase, week, day);

CREATE INDEX IF NOT EXISTS idx_content_files_slug
  ON public.content_files(slug);

CREATE INDEX IF NOT EXISTS idx_content_files_lesson_id
  ON public.content_files(lesson_id);

CREATE INDEX IF NOT EXISTS idx_content_files_published
  ON public.content_files(is_published);

CREATE INDEX IF NOT EXISTS idx_content_file_versions_file_id
  ON public.content_file_versions(content_file_id);

-- Enable Row-Level Security
ALTER TABLE public.content_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_file_versions ENABLE ROW LEVEL SECURITY;

-- Learners / Public can only read published content
CREATE POLICY "content_files_select_published"
  ON public.content_files FOR SELECT
  USING (is_published = true);

-- Content file versions readable for published parent files
CREATE POLICY "content_file_versions_select_published"
  ON public.content_file_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.content_files cf
      WHERE cf.id = content_file_id AND cf.is_published = true
    )
  );

-- Service-role has full access for all operations (bypasses RLS by default in Supabase)
-- Realtime publication for instant content event broadcasts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'content_files'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.content_files;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Publication might already have table or publication missing in local mock
    NULL;
END $$;
