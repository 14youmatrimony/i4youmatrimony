import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kzvdzospvgzlfkkptadl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6dmR6b3Nwdmd6bGZra3B0YWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NjYwOTAsImV4cCI6MjEwNzU0MjA5MH0.2cbo44WPrlC_BNQH6-YvloxlAbxd67RwMsQOOiMFh-w';

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
 * Supabase client instance with explicit permanent session persistence (localStorage).
 * Gracefully initializes with dummy key if not yet provided to prevent frontend bundling crashes.
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'dummy-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
);

if (!isSupabaseConfigured()) {
  console.warn(
    '[Supabase] Connected to project https://kzvdzospvgzlfkkptadl.supabase.co, but VITE_SUPABASE_ANON_KEY is not yet set in .env. Please add your anon public key from the Supabase Dashboard.'
  );
}

/**
 * Initializes a root-level auth state change listener to synchronize session tokens
 */
export const initSupabaseAuthListener = (callback) => {
  if (!isSupabaseConfigured() || !supabase?.auth) return () => {};
  try {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token && typeof window !== 'undefined') {
        try {
          localStorage.setItem('i4u_auth_token', session.access_token);
          if (session.refresh_token) {
            localStorage.setItem('i4u_refresh_token', session.refresh_token);
          }
        } catch (e) {}
      }
      if (typeof callback === 'function') {
        callback(event, session);
      }
    });
    return () => {
      subscription?.unsubscribe?.();
    };
  } catch (err) {
    console.warn('[Supabase] Auth listener init warning:', err);
    return () => {};
  }
};

export default supabase;

