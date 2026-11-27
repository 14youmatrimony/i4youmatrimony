-- ============================================================================
-- I 4 YOU MATRIMONY - PARTNER PREFERENCES SCHEMA MIGRATION
-- Additive-only migration: adds structured Partner Preference columns to profiles
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_countries TEXT DEFAULT 'Any',
  ADD COLUMN IF NOT EXISTS pref_min_age INTEGER,
  ADD COLUMN IF NOT EXISTS pref_max_age INTEGER,
  ADD COLUMN IF NOT EXISTS pref_min_height INTEGER,
  ADD COLUMN IF NOT EXISTS pref_max_height INTEGER,
  ADD COLUMN IF NOT EXISTS pref_complexion TEXT DEFAULT 'Any',
  ADD COLUMN IF NOT EXISTS pref_education TEXT DEFAULT 'Any',
  ADD COLUMN IF NOT EXISTS pref_occupation TEXT DEFAULT 'Any',
  ADD COLUMN IF NOT EXISTS pref_income TEXT DEFAULT 'Any',
  ADD COLUMN IF NOT EXISTS pref_diet TEXT DEFAULT 'Any',
  ADD COLUMN IF NOT EXISTS pref_marital_status TEXT DEFAULT 'Any',
  ADD COLUMN IF NOT EXISTS pref_religion TEXT DEFAULT 'Any',
  ADD COLUMN IF NOT EXISTS pref_caste TEXT DEFAULT 'Any',
  ADD COLUMN IF NOT EXISTS pref_mother_tongue TEXT DEFAULT 'Any',
  ADD COLUMN IF NOT EXISTS pref_state TEXT DEFAULT 'Any',
  ADD COLUMN IF NOT EXISTS pref_district TEXT DEFAULT 'Any',
  ADD COLUMN IF NOT EXISTS pref_physical_status TEXT DEFAULT 'Any',
  ADD COLUMN IF NOT EXISTS pref_smoking TEXT DEFAULT 'Any',
  ADD COLUMN IF NOT EXISTS pref_drinking TEXT DEFAULT 'Any';
