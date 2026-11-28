import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle, 
  ArrowLeft 
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';

/**
 * AdminLogin
 * Secure Administrator Authentication UI Component.
 * Authenticates against Supabase Auth (email & password).
 * Strictly guards administrative access to Super Admin panel.
 */
export default function AdminLogin({ onLoginSuccess, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your administrator email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your administrator password.');
      return;
    }

    if (!isSupabaseConfigured() || !supabase) {
      setErrorMessage('Authentication service is currently unavailable. Please verify backend connection.');
      return;
    }

    setIsLoading(true);

    try {
      // Authenticate with Supabase Auth using email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (error) {
        setErrorMessage(error.message || 'Invalid administrator email or password. Access denied.');
        setIsLoading(false);
        return;
      }

      if (data?.session && data?.user) {
        // Persist admin authentication token & session
        localStorage.setItem('i4u_admin_token', data.session.access_token);
        localStorage.setItem('i4u_admin_session', JSON.stringify(data.session));
        localStorage.setItem('i4u_admin_user', JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || 'Super Admin',
          full_name: data.user.user_metadata?.full_name || 'Super Admin',
          name: data.user.user_metadata?.full_name || 'Super Admin'
        }));
        localStorage.removeItem('i4u_admin_logged_out');
        sessionStorage.removeItem('i4u_admin_logged_out');

        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(data.session);
        }
      } else {
        setErrorMessage('Authentication did not return a valid session. Please try again.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during administrator authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1012] flex items-center justify-center p-4 overflow-y-auto">
      {/* Ambient Luxury Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#C58B76]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#7A2E43]/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-3xl bg-[#2C1A1D] border border-[#C58B76]/30 shadow-2xl relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-14 rounded-2xl bg-[#1A1012]/80 border border-[#C58B76]/40 p-1.5 flex items-center justify-center mx-auto shadow-inner">
            <img src="/logo.png" alt="I 4 You Logo" className="w-full h-full object-contain" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C58B76]/10 border border-[#C58B76]/30 text-[10px] text-[#E6B8A2] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C58B76] animate-pulse" />
            Super Admin Portal
          </div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-tight">Admin Sign In</h2>
          <p className="text-xs text-slate-400">Enter your administrator credentials to access the management portal.</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Login ID / Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                autoComplete="email"
                placeholder="admin@i4you.com" 
                className="w-full pl-10 pr-3 py-2.5 bg-[#1A1012] border border-slate-700 rounded-xl text-white text-xs focus:border-[#C58B76] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                autoComplete="current-password"
                placeholder="••••••••" 
                className="w-full pl-10 pr-10 py-2.5 bg-[#1A1012] border border-slate-700 rounded-xl text-white text-xs focus:border-[#C58B76] focus:outline-none transition-colors"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(prev => !prev)} 
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#7A2E43] hover:bg-[#612234] text-white font-bold text-xs shadow-lg shadow-[#7A2E43]/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-98"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Return to website */}
        <div className="pt-2 border-t border-slate-800/80 text-center">
          <button 
            type="button"
            onClick={onBack ? onBack : () => { window.location.href = '/'; }}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#E6B8A2] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Matrimony Website</span>
          </button>
        </div>
      </div>
    </div>
  );
}
