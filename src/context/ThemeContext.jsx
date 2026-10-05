import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

export const ACCENT_PALETTES = {
  gold: {
    id: 'gold',
    name: 'Royal Gold',
    desc: 'Traditional Gold & Royal Navy',
    primary: '#D4AF37',
    primaryLight: '#DFB76C',
    primaryDark: '#8C6D1F',
    bgGradient: 'from-[#D4AF37] to-[#DFB76C]',
    textClass: 'text-[#DFB76C]',
    borderClass: 'border-[#D4AF37]',
    bgClass: 'bg-[#D4AF37]',
    ringClass: 'ring-[#DFB76C]',
    glowColor: 'rgba(212, 175, 55, 0.4)',
    badgeBg: 'bg-gradient-to-tr from-[#D4AF37] to-[#DFB76C]',
    badgeText: 'text-[#0B192C]'
  },
  rose: {
    id: 'rose',
    name: 'Rose Vivah',
    desc: 'Romantic Crimson & Blush',
    primary: '#E11D48',
    primaryLight: '#FB7185',
    primaryDark: '#9F1239',
    bgGradient: 'from-[#E11D48] to-[#FB7185]',
    textClass: 'text-rose-500',
    borderClass: 'border-rose-500',
    bgClass: 'bg-rose-600',
    ringClass: 'ring-rose-400',
    glowColor: 'rgba(225, 29, 72, 0.4)',
    badgeBg: 'bg-gradient-to-tr from-[#E11D48] to-[#FB7185]',
    badgeText: 'text-white'
  },
  emerald: {
    id: 'emerald',
    name: 'Kasavu Emerald',
    desc: 'Temple Emerald & Gold',
    primary: '#059669',
    primaryLight: '#34D399',
    primaryDark: '#064E3B',
    bgGradient: 'from-[#059669] to-[#34D399]',
    textClass: 'text-emerald-500',
    borderClass: 'border-emerald-500',
    bgClass: 'bg-emerald-600',
    ringClass: 'ring-emerald-400',
    glowColor: 'rgba(5, 150, 105, 0.4)',
    badgeBg: 'bg-gradient-to-tr from-[#059669] to-[#34D399]',
    badgeText: 'text-white'
  },
  saffron: {
    id: 'saffron',
    name: 'Auspicious Saffron',
    desc: 'Sacred Sandal & Amber',
    primary: '#D97706',
    primaryLight: '#FBBF24',
    primaryDark: '#92400E',
    bgGradient: 'from-[#D97706] to-[#FBBF24]',
    textClass: 'text-amber-500',
    borderClass: 'border-amber-500',
    bgClass: 'bg-amber-600',
    ringClass: 'ring-amber-400',
    glowColor: 'rgba(217, 119, 6, 0.4)',
    badgeBg: 'bg-gradient-to-tr from-[#D97706] to-[#FBBF24]',
    badgeText: 'text-[#0B192C]'
  },
  sapphire: {
    id: 'sapphire',
    name: 'Ocean Sapphire',
    desc: 'Regal Sapphire & Blue',
    primary: '#2563EB',
    primaryLight: '#60A5FA',
    primaryDark: '#1E3A8A',
    bgGradient: 'from-[#2563EB] to-[#60A5FA]',
    textClass: 'text-blue-500',
    borderClass: 'border-blue-500',
    bgClass: 'bg-blue-600',
    ringClass: 'ring-blue-400',
    glowColor: 'rgba(37, 99, 235, 0.4)',
    badgeBg: 'bg-gradient-to-tr from-[#2563EB] to-[#60A5FA]',
    badgeText: 'text-white'
  }
};

export const BOTTOM_BAR_STYLES = {
  glass: {
    id: 'glass',
    name: 'Frosted Glass (Glassmorphism)',
    badge: '✨ Recommended',
    desc: 'Translucent glass with soft blur and top gold rim highlight.'
  },
  classic: {
    id: 'classic',
    name: 'Classic Solid Navy',
    badge: '🏛️ Traditional',
    desc: 'Solid midnight navy tab bar with gold accents & safe bottom fill.'
  },
  dock: {
    id: 'dock',
    name: 'Floating Island Dock',
    badge: '🏝️ Floating',
    desc: 'Rounded floating capsule centered above bottom edge.'
  },
  transparent: {
    id: 'transparent',
    name: 'Full Transparent (Buttons Only)',
    badge: '⚡ Minimal',
    desc: 'Floating buttons directly over content with contrast pills.'
  }
};

