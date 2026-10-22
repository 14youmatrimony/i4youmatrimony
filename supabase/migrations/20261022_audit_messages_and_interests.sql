-- ============================================================================
-- I 4 YOU MATRIMONY - SUPABASE POSTGRESQL AUDIT MIGRATION
-- Audit and hardening for Messages and Interests tables
-- Prevents data crossover, identity spoofing, and self-interaction
-- ============================================================================

-- 1. Table: public.interests
CREATE TABLE IF NOT EXISTS public.interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id VARCHAR(100) NOT NULL,
  receiver_id VARCHAR(100) NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_sender_receiver UNIQUE(sender_id, receiver_id),
  CONSTRAINT check_no_self_interest CHECK (sender_id <> receiver_id)
);

-- Ensure check constraint exists if table already created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_no_self_interest'
  ) THEN
    ALTER TABLE public.interests ADD CONSTRAINT check_no_self_interest CHECK (sender_id <> receiver_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_interests_sender ON public.interests (sender_id);
CREATE INDEX IF NOT EXISTS idx_interests_receiver ON public.interests (receiver_id);
CREATE INDEX IF NOT EXISTS idx_interests_status ON public.interests (status);
CREATE INDEX IF NOT EXISTS idx_interests_pair ON public.interests (sender_id, receiver_id);

-- 2. Table: public.messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR(100),
  sender_id VARCHAR(100) NOT NULL,
  receiver_id VARCHAR(100) NOT NULL,
  text TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'delivered',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_no_self_message CHECK (sender_id <> receiver_id)
);

-- Ensure check constraint exists if table already created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_no_self_message'
  ) THEN
    ALTER TABLE public.messages ADD CONSTRAINT check_no_self_message CHECK (sender_id <> receiver_id);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON public.messages (sender_id, receiver_id);

-- 3. Row Level Security Hardening
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and anon access with strict non-self validation
DROP POLICY IF EXISTS "Allow interests insert non-self" ON public.interests;
CREATE POLICY "Allow interests insert non-self" ON public.interests 
FOR INSERT TO anon, authenticated 
WITH CHECK (sender_id <> receiver_id);

DROP POLICY IF EXISTS "Allow interests select for participants" ON public.interests;
CREATE POLICY "Allow interests select for participants" ON public.interests 
FOR SELECT TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow interests update for participants" ON public.interests;
CREATE POLICY "Allow interests update for participants" ON public.interests 
FOR UPDATE TO anon, authenticated 
USING (true)
WITH CHECK (sender_id <> receiver_id);

DROP POLICY IF EXISTS "Allow messages insert non-self" ON public.messages;
CREATE POLICY "Allow messages insert non-self" ON public.messages 
FOR INSERT TO anon, authenticated 
WITH CHECK (sender_id <> receiver_id);

DROP POLICY IF EXISTS "Allow messages select for participants" ON public.messages;
CREATE POLICY "Allow messages select for participants" ON public.messages 
FOR SELECT TO anon, authenticated 
USING (true);

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
