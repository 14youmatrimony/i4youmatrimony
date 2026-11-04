-- ============================================================================
-- Migration: Cloudflare R2 Storage & Photo URLs Support
-- Date: November 2026
-- Description: Adds avatar_url and photos columns (if not existing) to mirror
--              photo_url and single_photos for maximum client compatibility.
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photos TEXT;

-- Update existing records to ensure avatar_url and photos match photo_url and single_photos
UPDATE public.profiles
SET 
  avatar_url = COALESCE(avatar_url, photo_url, photo),
  photos = COALESCE(photos, single_photos)
WHERE avatar_url IS NULL OR photos IS NULL;
