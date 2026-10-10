import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  RotateCw, 
  Sparkles, 
  Check, 
  ChevronLeft, 
  MessageSquare, 
  AlertCircle, 
  Edit2, 
  X,
  CheckCircle2,
  Heart
} from 'lucide-react';
import { sendPhoneOtp, verifyPhoneOtp } from '../services/phoneAuth';
import { isSupabaseConfigured } from '../services/supabase';
import GoogleSignInButton from './GoogleSignInButton';
import { signInWithGoogleAuth } from '../services/googleAuth';

export default function RegisterPhoneVerification({
  onVerificationSuccess,
  onGoogleLogin,
  onNavigateToLogin,
  onBack,
  isWebsiteModal = false
}) {
  const [phase, setPhase] = useState('phone'); // 'phone' | 'otp' | 'verified'
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(45);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isLiveMode, setIsLiveMode] = useState(isSupabaseConfigured());
  const [showSimulatedSms, setShowSimulatedSms] = useState(false);
  const [isRegionRestricted, setIsRegionRestricted] = useState(false);

  const phoneInputRef = useRef(null);
  const otpInputsRef = useRef([]);

  // Auto-focus phone input on mount
  useEffect(() => {
    const timerId = setTimeout(() => {
      phoneInputRef.current?.focus({ preventScroll: true });
    }, 200);
    return () => clearTimeout(timerId);
  }, []);

  // Timer countdown for OTP resend
  useEffect(() => {
    let interval = null;
    if (timer > 0 && phase === 'otp') {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, phase]);

  // Clean and format phone number input
  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
    setPhoneError('');
    setError('');
  };

  // Submit phone number to send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setPhoneError('');
    setError('');

    const cleanNum = phone.trim();
    if (!cleanNum) {
      setPhoneError('Please enter your 10-digit mobile number');
      return;
    }
    if (cleanNum.length !== 10) {
      setPhoneError('Mobile number must be exactly 10 digits');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanNum)) {
      setPhoneError('Indian mobile numbers must start with 6, 7, 8, or 9');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPhoneOtp(cleanNum);
      if (res.success) {
        setIsLiveMode(!res.isSimulated);
        setConfirmationResult(res.confirmationResult);
        setTimer(45);
        setIsRegionRestricted(Boolean(res.realSmsFailed));
        if (res.isSimulated) {
          setShowSimulatedSms(true);
          const defaultOtp = cleanNum === '9123456780' ? '913724' : '482916';
          setOtp(defaultOtp.split(''));
        } else {
          setShowSimulatedSms(false);
          setOtp(['', '', '', '', '', '']);
        }
        setPhase('otp');
        setTimeout(() => {
          otpInputsRef.current[0]?.focus({ preventScroll: true });
        }, 200);
      } else {
        // Fallback for seamless demo
        setIsLiveMode(false);
        setShowSimulatedSms(true);
        setOtp(['4', '8', '2', '9', '1', '6']);
        setTimer(45);
        setPhase('otp');
      }
    } catch (err) {
      console.warn('Fallback activated for registration OTP:', err);
      setIsLiveMode(false);
      setShowSimulatedSms(true);
      setOtp(['4', '8', '2', '9', '1', '6']);
      setTimer(45);
      setPhase('otp');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google 1-Click Sign In
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const res = await signInWithGoogleAuth();
      if (res.success && res.user) {
        if (onGoogleLogin) {
          onGoogleLogin(res.user);
        } else if (onVerificationSuccess) {
          onVerificationSuccess(res.user.mobile || '9847123456');
        }
      } else {
        setError(res.error || 'Failed to authenticate with Google. Please try again.');
      }
    } catch (err) {
      setError(err?.message || 'Google sign-in was interrupted. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // OTP field handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    setError('');

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus({ preventScroll: true });
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        otpInputsRef.current[index - 1]?.focus({ preventScroll: true });
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus({ preventScroll: true });
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef.current[index + 1]?.focus({ preventScroll: true });
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      otpInputsRef.current[Math.min(pastedData.length, 5)]?.focus({ preventScroll: true });
    }
  };

  const handleAutoFillDemo = () => {
    const demoCode = ['4', '8', '2', '9', '1', '6'];
    setOtp(demoCode);
    setError('');
    otpInputsRef.current[5]?.focus({ preventScroll: true });
  };

  const handleResendOtp = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    setError('');
    setOtp(['', '', '', '', '', '']);

    try {
      const res = await sendPhoneOtp(phone);
      if (res.success) {
        setConfirmationResult(res.confirmationResult);
        setTimer(45);
        setIsLiveMode(!res.isSimulated);
        setIsRegionRestricted(Boolean(res.realSmsFailed));
        if (res.isSimulated) {
          setShowSimulatedSms(true);
          const defaultOtp = phone === '9123456780' ? '913724' : '482916';
          setOtp(defaultOtp.split(''));
        } else {
          setShowSimulatedSms(false);
        }
      } else {
        setError(res.error || 'Failed to resend OTP. Please try again.');
      }
    } catch (err) {
      setError('Resend failed: ' + (err.message || ''));
    } finally {
      setIsResending(false);
      otpInputsRef.current[0]?.focus();
    }
  };

  // Verify OTP submission
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setError('');
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setError('Please enter all 6 digits of the OTP code');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyPhoneOtp(confirmationResult, enteredOtp, !isLiveMode, phone);
      if (res.success) {
        setPhase('verified');
        // Transition directly to Registration Wizard Step 1 after brief celebration
        setTimeout(() => {
          onVerificationSuccess?.(phone);
        }, 900);
      } else {
        setError(res.error || 'Incorrect OTP code. Please verify and try again.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex-1 h-full min-h-full w-full bg-gradient-to-b from-[#FFFDF9] via-[#FFFFFF] to-[#FAF8F5] relative flex flex-col justify-between overflow-y-auto selection:bg-[#D4AF37]/30 ${isWebsiteModal ? 'rounded-3xl' : ''}`}>
      
      {/* Decorative Gold & Navy Top Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0B192C] via-[#D4AF37] via-50% to-[#0B192C] shrink-0 shadow-xs" />

      {/* Ambient Champagne Glow & Soft Decorative Blobs */}
      <div className="absolute top-0 inset-x-0 h-64 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(212,175,55,0.16),rgba(255,255,255,0)_75%)] pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-44 -left-10 w-40 h-40 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 min-h-0 relative z-10">

        {/* Top Controls: Back and Close buttons */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          {phase === 'otp' ? (
            <button
              type="button"
              onClick={() => {
                setPhase('phone');
                setOtp(['', '', '', '', '', '']);
                setError('');
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/90 border border-slate-200/80 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:border-amber-300 hover:bg-amber-50/70 shadow-2xs transition-all cursor-pointer backdrop-blur-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Change Number</span>
            </button>
          ) : (
            onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/90 border border-slate-200/80 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:border-amber-300 hover:bg-amber-50/70 shadow-2xs transition-all cursor-pointer backdrop-blur-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Back</span>
              </button>
            ) : <div />
          )}

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 bg-white/80 border border-slate-200/60 hover:bg-slate-100 shadow-2xs transition-all cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Middle Main Content */}
        <div className="flex-1 flex flex-col justify-center my-auto py-1">

          {/* Brand Header with Prominent I 4 You Matrimony Logo */}
          <div className="flex flex-col items-center text-center mb-3.5 shrink-0 relative">
            
            {/* Ambient Halo Behind Logo */}
            <div className="absolute w-24 h-24 -top-2 bg-[#D4AF37]/25 rounded-full blur-2xl pointer-events-none" />

            {/* Logo in Prominent Size with Luxury Dual Ring & Elevation */}
            <div className="relative mb-2.5 group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#0B192C] via-[#132847] to-[#0B192C] p-2 shadow-xl shadow-[#D4AF37]/20 border-2 border-[#D4AF37] ring-4 ring-[#D4AF37]/15 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:ring-[#D4AF37]/30">
                <img 
                  src="/brand-logo.png" 
                  alt="I 4 You Matrimony Logo" 
                  className="w-full h-full object-contain drop-shadow-md rounded-2xl"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 bg-gradient-to-br from-emerald-400 to-emerald-600 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-md">
                <Check className="w-3 h-3 text-white stroke-[3]" />
              </span>
            </div>

            {/* Brand Tagline Badge */}
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 via-[#D4AF37]/20 to-amber-500/10 text-[#8C6D1F] border border-[#D4AF37]/35 text-[10px] font-extrabold tracking-wider uppercase mb-1.5 shadow-2xs">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              <span>Exclusive Matrimony Network</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-[#0B192C]">
              {phase === 'phone' ? (
                <>
                  Begin Your <span className="bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#8C6D1F] bg-clip-text text-transparent">Journey</span>
                </>
              ) : (
                <>
                  Verify Your <span className="bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#8C6D1F] bg-clip-text text-transparent">Number</span>
                </>
              )}
            </h1>
            <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
              {phase === 'phone' 
                ? 'Enter your mobile number to unlock verified profiles with complete privacy.'
                : `Enter the 6-digit verification code sent to +91 ${phone}`}
            </p>
          </div>

          {/* Simulated Incoming SMS Alert Banner */}
          {showSimulatedSms && phase === 'otp' && (
            <aside aria-label="Simulated SMS Alert" className="mb-3.5 bg-gradient-to-r from-slate-900 via-[#152E52] to-slate-900 text-white p-3 rounded-2xl shadow-md border border-[#D4AF37]/50 flex items-center justify-between text-xs animate-in fade-in duration-200">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-[#DFB76C]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-[#DFB76C] text-[10px] uppercase tracking-wider">SMS Alert</span>
                    <span className="text-[9px] text-slate-400">Just now</span>
                  </div>
                  <p className="text-slate-200 text-xs truncate">
                    OTP Code: <span className="font-mono font-bold text-white bg-black/50 px-2 py-0.5 rounded text-xs tracking-wider border border-white/20">482916</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAutoFillDemo}
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-extrabold text-[11px] shadow-sm hover:from-[#dfb76c] hover:to-[#b89228] transition-all shrink-0 cursor-pointer flex items-center space-x-1 active:scale-95"
              >
                <Sparkles className="w-3 h-3 text-[#0B192C]" />
                <span>Tap to Fill</span>
              </button>
            </aside>
          )}

          {/* PHASE 1: Enter Mobile Number */}
          {phase === 'phone' && (
            <div className="space-y-3">
              
              {/* Trust & Value Proposition Mini Ribbon */}
              <div className="grid grid-cols-3 gap-1.5 px-2 py-1.5 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/80 rounded-2xl border border-[#D4AF37]/25 text-center shadow-2xs">
                <div className="flex flex-col items-center justify-center py-0.5">
                  <span className="font-black text-xs text-[#0B192C]">100%</span>
                  <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Verified</span>
                </div>
                <div className="flex flex-col items-center justify-center py-0.5 border-x border-[#D4AF37]/25">
                  <span className="font-black text-xs text-[#8C6D1F]">Free</span>
                  <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Registration</span>
                </div>
                <div className="flex flex-col items-center justify-center py-0.5">
                  <span className="font-black text-xs text-[#0B192C]">Direct</span>
                  <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Contact</span>
                </div>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Mobile Number
                    </label>
                    <span className="text-[10px] text-[#8C6D1F] font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                      Instant OTP
                    </span>
                  </div>

                  <div className={`flex rounded-2xl border-2 transition-all duration-200 ${
                    phoneError 
                      ? 'border-rose-400 bg-rose-50/40' 
                      : phone.length === 10
                        ? 'border-emerald-400 bg-emerald-50/20 ring-3 ring-emerald-400/15'
                        : 'border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#D4AF37] focus-within:ring-4 focus-within:ring-[#D4AF37]/20 shadow-xs'
                  }`}>
                    {/* Clean Tricolor SVG Badge +91 */}
                    <span className="px-3.5 py-2.5 bg-gradient-to-b from-slate-50 to-slate-100/90 text-slate-800 font-bold text-xs border-r border-slate-200 flex items-center gap-2 rounded-l-2xl select-none shrink-0">
                      <svg className="w-5 h-3.5 rounded-xs shadow-2xs shrink-0" viewBox="0 0 640 480" aria-label="India Flag">
                        <path fill="#f93" d="M0 0h640v160H0z"/>
                        <path fill="#fff" d="M0 160h640v160H0z"/>
                        <path fill="#128807" d="M0 320h640v160H0z"/>
                        <circle cx="320" cy="240" r="38" fill="#008"/>
                      </svg>
                      <span className="tracking-wide">+91</span>
                    </span>

                    <input
                      ref={phoneInputRef}
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Enter 10-digit mobile number"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="flex-1 px-3.5 py-2.5 text-sm font-bold text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400 placeholder:font-normal rounded-r-2xl tracking-wider"
                    />

                    {phone.length === 10 && (
                      <div className="pr-3.5 flex items-center text-emerald-500 animate-in zoom-in-75 duration-200">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {phoneError && (
                    <p className="text-rose-500 text-[11px] mt-1.5 flex items-center gap-1 font-medium animate-in fade-in duration-150">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{phoneError}</span>
                    </p>
                  )}
                </div>

                {/* Privacy & Security Card */}
                <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-50/80 via-white to-amber-50/80 border border-amber-200/80 text-xs text-amber-950 flex items-start space-x-2.5 shadow-2xs">
                  <div className="w-5 h-5 rounded-full bg-amber-100/90 border border-amber-300/80 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#8C6D1F]" />
                  </div>
                  <p className="leading-relaxed text-[11px] text-slate-600">
                    <strong className="text-[#0B192C] font-semibold">100% Privacy Protected:</strong> Mobile number is confidential and verified securely.
                  </p>
                </div>

                {/* Send OTP Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-black text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#F5E6B8] via-50% to-[#D4AF37] hover:from-[#dfb76c] hover:via-[#faebd7] hover:to-[#b89228] shadow-md shadow-[#D4AF37]/30 hover:shadow-lg hover:shadow-[#D4AF37]/40 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer border border-[#D4AF37]/60 group"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin text-[#0B192C]" />
                      <span className="tracking-wide">Sending OTP Code...</span>
                    </>
                  ) : (
                    <>
                      <span className="tracking-wide">Send OTP Code</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                {/* OR Divider */}
                <div className="relative my-2.5 flex items-center justify-center">
                  <div className="border-t border-slate-200/90 w-full"></div>
                  <span className="bg-white px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest absolute rounded-full border border-slate-100 shadow-2xs">
                    or continue with
                  </span>
                </div>

                {/* Google Sign In Button */}
                <GoogleSignInButton 
                  loading={googleLoading}
                  onClick={handleGoogleSignIn}
                  text="Continue with Google"
                  className="py-3 px-4 rounded-2xl border-2 border-slate-200/90 bg-white hover:bg-slate-50/80 hover:border-slate-300 text-xs sm:text-sm font-bold text-slate-700 shadow-xs hover:shadow-md transition-all"
                />
              </form>

              {/* Navigation to login if already registered */}
              <div className="pt-1.5 text-center">
                <p className="text-xs text-slate-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    className="font-bold text-[#8C6D1F] hover:text-[#0B192C] hover:underline cursor-pointer transition-colors inline-flex items-center gap-1"
                  >
                    <span>Sign In</span>
                    <ArrowRight className="w-3 h-3 inline" />
                  </button>
                </p>
              </div>

            </div>
          )}

          {/* PHASE 2: Verify OTP */}
          {phase === 'otp' && (
            <div className="space-y-3.5">

              {/* Active Phone Display with Change Option */}
              <div className="bg-white border-2 border-slate-200/90 rounded-2xl p-3 flex items-center justify-between text-xs shadow-xs">
                <div className="flex items-center space-x-2.5">
                  <svg className="w-5 h-3.5 rounded-xs shadow-2xs shrink-0" viewBox="0 0 640 480" aria-label="India Flag">
                    <path fill="#f93" d="M0 0h640v160H0z"/>
                    <path fill="#fff" d="M0 160h640v160H0z"/>
                    <path fill="#128807" d="M0 320h640v160H0z"/>
                    <circle cx="320" cy="240" r="38" fill="#008"/>
                  </svg>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mobile Number</p>
                    <p className="font-extrabold text-slate-900 text-sm tracking-wider">
                      +91 {phone}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhase('phone');
                    setOtp(['', '', '', '', '', '']);
                    setError('');
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[#8C6D1F] hover:bg-amber-100 font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Change</span>
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* 6-Digit OTP Input Form */}
              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div>
                  <label className="block text-center text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Enter 6-Digit Verification Code
                  </label>

                  <div className="grid grid-cols-6 gap-1.5 sm:gap-2" onPaste={handlePaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputsRef.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        autoComplete={idx === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        aria-label={`Digit ${idx + 1}`}
                        className="w-full h-12 text-center text-xl sm:text-2xl font-black bg-white border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/20 focus:outline-none transition-all shadow-xs text-slate-900 min-w-0"
                      />
                    ))}
                  </div>
                </div>

                {/* Countdown Timer & Resend Controls */}
                <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                  <span className="font-medium">Didn’t receive code?</span>
                  {timer > 0 ? (
                    <span className="font-bold text-[#8C6D1F] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
                      Resend in 0:{timer < 10 ? `0${timer}` : timer}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isResending}
                      className="font-black text-[#8C6D1F] hover:text-[#0B192C] flex items-center space-x-1 cursor-pointer underline underline-offset-2"
                    >
                      {isResending ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <span>Resend OTP</span>}
                    </button>
                  )}
                </div>

                {/* 1-Tap Autofill Chip for Quick Testing */}
                <div>
                  <button
                    type="button"
                    onClick={handleAutoFillDemo}
                    className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-50 via-white to-amber-50 border border-amber-200 text-[#8C6D1F] text-xs font-bold hover:bg-amber-100/70 transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" />
                    <span>Quick Test: Auto-fill Code (482916)</span>
                  </button>
                </div>

                {/* Submit Verification */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-black text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#F5E6B8] via-50% to-[#D4AF37] hover:from-[#dfb76c] hover:via-[#faebd7] hover:to-[#b89228] shadow-md shadow-[#D4AF37]/30 hover:shadow-lg hover:shadow-[#D4AF37]/40 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer border border-[#D4AF37]/60 group"
                >
                  {loading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin text-[#0B192C]" />
                      <span className="tracking-wide">Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <span className="tracking-wide">Verify & Continue</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

            </div>
          )}

          {/* PHASE 3: Verified Celebration State */}
          {phase === 'verified' && (
            <div className="py-6 space-y-4 text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 flex items-center justify-center mx-auto ring-8 ring-emerald-50 shadow-inner">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Mobile Verified</span>
                </span>

                <h2 className="text-xl font-serif font-black text-[#0B192C] mt-2">
                  Mobile Number Verified!
                </h2>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto leading-relaxed">
                  <span className="font-bold text-slate-900">+91 {phone}</span> has been authenticated successfully.
                </p>
              </div>

              <div className="flex items-center justify-center space-x-2 text-xs font-bold text-[#8C6D1F] pt-2">
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Opening Step 1: Basic Details & Lifestyle...</span>
              </div>
            </div>
          )}

        </div>

        {/* Trust Badges Footer - Pinned to bottom */}
        <div className="pt-3 pb-1 mt-auto border-t border-slate-100 shrink-0">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-xl bg-emerald-50/90 border border-emerald-200/60 text-emerald-800 text-[10px] font-bold shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>100% Verified Profiles</span>
            </div>
            <div className="flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-xl bg-amber-50/90 border border-amber-200/60 text-amber-900 text-[10px] font-bold shadow-2xs">
              <Lock className="w-3.5 h-3.5 text-[#8C6D1F] shrink-0" />
              <span>Zero Spam Guarantee</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
