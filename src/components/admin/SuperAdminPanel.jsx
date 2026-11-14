import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  LogOut, 
  ExternalLink, 
  RefreshCw 
} from 'lucide-react';
import { supabase } from '../../services/supabase';

/**
 * SuperAdminPanel
 * Protected Super Admin Management Console Wrapper.
 * Provides a dedicated Logout action that clears the Supabase Auth session,
 * wipes administrative credentials, and returns immediately to the AdminLogin page.
 */
export default function SuperAdminPanel({ onLogout, onBackToSite }) {
  const [adminEmail, setAdminEmail] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('i4u_admin_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setAdminEmail(parsed.email || parsed.username || 'Super Admin');
      }
    } catch (e) {}

    // Fetch current user from Supabase session
    supabase?.auth?.getUser?.().then(({ data }) => {
      if (data?.user?.email) {
        setAdminEmail(data.user.email);
      }
    }).catch(() => {});
  }, []);

  const handleAdminLogout = async () => {
    setIsLoggingOut(true);
    try {
      // 1. Sign out of Supabase Auth
      if (supabase?.auth) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('[SuperAdminPanel] Supabase signOut notice:', e);
    } finally {
      // 2. Clear all admin tokens and session flags
      localStorage.removeItem('i4u_admin_token');
      localStorage.removeItem('i4u_admin_user');
      localStorage.removeItem('i4u_admin_session');
      sessionStorage.removeItem('i4u_admin_token');
      sessionStorage.removeItem('i4u_admin_user');
      sessionStorage.removeItem('i4u_admin_session');
      localStorage.setItem('i4u_admin_logged_out', 'true');
      sessionStorage.setItem('i4u_admin_logged_out', 'true');

      setIsLoggingOut(false);
      if (typeof onLogout === 'function') {
        onLogout();
      } else {
        window.location.href = '/admin';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070F1E] text-slate-100 overflow-hidden">
      {/* Top Admin Security Control Bar */}
      <header className="h-12 bg-[#0B192C] border-b border-[#D4AF37]/30 px-4 flex items-center justify-between shrink-0 z-20 shadow-md">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-[#DFB76C]/40 flex items-center justify-center text-[#DFB76C]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-serif font-bold text-xs sm:text-sm text-white tracking-wide">
            I 4 YOU SUPER ADMIN CONSOLE
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Authenticated
          </span>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {adminEmail && (
            <span className="hidden md:inline-block text-xs text-slate-300 font-mono">
              {adminEmail}
            </span>
          )}

          {onBackToSite && (
            <button
              type="button"
              onClick={onBackToSite}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Return to public matrimony website"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Website</span>
            </button>
          )}

          {/* Prominent Super Admin Logout Button */}
          <button
            type="button"
            onClick={handleAdminLogout}
            disabled={isLoggingOut}
            className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            title="Sign out of Super Admin Console and return to Login"
          >
            {isLoggingOut ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Embedded Super Admin Management Engine */}
      <main className="flex-1 w-full h-full relative overflow-hidden bg-[#070F1E]">
        <iframe
          src="/super-admin.html"
          title="Super Admin Workspace"
          className="w-full h-full border-0"
          allow="clipboard-read; clipboard-write; microphone; camera"
        />
      </main>
    </div>
  );
}
