-- ============================================================================
-- Migration: Add profile_photo_url and family_photo_url columns to profiles
-- Date: November 2026
-- Description: Ensures explicit columns exist for profile_photo_url and
--              family_photo_url for unified cross-platform photo upload and
--              retrieval across Flutter, React Web, and Capacitor mobile.
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS family_photo_url TEXT;

-- Backfill profile_photo_url from photo_url, photo, or avatar_url
UPDATE public.profiles
SET profile_photo_url = COALESCE(profile_photo_url, photo_url, photo, avatar_url)
WHERE profile_photo_url IS NULL AND (photo_url IS NOT NULL OR photo IS NOT NULL OR avatar_url IS NOT NULL);

-- Backfill family_photo_url from family_photos if available
UPDATE public.profiles
SET family_photo_url = COALESCE(
  family_photo_url,
  CASE
    WHEN family_photos IS NOT NULL AND family_photos LIKE '[%' AND family_photos NOT LIKE '[]' THEN
      -- Extract the first URL element from a JSON array string if possible
      TRIM(BOTH '"' FROM split_part(TRIM(BOTH '[]' FROM family_photos), ',', 1))
    WHEN family_photos IS NOT NULL AND family_photos LIKE 'http%' THEN
      family_photos
    ELSE NULL
  END
)
WHERE family_photo_url IS NULL AND family_photos IS NOT NULL;
