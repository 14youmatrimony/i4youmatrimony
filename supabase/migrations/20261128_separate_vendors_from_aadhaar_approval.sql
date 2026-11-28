-- ============================================================================
-- I 4 YOU MATRIMONY - STRICT SEPARATION OF MATRIMONY PROFILES & SERVICE PROVIDERS
-- 1. Prevents handle_new_user() from creating public.profiles rows for vendors.
-- 2. Cleans up any ghost profiles rows created for existing wedding_vendors.
-- 3. Ensures verification_doc_url is nullable and adds optional photos/map fields
--    to public.wedding_vendors.
-- ============================================================================

-- 1. Update handle_new_user() trigger so vendor/service provider signups NEVER
--    create a Matrimony user profile or enter the Aadhaar Approval queue.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_role TEXT;
  v_raw_name TEXT;
  v_clean_name TEXT;
  v_avatar_url TEXT;
  v_email TEXT;
  v_email_prefix TEXT;
  v_reg_id TEXT;
BEGIN
  v_role := LOWER(TRIM(COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.raw_app_meta_data->>'role',
    ''
  )));

  -- Strictly skip profile creation for Matrimony Service Providers / Vendors
  IF v_role IN ('vendor', 'service_provider', 'matrimony_service') THEN
    RETURN NEW;
  END IF;

  v_email := LOWER(TRIM(COALESCE(NEW.email, '')));

  -- Extract real name from Google / OAuth metadata (full_name, name, user_name)
  v_raw_name := TRIM(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'user_name',
    ''
  ));

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

  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NEW.raw_user_meta_data->>'avatar',
    NULL
  );

  BEGIN
    v_reg_id := 'I4Y' || nextval('public.register_id_seq')::text;
  EXCEPTION WHEN OTHERS THEN
    v_reg_id := 'I4Y' || FLOOR(1000 + RANDOM() * 9000)::text;
  END;

  INSERT INTO public.profiles (
    id,
    register_id,
    name,
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
    v_reg_id,
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
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    photo = COALESCE(public.profiles.photo, EXCLUDED.photo),
    photo_url = COALESCE(public.profiles.photo_url, EXCLUDED.photo_url),
    profile_photo_url = COALESCE(public.profiles.profile_photo_url, EXCLUDED.profile_photo_url),
    updated_at = NOW();

  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Clean up ghost profiles rows that were auto-created for service providers
--    (only remove rows that belong to a vendor/wedding_vendors owner and have no
--    matrimony candidate details such as age/gender/marital_status).
DELETE FROM public.profiles p
WHERE (
  EXISTS (
    SELECT 1 FROM public.wedding_vendors wv
    WHERE wv.owner_user_id::text = p.id
  )
  OR EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id::text = p.id
      AND LOWER(COALESCE(au.raw_user_meta_data->>'role', '')) IN ('vendor', 'service_provider', 'matrimony_service')
  )
)
AND p.age IS NULL
AND (p.gender IS NULL OR TRIM(p.gender) = '')
AND (p.aadhaar_front_image IS NULL OR TRIM(p.aadhaar_front_image) = '')
AND (p.aadhaar_back_image IS NULL OR TRIM(p.aadhaar_back_image) = '');

-- 3. Ensure wedding_vendors.verification_doc_url is strictly nullable and add
--    optional photos JSONB & map/coordinates columns for service listings.
ALTER TABLE public.wedding_vendors
  ALTER COLUMN verification_doc_url DROP NOT NULL;

ALTER TABLE public.wedding_vendors
  ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS map_url TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 4. Backfill wedding_vendors.photos from vendor_media images if empty
UPDATE public.wedding_vendors wv
SET photos = COALESCE((
  SELECT jsonb_agg(vm.media_url ORDER BY vm.sort_order ASC, vm.created_at ASC)
  FROM public.vendor_media vm
  WHERE vm.vendor_id = wv.id
    AND vm.media_type = 'image'
), '[]'::jsonb)
WHERE jsonb_array_length(COALESCE(wv.photos, '[]'::jsonb)) = 0
  AND EXISTS (
    SELECT 1 FROM public.vendor_media vm
    WHERE vm.vendor_id = wv.id AND vm.media_type = 'image'
  );
