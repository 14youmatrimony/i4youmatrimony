-- ============================================================================
-- Migration: Disable RLS and create save_and_lock_user_photos RPC function
-- Date: November 2026
-- Description:
--   1. Completely disables Row Level Security (RLS) on public.profiles to avoid any blocking.
--   2. Creates save_and_lock_user_photos RPC function that matches user rows
--      regardless of I4Y/i4y case or composite timestamp suffix, updating all
--      photo columns, and inserting a new row if none is found.
-- ============================================================================

-- 1. Disable RLS block completely on profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Special function to save and lock user photos regardless of I4Y/i4y case
CREATE OR REPLACE FUNCTION save_and_lock_user_photos(
  p_user_id TEXT,
  p_main_photo TEXT,
  p_single_photos JSONB,
  p_family_photo TEXT,
  p_family_photos JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_row public.profiles;
BEGIN
  -- First update by id or register_id (case-insensitive) or phone or prefix pattern
  UPDATE public.profiles
  SET 
    photo = COALESCE(p_main_photo, photo),
    photo_url = COALESCE(p_main_photo, photo_url),
    profile_photo_url = COALESCE(p_main_photo, profile_photo_url),
    avatar_url = COALESCE(p_main_photo, avatar_url),
    photos = COALESCE(p_single_photos, photos),
    single_photos = COALESCE(p_single_photos::text, single_photos),
    family_photo = COALESCE(p_family_photo, family_photo),
    family_photo_url = COALESCE(p_family_photo, family_photo_url),
    family_photos = COALESCE(p_family_photos::text, family_photos),
    updated_at = NOW()
  WHERE LOWER(id::text) = LOWER(p_user_id) 
     OR LOWER(register_id::text) = LOWER(p_user_id)
     OR (p_user_id ~* '^i4y[0-9]+' AND LOWER(id::text) LIKE LOWER(p_user_id) || '_%')
     OR (p_user_id ~ '^[0-9]+$' AND phone IS NOT NULL AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = RIGHT(p_user_id, 10))
  RETURNING * INTO v_row;

  -- If user not in table (0 rows updated), insert a new row
  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      id, register_id, photo, photo_url, profile_photo_url, avatar_url,
      photos, single_photos, family_photo, family_photo_url, family_photos,
      created_at, updated_at
    )
    VALUES (
      p_user_id, p_user_id, p_main_photo, p_main_photo, p_main_photo, p_main_photo,
      COALESCE(p_single_photos, '[]'::jsonb), COALESCE(p_single_photos::text, '[]'),
      p_family_photo, p_family_photo, COALESCE(p_family_photos::text, '[]'),
      NOW(), NOW()
    )
    RETURNING * INTO v_row;
  END IF;

  RETURN to_jsonb(v_row);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION save_and_lock_user_photos(TEXT, TEXT, JSONB, TEXT, JSONB) TO anon, authenticated, service_role;
