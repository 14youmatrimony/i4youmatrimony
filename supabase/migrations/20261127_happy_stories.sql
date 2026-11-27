-- ============================================================================
-- I 4 YOU MATRIMONY - HAPPY STORIES (SUCCESS STORIES) MIGRATION
-- Stores Cloudflare R2 URLs (happy-stories/ prefix), couple details, source,
-- display_order, is_active, and compressed_size_kb.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.happy_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  couple_name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Kerala, India',
  wedding_date TEXT,
  story_text TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'admin',
  display_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  compressed_size_kb INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_happy_stories_active_order
  ON public.happy_stories(is_active, display_order ASC, created_at DESC);

ALTER TABLE public.happy_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read happy_stories" ON public.happy_stories;
CREATE POLICY "Public can read happy_stories"
  ON public.happy_stories
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins and users can manage happy_stories" ON public.happy_stories;
CREATE POLICY "Admins and users can manage happy_stories"
  ON public.happy_stories
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.happy_stories REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'happy_stories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.happy_stories;
  END IF;
END $$;
