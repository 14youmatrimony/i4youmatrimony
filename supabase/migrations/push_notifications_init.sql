-- ============================================================================
-- I 4 YOU MATRIMONY - SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Standalone Web Push & Background Notification System
-- ============================================================================

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Table: public.push_subscriptions
-- Stores W3C Web Push API subscriptions across Web, Android PWA, and iOS PWA
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  subscription_json JSONB NOT NULL,
  device_type TEXT DEFAULT 'web',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_push_subscriptions_user_endpoint UNIQUE(user_id, endpoint)
);

-- 3. Indexes for fast lookup and pruning
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON public.push_subscriptions (endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subs_updated_at ON public.push_subscriptions (updated_at);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies for Authenticated Users (auth.uid() = user_id)
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update own push subscriptions"
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Also allow service_role full administrative access (Edge Functions & Webhooks)
DROP POLICY IF EXISTS "Service role full access on push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role full access on push subscriptions"
ON public.push_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. Realtime Publication (Optional - allows listening to subscription changes)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- 7. Ensure Target Application Tables Exist (Fail-Safe)
-- ============================================================================

-- Ensure public.messages exists if not yet initialized
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR(100),
  sender_id VARCHAR(100) NOT NULL,
  receiver_id VARCHAR(100) NOT NULL,
  text TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'delivered',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure public.call_requests exists if not yet initialized
CREATE TABLE IF NOT EXISTS public.call_requests (
  id TEXT PRIMARY KEY,
  caller_id TEXT NOT NULL,
  callee_id TEXT NOT NULL,
  caller_name TEXT NOT NULL,
  caller_photo TEXT,
  call_type VARCHAR(20) DEFAULT 'audio',
  channel_name TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'ringing',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_call_requests_callee ON public.call_requests(callee_id, status);
CREATE INDEX IF NOT EXISTS idx_call_requests_caller ON public.call_requests(caller_id);

-- Enable RLS on call_requests if table was just created
DO $$
BEGIN
  ALTER TABLE public.call_requests ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Allow all access on call_requests" ON public.call_requests;
  CREATE POLICY "Allow all access on call_requests" ON public.call_requests FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- 8. Automated Database Trigger: Dispatch Web Push on New Chat Message
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_trigger_push_on_message()
RETURNS TRIGGER AS $$
DECLARE
  v_payload JSONB;
  v_sender_name TEXT := 'A match';
BEGIN
  -- Look up sender's display name from profiles if available
  BEGIN
    SELECT COALESCE(name, full_name, 'A match')
    INTO v_sender_name
    FROM public.profiles
    WHERE id = NEW.sender_id OR register_id = NEW.sender_id
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_sender_name := 'A match';
  END;

  -- Construct Webhook payload matching the 'send-push' Edge Function format
  v_payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'messages',
    'record', jsonb_build_object(
      'id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'sender_name', v_sender_name,
      'receiver_id', NEW.receiver_id,
      'text', NEW.text,
      'status', NEW.status,
      'created_at', NEW.created_at
    )
  );

  -- Dispatch asynchronous non-blocking HTTP POST via pg_net to Supabase Edge Function
  PERFORM net.http_post(
    url := 'https://kzvdzospvgzlfkkptadl.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := v_payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger dynamically to public.messages with existence guard
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_push_on_message ON public.messages;';
    EXECUTE 'CREATE TRIGGER trg_push_on_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_push_on_message();';
  END IF;
END $$;

-- ============================================================================
-- 9. Automated Database Trigger: Dispatch Web Push on New Call Request
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_trigger_push_on_call()
RETURNS TRIGGER AS $$
DECLARE
  v_payload JSONB;
BEGIN
  -- Construct Webhook payload matching the 'send-push' Edge Function format
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

  -- Dispatch asynchronous non-blocking HTTP POST via pg_net to Supabase Edge Function
  PERFORM net.http_post(
    url := 'https://kzvdzospvgzlfkkptadl.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := v_payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger dynamically to public.call_requests with existence guard
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'call_requests'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_push_on_call ON public.call_requests;';
    EXECUTE 'CREATE TRIGGER trg_push_on_call AFTER INSERT ON public.call_requests FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_push_on_call();';
  END IF;
END $$;
