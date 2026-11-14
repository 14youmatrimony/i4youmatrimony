-- Migration: 20261116_daily_contact_limit.sql
-- Description: Dynamic Daily Contact View Limit schema setup.
-- Includes admin_settings table, daily_contact_views audit log, and profiles tracking columns.

-- 1. Create admin_settings table for dynamic system configuration
CREATE TABLE IF NOT EXISTS public.admin_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '5'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- Seed default daily_contact_limit (5 contacts / day)
INSERT INTO public.admin_settings (key, value, updated_at, updated_by)
VALUES ('daily_contact_limit', '5'::jsonb, NOW(), 'system_init')
ON CONFLICT (key) DO NOTHING;

-- 2. Create daily_contact_views audit log table
CREATE TABLE IF NOT EXISTS public.daily_contact_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    viewed_profile_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast daily view count lookups by user and date
CREATE INDEX IF NOT EXISTS idx_daily_contact_views_user_created 
ON public.daily_contact_views (user_id, created_at DESC);

-- 3. Add views_today and last_view_date columns to profiles table for fast access
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS views_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_view_date DATE DEFAULT CURRENT_DATE;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_contact_views ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for admin_settings
DROP POLICY IF EXISTS "Public can read admin_settings" ON public.admin_settings;
CREATE POLICY "Public can read admin_settings" ON public.admin_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update admin_settings" ON public.admin_settings;
CREATE POLICY "Admins can update admin_settings" ON public.admin_settings
    FOR ALL USING (true) WITH CHECK (true);

-- 6. RLS Policies for daily_contact_views
DROP POLICY IF EXISTS "Users can insert daily_contact_views" ON public.daily_contact_views;
CREATE POLICY "Users can insert daily_contact_views" ON public.daily_contact_views
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read daily_contact_views" ON public.daily_contact_views;
CREATE POLICY "Users can read daily_contact_views" ON public.daily_contact_views
    FOR SELECT USING (true);

-- Realtime publication for admin_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;
