-- ==============================================================================
-- REEC ACADEMY — PRODUCTION SUPABASE DATABASE SCHEMA & RLS POLICIES
-- Strict user-data isolation, Row-Level Security, unique constraints & indexes
-- ==============================================================================

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 2. USER PROGRESS TABLE (Single record per user with atomic state & version)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  bookmarks JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_visited TEXT,
  study_time_minutes INTEGER NOT NULL DEFAULT 0,
  daily_minutes JSONB NOT NULL DEFAULT '{}'::jsonb,
  active_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_progress_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

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

-- ------------------------------------------------------------------------------
-- 3. USER ACTIVITY LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  timestamp BIGINT NOT NULL,
  path TEXT,
  icon_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_activity_logs_select_own"
  ON public.user_activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_activity_logs_insert_own"
  ON public.user_activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_activity_logs_update_own"
  ON public.user_activity_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_activity_logs_delete_own"
  ON public.user_activity_logs FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_timestamp
  ON public.user_activity_logs(user_id, timestamp DESC);

-- ------------------------------------------------------------------------------
-- 4. USER PROJECTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_projects (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL,
  title TEXT NOT NULL,
  tagline TEXT,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  estimated_hours INTEGER NOT NULL DEFAULT 10,
  tech_stack JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  starter_code TEXT NOT NULL DEFAULT '',
  architecture_highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TEXT NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_projects_select_own"
  ON public.user_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_projects_insert_own"
  ON public.user_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_projects_update_own"
  ON public.user_projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_projects_delete_own"
  ON public.user_projects FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_projects_user_id
  ON public.user_projects(user_id);

-- ------------------------------------------------------------------------------
-- 5. USER HIDDEN LESSONS (Strict unique constraint per user + lessonId)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_hidden_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  badge TEXT DEFAULT 'NLL',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'unlocked_unopened',
  unlocked_at BIGINT NOT NULL,
  opened_at BIGINT,
  trigger_source TEXT,
  trigger_execution_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_hidden_lessons_user_lesson_key UNIQUE (user_id, lesson_id)
);

ALTER TABLE public.user_hidden_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_hidden_lessons_select_own"
  ON public.user_hidden_lessons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_hidden_lessons_insert_own"
  ON public.user_hidden_lessons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_hidden_lessons_update_own"
  ON public.user_hidden_lessons FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_hidden_lessons_delete_own"
  ON public.user_hidden_lessons FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_hidden_lessons_user_id
  ON public.user_hidden_lessons(user_id);

-- ------------------------------------------------------------------------------
-- 6. USER WORKSPACE FILES (hello_reec Rust deliverables)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_workspace_files (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  file_created_at BIGINT NOT NULL,
  file_updated_at BIGINT NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_workspace_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_workspace_files_select_own"
  ON public.user_workspace_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_workspace_files_insert_own"
  ON public.user_workspace_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_workspace_files_update_own"
  ON public.user_workspace_files FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_workspace_files_delete_own"
  ON public.user_workspace_files FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_workspace_files_user_id
  ON public.user_workspace_files(user_id);
