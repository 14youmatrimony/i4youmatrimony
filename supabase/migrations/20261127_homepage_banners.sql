-- ============================================================================
-- I 4 YOU MATRIMONY - HOMEPAGE BANNERS TABLE & REALTIME MIGRATION
-- Stores strictly Cloudflare R2 URLs (banners/ prefix), display_order, is_active.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.homepage_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title TEXT,
  display_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  original_size_kb INTEGER,
  compressed_size_kb INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homepage_banners_active_order
  ON public.homepage_banners(is_active, display_order ASC);

ALTER TABLE public.homepage_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read homepage_banners" ON public.homepage_banners;
CREATE POLICY "Public can read homepage_banners"
  ON public.homepage_banners
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage homepage_banners" ON public.homepage_banners;
CREATE POLICY "Admins can manage homepage_banners"
  ON public.homepage_banners
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.homepage_banners REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'homepage_banners'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_banners;
  END IF;
END $$;