export const FEED_LAYOUTS = {
  single: {
    id: 'single',
    name: 'Single Card View (Classic)',
    badge: '📱 1 Profile',
    desc: 'Immersive full-screen card layout with large photo & details.'
  },
  grid4: {
    id: 'grid4',
    name: '4-Profile Grid View (2×2)',
    badge: '⊞ 4 Profiles',
    desc: 'Compact 2×2 grid showing 4 profiles at once for quick matching.'
  }
};

const DEFAULT_THEME = {
  themeMode: 'light', // 'light' | 'dark' | 'auto'
  accentColor: 'gold', // 'gold' | 'rose' | 'emerald' | 'saffron' | 'sapphire'
  bottomBarStyle: 'glass', // 'glass' | 'classic' | 'dock' | 'transparent'
  feedLayout: 'single', // 'single' | 'grid4'
  highContrast: true
};

const ThemeContext = createContext({
  ...DEFAULT_THEME,
  isDarkMode: false,
  accent: ACCENT_PALETTES.gold,
  setThemeMode: () => {},
  setAccentColor: () => {},
  setBottomBarStyle: () => {},
  setFeedLayout: () => {},
  setHighContrast: () => {},
  resetTheme: () => {}
});

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(() => {
    try {
      const saved = localStorage.getItem('i4u_theme_mode');
      return saved || DEFAULT_THEME.themeMode;
    } catch {
      return DEFAULT_THEME.themeMode;
    }
  });

  const [accentColor, setAccentColorState] = useState(() => {
    try {
      const saved = localStorage.getItem('i4u_accent_color');
      return ACCENT_PALETTES[saved] ? saved : DEFAULT_THEME.accentColor;
    } catch {
      return DEFAULT_THEME.accentColor;
    }
  });

  const [bottomBarStyle, setBottomBarStyleState] = useState(() => {
    try {
      const saved = localStorage.getItem('i4u_bottom_bar_style');
      return BOTTOM_BAR_STYLES[saved] ? saved : DEFAULT_THEME.bottomBarStyle;
    } catch {
      return DEFAULT_THEME.bottomBarStyle;
    }
  });

  const [feedLayout, setFeedLayoutState] = useState(() => {
    try {
      const saved = localStorage.getItem('i4u_feed_layout');
      return FEED_LAYOUTS[saved] ? saved : DEFAULT_THEME.feedLayout;
    } catch {
      return DEFAULT_THEME.feedLayout;
    }
  });

  const [highContrast, setHighContrastState] = useState(() => {
    try {
      const saved = localStorage.getItem('i4u_high_contrast');
      return saved !== null ? JSON.parse(saved) : DEFAULT_THEME.highContrast;
    } catch {
      return DEFAULT_THEME.highContrast;
    }
  });

  // Calculate actual dark mode based on setting and system preference
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mq.matches);
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const isDarkMode = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return systemDark;
  }, [themeMode, systemDark]);

  const accent = useMemo(() => {
    return ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.gold;
  }, [accentColor]);

  const setThemeMode = (mode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem('i4u_theme_mode', mode);
    } catch {
      // ignore
    }
  };

  const setAccentColor = (color) => {
    if (!ACCENT_PALETTES[color]) return;
    setAccentColorState(color);
    try {
      localStorage.setItem('i4u_accent_color', color);
    } catch {
      // ignore
    }
  };

  const setBottomBarStyle = (style) => {
    if (!BOTTOM_BAR_STYLES[style]) return;
    setBottomBarStyleState(style);
    try {
      localStorage.setItem('i4u_bottom_bar_style', style);
    } catch {
      // ignore
    }
  };

  const setFeedLayout = (layout) => {
    if (!FEED_LAYOUTS[layout]) return;
    setFeedLayoutState(layout);
    try {
      localStorage.setItem('i4u_feed_layout', layout);
    } catch {
      // ignore
    }
  };

  const setHighContrast = (val) => {
    setHighContrastState(val);
    try {
      localStorage.setItem('i4u_high_contrast', JSON.stringify(val));
    } catch {
      // ignore
    }
  };

  const resetTheme = () => {
    setThemeMode(DEFAULT_THEME.themeMode);
    setAccentColor(DEFAULT_THEME.accentColor);
    setBottomBarStyle(DEFAULT_THEME.bottomBarStyle);
    setFeedLayout(DEFAULT_THEME.feedLayout);
    setHighContrast(DEFAULT_THEME.highContrast);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDarkMode,
        accentColor,
        accent,
        bottomBarStyle,
        feedLayout,
        highContrast,
        setThemeMode,
        setAccentColor,
        setBottomBarStyle,
        setFeedLayout,
        setHighContrast,
        resetTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
