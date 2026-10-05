import React from 'react';
import { 
  Smartphone, 
  Maximize2, 
  StretchHorizontal,
  Flame,
  LogIn,
  UserPlus,
  ShieldCheck,
  FileCheck2,
  Camera,
  Lock,
  Bell,
  Crown,
  Palette,
  Monitor,
  LogOut
} from 'lucide-react';
import { MobileTopStatusBar, MobileBottomNavigationIndicator } from './MobileStatusBar';
import { usePhotoPrivacy } from '../../context/PhotoPrivacyContext';
import { useTheme } from '../../context/ThemeContext';

export default function DeviceFrameSimulator({
  children,
  deviceMode = 'fit',
  setDeviceMode,
  currentScreen = 'app',
  setCurrentScreen,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  activeStoryViewer = null,
  onOpenOffers,
  onOpenThemeSettings,
  onSwitchToWebsite,
  isProduction = false,
  onToggleProductionMode,
  currentUser = null,
  onLogout,
  onSwitchDemoGender
}) {
  const { triggerScreenshotBlock, screenshotRestricted } = usePhotoPrivacy();
  const { bottomBarStyle, isDarkMode } = useTheme();
  const [statusBarMode, setStatusBarMode] = React.useState('auto'); // 'auto' | 'dark' | 'light'
  const hasPaidPlan = Boolean(currentUser?.membership && currentUser?.membership !== 'free');
  const isLoggedIn = Boolean(currentUser && (currentUser.id || currentUser.name || currentUser.mobile));

  const screens = [
    { id: 'app', label: 'App Feed', icon: Flame },
    ...(hasPaidPlan ? [] : [{ id: 'offers', label: 'Offers (50%)', icon: Crown }]),
    ...(!isLoggedIn ? [
      { id: 'login', label: 'Login Page', icon: LogIn },
      { id: 'register', label: 'Register Wizard', icon: UserPlus }
    ] : []),
    ...(!currentUser?.aadhaarVerified ? [{ id: 'verify-aadhaar', label: 'Aadhaar UIDAI', icon: FileCheck2 }] : [])
  ];

  return (
    <div className="min-h-screen h-screen bg-slate-950 flex flex-col items-center justify-start p-0 sm:p-2 overflow-hidden selection:bg-[#DFB76C]/30">
      
      {/* Top Floating Simulator Control Bar */}
      <header className="w-full max-w-6xl mb-1 px-3 py-1 bg-[#0B192C]/95 backdrop-blur-md border border-[#D4AF37]/40 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-1 z-40 text-white shrink-0">
        
        {/* Left: Website Return Button & Device Mode Switcher */}
        <div className="flex items-center space-x-1.5">
          {onSwitchToWebsite && (
            <button
              type="button"
              onClick={onSwitchToWebsite}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] text-xs font-extrabold shadow-md hover:opacity-95 transition-all cursor-pointer active:scale-95 shrink-0 mr-1"
              title="Return to Full Desktop Website Presentation"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>🖥️ Website View</span>
            </button>
          )}

          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#DFB76C] flex items-center justify-center text-[#0B192C] font-bold text-xs shrink-0">
            {deviceMode === 'fit' ? '📱' : deviceMode === 'ios' ? '' : deviceMode === 'android' ? '🤖' : '↔️'}
          </div>
          <div className="flex items-center space-x-0.5 bg-black/40 p-0.5 rounded-full border border-white/10 text-xs">
            <button
              onClick={() => setDeviceMode('fit')}
              className={`px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                deviceMode === 'fit' || deviceMode === 'fullscreen'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] shadow-sm' 
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Fit Screen (Recommended) - Responsive edge-to-edge mobile layout"
            >
              <Smartphone className="w-3 h-3" />
              <span>Fit Screen</span>
            </button>
            <button
              onClick={() => setDeviceMode('ios')}
              className={`px-2 py-0.5 rounded-full font-semibold transition-all cursor-pointer ${
                deviceMode === 'ios' 
                  ? 'bg-[#D4AF37] text-[#0B192C] shadow-sm font-bold' 
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Simulated iPhone 16 Pro Frame"
            >
              iPhone
            </button>
            <button
              onClick={() => setDeviceMode('android')}
              className={`px-2 py-0.5 rounded-full font-semibold transition-all cursor-pointer ${
                deviceMode === 'android' 
                  ? 'bg-[#D4AF37] text-[#0B192C] shadow-sm font-bold' 
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Simulated Pixel 9 Android Frame"
            >
              Pixel
            </button>
            <button
              onClick={() => setDeviceMode('wide')}
              className={`px-2 py-0.5 rounded-full font-semibold transition-all cursor-pointer ${
                deviceMode === 'wide' 
                  ? 'bg-[#D4AF37] text-[#0B192C] shadow-sm font-bold' 
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Wide tablet/desktop view"
            >
              Wide
            </button>
          </div>
        </div>

        {/* Center: Themes, Production Mode & Privacy Actions */}
        <div className="flex items-center space-x-1">


          {/* Demo Persona Switcher: Bride (Priya) vs Groom (Rohan) */}
          {!isProduction && onSwitchDemoGender && (
            <div className="flex items-center space-x-0.5 bg-black/40 p-0.5 rounded-full border border-[#D4AF37]/40 text-xs">
              <button
                type="button"
                onClick={() => onSwitchDemoGender('female')}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold transition-all cursor-pointer ${
                  (currentUser?.gender || '').toLowerCase() === 'female'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-xs'
                    : 'text-rose-300 hover:text-white'
                }`}
                title="Active: Bride Persona (Priya Sharma). Viewing Gents ONLY."
              >
                <span>👩 Bride (Priya)</span>
              </button>
              <button
                type="button"
                onClick={() => onSwitchDemoGender('male')}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold transition-all cursor-pointer ${
                  (currentUser?.gender || '').toLowerCase() === 'male'
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs'
                    : 'text-sky-300 hover:text-white'
                }`}
                title="Active: Groom Persona (Rohan Jayasimha). Viewing Women ONLY."
              >
                <span>👨 Groom (Rohan)</span>
              </button>
            </div>
          )}

          {/* Themes & Bottom Bar Settings Trigger Button */}
          {onOpenThemeSettings && (
            <button
              type="button"
              onClick={onOpenThemeSettings}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-800 text-amber-300 hover:text-white border border-amber-400/40 text-[11px] font-bold transition-all cursor-pointer shadow-sm hover:bg-slate-700 active:scale-95"
              title="Open Themes, Appearance & Bottom Bar Settings"
            >
              <Palette className="w-3.5 h-3.5 text-amber-300" />
              <span>🎨 Themes & Bar</span>
            </button>
          )}

          {/* Test Screenshot Privacy Restriction Button */}
          <button
            type="button"
            onClick={() => triggerScreenshotBlock('simulator-button')}
            className="flex items-center space-x-1 px-2 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/50 text-rose-200 text-[11px] font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
            title="Click to test screenshot privacy restriction"
          >
            <Camera className="w-3 h-3 text-rose-400" />
            <span className="hidden sm:inline">Screenshot</span>
            <span className="text-[8.5px] px-1 py-0.2 rounded-full bg-rose-950/80 text-rose-300 font-mono border border-rose-800/60">
              {screenshotRestricted ? 'Restricted' : 'Allowed'}
            </span>
          </button>

          {/* Notification Alert Bell Button - Only visible when logged in and hidden on registration/login page */}
          {onOpenNotifications && isLoggedIn && currentScreen !== 'register' && currentScreen !== 'login' && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="flex items-center space-x-1 px-2 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200 text-[11px] font-semibold transition-all cursor-pointer shadow-xs active:scale-95 relative"
              title="Open Matrimony Notifications & Alerts"
            >
              <Bell className="w-3 h-3 text-amber-400 fill-amber-400" />
              {unreadNotificationsCount > 0 && (
                <span className="text-[8.5px] px-1 py-0.2 rounded-full bg-rose-600 text-white font-bold animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {/* Plans & Special Offers Trigger - Hidden after plan purchased */}
          {onOpenOffers && !hasPaidPlan && (
            <button
              type="button"
              onClick={onOpenOffers}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] text-[11px] font-bold transition-all cursor-pointer shadow-md hover:opacity-95 active:scale-95"
              title="Open Matrimony Offers & Plans"
            >
              <Crown className="w-3 h-3 fill-current" />
              <span>💎 50% OFF</span>
            </button>
          )}
        </div>

        {/* Right: Screen Jump Buttons */}
        {setCurrentScreen && (
          <div className="flex items-center space-x-1 bg-black/40 p-0.5 rounded-full border border-white/10 text-[10.5px] overflow-x-auto max-w-full no-scrollbar">
            {screens.map(s => {
              const Icon = s.icon;
              const isActive = currentScreen === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    if (s.id === 'offers') {
                      onOpenOffers ? onOpenOffers() : setCurrentScreen('app');
                    } else {
                      setCurrentScreen(s.id);
                    }
                  }}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded-full font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-bold shadow-md' 
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-3 h-3 ${isActive ? 'text-[#0B192C]' : 'text-[#DFB76C]'}`} />
                  <span>{s.label}</span>
                </button>
              );
            })}
            {isLoggedIn && (
              <div className="flex items-center space-x-1">
                <div 
                  className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold whitespace-nowrap shadow-xs ml-0.5"
                  title={`Logged in as ${currentUser?.name || 'Member'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="max-w-[70px] truncate">{currentUser?.name?.split(' ')[0] || 'Active'}</span>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-300 text-[10px] font-bold cursor-pointer transition-all active:scale-95 ml-0.5"
                    title="Log Out of current account"
                  >
                    <LogOut className="w-3 h-3 text-rose-400" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      </header>

      {/* Frame Container - Mobile Screen with Dynamic Theme Adaptation */}
      <div className="relative flex items-center justify-center flex-1 min-h-0 w-full overflow-hidden p-1 sm:p-2">
        {/* Ambient backlight glow */}
        <div className="absolute w-[500px] h-[750px] rounded-full bg-gradient-to-tr from-[#D4AF37]/15 via-rose-500/10 to-[#152E52]/40 blur-3xl pointer-events-none -z-10 animate-pulse-glow" />

        {deviceMode === 'fit' || deviceMode === 'fullscreen' ? (
          /* 📱 Screen-Fit Mode: Edge-to-Edge Responsive Container perfectly fitted to display */
          <div className={`w-full max-w-[395px] sm:w-[395px] flex flex-col h-full max-h-[780px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_30px_rgba(212,175,55,0.18)] overflow-hidden sm:border sm:border-[#D4AF37]/40 sm:rounded-[38px] relative [transform:translateZ(0)] shrink-0 ${
            currentScreen === 'app' ? (isDarkMode ? 'bg-[#081220]' : 'bg-slate-50') : 'bg-[#0B192C]'
          }`}>
            <MobileTopStatusBar 
              deviceType="ios" 
              currentScreen={currentScreen} 
              activeStoryViewer={activeStoryViewer} 
              theme={statusBarMode} 
            />
            <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
              {children}
            </div>
            <MobileBottomNavigationIndicator 
              deviceType="ios" 
              currentScreen={currentScreen} 
              activeStoryViewer={activeStoryViewer} 
              theme={statusBarMode} 
              bottomBarStyle={bottomBarStyle}
              isDarkMode={isDarkMode}
            />
          </div>
        ) : deviceMode === 'wide' ? (
          /* Wide App View (Spacious ~520px) */
          <div className={`w-full max-w-lg flex flex-col h-full max-h-[780px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_30px_rgba(212,175,55,0.18)] overflow-hidden border border-[#D4AF37]/40 sm:rounded-[38px] relative [transform:translateZ(0)] shrink-0 ${
            currentScreen === 'app' ? (isDarkMode ? 'bg-[#081220]' : 'bg-slate-50') : 'bg-[#0B192C]'
          }`}>
            <MobileTopStatusBar 
              deviceType="ios" 
              currentScreen={currentScreen} 
              activeStoryViewer={activeStoryViewer} 
              theme={statusBarMode} 
            />
            <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
              {children}
            </div>
            <MobileBottomNavigationIndicator 
              deviceType="ios" 
              currentScreen={currentScreen} 
              activeStoryViewer={activeStoryViewer} 
              theme={statusBarMode} 
              bottomBarStyle={bottomBarStyle}
              isDarkMode={isDarkMode}
            />
          </div>
        ) : deviceMode === 'android' ? (
          /* Google Pixel 9 Android Frame */
          <div className="relative w-[395px] h-full max-h-[780px] max-w-[95vw] bg-black rounded-[44px] p-2.5 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_40px_rgba(212,175,55,0.2)] ring-1 ring-[#D4AF37]/50 border-4 border-slate-900 flex flex-col overflow-hidden shrink-0">
            <div className={`flex-1 flex flex-col rounded-[34px] overflow-hidden relative shadow-inner [transform:translateZ(0)] ${
              currentScreen === 'app' ? (isDarkMode ? 'bg-[#081220]' : 'bg-slate-50') : 'bg-[#0B192C]'
            }`}>
              <MobileTopStatusBar 
                deviceType="android" 
                currentScreen={currentScreen} 
                activeStoryViewer={activeStoryViewer} 
                theme={statusBarMode} 
              />
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                {children}
              </div>
              <MobileBottomNavigationIndicator 
                deviceType="android" 
                currentScreen={currentScreen} 
                activeStoryViewer={activeStoryViewer} 
                theme={statusBarMode} 
                bottomBarStyle={bottomBarStyle}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>
        ) : (
          /* iPhone 16 Pro iOS Frame */
          <div className="relative w-[395px] h-full max-h-[780px] max-w-[95vw] bg-[#0c0d12] rounded-[48px] p-2.5 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_40px_rgba(212,175,55,0.22)] ring-1 ring-[#D4AF37]/60 border-4 border-slate-950 flex flex-col overflow-hidden shrink-0">
            <div className={`flex-1 flex flex-col rounded-[38px] overflow-hidden relative shadow-inner [transform:translateZ(0)] ${
              currentScreen === 'app' ? (isDarkMode ? 'bg-[#081220]' : 'bg-slate-50') : 'bg-[#0B192C]'
            }`}>
              <MobileTopStatusBar 
                deviceType="ios" 
                currentScreen={currentScreen} 
                activeStoryViewer={activeStoryViewer} 
                theme={statusBarMode} 
              />
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                {children}
              </div>
              <MobileBottomNavigationIndicator 
                deviceType="ios" 
                currentScreen={currentScreen} 
                activeStoryViewer={activeStoryViewer} 
                theme={statusBarMode} 
                bottomBarStyle={bottomBarStyle}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
