-- ============================================================================
-- Migration: 20261105_profiles_realtime_replica_identity.sql
-- Description: Enable REPLICA IDENTITY FULL on public.profiles and add to
--              supabase_realtime publication for instant cross-device sync.
-- ============================================================================

-- 1. Ensure REPLICA IDENTITY FULL is enabled for public.profiles
-- Ensures that when an UPDATE occurs, PostgreSQL writes the full row (all columns) into WAL,
-- allowing Supabase Realtime to broadcast complete updated row data to listeners.
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- 2. Add public.profiles to supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
