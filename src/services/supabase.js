import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ejtkrilhntdbsiavugta.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdGtyaWxobnRkYnNpYXZ1Z3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMjcyNjMsImV4cCI6MjEwNTkwMzI2M30.1B1llzakdq-Gyz_FGFr8A1xXmU1mT98FzkLaQG_GID8';

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
