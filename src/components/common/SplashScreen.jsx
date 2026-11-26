import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Heart } from 'lucide-react';
import brandLogoAsset from '../../assets/brand-logo.png';

/**
 * Premium Luxury Splash Screen for I4 You Matrimony
 * Features smooth CSS animations, warm gold/burgundy accents,
 * brand logo presentation, and a fluid 2.8s fade-out transition.
 */
export default function SplashScreen({ onFinish, duration = 2800 }) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Smooth progress bar update over duration
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(100, Math.round((elapsed / (duration - 400)) * 100));
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 30);

    // Trigger smooth fade-out animation 450ms before duration ends
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(500, duration - 450));

    // Complete splash sequence and transition to main app flow
    const finishTimer = setTimeout(() => {
      if (onFinish) onFinish();
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  return (
    <div
      role="dialog"
      aria-label="Welcome to I4 You Matrimony"
      className={`fixed inset-0 z-[99999] select-none flex flex-col items-center justify-between p-6 sm:p-10 overflow-hidden bg-gradient-to-b from-[#1A0E10] via-[#2C1A1D] to-[#0D0708] transition-all duration-500 ease-out ${
        isFadingOut
          ? 'opacity-0 scale-[1.02] blur-sm pointer-events-none'
          : 'opacity-100 scale-100 blur-0'
      }`}
    >
      {/* Ambient Lighting & Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-Center Warm Rose-Gold Aura */}
        <div className="absolute w-[500px] h-[500px] -top-32 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-b from-[#C58B76]/20 via-[#E6B8A2]/10 to-transparent blur-3xl" />

        {/* Right Plum Accent Orb */}
        <div className="absolute w-[450px] h-[450px] top-1/4 -right-28 rounded-full bg-[#7A2E43]/25 blur-3xl" />

        {/* Left Rich Plum Ambient Glow */}
        <div className="absolute w-[420px] h-[420px] bottom-1/4 -left-28 rounded-full bg-[#612234]/20 blur-3xl" />

        {/* Bottom Warm Rose-Gold Glow */}
        <div className="absolute w-[550px] h-[260px] -bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-[#C58B76]/15 blur-3xl" />

        {/* Subtle Decorative Floating Sparkles */}
        <div className="absolute top-1/4 left-[15%] w-1.5 h-1.5 rounded-full bg-[#E6B8A2]/70 shadow-[0_0_8px_#C58B76] animate-pulse" />
        <div className="absolute top-1/3 right-[18%] w-2 h-2 rounded-full bg-[#E6B8A2]/80 shadow-[0_0_10px_#C58B76] animate-pulse" style={{ animationDelay: '700ms' }} />
        <div className="absolute bottom-1/3 left-[22%] w-1.5 h-1.5 rounded-full bg-[#E6B8A2]/60 shadow-[0_0_8px_#C58B76] animate-pulse" style={{ animationDelay: '1200ms' }} />
        <div className="absolute bottom-1/4 right-[25%] w-2 h-2 rounded-full bg-[#E6B8A2]/75 shadow-[0_0_10px_#C58B76] animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>

      {/* Top Header Badge */}
      <div className="relative z-10 pt-4 flex flex-col items-center animate-in fade-in duration-700">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#C58B76]/10 via-[#C58B76]/20 to-[#C58B76]/10 text-[#E6B8A2] border border-[#C58B76]/35 text-[10px] sm:text-xs font-bold tracking-widest uppercase shadow-lg shadow-[#2C1A1D]/50 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-[#C58B76]" />
          <span>Exclusive Matrimony Network</span>
        </div>
      </div>

      {/* Centerpiece: Brand Logo Emblem & Animated Typography */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto px-4 max-w-lg">
        {/* Emblem Wrapper with Dual Halo and Smooth Pulse Animation */}
        <div className="relative mb-6 sm:mb-8 flex items-center justify-center">
          {/* Subtle Rotating Rose-Gold Ring */}
          <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-dashed border-[#C58B76]/30 animate-splash-aura pointer-events-none" />

          {/* Secondary Plum Radial Ambient Halo */}
          <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full bg-gradient-to-tr from-[#7A2E43]/30 to-[#C58B76]/25 blur-2xl pointer-events-none" />

          {/* Elevated Brand Logo Box */}
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-br from-[#3D2328] via-[#2C1A1D] to-[#1A0E10] p-3.5 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(197,139,118,0.35)] border-2 border-[#C58B76] ring-4 ring-[#C58B76]/20 flex items-center justify-center overflow-hidden animate-splash-scale-in animate-splash-pulse-glow">
            {/* Subtle Glass Reflection Line */}
            <div className="absolute -top-10 -left-10 w-24 h-40 bg-white/10 rotate-45 pointer-events-none" />

            <img
              src={brandLogoAsset}
              onError={(e) => {
                e.currentTarget.src = '/brand-logo.png';
              }}
              alt="I4 You Matrimony Logo"
              className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
            />
          </div>

          {/* Luxury Corner Heart / Sparkle Jewel */}
          <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-[#E6B8A2] via-[#C58B76] to-[#7A2E43] p-1.5 rounded-full shadow-lg border-2 border-[#2C1A1D] flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 text-[#2C1A1D] fill-[#2C1A1D]" />
          </div>
        </div>

        {/* Brand Title: "I4 You Matrimony" */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight text-white mb-2 sm:mb-3 drop-shadow-md">
          <span className="bg-gradient-to-r from-[#FFF9F6] via-[#E6B8A2] to-[#C58B76] bg-clip-text text-transparent animate-splash-shimmer">
            I4 You
          </span>
          <span className="text-white ml-2.5 font-serif font-light tracking-normal">
            Matrimony
          </span>
        </h1>

        {/* Brand Tagline: "Find Your Perfect Match" */}
        <p className="text-sm sm:text-base md:text-lg font-serif italic text-[#E6B8A2] tracking-wider max-w-sm sm:max-w-md mx-auto drop-shadow-sm">
          Find Your Perfect Match
        </p>

        {/* Pan-India Sub-tagline */}
        <p className="text-[11px] sm:text-xs text-slate-400 tracking-widest uppercase font-medium mt-1.5">
          Connecting Hearts Across India
        </p>
      </div>

      {/* Bottom Progress Bar & Trust Indicators */}
      <div className="relative z-10 pb-4 w-full flex flex-col items-center text-center">
        {/* Elegant Rose-Gold Progress Indicator */}
        <div className="w-48 sm:w-64 h-1.5 bg-slate-800/80 rounded-full border border-[#C58B76]/35 p-0.5 mb-3.5 shadow-inner backdrop-blur-sm overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#7A2E43] via-[#C58B76] to-[#FDECE4] rounded-full shadow-[0_0_12px_rgba(197,139,118,0.7)] transition-all ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Trust & Verification Badges */}
        <div className="inline-flex items-center space-x-2 text-[11px] sm:text-xs text-slate-300/85 font-medium tracking-wide">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C58B76] shrink-0" />
          <span>100% Aadhaar Verified Profiles</span>
          <span className="text-[#C58B76]">•</span>
          <span>Trusted & Confidential</span>
        </div>
      </div>
    </div>
  );
}
