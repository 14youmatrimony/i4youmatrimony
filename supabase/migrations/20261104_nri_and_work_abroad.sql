-- ============================================================================
-- I 4 YOU MATRIMONY - WORKING ABROAD / NRI LOCATION & SEARCH PREFERENCES
-- Migration: 20261104_nri_and_work_abroad.sql
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_country VARCHAR(100) DEFAULT 'India';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_city VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_nri BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS residency_status VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_countries TEXT DEFAULT 'Any';

-- Index for high performance NRI and country search filtering
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_work_country ON public.profiles(work_country);
CREATE INDEX IF NOT EXISTS idx_profiles_is_nri ON public.profiles(is_nri);
