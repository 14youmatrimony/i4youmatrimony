import React, { useMemo } from 'react';

/**
 * MobileTopStatusBar
 * Clean edge-to-edge native view.
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
      return { containerBg: 'bg-[#FFF7FA]', indicatorLine: 'bg-[#8064A2]/60' };
    }

    if (currentScreen === 'register') {
      return { containerBg: 'bg-[#FFF7FA]', indicatorLine: 'bg-[#8064A2]/50' };
    }

    if (currentScreen === 'verify-mobile' || currentScreen === 'verify-aadhaar') {
      return { containerBg: 'bg-[#FFF7FA]', indicatorLine: 'bg-[#E8C6D1]' };
    }

    if (currentScreen === 'app') {
      if (bottomBarStyle === 'classic') {
        return { 
          containerBg: 'bg-[#FDF2F6]', 
          indicatorLine: 'bg-[#8064A2]/50' 
        };
      }
      if (bottomBarStyle === 'glass') {
        return { 
          containerBg: 'bg-[#FDF2F6]/95 backdrop-blur-xl', 
          indicatorLine: 'bg-[#8064A2]/50' 
        };
      }
      if (bottomBarStyle === 'dock') {
        return { 
          containerBg: 'bg-transparent', 
          indicatorLine: isDarkMode ? 'bg-[#8064A2]/60' : 'bg-[#8064A2]/50' 
        };
      }
      // transparent
      return { 
        containerBg: 'bg-transparent', 
        indicatorLine: isDarkMode ? 'bg-[#8064A2]/60' : 'bg-[#8064A2]/50' 
      };
    }

    if (theme === 'dark' || isDarkMode) {
      return { containerBg: 'bg-[#2E1A36]', indicatorLine: 'bg-[#8064A2]/60' };
    }

    return { containerBg: 'bg-transparent', indicatorLine: 'bg-[#8064A2]/50' };
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
