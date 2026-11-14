import React, { useState, useEffect } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import AdminLogin from './AdminLogin';

/**
 * AdminRouteGuard
 * Strict Route Guard (Protected Route) for the /admin route and all its sub-routes.
 * Verifies active authenticated session via Supabase Auth.
 * If unauthenticated, automatically renders the AdminLogin page.
 */
export default function AdminRouteGuard({ children, onBack }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = verifying, true = authed, false = unauthed
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkAdminAuth = async () => {
      // 1. Check explicit logout flag
      if (
        localStorage.getItem('i4u_admin_logged_out') === 'true' || 
        sessionStorage.getItem('i4u_admin_logged_out') === 'true'
      ) {
        if (isMounted) setIsAuthenticated(false);
        return;
      }

      if (!isSupabaseConfigured() || !supabase) {
        if (isMounted) setIsAuthenticated(false);
        return;
      }

      try {
        // 2. Query Supabase Auth for active session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session && session.user && !error) {
          if (isMounted) {
            setAdminUser(session.user);
            setIsAuthenticated(true);
          }
          return;
        }

        // 3. Fallback: check stored admin token with Supabase getUser
        const storedToken = localStorage.getItem('i4u_admin_token') || sessionStorage.getItem('i4u_admin_token');
        if (storedToken && storedToken.length > 20 && storedToken !== 'i4u-super-admin-token-2026') {
          const { data: { user }, error: userErr } = await supabase.auth.getUser(storedToken);
          if (user && !userErr && isMounted) {
            setAdminUser(user);
            setIsAuthenticated(true);
            return;
          }
        }

        if (isMounted) setIsAuthenticated(false);
      } catch (err) {
        console.warn('[AdminRouteGuard] Session verification error:', err);
        if (isMounted) setIsAuthenticated(false);
      }
    };

    checkAdminAuth();

    // 4. Real-time Supabase Auth state listener
    const { data: { subscription } } = supabase?.auth?.onAuthStateChange?.((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        setAdminUser(session.user);
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        setAdminUser(null);
        setIsAuthenticated(false);
      }
    }) || { data: {} };

    return () => {
      isMounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const handleLoginSuccess = (session) => {
    if (session?.user) {
      setAdminUser(session.user);
    }
    setIsAuthenticated(true);
  };

  // State 1: Verifying active session
  if (isAuthenticated === null) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070F1E] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-600/10 border border-[#DFB76C]/30 text-[#DFB76C] flex items-center justify-center mb-4 shadow-xl">
          <ShieldCheck className="w-8 h-8 text-[#DFB76C] animate-pulse" />
        </div>
        <div className="flex items-center space-x-2 text-slate-300 text-sm font-semibold">
          <Loader2 className="w-4 h-4 text-[#DFB76C] animate-spin" />
          <span>Verifying Admin Authorization...</span>
        </div>
      </div>
    );
  }

  // State 2: Unauthenticated -> Show AdminLogin component
  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} onBack={onBack} />;
  }

  // State 3: Authenticated -> Render protected child content
  return typeof children === 'function' ? children({ adminUser }) : children;
}
