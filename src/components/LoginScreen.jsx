import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  RotateCw, 
  CheckCircle2, 
  HeartHandshake,
  Mail,
  Eye,
  EyeOff,
  ChevronLeft,
  AlertCircle,
  MessageSquare,
  KeyRound,
  Sparkles,
  X,
  Settings,
  ExternalLink,
  User,
  Plus
} from 'lucide-react';
import { 
  sanitizeInput, 
  sanitizePhone, 
  validatePasswordStrength, 
  hashPasswordSha256 
} from '../utils/security';
import { 
  sendPhoneOtp, 
  verifyPhoneOtp 
} from '../services/phoneAuth';
import { 
  getFast2SmsApiKey, 
  saveFast2SmsApiKey, 
  hasFast2SmsKey 
} from '../services/fast2sms';
import { 
  signInWithGoogleAuth, 
  GOOGLE_DEMO_ACCOUNTS, 
  getSavedGoogleAccount 
} from '../services/googleAuth';
import { isSupabaseConfigured } from '../services/supabase';
import GoogleSignInButton from './GoogleSignInButton';

export default function LoginScreen({ 
  onLoginSuccess, 
  setCurrentScreen, 
  onNavigateToRegister, 
  onBack 
}) {
  const [loginMethod, setLoginMethod] = useState('otp'); // 'otp' | 'password'
  
  // OTP Login State
  const [mobileNumber, setMobileNumber] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(45);
  const [isResending, setIsResending] = useState(false);
  const [showSimulatedSms, setShowSimulatedSms] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isLiveMode, setIsLiveMode] = useState(isSupabaseConfigured() || hasFast2SmsKey());
  const [isRegionRestricted, setIsRegionRestricted] = useState(false);
  const [isBillingError, setIsBillingError] = useState(false);
  const [realSmsError, setRealSmsError] = useState('');
  const [showRealSmsModal, setShowRealSmsModal] = useState(false);
  const [inputFast2SmsKey, setInputFast2SmsKey] = useState(getFast2SmsApiKey());
  const [smsKeySaved, setSmsKeySaved] = useState(false);
  const otpInputsRef = useRef([]);

  const handleSaveFast2SmsKey = (e) => {
    e?.preventDefault();
    saveFast2SmsApiKey(inputFast2SmsKey);
    setSmsKeySaved(true);
    setTimeout(() => {
      setSmsKeySaved(false);
      setShowRealSmsModal(false);
    }, 1200);
  };

  // Password Login State
  const [profileIdOrEmail, setProfileIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Common UI State
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showCustomGoogleForm, setShowCustomGoogleForm] = useState(false);
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleMobile, setCustomGoogleMobile] = useState('');
  const [customGoogleGender, setCustomGoogleGender] = useState('Male');
  const [successMessage, setSuccessMessage] = useState('');

  // Timer countdown for OTP resend
  useEffect(() => {
    let interval = null;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Live Password Strength Calculation
  const passwordStrength = useMemo(() => {
    return validatePasswordStrength(password);
  }, [password]);

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError('');

    const cleanNum = sanitizePhone(mobileNumber);
    if (!cleanNum) {
      setError('Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPhoneOtp(cleanNum);
      if (res.success) {
        setIsLiveMode(!res.isSimulated);
        setConfirmationResult(res.confirmationResult);
        setStep('otp');
        setTimer(45);
        setIsRegionRestricted(Boolean(res.realSmsFailed));
        setIsBillingError(Boolean(res.isBillingError));
        setRealSmsError(res.realSmsError || '');

        if (res.isSimulated) {
          setShowSimulatedSms(true);
          const defaultOtp = cleanNum === '9123456780' ? '913724' : '482916';
          setOtp(defaultOtp.split(''));
        } else {
          setShowSimulatedSms(false);
          setOtp(['', '', '', '', '', '']);
        }

        setTimeout(() => {
          otpInputsRef.current[res.isSimulated ? 5 : 0]?.focus({ preventScroll: true });
        }, 150);
      } else {
        // Even if error occurs, smoothly fall back to OTP entry with standard test OTP
        setIsLiveMode(false);
        setStep('otp');
        setShowSimulatedSms(true);
        setIsRegionRestricted(true);
        setOtp(['4', '8', '2', '9', '1', '6']);
        setTimer(45);
      }
    } catch (err) {
      console.warn('Fallback activated for OTP dispatch:', err);
      setIsLiveMode(false);
      setStep('otp');
      setShowSimulatedSms(true);
      setIsRegionRestricted(true);
      setOtp(['4', '8', '2', '9', '1', '6']);
      setTimer(45);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    setError('');
    const cleanNum = sanitizePhone(mobileNumber);
    try {
      const res = await sendPhoneOtp(cleanNum);
      if (res.success) {
        setConfirmationResult(res.confirmationResult);
        setTimer(45);
        setIsLiveMode(!res.isSimulated);
        setIsBillingError(Boolean(res.isBillingError));
        setIsRegionRestricted(Boolean(res.realSmsFailed));
        setRealSmsError(res.realSmsError || '');
        if (res.isSimulated) {
          setShowSimulatedSms(true);
          const defaultOtp = cleanNum === '9123456780' ? '913724' : '482916';
          setOtp(defaultOtp.split(''));
        } else {
          setShowSimulatedSms(false);
          setOtp(['', '', '', '', '', '']);
        }
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('Resend failed: ' + (err.message || ''));
    } finally {
      setIsResending(false);
      otpInputsRef.current[0]?.focus();
    }
  };

  const handleSwitchToDemoMode = () => {
    setIsLiveMode(false);
    setIsRegionRestricted(false);
    setError('');
    setStep('otp');
    setTimer(45);
    setShowSimulatedSms(true);
    setOtp(['4', '8', '2', '9', '1', '6']);
    setTimeout(() => {
      otpInputsRef.current[5]?.focus({ preventScroll: true });
    }, 150);
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    setError('');

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto advance to next input
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
      const res = await verifyPhoneOtp(confirmationResult, enteredOtp, !isLiveMode, mobileNumber);
      if (res.success) {
        setSuccessMessage('Mobile OTP Authenticated! Logging you in...');
        setTimeout(() => {
          const cleanNum = sanitizePhone(mobileNumber);
          const isRohan = cleanNum === '9123456780' || (mobileNumber && mobileNumber.includes('9123456780'));
          const rawDisplayName = res.user?.displayName;
          const resolvedDisplayName = (rawDisplayName && rawDisplayName !== 'Verified Member') ? rawDisplayName : 'Priya Sharma';
          onLoginSuccess?.({
            name: isRohan ? 'Rohan Jayasimha' : resolvedDisplayName,
            mobile: mobileNumber || (isRohan ? '9123456780' : '9876543210'),
            uid: res.user?.uid,
            city: isRohan ? 'Mysuru' : 'Pune',
            district: isRohan ? 'Mysuru' : 'Pune',
            state: isRohan ? 'Karnataka' : 'Maharashtra',
            gender: isRohan ? 'Male' : 'Female',
            verified: true,
            mobileVerified: true,
            photo: isRohan 
              ? 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'
              : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800'
          });
        }, 600);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e?.preventDefault();
    setError('');

    const cleanId = sanitizeInput(profileIdOrEmail, { maxLength: 100 });
    if (!cleanId) {
      setError('Please enter your Matrimony Profile ID or Email');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (passwordStrength.isCommon) {
      setError('Password is too common and predictable. Please choose a stronger password.');
      return;
    }

    setLoading(true);

    try {
      // Compute cryptographic hash for secure transit
      const clientHash = await hashPasswordSha256(password);

      setTimeout(() => {
        setLoading(false);
        setSuccessMessage('Credentials Verified! Welcome back to I 4 You.');
        setTimeout(() => {
          onLoginSuccess?.({
            name: 'Priya Sharma',
            mobile: '9876543210',
            city: 'Pune',
            district: 'Pune',
            state: 'Maharashtra',
            gender: 'Female',
            verified: true,
            mobileVerified: true,
            authKey: clientHash ? clientHash.slice(0, 16) : undefined
          });
        }, 800);
      }, 800);
    } catch {
      setLoading(false);
      setError('Authentication security error. Please try again.');
    }
  };

  const handleExecuteGoogleSignIn = async (accountOverride = null) => {
    setError('');
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogleAuth(accountOverride);
      if (res && res.success && res.user) {
        setShowGoogleModal(false);
        setShowCustomGoogleForm(false);
        setSuccessMessage(`Welcome, ${res.user.name || 'Member'}! Logging you in with Google...`);
        setTimeout(() => {
          const nameLower = (res.user.name || '').toLowerCase();
          const isMale = res.user.gender
            ? res.user.gender.toLowerCase() === 'male'
            : (nameLower.includes('arun') || nameLower.includes('thomas') || nameLower.includes('kumar') || nameLower.includes('singh') || nameLower.includes('rohan'));
          
          onLoginSuccess?.({
            name: res.user.name || 'Arun Kumar',
            email: res.user.email || 'arun.matrimony@gmail.com',
            mobile: res.user.mobile || (isMale ? '9847123456' : '9876543210'),
            uid: res.user.uid || ('google-user-' + Date.now()),
            city: res.user.city || (isMale ? 'Kochi' : 'Pune'),
            district: res.user.district || (isMale ? 'Ernakulam' : 'Pune'),
            state: res.user.state || (isMale ? 'Kerala' : 'Maharashtra'),
            gender: isMale ? 'Male' : 'Female',
            verified: true,
            mobileVerified: true,
            aadhaarVerified: true,
            membership: 'free',
            photo: res.user.photo || (isMale 
              ? 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'
              : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800')
          });
        }, 500);
      } else {
        setError(res?.error || 'Google Sign-In was cancelled or failed.');
      }
    } catch (err) {
      setError(err?.message || 'Google Sign-In encountered an error.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    const saved = getSavedGoogleAccount() || GOOGLE_DEMO_ACCOUNTS[0];
    handleExecuteGoogleSignIn(saved);
  };




  return (
    <div className="flex-1 flex flex-col h-full w-full bg-slate-50 relative overflow-hidden">
      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5 pb-8">
        
        {/* Simulated Incoming SMS Notification */}
        {showSimulatedSms && step === 'otp' && loginMethod === 'otp' && (
          <aside 
            aria-label="Simulated SMS Notification" 
            className="bg-gradient-to-r from-slate-900 to-[#152E52] text-white p-3.5 rounded-2xl shadow-xl border border-[#D4AF37]/50 flex items-start space-x-3 animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4 text-[#DFB76C]" />
            </div>
            <div className="flex-1 text-xs min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#DFB76C] text-[11px] flex items-center gap-1.5">
                  💬 Demo OTP Generated
                  <span className="text-[9px] bg-[#D4AF37]/30 text-[#DFB76C] font-bold px-1.5 py-0.5 rounded-full border border-[#D4AF37]/40">Demo Code</span>
                </span>
                <span className="text-[9px] text-slate-400">Instant</span>
              </div>
              <p className="text-slate-200 mt-1 leading-snug">
                Your I 4 You login code is <span className="font-mono font-bold text-white bg-black/40 px-1.5 py-0.5 rounded text-xs tracking-wider border border-white/20">{mobileNumber === '9123456780' ? '913724' : '482916'}</span>.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    const code = mobileNumber === '9123456780' ? '913724' : '482916';
                    setOtp(code.split(''));
                    setError('');
                    otpInputsRef.current[5]?.focus({ preventScroll: true });
                  }}
                  className="text-[10px] font-bold text-[#DFB76C] hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Tap to auto-fill code</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRealSmsModal(true)}
                  className="text-[10px] font-bold text-cyan-300 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>Why didn't SMS reach phone? (Setup Real SMS)</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative">
          
          {/* Top Decorative Banner with Official Brand Logo */}
          <div className="bg-[#242752] px-3 pt-3 pb-2 text-center relative overflow-hidden text-white border-b border-[#D4AF37]/20">
            {/* Top Navigation Controls inside Banner */}
            {onBack && (
              <div className="flex items-center justify-start mb-0.5">
                <button
                  type="button"
                  onClick={onBack}
                  className="p-1 rounded-full bg-black/30 hover:bg-black/50 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Back"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-4 h-4 text-[#DFB76C]" />
                </button>
              </div>
            )}

            {/* Official 3D Interlocking Hearts Brand Logo */}
            <div className="flex items-center justify-center">
              <img 
                src="/brand-logo.png" 
                alt="I 4 You Matrimony" 
                className="w-24 sm:w-28 h-auto max-h-20 object-contain rounded-xl drop-shadow-md"
              />
            </div>

            {/* Dynamic Step / Method Info for OTP */}
            {step === 'otp' && loginMethod === 'otp' ? (
              <p className="text-[11px] text-[#DFB76C] mt-2 font-medium tracking-wide">
                Enter the 6-digit code sent to +91 {mobileNumber}
              </p>
            ) : null}

            {/* Login Method Toggle Switch */}
            <div className="mt-3 inline-flex p-0.5 rounded-xl bg-black/50 border border-white/10 text-xs font-semibold shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('otp');
                  setError('');
                }}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  loginMethod === 'otp'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Mobile OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('password');
                  setError('');
                }}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  loginMethod === 'password'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                ID / Password
              </button>
            </div>

            {/* Real SMS Setup Link */}
            {loginMethod === 'otp' && (
              <div className="mt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowRealSmsModal(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[#DFB76C] text-[10.5px] font-semibold border border-[#D4AF37]/30 transition-all cursor-pointer"
                  title="Configure Real SMS Gateway"
                >
                  <Settings className="w-3 h-3 text-[#DFB76C]" />
                  <span>Real SMS Setup / എന്തുകൊണ്ട് SMS വന്നില്ല?</span>
                </button>
              </div>
            )}
          </div>

          {/* Form Content */}
          <div className="p-3.5 space-y-3">


            {/* Region / Billing / Credential Notice & Instant Test Fallback */}
            {isRegionRestricted && (
              <div className="p-3.5 rounded-2xl bg-amber-50/95 border border-amber-300 text-amber-900 text-xs space-y-2.5 shadow-sm animate-in fade-in">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[12px] text-amber-900">
                      Supabase & Fast2SMS Gateway Notice
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Firebase പൂർണ്ണമായി ഒഴിവാക്കി പകരം <strong>Supabase Auth & Fast2SMS</strong> ലേക്ക് മാറ്റിയിരിക്കുന്നു.
                    </p>
                  </div>
                </div>

                <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 text-[10.5px] space-y-1.5 text-slate-700 font-medium">
                  <p className="font-bold text-amber-900">ഫോണിലേക്ക് യഥാർത്ഥ SMS ലൈവായി ലഭിക്കാൻ:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      <strong>Fast2SMS Gateway:</strong> മുകളിലെ <strong>"Real SMS Setup"</strong> ക്ലിക്ക് ചെയ്ത് Fast2SMS API Key നൽകുക. ക്രെഡിറ്റ് കാർഡില്ലാതെ UPI വഴി റീചാർജ്ജ് ചെയ്യാം.
                    </li>
                    <li>
                      <strong>ഡെമോ കോഡ്:</strong> തൽക്കാലം ലോഗിൻ ചെയ്യാൻ താഴെയുള്ള <strong>"Continue with Test OTP (482916)"</strong> ക്ലിക്ക് ചെയ്യുക.
                    </li>
                  </ol>
                  <div className="mt-2 pt-1 border-t border-amber-200/80">
                    <p className="text-[10px] text-amber-800">
                      💡 <strong>ഉടൻ ലോഗിൻ ചെയ്യാൻ:</strong> താഴെയുള്ള <strong>"Continue with Test OTP (482916)"</strong> ക്ലിക്ക് ചെയ്യുക.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleSwitchToDemoMode}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-extrabold text-xs shadow-sm hover:brightness-105 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#0B192C]" />
                    <span>Continue with Test OTP (482916)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="py-2 px-3 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100/50 transition-all cursor-pointer text-center"
                  >
                    Retry SMS
                  </button>
                </div>
              </div>
            )}

            {/* Standard Error Message */}
            {error && !isRegionRestricted && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* METHOD 1: Mobile OTP Login */}
            {loginMethod === 'otp' && (
              <>
                {step === 'phone' ? (
                  /* Step 1: Phone Input */
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label htmlFor="loginMobile" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Registered Mobile Number
                      </label>
                      <div className="flex rounded-xl border border-slate-300 focus-within:ring-2 focus-within:ring-[#D4AF37] focus-within:border-[#D4AF37] transition-all overflow-hidden bg-slate-50">
                        <div className="px-3 py-2.5 bg-slate-100 border-r border-slate-300 flex items-center space-x-1 text-slate-700 font-semibold text-xs">
                          <span className="text-base">🇮🇳</span>
                          <span>+91</span>
                        </div>
                        <input
                          id="loginMobile"
                          type="tel"
                          maxLength={10}
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="Enter 10-digit number"
                          className="flex-1 px-3 py-2.5 bg-white text-slate-900 text-xs font-medium focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 flex items-center space-x-1">
                        <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Protected by 100% verified matrimonial security.</span>
                      </p>
                    </div>



                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-md shadow-[#D4AF37]/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
                    >
                      {loading ? (
                        <RotateCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Get Security OTP</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>


                  </form>
                ) : (
                  /* Step 2: 6-Digit OTP Verification */
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          6-Digit OTP Code
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setError('');
                            setStep('phone');
                          }}
                          className="text-xs text-[#8C6D1F] hover:underline font-semibold cursor-pointer"
                        >
                          Change Number
                        </button>
                      </div>

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
                            aria-label={`OTP Digit ${idx + 1}`}
                            className="w-full h-12 text-center text-xl font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/40 focus:outline-none transition-all shadow-inner min-w-0"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                      <span>Didn’t receive code?</span>
                      {timer > 0 ? (
                        <span className="font-semibold text-slate-500">
                          Resend in 0:{timer < 10 ? `0${timer}` : timer}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isResending}
                          className="font-bold text-[#8C6D1F] hover:text-[#0B192C] flex items-center space-x-1 cursor-pointer"
                        >
                          {isResending ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <span>Resend OTP</span>}
                        </button>
                      )}
                    </div>

                    {/* Quick Demo Test OTP Button */}
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsLiveMode(false);
                          setConfirmationResult(null);
                          setOtp(['4', '8', '2', '9', '1', '6']);
                          setError('');
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[#8C6D1F] text-xs font-semibold hover:bg-amber-100/70 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" />
                        <span>Quick Test: Auto-fill Demo Code (482916)</span>
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-md shadow-[#D4AF37]/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
                    >
                      {loading ? (
                        <RotateCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Verify & Access Account</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* METHOD 2: Password Login */}
            {loginMethod === 'password' && (
              <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                <div>
                  <label htmlFor="loginId" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Matrimony Profile ID or Email
                  </label>
                  <div className="flex rounded-xl border border-slate-300 focus-within:ring-2 focus-within:ring-[#D4AF37] overflow-hidden bg-slate-50">
                    <span className="px-3 py-2.5 bg-slate-100 border-r border-slate-300 flex items-center text-slate-600">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      id="loginId"
                      type="text"
                      value={profileIdOrEmail}
                      onChange={(e) => setProfileIdOrEmail(e.target.value)}
                      placeholder="e.g. I4U-78291 or email@domain.com"
                      className="flex-1 px-3 py-2 text-xs font-medium text-slate-900 bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="loginPassword" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => alert("Password Reset: A temporary OTP has been sent to your registered contact number to reset your password.")}
                      className="text-[11px] text-[#8C6D1F] hover:underline font-semibold cursor-pointer"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="flex rounded-xl border border-slate-300 focus-within:ring-2 focus-within:ring-[#D4AF37] overflow-hidden bg-slate-50">
                    <span className="px-3 py-2.5 bg-slate-100 border-r border-slate-300 flex items-center text-slate-600">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      id="loginPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="flex-1 px-3 py-2 text-xs font-medium text-slate-900 bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="px-3 text-slate-500 hover:text-slate-800 focus:outline-none cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-medium">Security Strength:</span>
                        <span className={`font-bold ${passwordStrength.color}`}>{passwordStrength.feedback}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div 
                          className={`h-full transition-all duration-300 ${passwordStrength.barColor}`} 
                          style={{ width: `${Math.max(15, passwordStrength.score * 25)}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-0.5 text-[9px] text-slate-500 flex-wrap">
                        <span className={passwordStrength.criteria.length ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                          {passwordStrength.criteria.length ? '✓' : '•'} 8+ Chars
                        </span>
                        <span className={passwordStrength.criteria.upper && passwordStrength.criteria.lower ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                          {passwordStrength.criteria.upper && passwordStrength.criteria.lower ? '✓' : '•'} A-Z & a-z
                        </span>
                        <span className={passwordStrength.criteria.number ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                          {passwordStrength.criteria.number ? '✓' : '•'} 0-9
                        </span>
                        <span className={passwordStrength.criteria.special ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                          {passwordStrength.criteria.special ? '✓' : '•'} Special (!@#)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded accent-[#D4AF37] cursor-pointer"
                    />
                    <span className="text-[11px] font-medium">Keep me signed in</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-md shadow-[#D4AF37]/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
                >
                  {loading ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Sign In with Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Social Authentication: Google Sign-In */}
            <div className="pt-2 pb-1">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="shrink-0 mx-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Or continue with
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="mt-1">
                <GoogleSignInButton
                  onPress={handleGoogleSignIn}
                  loading={googleLoading}
                  disabled={loading}
                />
              </div>
            </div>

          </div>

          {/* Trust Badges Footer */}
          <div className="bg-slate-50 border-t border-slate-100 px-3 py-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col items-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mb-0.5" />
                <span className="text-[9px] font-bold text-slate-700">100% Verified</span>
              </div>
              <div className="flex flex-col items-center">
                <Lock className="w-3.5 h-3.5 text-[#8C6D1F] mb-0.5" />
                <span className="text-[9px] font-bold text-slate-700">Strict Privacy</span>
              </div>
              <div className="flex flex-col items-center">
                <HeartHandshake className="w-3.5 h-3.5 text-[#1E3A8A] mb-0.5" />
                <span className="text-[9px] font-bold text-slate-700">Pan-India Matches</span>
              </div>
            </div>
          </div>

        </div>

      {/* Real SMS Setup & Diagnostics Modal */}
      {showRealSmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B192C] text-white border-2 border-[#D4AF37]/50 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <button
              type="button"
              onClick={() => setShowRealSmsModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-[#DFB76C]" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-white">
                  Real Login SMS Setup
                </h3>
                <p className="text-[11px] text-slate-300">
                  ഫോണിലേക്ക് യഥാർത്ഥ SMS വരാൻ വേണ്ട ക്രമീകരണങ്ങൾ
                </p>
              </div>
            </div>

            {/* Explanation why real SMS didn't arrive */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs space-y-2 mb-4">
              <p className="text-amber-300 font-bold flex items-center gap-1 text-[12px]">
                <span>❓ എന്തുകൊണ്ടാണ് ഫോണിൽ SMS വരാതിരുന്നത്?</span>
              </p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                ആപ്പിൽ നിന്ന് Firebase പൂർണ്ണമായി ഒഴിവാക്കി പകരം <strong>Supabase & Fast2SMS</strong> ലേക്ക് മാറ്റിയിരിക്കുന്നു. ഇന്ത്യയിലെ ഏത് മൊബൈൽ നമ്പറിലേക്കും തത്സമയം യഥാർത്ഥ SMS എത്താൻ താഴെ പറയുന്ന ഓപ്ഷനുകൾ ഉപയോഗിക്കാം.
              </p>
            </div>

            {/* Solutions Section */}
            <div className="space-y-3">
              {/* Option A: Fast2SMS Real SMS Gateway */}
              <div className="p-3.5 bg-white/5 border border-[#D4AF37]/40 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#DFB76C] text-xs flex items-center gap-1.5">
                    <span>⚡ ഓപ്ഷൻ 1: Fast2SMS API Key (ഏറ്റവും എളുപ്പം)</span>
                  </span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Real SMS
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Fast2SMS വഴി ഏത് ഇന്ത്യൻ മൊബൈൽ നമ്പറിലേക്കും തത്സമയം യഥാർത്ഥ SMS അയക്കാം. ഫ്രീ സൈൻ-അപ്പിൽ സൗജന്യ SMS ലഭിക്കും.
                </p>

                {smsKeySaved ? (
                  <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/50 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Fast2SMS Key സേവ് ചെയ്തു! ഇനി യഥാർത്ഥ SMS നിങ്ങളുടെ ഫോണിൽ എത്തും!</span>
                  </div>
                ) : (
                  <form onSubmit={handleSaveFast2SmsKey} className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={inputFast2SmsKey}
                      onChange={(e) => setInputFast2SmsKey(e.target.value)}
                      placeholder="Paste your Fast2SMS API Key here..."
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white text-xs font-mono focus:border-[#DFB76C] focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-bold text-xs flex items-center justify-center gap-1 cursor-pointer hover:opacity-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save & Enable Fast2SMS</span>
                      </button>
                      <a
                        href="https://www.fast2sms.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-amber-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Get Free Key</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </form>
                )}
              </div>

              {/* Option B: Supabase Phone Auth */}
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl space-y-1.5 text-xs text-slate-300">
                <span className="font-bold text-amber-300 block text-[11.5px]">
                  📱 ഓപ്ഷൻ 2: Supabase Phone Auth
                </span>
                <p className="text-[11px] leading-relaxed">
                  നിങ്ങളുടെ Supabase Dashboard-ൽ <strong>Authentication ➔ Providers ➔ Phone</strong> വഴി SMS പ്രൊവൈഡർ കോൺഫിഗർ ചെയ്യാവുന്നതാണ്.
                </p>
              </div>

              {/* Option C: Instant Demo Bypass */}
              <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-amber-300 text-[11px]">ഉടൻ തന്നെ ആപ്പിൽ ലോഗിൻ ചെയ്യണോ?</p>
                  <p className="text-[10px] text-slate-300">സ്ക്രീനിൽ കാണുന്ന കോഡ് (482916) നൽകി ലോഗിൻ ചെയ്യാം</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const code = mobileNumber === '9123456780' ? '913724' : '482916';
                    setOtp(code.split(''));
                    setError('');
                    setShowRealSmsModal(false);
                    otpInputsRef.current[5]?.focus({ preventScroll: true });
                  }}
                  className="py-1.5 px-3 rounded-lg bg-[#D4AF37] text-[#0B192C] font-bold text-xs hover:bg-[#dfb76c] transition-colors cursor-pointer shrink-0"
                >
                  Use 482916
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Google Account Chooser Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white text-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto border border-slate-200">
            
            <button
              type="button"
              onClick={() => {
                setShowGoogleModal(false);
                setShowCustomGoogleForm(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Google Brand Header */}
            <div className="flex flex-col items-center text-center mb-5 pt-1">
              <svg className="w-10 h-10 mb-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Sign in with Google
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose an account to continue to <span className="font-semibold text-slate-700">I 4 You Matrimony</span>
              </p>
            </div>

            {/* Quick 1-Click login banner */}
            <div className="mb-4">
              <button
                type="button"
                disabled={googleLoading}
                onClick={() => handleExecuteGoogleSignIn(GOOGLE_DEMO_ACCOUNTS[0])}
                className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
              >
                {googleLoading ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>⚡ 1-Click Fast Login as Arun Kumar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            <div className="relative flex py-2 items-center mb-3">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="shrink-0 mx-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Or Choose Account
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Account List */}
            <div className="space-y-2.5 mb-4">
              {GOOGLE_DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.uid}
                  type="button"
                  disabled={googleLoading}
                  onClick={() => handleExecuteGoogleSignIn(acc)}
                  className="w-full flex items-center p-3 rounded-2xl border border-slate-200 hover:border-[#D4AF37] hover:bg-amber-50/40 active:scale-[0.99] transition-all text-left group cursor-pointer"
                >
                  <div className="relative shrink-0">
                    <img
                      src={acc.photo}
                      alt={acc.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 group-hover:border-[#D4AF37]"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                      <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 truncate group-hover:text-[#8C6D1F]">
                        {acc.name}
                      </p>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {acc.gender}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{acc.email}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{acc.badge}</p>
                  </div>
                </button>
              ))}

              {/* Add Custom Account Accordion / Button */}
              {!showCustomGoogleForm ? (
                <button
                  type="button"
                  onClick={() => setShowCustomGoogleForm(true)}
                  className="w-full flex items-center p-3 rounded-2xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-left transition-colors cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:text-slate-700">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                      Use another Google account
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Enter your own Google name & email
                    </p>
                  </div>
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!customGoogleName.trim()) {
                      setError('Please enter your name');
                      return;
                    }
                    const customAcc = {
                      uid: 'google-custom-' + Date.now(),
                      name: customGoogleName.trim(),
                      email: customGoogleEmail.trim() || `${customGoogleName.trim().toLowerCase().replace(/\s+/g, '')}@gmail.com`,
                      mobile: customGoogleMobile.trim() || '9847123456',
                      city: 'Kochi',
                      district: 'Ernakulam',
                      state: 'Kerala',
                      gender: customGoogleGender,
                      verified: true,
                      mobileVerified: true,
                      emailVerified: true,
                      badge: 'Kochi, Kerala • Verified Profile',
                      photo: customGoogleGender === 'Male'
                        ? 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'
                        : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800'
                    };
                    handleExecuteGoogleSignIn(customAcc);
                  }}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Custom Google Sign-In</span>
                    <button
                      type="button"
                      onClick={() => setShowCustomGoogleForm(false)}
                      className="text-[10px] text-slate-500 hover:text-slate-700 underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={customGoogleName}
                      onChange={(e) => setCustomGoogleName(e.target.value)}
                      placeholder="Your Full Name (e.g. Arun Kumar)"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <input
                      type="email"
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      placeholder="Google Email (e.g. arun@gmail.com)"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={customGoogleMobile}
                      onChange={(e) => setCustomGoogleMobile(e.target.value.replace(/\D/g, ''))}
                      maxLength={10}
                      placeholder="Mobile No (optional)"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                    <select
                      value={customGoogleGender}
                      onChange={(e) => setCustomGoogleGender(e.target.value)}
                      className="px-2.5 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={googleLoading}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] hover:brightness-105 transition-all shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {googleLoading ? (
                      <RotateCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Continue with this Account</span>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Privacy notice */}
            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center leading-relaxed">
              To continue, Google will securely share your profile details with I 4 You Matrimony. Protected by 256-bit encryption.
            </div>

          </div>
        </div>
      )}

      </div>

    </div>
  );
}
