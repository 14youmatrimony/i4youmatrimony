-- ============================================================================
-- I 4 YOU MATRIMONY - WEDDING SERVICES & VENDOR PORTAL MIGRATION
-- Additive-only migration: creates wedding_vendors, vendor_media, vendor_inquiries
-- Does NOT modify or drop any existing user profile tables.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Helper Functions for RLS
-- ----------------------------------------------------------------------------

-- Check if the current authenticated user has an active paid/premium membership
-- Uses to_jsonb(p)->>'membership' safely (no hard dependency on profiles.membership column)
-- and also checks completed/paid records in public.payments.
CREATE OR REPLACE FUNCTION public.is_premium_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE (
        p.id = auth.uid()::text
        OR LOWER(COALESCE(p.email, '')) = LOWER(COALESCE(auth.jwt()->>'email', ''))
      )
      AND LOWER(COALESCE(to_jsonb(p)->>'membership', 'free')) <> 'free'
      AND COALESCE(p.status, 'active') = 'active'
    )
    OR EXISTS (
      SELECT 1
      FROM public.payments pay
      WHERE pay.user_id = auth.uid()::text
        AND LOWER(COALESCE(pay.status, '')) IN ('completed', 'success', 'paid', 'active', 'captured')
        AND LOWER(COALESCE(pay.plan_name, '')) NOT LIKE '%free%'
    )
  );
$$;

-- Check if the current authenticated user is a Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    COALESCE(auth.jwt()->'app_metadata'->>'role', '') IN ('super_admin', 'admin')
    OR COALESCE(auth.jwt()->'user_metadata'->>'role', '') IN ('super_admin', 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.admin_users a
      WHERE LOWER(a.email) = LOWER(COALESCE(auth.jwt()->>'email', ''))
        AND a.role IN ('Super Admin', 'CRM Manager', 'Security Admin')
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. Table: public.wedding_vendors
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wedding_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  district TEXT NOT NULL,
  city_address TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN (
      'clothing',
      'jewellery',
      'catering',
      'rentals',
      'photography',
      'makeup',
      'stitching'
    )
  ),
  description TEXT,
  staff_details TEXT,
  pricing_range TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wedding_vendors_category ON public.wedding_vendors(category);
CREATE INDEX IF NOT EXISTS idx_wedding_vendors_district ON public.wedding_vendors(district);
CREATE INDEX IF NOT EXISTS idx_wedding_vendors_approved ON public.wedding_vendors(is_approved);
CREATE INDEX IF NOT EXISTS idx_wedding_vendors_owner ON public.wedding_vendors(owner_user_id);

-- Public/Free-tier safe view exposing only id, business_name, category, and district of approved vendors
CREATE OR REPLACE VIEW public.wedding_vendors_public AS
SELECT
  id,
  business_name,
  category,
  district
FROM public.wedding_vendors
WHERE is_approved = TRUE;

GRANT SELECT ON public.wedding_vendors_public TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Table: public.vendor_media
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.wedding_vendors(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  media_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_media_vendor ON public.vendor_media(vendor_id, sort_order);

-- ----------------------------------------------------------------------------
-- 4. Table: public.vendor_inquiries
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.wedding_vendors(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_inquiries_vendor ON public.vendor_inquiries(vendor_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 5. Row Level Security (RLS)
-- ----------------------------------------------------------------------------

ALTER TABLE public.wedding_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_inquiries ENABLE ROW LEVEL SECURITY;

-- wedding_vendors policies
DROP POLICY IF EXISTS "Premium users can view approved vendors" ON public.wedding_vendors;
CREATE POLICY "Premium users can view approved vendors"
  ON public.wedding_vendors
  FOR SELECT
  TO authenticated
  USING (
    (is_approved = TRUE AND public.is_premium_user())
    OR owner_user_id = auth.uid()
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Vendors can insert own profile" ON public.wedding_vendors;
CREATE POLICY "Vendors can insert own profile"
  ON public.wedding_vendors
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "Vendors can update own profile" ON public.wedding_vendors;
CREATE POLICY "Vendors can update own profile"
  ON public.wedding_vendors
  FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (owner_user_id = auth.uid() OR public.is_super_admin());

-- Prevent non-admin vendors from self-approving via UPDATE
CREATE OR REPLACE FUNCTION public.prevent_vendor_self_approve()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    NEW.is_approved := COALESCE(OLD.is_approved, FALSE);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_vendor_self_approve ON public.wedding_vendors;
CREATE TRIGGER trg_prevent_vendor_self_approve
  BEFORE UPDATE ON public.wedding_vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_vendor_self_approve();

DROP POLICY IF EXISTS "Vendors can delete own profile" ON public.wedding_vendors;
CREATE POLICY "Vendors can delete own profile"
  ON public.wedding_vendors
  FOR DELETE
  TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_super_admin());

-- vendor_media policies
DROP POLICY IF EXISTS "Premium users and owners can view vendor media" ON public.vendor_media;
CREATE POLICY "Premium users and owners can view vendor media"
  ON public.vendor_media
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wedding_vendors v
      WHERE v.id = vendor_media.vendor_id
        AND (
          (v.is_approved = TRUE AND public.is_premium_user())
          OR v.owner_user_id = auth.uid()
          OR public.is_super_admin()
        )
    )
  );

DROP POLICY IF EXISTS "Vendors can insert own media" ON public.vendor_media;
CREATE POLICY "Vendors can insert own media"
  ON public.vendor_media
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.wedding_vendors v
      WHERE v.id = vendor_media.vendor_id
        AND (v.owner_user_id = auth.uid() OR public.is_super_admin())
    )
  );

DROP POLICY IF EXISTS "Vendors can update own media" ON public.vendor_media;
CREATE POLICY "Vendors can update own media"
  ON public.vendor_media
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wedding_vendors v
      WHERE v.id = vendor_media.vendor_id
        AND (v.owner_user_id = auth.uid() OR public.is_super_admin())
    )
  );

DROP POLICY IF EXISTS "Vendors can delete own media" ON public.vendor_media;
CREATE POLICY "Vendors can delete own media"
  ON public.vendor_media
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wedding_vendors v
      WHERE v.id = vendor_media.vendor_id
        AND (v.owner_user_id = auth.uid() OR public.is_super_admin())
    )
  );

-- vendor_inquiries policies
DROP POLICY IF EXISTS "Premium users can send vendor inquiries" ON public.vendor_inquiries;
CREATE POLICY "Premium users can send vendor inquiries"
  ON public.vendor_inquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_premium_user()
    AND customer_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.wedding_vendors v
      WHERE v.id = vendor_inquiries.vendor_id
        AND v.is_approved = TRUE
    )
  );

DROP POLICY IF EXISTS "Vendors and senders can read inquiries" ON public.vendor_inquiries;
CREATE POLICY "Vendors and senders can read inquiries"
  ON public.vendor_inquiries
  FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.wedding_vendors v
      WHERE v.id = vendor_inquiries.vendor_id
        AND v.owner_user_id = auth.uid()
    )
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Vendors can mark inquiries read" ON public.vendor_inquiries;
CREATE POLICY "Vendors can mark inquiries read"
  ON public.vendor_inquiries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wedding_vendors v
      WHERE v.id = vendor_inquiries.vendor_id
        AND v.owner_user_id = auth.uid()
    )
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Super Admin can delete inquiries" ON public.vendor_inquiries;
CREATE POLICY "Super Admin can delete inquiries"
  ON public.vendor_inquiries
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());
