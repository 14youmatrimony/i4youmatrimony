import React, { useState } from 'react';
import { 
  X, 
  Sun, 
  Moon, 
  Sparkles, 
  Check, 
  Layers, 
  RotateCcw,
  Palette,
  CheckCircle2,
  LayoutGrid,
  Square
} from 'lucide-react';
import { useTheme, ACCENT_PALETTES, BOTTOM_BAR_STYLES, FEED_LAYOUTS } from '../../context/ThemeContext';

export default function MobileThemeSettingsSheet({ isOpen, onClose }) {
  const { 
    themeMode, 
    setThemeMode, 
    accentColor, 
    setAccentColor, 
    bottomBarStyle, 
    setBottomBarStyle,
    feedLayout,
    setFeedLayout,
    resetTheme,
    accent,
    isDarkMode
  } = useTheme();

  const [activeTab, setActiveTab] = useState('palette'); // 'palette' | 'layout' | 'bar'
  const [showSavedToast, setShowSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleApply = () => {
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
      onClose && onClose();
    }, 500);
  };

  return (
    <div className="absolute inset-0 z-[60] bg-black/75 backdrop-blur-xs flex flex-col justify-end w-full max-w-full overflow-hidden transition-opacity duration-200">
      
      {/* Background touch dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Sheet Content Card - Strictly fitted to mobile container */}
      <div className="w-full max-w-md mx-auto bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[82%] overflow-hidden">
        
        {/* Top Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/95">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
              style={{ backgroundColor: accent.primary }}
            >
              <Palette className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-bold text-sm text-slate-900 truncate">
                Theme & Appearance
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                Personalize colors, mode & bottom bar
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={resetTheme}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Reset theme"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Segmented Category Tabs */}
        <div className="px-3 pt-2.5 pb-1 border-b border-slate-100 flex space-x-1.5 shrink-0 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('palette')}
            className={`flex-1 py-1.5 px-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
              activeTab === 'palette'
                ? 'bg-[#0B192C] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" />
            <span>Colors & Mode</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('layout')}
            className={`flex-1 py-1.5 px-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
              activeTab === 'layout'
                ? 'bg-[#0B192C] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#DFB76C]" />
            <span>Feed Layout</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#DFB76C]"></span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bar')}
            className={`flex-1 py-1.5 px-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
              activeTab === 'bar'
                ? 'bg-[#0B192C] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#DFB76C]" />
            <span>Bottom Bar</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3.5 w-full max-w-full overflow-x-hidden">
          
          {activeTab === 'palette' && (
            <>
              {/* 1. Display Mode */}
              <div>
                <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Display Mode
                </label>
                <div className="grid grid-cols-3 gap-2 w-full">
                  {[
                    { id: 'light', label: 'Light', sub: 'Daylight ☀️', icon: Sun, bg: 'bg-white', text: 'text-slate-800' },
                    { id: 'dark', label: 'Dark', sub: 'Midnight 🌙', icon: Moon, bg: 'bg-[#0B192C]', text: 'text-white' },
                    { id: 'auto', label: 'Auto', sub: 'System ⚡', icon: Sparkles, bg: 'bg-slate-100', text: 'text-slate-800' }
                  ].map(m => {
                    const Icon = m.icon;
                    const isSelected = themeMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setThemeMode(m.id)}
                        className={`py-2 px-2 rounded-xl border text-center transition-all relative flex flex-col items-center justify-center min-w-0 cursor-pointer ${
                          isSelected 
                            ? 'border-2 border-[#D4AF37] ring-1 ring-[#DFB76C]/40 bg-amber-50/50 shadow-xs' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${m.bg} ${m.text} shadow-2xs border border-slate-200/50 mb-1`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs text-slate-900 block truncate leading-tight">
                          {m.label}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium block truncate">
                          {m.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Color Accent Palettes */}
              <div>
                <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Matrimony Accent Colors
                </label>
                <div className="space-y-1.5 w-full">
                  {Object.values(ACCENT_PALETTES).map(pal => {
                    const isSelected = accentColor === pal.id;
                    return (
                      <div
                        key={pal.id}
                        onClick={() => setAccentColor(pal.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-2 border-slate-900 bg-slate-50 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div 
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                            style={{ background: `linear-gradient(135deg, ${pal.primary}, ${pal.primaryLight})` }}
                          >
                            <Sparkles className="w-4 h-4 text-white drop-shadow-xs" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-slate-900 block truncate">
                              {pal.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium block truncate">
                              {pal.desc}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 ml-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
                            isSelected 
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' 
                              : 'border-slate-300 bg-white text-transparent'
                          }`}>
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'layout' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Main Discover Feed Layout
                  </label>
                  <span className="text-[10px] font-bold text-[#D4AF37] bg-amber-50 px-2 py-0.5 rounded-md border border-[#D4AF37]/30">
                    Live Switch ⚡
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Choose how profile cards are arranged on the main Discover feed.
                </p>

                <div className="space-y-2.5 w-full">
                  {Object.values(FEED_LAYOUTS).map(layout => {
                    const isSelected = feedLayout === layout.id;
                    const isSingle = layout.id === 'single';

                    return (
                      <div
                        key={layout.id}
                        onClick={() => setFeedLayout(layout.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-2 border-[#D4AF37] ring-2 ring-[#DFB76C]/30 bg-amber-50/50 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/40'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 min-w-0 pr-2">
                            {/* Graphic Mockup Preview */}
                            <div className={`w-14 h-16 rounded-xl border flex flex-col p-1.5 shrink-0 transition-colors ${
                              isSelected ? 'border-[#D4AF37] bg-white' : 'border-slate-200 bg-slate-50'
                            }`}>
                              {isSingle ? (
                                /* Single Full Card Mockup */
                                <div className="w-full h-full flex flex-col justify-between">
                                  <div className="w-full h-7 rounded-md bg-gradient-to-tr from-[#0B192C] to-[#1E3A8A] flex items-center justify-center">
                                    <div className="w-3 h-3 rounded-full bg-[#DFB76C]/80" />
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="w-4/5 h-1 bg-slate-800 rounded" />
                                    <div className="w-3/5 h-1 bg-slate-400 rounded" />
                                  </div>
                                  <div className="w-full h-1.5 bg-[#D4AF37] rounded-full" />
                                </div>
                              ) : (
                                /* 4-Profile Grid Mockup (2x2) */
                                <div className="w-full h-full grid grid-cols-2 gap-1">
                                  {[1, 2, 3, 4].map(idx => (
                                    <div key={idx} className="rounded bg-gradient-to-tr from-[#0B192C] to-[#1E3A8A] flex flex-col justify-between p-0.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-[#DFB76C]/80 self-center" />
                                      <div className="w-full h-0.5 bg-white/60 rounded" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Text Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                                <span className={`font-bold text-xs ${isSelected ? 'text-slate-950 font-black' : 'text-slate-800'}`}>
                                  {layout.name}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-[#DFB76C]/25 text-[#8C6D1F]">
                                  {layout.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                {layout.desc}
                              </p>
                            </div>
                          </div>

                          {/* Checkbox circle */}
                          <div className="shrink-0 ml-1 mt-0.5">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                : 'border-slate-300 bg-white text-transparent'
                            }`}>
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'bar' && (
            <>
              {/* Bottom Navigation Bar Styles */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Bottom Navigation Bar Style
                  </label>
                  <span className="text-[10px] font-bold text-[#D4AF37] bg-amber-50 px-2 py-0.5 rounded-md border border-[#D4AF37]/30">
                    Live Preview ✨
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Select your preferred bottom navigation bar appearance.
                </p>

                <div className="space-y-2 w-full">
                  {Object.values(BOTTOM_BAR_STYLES).map(style => {
                    const isSelected = bottomBarStyle === style.id;
                    return (
                      <div
                        key={style.id}
                        onClick={() => setBottomBarStyle(style.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-2 border-[#D4AF37] ring-2 ring-[#DFB76C]/30 bg-amber-50/50 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/40'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <span className={`font-bold text-xs ${isSelected ? 'text-slate-950 font-black' : 'text-slate-800'}`}>
                                {style.name}
                              </span>
                              {style.badge && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                                  style.id === 'glass'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300/40'
                                    : style.id === 'classic'
                                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                      : style.id === 'dock'
                                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                        : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                }`}>
                                  {style.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                              {style.desc}
                            </p>
                          </div>

                          <div className="shrink-0 pt-0.5">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border transition-all ${
                              isSelected 
                                ? 'bg-[#D4AF37] text-[#0B192C] border-[#D4AF37] shadow-sm' 
                                : 'border-slate-300 bg-white text-transparent'
                            }`}>
                              <Check className="w-3.5 h-3.5 stroke-[3] text-[#0B192C]" />
                            </span>
                          </div>
                        </div>

                        {/* Interactive Visual Mini-Preview */}
                        <div className="mt-2 pt-1.5 border-t border-slate-100">
                          <div className="h-7 rounded-lg overflow-hidden relative flex items-center justify-around px-2 bg-slate-100/90 w-full">
                            {style.id === 'glass' && (
                              <div className="absolute inset-0 bg-[#0B192C]/85 backdrop-blur-md flex items-center justify-around px-2 text-white border-t border-white/20">
                                <span className="text-[9px] font-black text-[#DFB76C]">🔥 Discover</span>
                                <span className="text-[9px] font-semibold text-slate-200">🔍 Search</span>
                                <span className="text-[9px] font-semibold text-slate-200">❤️ Interests</span>
                                <span className="text-[9px] font-semibold text-slate-200">💬 Chat</span>
                              </div>
                            )}

                            {style.id === 'classic' && (
                              <div className="absolute inset-0 bg-[#0B192C] flex items-center justify-around px-2 text-white border-t border-[#D4AF37]/35">
                                <span className="text-[9px] font-bold text-[#DFB76C]">🔥 Discover</span>
                                <span className="text-[9px] text-slate-300">🔍 Search</span>
                                <span className="text-[9px] text-slate-300">❤️ Interests</span>
                                <span className="text-[9px] text-slate-300">💬 Chat</span>
                              </div>
                            )}

                            {style.id === 'dock' && (
                              <div className="w-full flex justify-center">
                                <div className="px-3 py-0.5 rounded-full bg-[#0B192C] text-white flex items-center space-x-2.5 shadow-xs border border-[#DFB76C]/40">
                                  <span className="text-[9px] font-black text-[#DFB76C]">🔥</span>
                                  <span className="text-[9px] text-slate-300">🔍</span>
                                  <span className="text-[9px] text-slate-300">❤️</span>
                                  <span className="text-[9px] text-slate-300">💬</span>
                                </div>
                              </div>
                            )}

                            {style.id === 'transparent' && (
                              <div className="w-full flex items-center justify-around px-2">
                                <span className="text-[9px] font-black text-white bg-black/60 px-1.5 py-0.5 rounded-md">🔥 Discover</span>
                                <span className="text-[9px] font-bold text-slate-200 bg-black/40 px-1.5 py-0.5 rounded-md">🔍 Search</span>
                                <span className="text-[9px] font-bold text-slate-200 bg-black/40 px-1.5 py-0.5 rounded-md">❤️ Interests</span>
                                <span className="text-[9px] font-bold text-slate-200 bg-black/40 px-1.5 py-0.5 rounded-md">💬 Chat</span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Miniature Live Preview Banner */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs w-full">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Active Configuration
            </span>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accent.primary }}></span>
                <span className="font-bold text-slate-800 truncate">
                  {accent.name} • {themeMode === 'dark' ? 'Dark' : themeMode === 'light' ? 'Light' : 'Auto'}
                </span>
              </div>
              <div className="flex items-center space-x-1 shrink-0 ml-1">
                <span className="text-[10px] text-[#0B192C] font-bold bg-[#DFB76C]/30 px-2 py-0.5 rounded-md border border-[#D4AF37]/40">
                  {FEED_LAYOUTS[feedLayout]?.badge || '1 Profile'}
                </span>
                <span className="text-[10px] text-slate-700 font-semibold bg-slate-200/80 px-2 py-0.5 rounded-md border border-slate-300/60">
                  {BOTTOM_BAR_STYLES[bottomBarStyle]?.name?.split(' ')[0] || bottomBarStyle}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions - Clear of bottom safe area */}
        <div className="px-3.5 py-2.5 pb-4 sm:pb-3 border-t border-slate-100 bg-white flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={resetTheme}
            className="py-2 px-3.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer shrink-0"
          >
            Reset
          </button>
          
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2 px-4 rounded-xl text-white text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm hover:opacity-95 active:scale-95 transition-all truncate"
            style={{ 
              background: `linear-gradient(135deg, ${accent.primaryDark || '#0B192C'}, ${accent.primary})` 
            }}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{showSavedToast ? 'Applied & Saved!' : 'Apply Theme'}</span>
          </button>
        </div>

      </div>

    </div>
  );
}
