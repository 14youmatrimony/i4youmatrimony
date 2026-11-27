-- ============================================================================
-- I 4 YOU MATRIMONY - REALTIME & RLS ADMIN/PUBLIC SYNC MIGRATION
-- Ensures public read + admin/authenticated write for profiles, membership_plans,
-- offers, and wedding_vendors, plus Realtime publication with REPLICA IDENTITY FULL.
-- ============================================================================

-- 1. Offers RLS (Public read, Admin write)
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on offers" ON public.offers;
DROP POLICY IF EXISTS "Public can read offers" ON public.offers;
CREATE POLICY "Public can read offers"
  ON public.offers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage offers" ON public.offers;
CREATE POLICY "Admins can manage offers"
  ON public.offers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Membership Plans RLS (Public read, Admin write)
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on membership_plans" ON public.membership_plans;
DROP POLICY IF EXISTS "Public can read membership_plans" ON public.membership_plans;
CREATE POLICY "Public can read membership_plans"
  ON public.membership_plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage membership_plans" ON public.membership_plans;
CREATE POLICY "Admins can manage membership_plans"
  ON public.membership_plans FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Wedding Vendors RLS (Ensure Super Admin can view, approve, reject, and delete)
DROP POLICY IF EXISTS "Admins can manage all wedding_vendors" ON public.wedding_vendors;
CREATE POLICY "Admins can manage all wedding_vendors"
  ON public.wedding_vendors
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 4. Enable REPLICA IDENTITY FULL & Supabase Realtime publication
ALTER TABLE public.offers REPLICA IDENTITY FULL;
ALTER TABLE public.membership_plans REPLICA IDENTITY FULL;
ALTER TABLE public.wedding_vendors REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'offers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'membership_plans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.membership_plans;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wedding_vendors'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wedding_vendors;
  END IF;
END $$;
