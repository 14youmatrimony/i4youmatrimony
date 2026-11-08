-- ============================================================================
-- Migration: Ensure photo columns exist, update RLS, and sync R2 photo columns
-- Date: November 2026
-- Description:
--   1. Ensures all profile and family photo columns exist in public.profiles:
--      photo, photo_url, profile_photo_url, avatar_url,
--      family_photo, family_photo_url, family_photos.
--   2. Updates Row Level Security (RLS) on public.profiles to ensure seamless
--      access (Add, Update, Delete) for custom login sessions (id / register_id).
--   3. Creates sync_r2_photo_columns() trigger to automatically mirror
--      Cloudflare R2 photo additions, updates, and deletions across all columns.
-- ============================================================================

-- 1. Ensure all profile photo and family photo columns exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS photo TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS family_photo TEXT,
ADD COLUMN IF NOT EXISTS family_photo_url TEXT,
ADD COLUMN IF NOT EXISTS family_photos TEXT[];

-- 2. Update Row Level Security (RLS) for public.profiles to allow unhindered access
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public all access on profiles" ON public.profiles;
CREATE POLICY "Allow full access to profiles" ON public.profiles
FOR ALL USING (true) WITH CHECK (true);

-- 3. Automatic synchronization trigger for Cloudflare R2 photos (Add, Update & Delete)
CREATE OR REPLACE FUNCTION sync_r2_photo_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Profile photo synchronization (Add, Update & Delete)
  IF NEW.photo IS DISTINCT FROM OLD.photo THEN
    NEW.photo_url := NEW.photo;
    NEW.profile_photo_url := NEW.photo;
    NEW.avatar_url := NEW.photo;
  ELSIF NEW.photo_url IS DISTINCT FROM OLD.photo_url THEN
    NEW.photo := NEW.photo_url;
    NEW.profile_photo_url := NEW.photo_url;
    NEW.avatar_url := NEW.photo_url;
  ELSIF NEW.profile_photo_url IS DISTINCT FROM OLD.profile_photo_url THEN
    NEW.photo := NEW.profile_photo_url;
    NEW.photo_url := NEW.profile_photo_url;
    NEW.avatar_url := NEW.profile_photo_url;
  ELSIF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    NEW.photo := NEW.avatar_url;
    NEW.photo_url := NEW.avatar_url;
    NEW.profile_photo_url := NEW.avatar_url;
  END IF;

  -- Family photo synchronization (Add, Update & Delete)
  IF NEW.family_photo_url IS DISTINCT FROM OLD.family_photo_url THEN
    NEW.family_photo := NEW.family_photo_url;
  ELSIF NEW.family_photo IS DISTINCT FROM OLD.family_photo THEN
    NEW.family_photo_url := NEW.family_photo;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop previous trigger variants to prevent redundant execution
DROP TRIGGER IF EXISTS trigger_sync_photos ON public.profiles;
DROP TRIGGER IF EXISTS trigger_sync_r2_photos ON public.profiles;

CREATE TRIGGER trigger_sync_r2_photos
BEFORE UPDATE OR INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION sync_r2_photo_columns();

-- 4. Initial Backfill: Synchronize any existing profiles across all photo columns
UPDATE public.profiles
SET 
  photo = COALESCE(photo, photo_url, profile_photo_url, avatar_url),
  photo_url = COALESCE(photo_url, photo, profile_photo_url, avatar_url),
  profile_photo_url = COALESCE(profile_photo_url, photo_url, photo, avatar_url),
  avatar_url = COALESCE(avatar_url, photo_url, photo, profile_photo_url),
  family_photo = COALESCE(family_photo, family_photo_url),
  family_photo_url = COALESCE(family_photo_url, family_photo)
WHERE 
  photo IS NOT NULL 
  OR photo_url IS NOT NULL 
  OR profile_photo_url IS NOT NULL 
  OR avatar_url IS NOT NULL 
  OR family_photo IS NOT NULL 
  OR family_photo_url IS NOT NULL;
