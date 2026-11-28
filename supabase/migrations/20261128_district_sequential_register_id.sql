-- ============================================================================
-- I 4 YOU MATRIMONY - DISTRICT-PREFIXED SEQUENTIAL REGISTER ID MIGRATION
-- Format: I4Y + <3-LETTER UPPERCASE DISTRICT CODE> + <5-DIGIT SEQ STARTING AT 10001>
-- Examples: Kannur -> I4YKAN10001, Kottayam -> I4YKOT10002, Ernakulam -> I4YERN10003
-- ============================================================================

-- 1. Create PostgreSQL sequence starting at 10001
CREATE SEQUENCE IF NOT EXISTS public.matrimony_reg_seq
  START WITH 10001
  INCREMENT BY 1;

-- Ensure register_id column and case-insensitive index exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS register_id VARCHAR(30) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_register_id
  ON public.profiles (LOWER(TRIM(register_id)));

-- 2. Helper function: get_district_code(district_name TEXT)
-- Extracts first 3 alphabetic characters in uppercase; defaults to 'GEN' if null/empty.
CREATE OR REPLACE FUNCTION public.get_district_code(district_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(
      UPPER(SUBSTRING(REGEXP_REPLACE(TRIM(COALESCE(district_name, '')), '[^A-Za-z]', '', 'g') FROM 1 FOR 3)),
      ''
    ),
    'GEN'
  );
$$;

-- 3. Trigger function on public.profiles (BEFORE INSERT OR UPDATE)
CREATE OR REPLACE FUNCTION public.fn_assign_register_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_dist_source TEXT;
  v_dist_code TEXT;
  v_seq_suffix TEXT;
  v_existing_id TEXT;
BEGIN
  v_dist_source := COALESCE(NULLIF(TRIM(NEW.district), ''), NULLIF(TRIM(NEW.city), ''), '');
  v_dist_code := public.get_district_code(v_dist_source);

  IF TG_OP = 'INSERT' THEN
    IF NEW.register_id IS NULL OR TRIM(NEW.register_id) = '' THEN
      NEW.register_id := 'I4Y' || v_dist_code || nextval('public.matrimony_reg_seq')::TEXT;
    ELSE
      NEW.register_id := UPPER(TRIM(NEW.register_id));
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_existing_id := UPPER(TRIM(COALESCE(NULLIF(NEW.register_id, ''), OLD.register_id, '')));
    IF v_existing_id = '' THEN
      NEW.register_id := 'I4Y' || v_dist_code || nextval('public.matrimony_reg_seq')::TEXT;
    ELSIF NEW.district IS DISTINCT FROM OLD.district AND NULLIF(TRIM(NEW.district), '') IS NOT NULL THEN
      -- Preserve numeric sequence when user updates their district
      v_seq_suffix := SUBSTRING(v_existing_id FROM '(\d+)$');
      IF v_seq_suffix IS NOT NULL AND v_seq_suffix <> '' THEN
        NEW.register_id := 'I4Y' || public.get_district_code(NEW.district) || v_seq_suffix;
      ELSE
        NEW.register_id := v_existing_id;
      END IF;
    ELSE
      NEW.register_id := v_existing_id;
    END IF;
  END IF;

  -- Ensure password is cryptographically hashed if passed in plaintext
  IF NEW.password IS NOT NULL AND LENGTH(NEW.password) > 0 AND NOT (NEW.password ~ '^\$2[aby]\$') THEN
    IF TG_OP = 'INSERT' OR NEW.password IS DISTINCT FROM OLD.password THEN
      NEW.password := crypt(NEW.password, gen_salt('bf', 10));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_register_id ON public.profiles;
CREATE TRIGGER trg_assign_register_id
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_assign_register_id();

-- 4. Update handle_new_user() so auth.users inserts leave register_id NULL
--    and let trg_assign_register_id assign I4Y<DIST><10001+> atomically.
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

  INSERT INTO public.profiles (
    id,
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

-- 5. Update register_member() RPC to use trg_assign_register_id / matrimony_reg_seq
CREATE OR REPLACE FUNCTION public.register_member(
  p_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT 'Female',
  p_password TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_new_id TEXT;
  v_new_reg_id TEXT;
  v_hashed_password TEXT;
  v_result JSONB;
BEGIN
  v_new_id := 'prof_' || gen_random_uuid()::text;
  v_new_reg_id := 'I4Y' || public.get_district_code(p_city) || nextval('public.matrimony_reg_seq')::TEXT;

  IF p_password IS NOT NULL AND LENGTH(p_password) > 0 THEN
    v_hashed_password := crypt(p_password, gen_salt('bf', 10));
  ELSE
    v_hashed_password := NULL;
  END IF;

  INSERT INTO public.profiles (
    id,
    register_id,
    password,
    name,
    email,
    phone,
    gender,
    state,
    city,
    status,
    verified,
    created_at,
    updated_at
  ) VALUES (
    v_new_id,
    v_new_reg_id,
    v_hashed_password,
    p_name,
    p_email,
    p_phone,
    p_gender,
    p_state,
    p_city,
    'active',
    1,
    NOW(),
    NOW()
  );

  SELECT jsonb_build_object(
    'id', v_new_id,
    'register_id', v_new_reg_id,
    'name', p_name,
    'email', p_email,
    'phone', p_phone,
    'gender', p_gender,
    'status', 'active'
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Backfill existing active profiles sequentially starting from 10001
--    and advance matrimony_reg_seq accordingly.
DO $$
DECLARE
  v_max_seq BIGINT := 10000;
  rec RECORD;
  v_seq BIGINT := 10000;
BEGIN
  -- Clear temporary register_id values first to avoid UNIQUE constraint collisions during re-numbering
  UPDATE public.profiles
  SET register_id = 'TMP_' || id
  WHERE COALESCE(status, 'active') <> 'deleted';

  FOR rec IN
    SELECT id, COALESCE(NULLIF(TRIM(district), ''), NULLIF(TRIM(city), ''), '') AS dist_src
    FROM public.profiles
    WHERE COALESCE(status, 'active') <> 'deleted'
    ORDER BY created_at ASC NULLS LAST, id ASC
  LOOP
    v_seq := v_seq + 1;
    UPDATE public.profiles
    SET register_id = 'I4Y' || public.get_district_code(rec.dist_src) || v_seq::TEXT
    WHERE id = rec.id;
  END LOOP;

  v_max_seq := v_seq;
  IF v_max_seq <= 10000 THEN
    PERFORM setval('public.matrimony_reg_seq', 10001, false);
  ELSE
    PERFORM setval('public.matrimony_reg_seq', v_max_seq, true);
  END IF;
END $$;
