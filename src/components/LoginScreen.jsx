import React, { useState } from 'react';
import { 
  Lock, 
  ArrowRight, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  X, 
  AlertCircle, 
  UserPlus, 
  CheckCircle2,
  HelpCircle,
  PhoneCall,
  Mail
} from 'lucide-react';
import { loginWithRegisterId, DEMO_CREDENTIALS } from '../services/authService';

export default function LoginScreen({ 
  onLoginSuccess, 
  setCurrentScreen, 
  onNavigateToRegister, 
  onBack 
}) {
  const [registerId, setRegisterId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanRegisterId = (registerId || '').trim().toUpperCase();
    if (!cleanRegisterId) {
      setError('Please enter your Register ID (e.g. I4Y1001)');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      const result = await loginWithRegisterId(cleanRegisterId, password);

      if (result.success && result.user) {
        setSuccessMessage(`Welcome back, ${result.user.name || 'Member'}! Logging in...`);
        
        // Brief visual success confirmation
        setTimeout(() => {
          onLoginSuccess?.(result.user);
          if (setCurrentScreen) setCurrentScreen('app');
        }, 600);
      } else {
        setError(result.error || 'Invalid Register ID or Password. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Authentication error. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDemoAccount = (demo) => {
    setRegisterId(demo.registerId);
    setPassword(demo.password);
    setError('');
  };

  return (
    <div className="w-full bg-white relative flex flex-col justify-between overflow-hidden">
      {/* Decorative Gold & Navy Top Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0B192C] via-[#D4AF37] to-[#0B192C]" />

      <div className="p-6 sm:p-8">
        {/* Header with Title and Close Button */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 text-[#8C6D1F] border border-[#D4AF37]/30 text-[11px] font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Pan India Matrimony</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#0B192C] tracking-tight">
              Member Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your unique Register ID and password to access your matrimony account
            </p>
          </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start space-x-2.5 text-xs animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2.5 text-xs font-semibold animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Login Form: ONLY Register ID and Password */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* FIELD 1: Register ID */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Register ID <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <input
                type="text"
                value={registerId}
                onChange={(e) => {
                  setRegisterId(e.target.value.toUpperCase());
                  if (error) setError('');
                }}
                placeholder="e.g. I4Y1001"
                maxLength={20}
                autoFocus
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none text-sm font-semibold tracking-wider text-slate-800 uppercase placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 transition-all bg-slate-50/50 hover:bg-white focus:bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Your unique matrimony identifier issued upon profile creation (e.g. I4Y1001)
            </p>
          </div>

          {/* FIELD 2: Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="text-[11px] font-semibold text-[#8C6D1F] hover:text-[#0B192C] transition-colors cursor-pointer"
              >
                Forgot Register ID / Password?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter your password"
                required
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all bg-slate-50/50 hover:bg-white focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"
              />
              <span className="text-xs text-slate-600 font-medium">Keep me logged in</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-lg shadow-[#D4AF37]/25 hover:shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0B192C] border-t-transparent rounded-full animate-spin" />
                <span>Authenticating with Supabase...</span>
              </>
            ) : (
              <>
                <span>Sign In with Register ID</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Pill Bar (For Testing & Verification) */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Quick Test Credentials
            </span>
            <span className="text-[10px] text-slate-400">Click to fill</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO_CREDENTIALS.map((demo) => (
              <button
                key={demo.registerId}
                type="button"
                onClick={() => handleApplyDemoAccount(demo)}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-[#D4AF37] bg-slate-50/60 hover:bg-[#FFFDF7] text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B192C] group-hover:text-[#8C6D1F]">
                    {demo.registerId}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-600 font-semibold">
                    {demo.user.gender === 'Female' ? 'Bride' : 'Groom'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {demo.user.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Switch to Registration */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600">
            Don't have a Register ID yet?{' '}
            <button
              type="button"
              onClick={() => {
                if (onNavigateToRegister) {
                  onNavigateToRegister();
                } else if (setCurrentScreen) {
                  setCurrentScreen('register');
                }
              }}
              className="font-bold text-[#8C6D1F] hover:text-[#0B192C] transition-colors underline cursor-pointer ml-1 inline-flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5 inline" />
              <span>Create New Profile Free</span>
            </button>
          </p>
        </div>
      </div>

      {/* Security Footer Notice */}
      <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>256-Bit SSL Encrypted Matrimonial Auth</span>
        </div>
        <span>UIDAI &bull; Pan India</span>
      </div>

      {/* Help Modal: Recover Register ID / Password */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-left shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-sm font-bold text-[#0B192C]">Need Help Logging In?</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Your <strong>Register ID</strong> (e.g. <code>I4Y1001</code>) was sent to your registered email address upon successful registration.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-slate-700">
                <PhoneCall className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>Toll-Free Helpline: <strong>8968926566</strong></span>
              </div>
              <div className="flex items-center space-x-2 text-slate-700">
                <Mail className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>Email: <strong>i4youmatrimony@gmail.com</strong></span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-[#0B192C] bg-[#D4AF37] hover:bg-[#dfb76c] transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
