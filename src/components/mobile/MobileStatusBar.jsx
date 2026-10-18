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
 * Disabled / Removed per user request to provide a clean edge-to-edge native view.
 */
export function MobileTopStatusBar() {
  return null;
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
      return { containerBg: 'bg-[#FAF8F5]', indicatorLine: 'bg-[#D4AF37]/50' };
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
