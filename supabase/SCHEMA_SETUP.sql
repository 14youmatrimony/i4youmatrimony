-- ============================================================================
-- I 4 YOU MATRIMONY - SUPABASE SCHEMA & TABLES SETUP (PART 1)
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kzvdzospvgzlfkkptadl/sql/new
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE SEQUENCE IF NOT EXISTS public.register_id_seq START WITH 1025 INCREMENT BY 1;

-- 1. Table: public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id VARCHAR(100) PRIMARY KEY,
  register_id VARCHAR(30) UNIQUE,
  password TEXT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(250),
  phone VARCHAR(250),
  age INTEGER,
  gender VARCHAR(20),
  height VARCHAR(20),
  skin_colour VARCHAR(50),
  photo TEXT,
  photo_url TEXT,
  religion VARCHAR(50),
  caste VARCHAR(50),
  mother_tongue VARCHAR(50),
  state VARCHAR(50),
  city VARCHAR(50),
  district VARCHAR(50),
  native_address TEXT,
  education VARCHAR(100),
  education_category VARCHAR(50),
  profession VARCHAR(100),
  company VARCHAR(100),
  annual_income VARCHAR(50),
  manglik VARCHAR(30),
  diet VARCHAR(30),
  marital_status VARCHAR(100),
  partner_expectations TEXT,
  family_details TEXT,
  body_type VARCHAR(50),
  smoking VARCHAR(50),
  drinking VARCHAR(50),
  hobbies TEXT,
  about TEXT,
  verified INTEGER DEFAULT 0,
  aadhaar_verified INTEGER DEFAULT 0,
  govt_id_verified INTEGER DEFAULT 0,
  selfie_verified INTEGER DEFAULT 0,
  selfie_photo TEXT,
  selfie_match_score NUMERIC,
  match_score INTEGER DEFAULT 85,
  status VARCHAR(30) DEFAULT 'active',
  deletion_reason TEXT,
  deleted_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  aadhaar_front_image TEXT,
  aadhaar_back_image TEXT,
  aadhaar_status VARCHAR(50) DEFAULT 'pending',
  aadhaar_rejection_reason TEXT,
  single_photos TEXT,
  family_photos TEXT
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on profiles" ON public.profiles;
CREATE POLICY "Allow public all access on profiles" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Table: public.admin_users
CREATE TABLE IF NOT EXISTS public.admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role VARCHAR(50) DEFAULT 'Super Admin',
  avatar TEXT,
  last_login TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on admin_users" ON public.admin_users;
CREATE POLICY "Allow public all access on admin_users" ON public.admin_users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Table: public.offers
CREATE TABLE IF NOT EXISTS public.offers (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  discount_percent INTEGER NOT NULL,
  plan_type VARCHAR(50) NOT NULL,
  description TEXT,
  valid_from VARCHAR(20),
  valid_until VARCHAR(20),
  max_uses INTEGER DEFAULT 100,
  current_uses INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on offers" ON public.offers;
CREATE POLICY "Allow public all access on offers" ON public.offers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Table: public.membership_plans
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  tagline VARCHAR(250),
  badge VARCHAR(50),
  is_popular INTEGER DEFAULT 0,
  color VARCHAR(30) DEFAULT 'amber',
  contact_credits INTEGER DEFAULT 30,
  price_1m INTEGER DEFAULT 0,
  offer_price_1m INTEGER DEFAULT 0,
  price_3m INTEGER DEFAULT 0,
  offer_price_3m INTEGER DEFAULT 0,
  price_6m INTEGER DEFAULT 0,
  offer_price_6m INTEGER DEFAULT 0,
  price_12m INTEGER DEFAULT 0,
  offer_price_12m INTEGER DEFAULT 0,
  features TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  daily_interests VARCHAR(100) DEFAULT 'Unlimited',
  kundali_reports VARCHAR(100) DEFAULT 'Basic Ashtakoot',
  search_boost VARCHAR(100) DEFAULT '1x Standard',
  has_advisor INTEGER DEFAULT 0,
  privacy_shield VARCHAR(100) DEFAULT 'Standard',
  support_level VARCHAR(100) DEFAULT 'Priority Support',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on membership_plans" ON public.membership_plans;
CREATE POLICY "Allow public all access on membership_plans" ON public.membership_plans FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. Table: public.payments
CREATE TABLE IF NOT EXISTS public.payments (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100),
  user_name VARCHAR(150) NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  amount NUMERIC NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  payment_method VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL,
  invoice_no VARCHAR(100) NOT NULL,
  payment_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all access on payments" ON public.payments;
CREATE POLICY "Allow public all access on payments" ON public.payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Storage Buckets (Avatars & Profile Photos)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true) ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for avatars
DROP POLICY IF EXISTS "Public avatars access" ON storage.objects;
DROP POLICY IF EXISTS "Public avatars insert" ON storage.objects;
DROP POLICY IF EXISTS "Public avatars update" ON storage.objects;
DROP POLICY IF EXISTS "Public avatars delete" ON storage.objects;

