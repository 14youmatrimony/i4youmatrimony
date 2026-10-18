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
      className={`fixed inset-0 z-[99999] select-none flex flex-col items-center justify-between p-6 sm:p-10 overflow-hidden bg-gradient-to-b from-[#060D17] via-[#0B192C] to-[#04080F] transition-all duration-500 ease-out ${
        isFadingOut
          ? 'opacity-0 scale-[1.02] blur-sm pointer-events-none'
          : 'opacity-100 scale-100 blur-0'
      }`}
    >
      {/* Ambient Lighting & Atmosphere (Royal Navy, Warm Gold, Burgundy Wine) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-Center Warm Gold Aura */}
        <div className="absolute w-[500px] h-[500px] -top-32 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-b from-[#D4AF37]/20 via-[#DFB76C]/10 to-transparent blur-3xl" />

        {/* Right Burgundy / Wine Accent Orb */}
        <div className="absolute w-[450px] h-[450px] top-1/4 -right-28 rounded-full bg-[#800020]/25 blur-3xl" />

        {/* Left Rich Crimson / Burgundy Ambient Glow */}
        <div className="absolute w-[420px] h-[420px] bottom-1/4 -left-28 rounded-full bg-[#580D1E]/20 blur-3xl" />

        {/* Bottom Warm Gold Glow */}
        <div className="absolute w-[550px] h-[260px] -bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-[#D4AF37]/15 blur-3xl" />

        {/* Subtle Decorative Floating Sparkles */}
        <div className="absolute top-1/4 left-[15%] w-1.5 h-1.5 rounded-full bg-[#DFB76C]/70 shadow-[0_0_8px_#D4AF37] animate-pulse" />
        <div className="absolute top-1/3 right-[18%] w-2 h-2 rounded-full bg-[#DFB76C]/80 shadow-[0_0_10px_#D4AF37] animate-pulse" style={{ animationDelay: '700ms' }} />
        <div className="absolute bottom-1/3 left-[22%] w-1.5 h-1.5 rounded-full bg-[#DFB76C]/60 shadow-[0_0_8px_#D4AF37] animate-pulse" style={{ animationDelay: '1200ms' }} />
        <div className="absolute bottom-1/4 right-[25%] w-2 h-2 rounded-full bg-[#DFB76C]/75 shadow-[0_0_10px_#D4AF37] animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>

      {/* Top Header Badge */}
      <div className="relative z-10 pt-4 flex flex-col items-center animate-in fade-in duration-700">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#D4AF37]/10 via-[#D4AF37]/20 to-[#D4AF37]/10 text-[#DFB76C] border border-[#D4AF37]/35 text-[10px] sm:text-xs font-bold tracking-widest uppercase shadow-lg shadow-[#0B192C]/50 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Exclusive Matrimony Network</span>
        </div>
      </div>

      {/* Centerpiece: Brand Logo Emblem & Animated Typography */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto px-4 max-w-lg">
        {/* Emblem Wrapper with Dual Halo and Smooth Pulse Animation */}
        <div className="relative mb-6 sm:mb-8 flex items-center justify-center">
          {/* Subtle Rotating Gold Ring */}
          <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-dashed border-[#D4AF37]/30 animate-splash-aura pointer-events-none" />

          {/* Secondary Burgundy Radial Ambient Halo */}
          <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full bg-gradient-to-tr from-[#800020]/30 to-[#D4AF37]/25 blur-2xl pointer-events-none" />

          {/* Elevated Brand Logo Box */}
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-br from-[#10233D] via-[#0B192C] to-[#07111F] p-3.5 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(212,175,55,0.35)] border-2 border-[#D4AF37] ring-4 ring-[#D4AF37]/20 flex items-center justify-center overflow-hidden animate-splash-scale-in animate-splash-pulse-glow">
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
          <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-[#DFB76C] via-[#D4AF37] to-[#8C6D1F] p-1.5 rounded-full shadow-lg border-2 border-[#0B192C] flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 text-[#0B192C] fill-[#0B192C]" />
          </div>
        </div>

        {/* Brand Title: "I4 You Matrimony" */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black tracking-tight text-white mb-2 sm:mb-3 drop-shadow-md">
          <span className="bg-gradient-to-r from-[#FDF8EB] via-[#DFB76C] to-[#D4AF37] bg-clip-text text-transparent animate-splash-shimmer">
            I4 You
          </span>
          <span className="text-white ml-2.5 font-serif font-light tracking-normal">
            Matrimony
          </span>
        </h1>

        {/* Brand Tagline: "Find Your Perfect Match" */}
        <p className="text-sm sm:text-base md:text-lg font-serif italic text-[#E5C158]/95 tracking-wider max-w-sm sm:max-w-md mx-auto drop-shadow-sm">
          Find Your Perfect Match
        </p>

        {/* Pan-India Sub-tagline */}
        <p className="text-[11px] sm:text-xs text-slate-400 tracking-widest uppercase font-medium mt-1.5">
          Connecting Hearts Across India
        </p>
      </div>

      {/* Bottom Progress Bar & Trust Indicators */}
      <div className="relative z-10 pb-4 w-full flex flex-col items-center text-center">
        {/* Elegant Gold Progress Indicator */}
        <div className="w-48 sm:w-64 h-1.5 bg-slate-800/80 rounded-full border border-[#D4AF37]/35 p-0.5 mb-3.5 shadow-inner backdrop-blur-sm overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#800020] via-[#D4AF37] to-[#FFF3B0] rounded-full shadow-[0_0_12px_rgba(212,175,55,0.7)] transition-all ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Trust & Verification Badges */}
        <div className="inline-flex items-center space-x-2 text-[11px] sm:text-xs text-slate-300/85 font-medium tracking-wide">
          <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
          <span>100% Aadhaar Verified Profiles</span>
          <span className="text-[#D4AF37]">•</span>
          <span>Trusted & Confidential</span>
        </div>
      </div>
    </div>
  );
}
