-- ============================================================================
-- I 4 YOU MATRIMONY - TWO-WAY VENDOR & CUSTOMER CHAT MIGRATION
-- Additive-only migration for vendor_inquiries two-way messaging
-- ============================================================================

ALTER TABLE public.vendor_inquiries
  ADD COLUMN IF NOT EXISTS sender_role TEXT NOT NULL DEFAULT 'customer'
    CHECK (sender_role IN ('customer', 'vendor'));

ALTER TABLE public.vendor_inquiries
  ADD COLUMN IF NOT EXISTS sender_name TEXT;

UPDATE public.vendor_inquiries
SET sender_name = COALESCE(sender_name, customer_name)
WHERE sender_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_inquiries_thread
  ON public.vendor_inquiries(vendor_id, customer_id, created_at ASC);

-- Allow vendors to insert replies into their own vendor_inquiries threads
DROP POLICY IF EXISTS "Vendors can reply to inquiries" ON public.vendor_inquiries;
CREATE POLICY "Vendors can reply to inquiries"
  ON public.vendor_inquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_role = 'vendor'
    AND EXISTS (
      SELECT 1
      FROM public.wedding_vendors v
      WHERE v.id = vendor_inquiries.vendor_id
        AND v.owner_user_id = auth.uid()
    )
  );

-- Allow customers to mark vendor replies as read
DROP POLICY IF EXISTS "Customers can mark vendor replies read" ON public.vendor_inquiries;
CREATE POLICY "Customers can mark vendor replies read"
  ON public.vendor_inquiries
  FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid());

-- Enable Realtime on vendor_inquiries for live two-way chat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'vendor_inquiries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_inquiries;
  END IF;
END $$;
