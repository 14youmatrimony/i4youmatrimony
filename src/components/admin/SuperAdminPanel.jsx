import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  LogOut, 
  ExternalLink, 
  RefreshCw,
  Eye,
  Save,
  Check
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { forceLogout } from '../../services/authService';
import { dailyContactLimitService } from '../../services/dailyContactLimitService';

/**
 * SuperAdminPanel
 * Protected Super Admin Management Console Wrapper.
 * Provides a dedicated Logout action that clears the Supabase Auth session,
 * wipes administrative credentials, and returns immediately to the AdminLogin page.
 */
export default function SuperAdminPanel({ onLogout, onBackToSite }) {
  const [adminEmail, setAdminEmail] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dailyLimitInput, setDailyLimitInput] = useState('5');
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  const [limitSaved, setLimitSaved] = useState(false);

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

    // Fetch current daily contact view limit
    dailyContactLimitService.getDailyContactLimit().then(lim => {
      setDailyLimitInput(String(lim));
    }).catch(() => {});

    // Subscribe to live limit updates
    const unsub = dailyContactLimitService.subscribeToDailyLimitChanges((newLimit) => {
      setDailyLimitInput(String(newLimit));
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const handleSaveDailyLimit = async () => {
    const parsed = parseInt(dailyLimitInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      alert('Please enter a valid daily contact view limit (at least 1).');
      return;
    }
    setIsSavingLimit(true);
    try {
      await dailyContactLimitService.updateDailyContactLimit(parsed, adminEmail);
      setLimitSaved(true);
      setTimeout(() => setLimitSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save daily limit:', err);
    } finally {
      setIsSavingLimit(false);
    }
  };

  const handleAdminLogout = async () => {
    setIsLoggingOut(true);
    await forceLogout(() => {
      setAdminEmail('');
      setIsLoggingOut(false);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1A1012] text-slate-100 overflow-hidden">
      {/* Top Admin Security Control Bar */}
      <header className="h-12 bg-[#2C1A1D] border-b border-[#C58B76]/30 px-4 flex items-center justify-between shrink-0 z-20 shadow-md">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#7A2E43]/40 border border-[#C58B76]/40 flex items-center justify-center text-[#E6B8A2]">
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
          {/* Dynamic Daily Contact Limit Control */}
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-black/40 border border-[#C58B76]/30 shadow-inner">
            <Eye className="w-3.5 h-3.5 text-[#E6B8A2]" />
            <span className="text-[11px] text-slate-300 font-semibold hidden md:inline">
              Daily Limit:
            </span>
            <input
              type="number"
              min="1"
              max="1000"
              value={dailyLimitInput}
              onChange={(e) => setDailyLimitInput(e.target.value)}
              className="w-12 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[#E6B8A2] font-mono text-xs text-center focus:outline-none focus:border-[#C58B76]"
              title="Daily contact view limit per user"
            />
            <button
              type="button"
              onClick={handleSaveDailyLimit}
              disabled={isSavingLimit}
              className="px-2 py-0.5 rounded bg-[#7A2E43] hover:bg-[#612234] text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Save daily contact limit"
            >
              {isSavingLimit ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : limitSaved ? (
                <>
                  <Check className="w-3 h-3 text-slate-950 stroke-[3]" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>

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
      <main className="flex-1 w-full h-full relative overflow-hidden bg-[#1A1012]">
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
