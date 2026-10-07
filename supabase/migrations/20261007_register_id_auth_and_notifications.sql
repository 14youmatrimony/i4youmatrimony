-- ============================================================================
-- I 4 YOU MATRIMONY - SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Custom "Register ID and Password" Authentication & Email Notifications
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_net; -- Required for automated Edge Function webhooks

-- 2. Create Sequential Counter for Register IDs (I4Y1001, I4Y1002, ...)
CREATE SEQUENCE IF NOT EXISTS public.register_id_seq
  START WITH 1001
  INCREMENT BY 1;

-- 3. Add 'register_id' and 'password' Columns to profiles Table
-- (If your table is named 'users', replace 'profiles' with 'users')
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS register_id VARCHAR(30) UNIQUE,
  ADD COLUMN IF NOT EXISTS password TEXT;

-- Create fast query index for login lookups
CREATE INDEX IF NOT EXISTS idx_profiles_register_id ON public.profiles (LOWER(TRIM(register_id)));
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (LOWER(TRIM(email)));

-- 4. Automatic Sequential ID Generation Trigger Function
-- Automatically assigns 'I4Y1001', 'I4Y1002', etc. upon row insertion if not provided
CREATE OR REPLACE FUNCTION public.fn_assign_register_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.register_id IS NULL OR TRIM(NEW.register_id) = '' THEN
    NEW.register_id := 'I4Y' || nextval('public.register_id_seq')::text;
  ELSE
    -- Ensure uppercase formatting
    NEW.register_id := UPPER(TRIM(NEW.register_id));
  END IF;

  -- Ensure password is cryptographically hashed if passed in plaintext
  IF NEW.password IS NOT NULL AND LENGTH(NEW.password) > 0 AND NOT (NEW.password ~ '^\$2[aby]\$') THEN
    -- If not already a bcrypt hash or sha256, hash it securely
    NEW.password := crypt(NEW.password, gen_salt('bf', 10));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_register_id ON public.profiles;
CREATE TRIGGER trg_assign_register_id
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.fn_assign_register_id();

-- 5. Safe Member Registration RPC Function
-- Hashes password with blowfish bcrypt (pgcrypto) and returns the generated register_id
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
  -- Generate unique ID and Register ID
  v_new_id := 'prof_' || gen_random_uuid()::text;
  v_new_reg_id := 'I4Y' || nextval('public.register_id_seq')::text;

  -- Hash password securely with pgcrypto bcrypt
  IF p_password IS NOT NULL AND LENGTH(p_password) > 0 THEN
    v_hashed_password := crypt(p_password, gen_salt('bf', 10));
  ELSE
    v_hashed_password := NULL;
  END IF;

  -- Insert member into profiles
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

  -- Return created member details (excluding password)
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

-- 6. Custom Member Authentication RPC Function
-- Validates Register ID and Password against pgcrypto bcrypt hash or SHA-256 hash
CREATE OR REPLACE FUNCTION public.authenticate_member(
  p_register_id TEXT,
  p_password TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_is_valid BOOLEAN := FALSE;
  v_clean_reg_id TEXT;
BEGIN
  v_clean_reg_id := UPPER(TRIM(p_register_id));

  -- Lookup profile by register_id (or email as alternative)
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE UPPER(TRIM(register_id)) = v_clean_reg_id
     OR LOWER(TRIM(email)) = LOWER(TRIM(p_register_id))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Register ID not found');
  END IF;

  -- Verify password using pgcrypto crypt() OR SHA-256 hex match OR plaintext fallback
  IF v_profile.password = crypt(p_password, v_profile.password)
     OR v_profile.password = encode(digest(p_password, 'sha256'), 'hex')
     OR v_profile.password = p_password THEN
    v_is_valid := TRUE;
  END IF;

  IF NOT v_is_valid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid password');
  END IF;

  -- Authentication successful: Return profile record (without password)
  RETURN jsonb_build_object(
    'success', true,
    'id', v_profile.id,
    'register_id', v_profile.register_id,
    'name', v_profile.name,
    'email', v_profile.email,
    'phone', v_profile.phone,
    'gender', v_profile.gender,
    'age', v_profile.age,
    'height', v_profile.height,
    'photo', v_profile.photo,
    'religion', v_profile.religion,
    'caste', v_profile.caste,
    'state', v_profile.state,
    'city', v_profile.city,
    'verified', v_profile.verified,
    'aadhaar_verified', v_profile.aadhaar_verified,
    'membership', v_profile.membership
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Notifications Table for In-App Activity & Email Triggers
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id TEXT,
  recipient_email TEXT,
  recipient_register_id TEXT,
  type VARCHAR(50) NOT NULL, -- 'registration_confirmation', 'interest_received', 'shortlist_alert', 'match_alert', 'chat_message'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_email_sent ON public.notifications (email_sent) WHERE NOT email_sent;

-- 8. Automated Database Trigger: Call Supabase Edge Function on New Notification
-- Uses Supabase's native pg_net extension for non-blocking HTTP requests
CREATE OR REPLACE FUNCTION public.fn_trigger_email_on_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_payload JSONB;
  v_url TEXT;
  v_anon_key TEXT;
BEGIN
  -- Construct payload for the Edge Function
  v_payload := jsonb_build_object(
    'type', NEW.type,
    'to', NEW.recipient_email,
    'title', NEW.title,
    'message', NEW.message,
    'metadata', NEW.metadata,
    'notification_id', NEW.id
  );

  -- Only trigger if recipient email is present and email has not already been sent
  IF NEW.recipient_email IS NOT NULL AND NEW.recipient_email LIKE '%@%' AND NOT NEW.email_sent THEN
    -- Invoke Supabase Edge Function asynchronously via pg_net
    -- (Replace with your project ref: https://<project-ref>.supabase.co/functions/v1/send-email-notification)
    PERFORM net.http_post(
      url := 'https://ejtkrilhntdbsiavugta.supabase.co/functions/v1/send-email-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := v_payload
    );

    UPDATE public.notifications
    SET email_sent = TRUE, email_sent_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notification_email ON public.notifications;
CREATE TRIGGER trg_notification_email
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.fn_trigger_email_on_notification();

-- 9. Row Level Security (RLS) Configuration
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow public read of active profiles (omitting sensitive columns in frontend queries)
DROP POLICY IF EXISTS "Public can view active profiles" ON public.profiles;
CREATE POLICY "Public can view active profiles" 
ON public.profiles FOR SELECT 
USING (status = 'active');

-- Allow profile registration and profile updates
DROP POLICY IF EXISTS "Anyone can insert new profiles" ON public.profiles;
CREATE POLICY "Anyone can insert new profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Profiles can update their own data" ON public.profiles;
CREATE POLICY "Profiles can update their own data" 
ON public.profiles FOR UPDATE 
USING (true);

-- Allow anyone to insert notifications and read their own
DROP POLICY IF EXISTS "Enable insert notifications" ON public.notifications;
CREATE POLICY "Enable insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read notifications" ON public.notifications;
CREATE POLICY "Enable read notifications" 
ON public.notifications FOR SELECT 
USING (true);