CREATE POLICY "Public avatars access" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Public avatars insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Public avatars update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Public avatars delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'avatars');

-- 7. Automatic Register ID & Password Crypt Trigger
CREATE OR REPLACE FUNCTION public.fn_assign_register_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.register_id IS NULL OR TRIM(NEW.register_id) = '' THEN
    NEW.register_id := 'I4Y' || nextval('public.register_id_seq')::text;
  ELSE
    NEW.register_id := UPPER(TRIM(NEW.register_id));
  END IF;
  IF NEW.password IS NOT NULL AND LENGTH(NEW.password) > 0 AND NOT (NEW.password ~ '^\$2[aby]\$') THEN
    NEW.password := crypt(NEW.password, gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_register_id ON public.profiles;
CREATE TRIGGER trg_assign_register_id BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_assign_register_id();

-- 8. Seed Default Super Admin Account (Admin@12345)
INSERT INTO public.admin_users (id, username, email, password_hash, full_name, role)
VALUES (
  1, 
  'admin', 
  'admin@i4you.in', 
  '79720451cf440cb2eb295ad6016fa959a4192fc1498b965f7c32ae15a3df43ca:c1d2e3f4a5b6c7d8e9f0123456789abc', 
  'I 4 You Super Admin', 
  'Super Admin'
) ON CONFLICT (id) DO NOTHING;

-- 9. Seed Default Membership Plans
INSERT INTO public.membership_plans (id, name, tagline, badge, is_popular, color, contact_credits, price_3m, offer_price_3m, price_6m, offer_price_6m, price_12m, offer_price_12m, features, is_active, sort_order, price_1m, offer_price_1m, daily_interests, kundali_reports, search_boost, has_advisor, privacy_shield, support_level)
VALUES 
('silver', 'Silver Starter', 'Ideal for exploring verified matches', 'BASIC', 0, 'slate', 10, 999, 799, 1499, 1199, 1999, 1699, '[{"text": "Browse 100% Aadhaar Verified Profiles", "included": true}, {"text": "Send 15 Interests Daily", "included": true}, {"text": "View 10 Verified Contacts", "included": true}, {"text": "Basic Astrological Horoscope Matching", "included": true}, {"text": "Direct Matrimonial Chat", "included": false}, {"text": "Instant WhatsApp Family Connect Link", "included": false}]', 1, 1, 499, 399, '15/day', 'Basic Ashtakoot', '1x Standard', 0, 'Standard Public', 'Email Support'),
('gold', 'Gold Match', 'Ideal for serious marriage seekers', 'POPULAR CHOICE', 1, 'amber', 30, 1999, 1499, 2999, 2499, 3999, 3599, '[{"text": "Browse 100% Aadhaar Verified Profiles", "included": true}, {"text": "Send Unlimited Interests & Shortlists", "included": true}, {"text": "View 30 Verified Mobile Numbers & Addresses", "included": true}, {"text": "Full 36 Gunas Ashtakoot Astrological Dossier", "included": true}, {"text": "Unlimited Direct Matrimonial Chat", "included": true}, {"text": "Instant WhatsApp Family Connect Link", "included": true}, {"text": "3x Search Visibility Profile Boost", "included": false}, {"text": "Personal Matchmaking Advisor", "included": false}]', 1, 2, 999, 799, 'Unlimited', 'Full 36 Gunas', '2x Priority', 0, 'Enhanced Privacy', 'Priority Chat & Email'),
('platinum', 'Platinum Royal', 'Full luxury matrimonial suite', 'BEST VALUE', 0, 'purple', 100, 3999, 2999, 5999, 4499, 7999, 6499, '[{"text": "Browse 100% Aadhaar Verified Profiles", "included": true}, {"text": "Send Unlimited Interests & Priority Messages", "included": true}, {"text": "View 100 Verified Mobile Numbers & Family Contacts", "included": true}, {"text": "Complete Horoscope & Kundali Matching Report", "included": true}, {"text": "Unlimited Direct Matrimonial Chat & Voice Calls", "included": true}, {"text": "Instant WhatsApp Family Connect Link", "included": true}, {"text": "5x Top-Rank Search Visibility Profile Boost", "included": true}, {"text": "Personal Relationship Advisor & Manager", "included": true}]', 1, 3, 1999, 1499, 'Unlimited', 'Full 36 Gunas + Dosha Analysis', '5x VIP Boost', 1, 'Maximum VIP Shield', '24/7 Dedicated Manager')
ON CONFLICT (id) DO NOTHING;

-- 10. Table: public.interests
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

-- 11. Table: public.messages
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

-- 12. Table: public.notifications
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

-- 13. Enable Realtime Replication Publication
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
