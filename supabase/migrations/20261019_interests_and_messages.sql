-- ============================================================================
-- I 4 YOU MATRIMONY - SUPABASE SCHEMA MIGRATION: INTERESTS & MESSAGES
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kzvdzospvgzlfkkptadl/sql/new
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Table: public.interests
CREATE TABLE IF NOT EXISTS public.interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id VARCHAR(100) NOT NULL,
  receiver_id VARCHAR(100) NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_sender_receiver UNIQUE(sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_interests_sender ON public.interests (sender_id);
CREATE INDEX IF NOT EXISTS idx_interests_receiver ON public.interests (receiver_id);
CREATE INDEX IF NOT EXISTS idx_interests_status ON public.interests (status);

ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on interests" ON public.interests;
CREATE POLICY "Allow public all access on interests" ON public.interests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Table: public.messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR(100),
  sender_id VARCHAR(100) NOT NULL,
  receiver_id VARCHAR(100) NOT NULL,
  text TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'delivered',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on messages" ON public.messages;
CREATE POLICY "Allow public all access on messages" ON public.messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Table: public.notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id VARCHAR(100),
  recipient_email VARCHAR(250),
  recipient_register_id VARCHAR(50),
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_reg ON public.notifications (recipient_register_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on notifications" ON public.notifications;
CREATE POLICY "Allow public all access on notifications" ON public.notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Enable Realtime Publications
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.interests;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
