-- ==============================================================================
-- REEC ACADEMY — USERNAME DOMAIN SCHEMA & DATABASE CONSTRAINTS
-- Authoritative persistent storage and uniqueness enforcement for usernames
-- ==============================================================================

-- 1. Extend profiles table with username, avatar, and cooldown timestamp
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS avatar_id TEXT,
  ADD COLUMN IF NOT EXISTS last_username_change_at TIMESTAMPTZ;

-- 2. Enforce strict database-level global case-insensitive uniqueness on usernames
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL;

-- 3. Secure database RPC to verify username availability without exposing other user data
CREATE OR REPLACE FUNCTION public.check_username_available(
  check_username TEXT,
  exclude_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(username) = LOWER(check_username)
      AND (exclude_user_id IS NULL OR id != exclude_user_id)
  );
END;
$$;

-- 4. Secure database RPC to resolve email by username for authentication lookup
CREATE OR REPLACE FUNCTION public.lookup_email_by_username(
  lookup_username TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resolved_email TEXT;
BEGIN
  SELECT email INTO resolved_email
  FROM public.profiles
  WHERE LOWER(username) = LOWER(lookup_username)
  LIMIT 1;

  RETURN resolved_email;
END;
$$;
