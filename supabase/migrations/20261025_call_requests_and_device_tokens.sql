-- ============================================================================
-- I 4 YOU MATRIMONY - SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Call Notification System: Tables, Device Tokens & Automated Webhook Trigger
-- ============================================================================

-- 1. Ensure required extensions are active
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Table: user_device_tokens
-- Stores multi-platform push notification and VoIP tokens per user
CREATE TABLE IF NOT EXISTS public.user_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,                  -- Profile UUID or ID
  register_id TEXT,                       -- e.g. 'I4Y1001'
  platform VARCHAR(20) NOT NULL,          -- 'android' | 'ios' | 'web'
  token TEXT,                             -- FCM device registration token
  voip_token TEXT,                        -- iOS PushKit VoIP device token
  device_name TEXT,                       -- Optional e.g. 'Pixel 7', 'iPhone 15'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON public.user_device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_register_id ON public.user_device_tokens(register_id);

-- 3. Table: call_requests
-- Stores call session records, signaling initiation, and status
CREATE TABLE IF NOT EXISTS public.call_requests (
  id TEXT PRIMARY KEY,                    -- e.g. 'call_1729849200000_abcde'
  caller_id TEXT NOT NULL,                -- User initiating the call
  callee_id TEXT NOT NULL,                -- User receiving the call
  caller_name TEXT NOT NULL,              -- Display name of caller
  caller_photo TEXT,                      -- Avatar URL
  call_type VARCHAR(20) DEFAULT 'audio',  -- 'audio' or 'video'
  channel_name TEXT NOT NULL,             -- WebRTC / Agora signaling channel
  status VARCHAR(20) DEFAULT 'ringing',   -- 'ringing', 'accepted', 'declined', 'ended', 'missed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_call_requests_callee ON public.call_requests(callee_id, status);
CREATE INDEX IF NOT EXISTS idx_call_requests_caller ON public.call_requests(caller_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.user_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_requests ENABLE ROW LEVEL SECURITY;

-- Device Tokens Policies
DROP POLICY IF EXISTS "Users can manage their own device tokens" ON public.user_device_tokens;
CREATE POLICY "Users can manage their own device tokens"
ON public.user_device_tokens FOR ALL
USING (true)
WITH CHECK (true);

-- Call Requests Policies
DROP POLICY IF EXISTS "Users can view and create call requests" ON public.call_requests;
CREATE POLICY "Users can view and create call requests"
ON public.call_requests FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Automated Database Trigger: Call Supabase Edge Function on New Call Request
-- Dispatches a background HTTP POST to the 'call-handler' edge function via pg_net
CREATE OR REPLACE FUNCTION public.fn_trigger_call_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_payload JSONB;
  v_project_url TEXT;
  v_anon_key TEXT;
BEGIN
  -- Construct payload matching edge function requirements
  v_payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'call_requests',
    'record', jsonb_build_object(
      'id', NEW.id,
      'caller_id', NEW.caller_id,
      'callee_id', NEW.callee_id,
      'caller_name', NEW.caller_name,
      'caller_photo', NEW.caller_photo,
      'call_type', NEW.call_type,
      'channel_name', NEW.channel_name,
      'status', NEW.status,
      'created_at', NEW.created_at
    )
  );

  -- Perform non-blocking HTTP POST to Supabase Edge Function
  PERFORM net.http_post(
    url := 'https://kzvdzospvgzlfkkptadl.supabase.co/functions/v1/call-handler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := v_payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_call_notification ON public.call_requests;
CREATE TRIGGER trg_call_notification
AFTER INSERT ON public.call_requests
FOR EACH ROW
EXECUTE FUNCTION public.fn_trigger_call_notification();
