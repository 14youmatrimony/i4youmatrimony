-- ==============================================================================
-- Migration: 20261126_google_oauth_and_cleanup_ghost_profiles.sql
-- Description:
-- 1. Updates handle_new_user() trigger on auth.users to use real Google account metadata
--    (full_name, avatar_url, email) and completely removes 'Google User' hardcoded fallback.
-- 2. Clean up legacy 'Google User' ghost rows and orphaned incomplete profiles.
-- ==============================================================================

-- 1. Create or replace the handle_new_user() trigger function on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_raw_name TEXT;
  v_clean_name TEXT;
  v_avatar_url TEXT;
  v_email TEXT;
  v_email_prefix TEXT;
  v_reg_id TEXT;
BEGIN
  v_email := LOWER(TRIM(COALESCE(NEW.email, '')));
  
  -- Extract real name from Google metadata (full_name, name, user_name)
  v_raw_name := TRIM(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'user_name',
    ''
  ));

  -- Derive authentic clean name. Completely eliminates 'Google User' fallback.
  IF v_raw_name = '' OR LOWER(v_raw_name) = 'google user' OR LOWER(v_raw_name) = 'google' THEN
    IF v_email LIKE '%@%' THEN
      v_email_prefix := SPLIT_PART(v_email, '@', 1);
      v_clean_name := INITCAP(REPLACE(REPLACE(v_email_prefix, '.', ' '), '_', ' '));
    ELSE
      v_clean_name := 'Member';
    END IF;
  ELSE
    v_clean_name := v_raw_name;
  END IF;

  -- Extract real avatar from Google metadata
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->>'avatar',
    NULL
  );

  -- Fetch next sequential Register ID if register_id_seq exists
  BEGIN
    v_reg_id := 'I4Y' || nextval('public.register_id_seq')::text;
  EXCEPTION WHEN OTHERS THEN
    v_reg_id := 'I4Y' || FLOOR(1000 + RANDOM() * 9000)::text;
  END;

  -- Insert new profile using authentic details
  INSERT INTO public.profiles (
    id,
    user_id,
    register_id,
    name,
    full_name,
    email,
    photo,
    photo_url,
    profile_photo_url,
    avatar_url,
    gender,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id::text,
    NEW.id::text,
    v_reg_id,
    v_clean_name,
    v_clean_name,
    NULLIF(v_email, ''),
    v_avatar_url,
    v_avatar_url,
    v_avatar_url,
    v_avatar_url,
    COALESCE(NEW.raw_user_meta_data->>'gender', NULL),
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    name = CASE 
      WHEN public.profiles.name IS NULL OR public.profiles.name = '' OR LOWER(TRIM(public.profiles.name)) = 'google user' 
      THEN EXCLUDED.name 
      ELSE public.profiles.name 
    END,
    full_name = CASE 
      WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' OR LOWER(TRIM(public.profiles.full_name)) = 'google user' 
      THEN EXCLUDED.full_name 
      ELSE public.profiles.full_name 
    END,
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    photo = COALESCE(public.profiles.photo, EXCLUDED.photo),
    photo_url = COALESCE(public.profiles.photo_url, EXCLUDED.photo_url),
    profile_photo_url = COALESCE(public.profiles.profile_photo_url, EXCLUDED.profile_photo_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reattach trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Cleanup orphaned, incomplete, and 'Google User' ghost profiles
-- Fix any existing profiles named 'Google User' if they have an email address
UPDATE public.profiles p
SET 
  name = INITCAP(REPLACE(REPLACE(SPLIT_PART(p.email, '@', 1), '.', ' '), '_', ' ')),
  full_name = INITCAP(REPLACE(REPLACE(SPLIT_PART(p.email, '@', 1), '.', ' '), '_', ' '))
WHERE LOWER(TRIM(p.name)) = 'google user'
  AND p.email IS NOT NULL 
  AND p.email LIKE '%@%';

-- Delete remaining empty or unrecoverable 'Google User' ghost rows
DELETE FROM public.profiles
WHERE LOWER(TRIM(name)) = 'google user'
   OR (name IS NULL OR TRIM(name) = '')
   OR (
     (photo IS NULL AND photo_url IS NULL AND profile_photo_url IS NULL AND avatar_url IS NULL)
     AND (gender IS NULL OR TRIM(gender) = '')
     AND (phone IS NULL OR TRIM(phone) = '')
   );
