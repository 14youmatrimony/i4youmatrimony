-- ============================================================================
-- I 4 YOU MATRIMONY - VENDOR VERIFICATION, OTP & NEW CATEGORIES MIGRATION
-- Additive-only migration for public.wedding_vendors
-- ============================================================================

-- 1. Add verification, OTP, location, and business detail columns
ALTER TABLE public.wedding_vendors
  ADD COLUMN IF NOT EXISTS is_mobile_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_doc_url TEXT,
  ADD COLUMN IF NOT EXISTS service_area TEXT,
  ADD COLUMN IF NOT EXISTS experience_years TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT;

-- 2. Expand category CHECK constraint to include new service categories
ALTER TABLE public.wedding_vendors
  DROP CONSTRAINT IF EXISTS wedding_vendors_category_check;

ALTER TABLE public.wedding_vendors
  ADD CONSTRAINT wedding_vendors_category_check CHECK (
    category IN (
      'clothing',
      'jewellery',
      'catering',
      'rentals',
      'photography',
      'makeup',
      'stitching',
      'stage_decoration',
      'vehicle_rental',
      'tourist_buses'
    )
  );

-- 3. Indexes for verified + approved filtering
CREATE INDEX IF NOT EXISTS idx_wedding_vendors_verified
  ON public.wedding_vendors(is_verified);

CREATE INDEX IF NOT EXISTS idx_wedding_vendors_verified_approved
  ON public.wedding_vendors(is_verified, is_approved);

-- 4. Update public/free-tier safe view to require BOTH is_verified AND is_approved
CREATE OR REPLACE VIEW public.wedding_vendors_public AS
SELECT
  id,
  business_name,
  category,
  district,
  is_verified
FROM public.wedding_vendors
WHERE is_verified = TRUE AND is_approved = TRUE;

GRANT SELECT ON public.wedding_vendors_public TO anon, authenticated;

-- 5. Update RLS policies to enforce is_verified = TRUE AND is_approved = TRUE
DROP POLICY IF EXISTS "Premium users can view approved vendors" ON public.wedding_vendors;
CREATE POLICY "Premium users can view approved vendors"
  ON public.wedding_vendors
  FOR SELECT
  TO authenticated
  USING (
    (is_verified = TRUE AND is_approved = TRUE AND public.is_premium_user())
    OR owner_user_id = auth.uid()
    OR public.is_super_admin()
  );

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
          (v.is_verified = TRUE AND v.is_approved = TRUE AND public.is_premium_user())
          OR v.owner_user_id = auth.uid()
          OR public.is_super_admin()
        )
    )
  );

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
        AND v.is_verified = TRUE
        AND v.is_approved = TRUE
    )
  );

-- 6. Prevent non-admin vendors from self-verifying or self-approving
CREATE OR REPLACE FUNCTION public.prevent_vendor_self_approve()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_verified := FALSE;
      NEW.is_approved := FALSE;
      NEW.rejection_reason := NULL;
    ELSE
      NEW.is_verified := COALESCE(OLD.is_verified, FALSE);
      NEW.is_approved := COALESCE(OLD.is_approved, FALSE);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_vendor_self_approve ON public.wedding_vendors;
CREATE TRIGGER trg_prevent_vendor_self_approve
  BEFORE INSERT OR UPDATE ON public.wedding_vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_vendor_self_approve();
