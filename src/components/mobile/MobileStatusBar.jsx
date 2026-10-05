import React, { useState, useEffect, useMemo } from 'react';
import { Wifi, BatteryMedium, Signal, Sparkles } from 'lucide-react';

/**
 * Custom hook to maintain realistic live digital clock updated every minute
 */
function useLiveTime(fallback = '9:41') {
  const [time, setTime] = useState(() => {
    try {
      const now = new Date();
      return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    const update = () => {
      try {
        const now = new Date();
        setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
      } catch {
        setTime(fallback);
      }
    };
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [fallback]);

  return time;
}

/**
 * MobileTopStatusBar
 * Dynamically switches theme & colors based on the active screen / app header:
 * - Login Screen: Deep Midnight Blue (#151c38) with crisp light text & gold accents
 * - Register Wizard: Dark Royal Navy (#07111F) with light text & gold accents
 * - Mobile Verification / Aadhaar Screen: Light Slate (bg-slate-50) with dark slate text & icons
 * - Main App Feed / Tabs: Dark Royal Navy (#0B192C) with light text & emerald battery
 * - Story Viewer: Fullscreen AMOLED Black (bg-black) with light text
 */
export function MobileTopStatusBar({ 
  deviceType = 'ios', 
  currentTime,
  currentScreen = 'app',
  activeStoryViewer = null,
  theme = 'auto',
  customBg = ''
}) {
  const liveTime = useLiveTime(currentTime || '9:41');
  const displayTime = currentTime || liveTime;

  // Determine if status bar should render in light mode (dark text/icons) or dark mode (light text/icons)
  const isLight = useMemo(() => {
    if (theme === 'light') return true;
    if (theme === 'dark') return false;
    if (activeStoryViewer) return false;
    if (currentScreen === 'verify-mobile' || currentScreen === 'verify-aadhaar') return true;
    return false; // Default: 'app', 'login', 'register' have dark top headers
  }, [theme, currentScreen, activeStoryViewer]);

  // Determine dynamic background styling to seamlessly blend with the active screen
  const { bgClass, islandRing, iconColor, textColor, batteryColor } = useMemo(() => {
    if (customBg) {
      return {
        bgClass: customBg,
        islandRing: isLight ? 'ring-slate-300' : 'ring-white/20',
        iconColor: isLight ? 'text-slate-800' : 'text-slate-200',
        textColor: isLight ? 'text-slate-900' : 'text-white',
        batteryColor: isLight ? 'text-emerald-700' : 'text-emerald-400'
      };
    }

    if (activeStoryViewer) {
      return {
        bgClass: 'bg-black text-white border-b border-white/10',
        islandRing: 'ring-white/20',
        iconColor: 'text-slate-300',
        textColor: 'text-white',
        batteryColor: 'text-emerald-400'
      };
    }

    if (isLight) {
      return {
        bgClass: 'bg-slate-50 text-slate-800 border-b border-slate-200/90 shadow-2xs',
        islandRing: 'ring-slate-400/40',
        iconColor: 'text-slate-800',
        textColor: 'text-slate-900',
        batteryColor: 'text-emerald-700'
      };
    }

    if (currentScreen === 'login') {
      return {
        bgClass: 'bg-[#151c38] text-white border-b border-[#D4AF37]/25 shadow-2xs',
        islandRing: 'ring-[#DFB76C]/30',
        iconColor: 'text-slate-200',
        textColor: 'text-white',
        batteryColor: 'text-emerald-400'
      };
    }

    if (currentScreen === 'register') {
      return {
        bgClass: 'bg-[#07111F] text-white border-b border-[#D4AF37]/25 shadow-2xs',
        islandRing: 'ring-[#DFB76C]/30',
        iconColor: 'text-slate-200',
        textColor: 'text-white',
        batteryColor: 'text-emerald-400'
      };
    }

    // Default 'app' shell feed & search
    return {
      bgClass: 'bg-[#0B192C] text-white border-b border-[#D4AF37]/25 shadow-2xs',
      islandRing: 'ring-[#DFB76C]/30',
      iconColor: 'text-slate-200',
      textColor: 'text-white',
      batteryColor: 'text-emerald-400'
    };
  }, [customBg, activeStoryViewer, isLight, currentScreen]);

  if (deviceType === 'android') {
    return (
      <aside 
        aria-label="Android Status Bar"
        className={`w-full px-5 pt-2 pb-1.5 flex items-center justify-between text-[11px] font-medium tracking-tight select-none shrink-0 transition-colors duration-300 ease-in-out z-30 ${bgClass}`}
      >
        {/* Left: Time & Matrimony Active Dot */}
        <div className="flex items-center space-x-1.5">
          <span className={`font-bold font-mono tracking-tight ${textColor}`}>{displayTime}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#DFB76C] animate-pulse"></span>
        </div>

        {/* Center: Camera Punch Hole */}
        <div className={`w-3.5 h-3.5 rounded-full bg-black ring-1 shrink-0 ${isLight ? 'ring-slate-300 shadow-inner' : 'ring-slate-800'}`}></div>

        {/* Right: Network & Battery Indicators */}
        <div className={`flex items-center space-x-1.5 ${iconColor}`}>
          <Signal className="w-3 h-3" />
          <Wifi className="w-3 h-3" />
          <span className={`text-[10px] font-bold font-mono ${textColor}`}>88%</span>
          <BatteryMedium className={`w-3.5 h-3.5 ${batteryColor}`} />
        </div>
      </aside>
    );
  }

  // Default: Apple iPhone iOS Style
  return (
    <aside 
      aria-label="iOS Status Bar"
      className={`w-full px-6 pt-2 pb-1.5 flex items-center justify-between text-[11px] font-semibold tracking-tight select-none shrink-0 transition-colors duration-300 ease-in-out z-30 ${bgClass}`}
    >
      {/* Left: Live Time */}
      <div className="min-w-[42px]">
        <span className={`font-bold font-mono tracking-tight ${textColor}`}>{displayTime}</span>
      </div>

      {/* Center: iPhone Dynamic Island with Matrimony Pulse */}
      <div className={`w-24 h-5 rounded-full bg-black flex items-center justify-between px-2.5 shrink-0 ring-1 shadow-xs transition-all ${islandRing}`}>
        {/* Camera Lens Dot */}
        <span className="w-2 h-2 rounded-full bg-slate-900 border border-slate-800"></span>

        {/* Dynamic Island Status Emblem */}
        <div className="flex items-center space-x-0.5">
          <Sparkles className="w-2.5 h-2.5 text-[#DFB76C] animate-pulse" />
          <span className="text-[8px] text-[#DFB76C] font-mono font-bold tracking-widest">I4U</span>
        </div>

        {/* Green Privacy / Connected Indicator Dot */}
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
      </div>

      {/* Right: Signal, 5G, Wi-Fi, Battery */}
      <div className={`flex items-center space-x-1.5 min-w-[50px] justify-end ${iconColor}`}>
        <Signal className="w-3 h-3" />
        <span className={`text-[9px] font-bold font-mono tracking-tighter ${textColor}`}>5G</span>
        <Wifi className="w-3 h-3" />
        <div className="flex items-center space-x-0.5">
          <span className={`text-[10px] font-bold font-mono ${textColor}`}>88%</span>
          <BatteryMedium className={`w-4 h-4 ${batteryColor}`} />
        </div>
      </div>
    </aside>
  );
}

/**
 * MobileBottomNavigationIndicator
 * Adapts to device form factor and screen color theme
 */
export function MobileBottomNavigationIndicator({ 
  deviceType = 'ios', 
  theme = 'auto', 
  currentScreen = 'app',
  activeStoryViewer = null,
  bottomBarStyle = 'glass',
  isDarkMode = false
}) {
  const { containerBg, indicatorLine } = useMemo(() => {
    if (activeStoryViewer) {
      return { containerBg: 'bg-black', indicatorLine: 'bg-white/40' };
    }

    if (currentScreen === 'login') {
      return { containerBg: 'bg-[#151c38]', indicatorLine: 'bg-[#DFB76C]/60' };
    }

    if (currentScreen === 'register') {
      return { containerBg: 'bg-[#07111F]', indicatorLine: 'bg-[#DFB76C]/60' };
    }

    if (currentScreen === 'verify-mobile' || currentScreen === 'verify-aadhaar') {
      return { containerBg: 'bg-slate-50', indicatorLine: 'bg-slate-400' };
    }

    if (currentScreen === 'app') {
      if (bottomBarStyle === 'classic') {
        // Seamlessly continue the classic solid navy bottom navigation bar
        return { 
          containerBg: 'bg-[#0B192C]', 
          indicatorLine: 'bg-white/40' 
        };
      }
      if (bottomBarStyle === 'glass') {
        // Seamlessly continue the frosted glass bottom navigation bar
        return { 
          containerBg: 'bg-[#0B192C]/85 backdrop-blur-xl', 
          indicatorLine: 'bg-white/40' 
        };
      }
      if (bottomBarStyle === 'dock') {
        // Dock floats above, so bottom indicator is transparent
        return { 
          containerBg: 'bg-transparent', 
          indicatorLine: isDarkMode ? 'bg-white/40' : 'bg-slate-400' 
        };
      }
      // transparent
      return { 
        containerBg: 'bg-transparent', 
        indicatorLine: isDarkMode ? 'bg-white/40' : 'bg-slate-500/80' 
      };
    }

    if (theme === 'dark' || isDarkMode) {
      return { containerBg: 'bg-[#0B192C]', indicatorLine: 'bg-white/40' };
    }

    return { containerBg: 'bg-transparent', indicatorLine: 'bg-slate-400' };
  }, [theme, currentScreen, activeStoryViewer, bottomBarStyle, isDarkMode]);

  if (deviceType === 'android') {
    return (
      <div className={`py-1.5 flex justify-center items-center shrink-0 transition-colors duration-300 ${containerBg}`}>
        <div className={`w-20 h-1 rounded-full ${indicatorLine}`}></div>
      </div>
    );
  }

  // iOS Home Indicator
  return (
    <div className={`py-2 flex justify-center items-center shrink-0 transition-colors duration-300 ${containerBg}`}>
      <div className={`w-32 h-1 rounded-full ${indicatorLine}`}></div>
    </div>
  );
}
