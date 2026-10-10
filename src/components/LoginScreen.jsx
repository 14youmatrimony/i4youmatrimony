import React, { useState, useEffect, useRef } from 'react';
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
  Mail,
  Smartphone,
  RotateCw,
  MessageSquare
} from 'lucide-react';
import { loginWithRegisterId, loginWithMobileOtpSuccess } from '../services/authService';
import { sendPhoneOtp, verifyPhoneOtp } from '../services/phoneAuth';

export default function LoginScreen({ 
  onLoginSuccess, 
  setCurrentScreen, 
  onNavigateToRegister, 
  onBack 
}) {
  // Login method: 'registerId' | 'mobile'
  const [loginMode, setLoginMode] = useState('registerId');

  // Mobile sub-mode: 'otp' | 'password'
  const [mobileAuthType, setMobileAuthType] = useState('otp');

  // Register ID form state
  const [registerId, setRegisterId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Mobile form state
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(45);
  const [isResending, setIsResending] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isSimulatedOtp, setIsSimulatedOtp] = useState(false);
  const [simulatedOtpCode, setSimulatedOtpCode] = useState('');
  const [mobilePassword, setMobilePassword] = useState('');
  const [showMobilePassword, setShowMobilePassword] = useState(false);

  // General state
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  const otpInputsRef = useRef([]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (timer > 0 && otpSent && loginMode === 'mobile' && mobileAuthType === 'otp') {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, otpSent, loginMode, mobileAuthType]);

  // Handler for Register ID + Password submission
  const handleRegisterIdSubmit = async (e) => {
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

  // Handler to send OTP to mobile number
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanMobile = (mobileNumber || '').replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPhoneOtp(cleanMobile);
      if (res.success) {
        setConfirmationResult(res.confirmationResult);
        setOtpSent(true);
        setTimer(45);
        setIsSimulatedOtp(Boolean(res.isSimulated));
        const demoCode = res.demoOtp || (cleanMobile === '9123456780' ? '913724' : '482916');
        setSimulatedOtpCode(demoCode);
        setSuccessMessage(`OTP sent successfully to +91 ${cleanMobile}`);
        setTimeout(() => {
          otpInputsRef.current[0]?.focus();
        }, 150);
      } else {
        setError(res.error || 'Failed to dispatch OTP. Please check your number.');
      }
    } catch (err) {
      setError(err.message || 'Error sending OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handler to resend OTP
  const handleResendOtp = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    setError('');
    setOtp(['', '', '', '', '', '']);

    const cleanMobile = (mobileNumber || '').replace(/\D/g, '').slice(-10);
    try {
      const res = await sendPhoneOtp(cleanMobile);
      if (res.success) {
        setConfirmationResult(res.confirmationResult);
        setTimer(45);
        setIsSimulatedOtp(Boolean(res.isSimulated));
        const demoCode = res.demoOtp || (cleanMobile === '9123456780' ? '913724' : '482916');
        setSimulatedOtpCode(demoCode);
        setSuccessMessage(`A new OTP has been sent to +91 ${cleanMobile}`);
      } else {
        setError(res.error || 'Failed to resend OTP. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Error resending OTP.');
    } finally {
      setIsResending(false);
      otpInputsRef.current[0]?.focus();
    }
  };

  // Handler for OTP input change
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    setError('');

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto advance
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        otpInputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < pasted.length; i++) {
        newOtp[i] = pasted[i];
      }
      setOtp(newOtp);
      otpInputsRef.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  // Handler to verify OTP and sign in
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanOtp = otp.join('').trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter all 6 digits of the OTP');
      return;
    }

    const cleanMobile = (mobileNumber || '').replace(/\D/g, '').slice(-10);
    setLoading(true);

    try {
      const verifyRes = await verifyPhoneOtp(
        confirmationResult,
        cleanOtp,
        isSimulatedOtp,
        cleanMobile
      );

      if (verifyRes.success) {
        const authRes = await loginWithMobileOtpSuccess(cleanMobile);
        if (authRes.success && authRes.user) {
          setSuccessMessage(`Welcome back, ${authRes.user.name || 'Member'}! Logging in...`);
          setTimeout(() => {
            onLoginSuccess?.(authRes.user);
            if (setCurrentScreen) setCurrentScreen('app');
          }, 600);
        } else {
          setError(authRes.error || 'Failed to authenticate mobile account.');
        }
      } else {
        setError(verifyRes.error || 'Incorrect OTP entered. Please check and try again.');
      }
    } catch (err) {
      setError(err.message || 'OTP verification error. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  // Handler for Mobile Number + Password submission
  const handleMobilePasswordSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanMobile = (mobileNumber || '').replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!mobilePassword) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      const result = await loginWithRegisterId(cleanMobile, mobilePassword);

      if (result.success && result.user) {
        setSuccessMessage(`Welcome back, ${result.user.name || 'Member'}! Logging in...`);
        
        setTimeout(() => {
          onLoginSuccess?.(result.user);
          if (setCurrentScreen) setCurrentScreen('app');
        }, 600);
      } else {
        setError(result.error || 'Invalid mobile number or password. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Authentication error. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white relative flex flex-col justify-between overflow-hidden">
      {/* Decorative Gold & Navy Top Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0B192C] via-[#D4AF37] to-[#0B192C]" />

      <div className="p-6 sm:p-8">
        {/* Header with Title and Close Button */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 text-[#8C6D1F] border border-[#D4AF37]/30 text-[11px] font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Pan India Matrimony</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#0B192C] tracking-tight">
              Member Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {loginMode === 'registerId' 
                ? 'Enter your unique Register ID and password to access your matrimony account'
                : 'Enter your 10-digit registered mobile number to sign in instantly'}
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

        {/* Login Method Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-xl mb-5 border border-slate-200/60">
          <button
            type="button"
            onClick={() => {
              setLoginMode('registerId');
              setError('');
              setSuccessMessage('');
            }}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              loginMode === 'registerId'
                ? 'bg-white text-[#0B192C] shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Register ID</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('mobile');
              setError('');
              setSuccessMessage('');
            }}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              loginMode === 'mobile'
                ? 'bg-white text-[#0B192C] shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Mobile Number</span>
          </button>
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

        {/* MODE 1: Register ID Login Form */}
        {loginMode === 'registerId' && (
          <form onSubmit={handleRegisterIdSubmit} className="space-y-4">
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
                  Forgot Password?
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
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In with Register ID</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* MODE 2: Mobile Number Login Form */}
        {loginMode === 'mobile' && (
          <div className="space-y-4">
            {/* Sub-Switch: OTP vs Password */}
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {mobileAuthType === 'otp' ? 'Instant OTP Sign In' : 'Mobile & Password Sign In'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMobileAuthType(mobileAuthType === 'otp' ? 'password' : 'otp');
                  setOtpSent(false);
                  setError('');
                }}
                className="text-[11px] font-bold text-[#8C6D1F] hover:text-[#0B192C] transition-colors cursor-pointer"
              >
                {mobileAuthType === 'otp' ? 'Use Password instead' : 'Use OTP instead'}
              </button>
            </div>

            {/* SUB-FLOW A: Mobile Login with OTP */}
            {mobileAuthType === 'otp' && (
              <>
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/20 transition-all overflow-hidden">
                        <div className="flex items-center px-3.5 bg-slate-100/80 border-r border-slate-200 text-xs font-bold text-slate-700 space-x-1.5 select-none">
                          <span className="text-base leading-none">🇮🇳</span>
                          <span>+91</span>
                        </div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={mobileNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setMobileNumber(val);
                            if (error) setError('');
                          }}
                          placeholder="Enter 10-digit mobile number"
                          autoFocus
                          required
                          className="flex-1 px-3.5 py-3 outline-none text-sm font-semibold tracking-wider text-slate-800 placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 bg-transparent"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        We'll send a 6-digit one-time password (OTP) via SMS to verify
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || mobileNumber.length !== 10}
                      className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-lg shadow-[#D4AF37]/25 hover:shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#0B192C] border-t-transparent rounded-full animate-spin" />
                          <span>Dispatching OTP...</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          <span>Get OTP via SMS</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    {/* Mobile Number Badge with Edit Option */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center space-x-2">
                        <Smartphone className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-xs font-bold text-slate-800">
                          +91 {mobileNumber}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp(['', '', '', '', '', '']);
                          setError('');
                        }}
                        className="text-[11px] font-bold text-[#8C6D1F] hover:text-[#0B192C] transition-colors cursor-pointer"
                      >
                        Change Number
                      </button>
                    </div>

                    {/* 6-Digit OTP Box Inputs */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Enter 6-Digit OTP <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-6 gap-2">
                        {otp.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => (otpInputsRef.current[idx] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            onPaste={idx === 0 ? handleOtpPaste : undefined}
                            className="w-full h-12 text-center text-lg font-bold rounded-xl border border-slate-200 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all bg-slate-50/50 hover:bg-white focus:bg-white text-slate-800"
                          />
                        ))}
                      </div>

                      {/* Demo OTP Auto-fill hint for frictionless testing */}
                      {isSimulatedOtp && simulatedOtpCode && (
                        <div className="mt-2.5 flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200/70 text-[11px] text-amber-900">
                          <span>Demo OTP: <strong>{simulatedOtpCode}</strong></span>
                          <button
                            type="button"
                            onClick={() => {
                              setOtp(simulatedOtpCode.split(''));
                              setError('');
                              otpInputsRef.current[5]?.focus();
                            }}
                            className="font-bold underline text-[#8C6D1F] hover:text-[#0B192C] cursor-pointer"
                          >
                            Auto Fill
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Resend OTP Bar */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">Didn't receive SMS?</span>
                      {timer > 0 ? (
                        <span className="text-slate-400 font-medium">
                          Resend in 0:{timer < 10 ? `0${timer}` : timer}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isResending}
                          className="font-bold text-[#8C6D1F] hover:text-[#0B192C] transition-colors inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                          <span>Resend OTP</span>
                        </button>
                      )}
                    </div>

                    {/* Verify & Sign In Button */}
                    <button
                      type="submit"
                      disabled={loading || otp.join('').length !== 6}
                      className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-lg shadow-[#D4AF37]/25 hover:shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#0B192C] border-t-transparent rounded-full animate-spin" />
                          <span>Verifying OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify & Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* SUB-FLOW B: Mobile Login with Password */}
            {mobileAuthType === 'password' && (
              <form onSubmit={handleMobilePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus-within:bg-white focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/20 transition-all overflow-hidden">
                    <div className="flex items-center px-3.5 bg-slate-100/80 border-r border-slate-200 text-xs font-bold text-slate-700 space-x-1.5 select-none">
                      <span className="text-base leading-none">🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={mobileNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setMobileNumber(val);
                        if (error) setError('');
                      }}
                      placeholder="Enter 10-digit mobile number"
                      autoFocus
                      required
                      className="flex-1 px-3.5 py-3 outline-none text-sm font-semibold tracking-wider text-slate-800 placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 bg-transparent"
                    />
                  </div>
                </div>

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
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <input
                      type={showMobilePassword ? 'text' : 'password'}
                      value={mobilePassword}
                      onChange={(e) => {
                        setMobilePassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="Enter your password"
                      required
                      className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all bg-slate-50/50 hover:bg-white focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMobilePassword(!showMobilePassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showMobilePassword ? 'Hide password' : 'Show password'}
                    >
                      {showMobilePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In with Mobile</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Switch Login Method Box (Replaces Quick Test Credentials) */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          {loginMode === 'registerId' ? (
            <button
              type="button"
              onClick={() => {
                setLoginMode('mobile');
                setError('');
                setSuccessMessage('');
              }}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-[#D4AF37] bg-slate-50/70 hover:bg-[#FFFDF7] flex items-center justify-between transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center text-[#8C6D1F] group-hover:bg-[#D4AF37] group-hover:text-[#0B192C] transition-colors">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-[#0B192C] group-hover:text-[#8C6D1F]">
                    Switch to Mobile Number Login
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Sign in using 10-digit mobile number with OTP or password
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1 text-slate-400 group-hover:text-[#8C6D1F] transition-colors">
                <span className="text-[11px] font-semibold">Switch</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setLoginMode('registerId');
                setError('');
                setSuccessMessage('');
              }}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-[#D4AF37] bg-slate-50/70 hover:bg-[#FFFDF7] flex items-center justify-between transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center text-[#8C6D1F] group-hover:bg-[#D4AF37] group-hover:text-[#0B192C] transition-colors">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-[#0B192C] group-hover:text-[#8C6D1F]">
                    Switch to Register ID Login
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Sign in using unique Register ID (e.g. I4Y1001) & password
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1 text-slate-400 group-hover:text-[#8C6D1F] transition-colors">
                <span className="text-[11px] font-semibold">Switch</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          )}
        </div>

        {/* Switch to Registration */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600">
            Don't have a matrimony account yet?{' '}
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
              Your <strong>Register ID</strong> (e.g. <code>I4Y1001</code>) was sent to your registered email address and mobile number upon successful registration.
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
