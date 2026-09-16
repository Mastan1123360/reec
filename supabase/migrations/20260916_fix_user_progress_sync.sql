-- ==============================================================================
-- REEC ACADEMY — FIX USER PROGRESS SYNCHRONIZATION MIGRATION
-- Migration: 20260916_fix_user_progress_sync.sql
--
-- Ensures public.user_progress table supports numeric/fractional study times,
-- guarantees idempotent columns and constraints, updates RLS policies,
-- and reloads PostgREST schema cache.
-- ==============================================================================

-- 1. Ensure user_progress table exists
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  bookmarks JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_visited TEXT,
  study_time_minutes NUMERIC NOT NULL DEFAULT 0,
  daily_minutes JSONB NOT NULL DEFAULT '{}'::jsonb,
  active_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_progress_user_id_key UNIQUE (user_id)
);

-- 2. Alter column types idempotently to ensure NUMERIC compatibility
DO $$
BEGIN
  -- Change study_time_minutes to NUMERIC if it is INTEGER or INT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND column_name = 'study_time_minutes' 
      AND data_type IN ('integer', 'smallint', 'bigint')
  ) THEN
    ALTER TABLE public.user_progress 
      ALTER COLUMN study_time_minutes TYPE NUMERIC USING study_time_minutes::NUMERIC;
  END IF;
END $$;

-- 3. Idempotently ensure all columns exist
ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS completed_lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS completed_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bookmarks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_visited TEXT,
  ADD COLUMN IF NOT EXISTS study_time_minutes NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_minutes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS active_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- 4. Enable Row Level Security & apply policies
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_progress_select_own" ON public.user_progress;
DROP POLICY IF EXISTS "user_progress_insert_own" ON public.user_progress;
DROP POLICY IF EXISTS "user_progress_update_own" ON public.user_progress;
DROP POLICY IF EXISTS "user_progress_delete_own" ON public.user_progress;

CREATE POLICY "user_progress_select_own"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_progress_insert_own"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_progress_update_own"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_progress_delete_own"
  ON public.user_progress FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
