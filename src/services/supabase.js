import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ejtkrilhntdbsiavugta.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Checks whether valid Supabase configuration is present.
 */
export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.trim() !== '' &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseAnonKey &&
    supabaseAnonKey.trim() !== '' &&
    supabaseAnonKey !== 'your_supabase_anon_key_here'
  );
};

/**
 * Supabase client instance.
 * Gracefully initializes with dummy key if not yet provided to prevent frontend bundling crashes.
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'dummy-anon-key-placeholder'
);

if (!isSupabaseConfigured()) {
  console.warn(
    '[Supabase] Connected to project https://ejtkrilhntdbsiavugta.supabase.co, but VITE_SUPABASE_ANON_KEY is not yet set in .env. Please add your anon public key from the Supabase Dashboard.'
  );
}

export default supabase;
