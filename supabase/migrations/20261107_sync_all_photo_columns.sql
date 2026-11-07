-- ============================================================================
-- Migration: Add missing photo columns & create bidirectional sync trigger
-- Date: November 2026
-- Description:
--   1. Ensures all profile and family photo columns exist in public.profiles:
--      profile_photo_url, photo_url, avatar_url, image_url, photo,
--      family_photo_url, family_image_url
--   2. Creates a PL/pgSQL trigger function to automatically mirror changes
--      across all profile and family photo columns upon INSERT or UPDATE.
-- ============================================================================

-- 1. Ensure all photo columns exist in public.profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS photo TEXT,
ADD COLUMN IF NOT EXISTS family_photo_url TEXT,
ADD COLUMN IF NOT EXISTS family_image_url TEXT;

-- 2. Trigger function to automatically mirror photo columns
CREATE OR REPLACE FUNCTION sync_all_photo_columns()
RETURNS TRIGGER AS $$
DECLARE
  selected_photo TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- On INSERT, find the first non-null profile photo
    selected_photo := COALESCE(NEW.profile_photo_url, NEW.photo_url, NEW.avatar_url, NEW.image_url, NEW.photo);
    IF selected_photo IS NOT NULL THEN
      NEW.profile_photo_url := selected_photo;
      NEW.photo_url         := selected_photo;
      NEW.avatar_url        := selected_photo;
      NEW.image_url         := selected_photo;
      NEW.photo             := selected_photo;
    END IF;

    IF NEW.family_photo_url IS NOT NULL THEN
      NEW.family_image_url := NEW.family_photo_url;
    ELSIF NEW.family_image_url IS NOT NULL THEN
      NEW.family_photo_url := NEW.family_image_url;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- On UPDATE, mirror whichever profile photo column was modified
    IF NEW.profile_photo_url IS DISTINCT FROM OLD.profile_photo_url THEN
      NEW.photo_url         := NEW.profile_photo_url;
      NEW.avatar_url        := NEW.profile_photo_url;
      NEW.image_url         := NEW.profile_photo_url;
      NEW.photo             := NEW.profile_photo_url;
    ELSIF NEW.photo_url IS DISTINCT FROM OLD.photo_url THEN
      NEW.profile_photo_url := NEW.photo_url;
      NEW.avatar_url        := NEW.photo_url;
      NEW.image_url         := NEW.photo_url;
      NEW.photo             := NEW.photo_url;
    ELSIF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
      NEW.profile_photo_url := NEW.avatar_url;
      NEW.photo_url         := NEW.avatar_url;
      NEW.image_url         := NEW.avatar_url;
      NEW.photo             := NEW.avatar_url;
    ELSIF NEW.image_url IS DISTINCT FROM OLD.image_url THEN
      NEW.profile_photo_url := NEW.image_url;
      NEW.photo_url         := NEW.image_url;
      NEW.avatar_url        := NEW.image_url;
      NEW.photo             := NEW.image_url;
    ELSIF NEW.photo IS DISTINCT FROM OLD.photo THEN
      NEW.profile_photo_url := NEW.photo;
      NEW.photo_url         := NEW.photo;
      NEW.avatar_url        := NEW.photo;
      NEW.image_url         := NEW.photo;
    END IF;

    -- Mirror family photo updates
    IF NEW.family_photo_url IS DISTINCT FROM OLD.family_photo_url THEN
      NEW.family_image_url := NEW.family_photo_url;
    ELSIF NEW.family_image_url IS DISTINCT FROM OLD.family_image_url THEN
      NEW.family_photo_url := NEW.family_image_url;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger to public.profiles
DROP TRIGGER IF EXISTS trigger_sync_photos ON public.profiles;
CREATE TRIGGER trigger_sync_photos
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION sync_all_photo_columns();

-- 4. Initial Backfill: Synchronize all existing profile records
UPDATE public.profiles
SET 
  profile_photo_url = COALESCE(profile_photo_url, photo_url, photo, avatar_url, image_url),
  photo_url = COALESCE(photo_url, profile_photo_url, photo, avatar_url, image_url),
  avatar_url = COALESCE(avatar_url, profile_photo_url, photo_url, photo, image_url),
  image_url = COALESCE(image_url, profile_photo_url, photo_url, photo, avatar_url),
  photo = COALESCE(photo, profile_photo_url, photo_url, avatar_url, image_url),
  family_photo_url = COALESCE(family_photo_url, family_image_url),
  family_image_url = COALESCE(family_image_url, family_photo_url)
WHERE 
  profile_photo_url IS NOT NULL 
  OR photo_url IS NOT NULL 
  OR photo IS NOT NULL 
  OR avatar_url IS NOT NULL 
  OR image_url IS NOT NULL 
  OR family_photo_url IS NOT NULL 
  OR family_image_url IS NOT NULL;
