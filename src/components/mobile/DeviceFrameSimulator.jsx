import React from 'react';
import { Monitor } from 'lucide-react';
import { MobileBottomNavigationIndicator } from './MobileStatusBar';
import { useTheme } from '../../context/ThemeContext';

export default function DeviceFrameSimulator({
  children,
  deviceMode = 'fit',
  currentScreen = 'app',
  activeStoryViewer = null,
  onSwitchToWebsite,
  currentUser = null
}) {
  const { bottomBarStyle, isDarkMode } = useTheme();
  const [statusBarMode] = React.useState('auto'); // 'auto' | 'dark' | 'light'

  return (
    <div 
      className="main-layout-wrapper min-h-[100dvh] h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-0 sm:p-2 overflow-hidden selection:bg-[#8E5766]/30 selection:text-[#4E0C22] relative"
      style={{ height: '100dvh', minHeight: '100dvh' }}
    >
      
      {/* Discreet Floating Website Return Button (Desktop Only) */}
      {onSwitchToWebsite && (
        <button
          type="button"
          onClick={onSwitchToWebsite}
          className="hidden sm:flex fixed top-4 left-4 z-50 items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-[#4E0C22] border border-[#E7CCD3] text-xs font-bold backdrop-blur-md shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Return to Full Desktop Website Presentation"
        >
          <Monitor className="w-3.5 h-3.5 text-[#4E0C22]" />
          <span>🖥️ Website View</span>
        </button>
      )}

      {/* Frame Container - Mobile Screen with Dynamic Theme Adaptation */}
      <div className="relative flex items-center justify-center flex-1 min-h-0 w-full overflow-hidden p-0 sm:p-2">
        {/* Ambient backlight glow on desktop */}
        <div className="hidden sm:block absolute w-[500px] h-[750px] rounded-full bg-gradient-to-tr from-[#8E5766]/15 via-rose-500/10 to-[#4E0C22]/20 blur-3xl pointer-events-none -z-10 animate-pulse-glow" />

        {deviceMode === 'fit' || deviceMode === 'fullscreen' ? (
          /* 📱 Screen-Fit Mode: Edge-to-Edge Responsive Container perfectly fitted to display */
          <div className={`w-full max-w-full sm:max-w-[400px] sm:w-[400px] flex flex-col h-full sm:max-h-[840px] shadow-[0_25px_60px_-15px_rgba(122,46,67,0.3),0_0_30px_rgba(197,139,118,0.15)] overflow-hidden sm:border sm:border-[#E7CCD3] sm:rounded-[38px] relative [transform:translateZ(0)] shrink-0 ${
            currentScreen === 'app' ? (isDarkMode ? 'bg-[#380817]' : 'bg-[#F5E1E6]') : (currentScreen === 'register' || currentScreen === 'login' ? 'bg-white' : 'bg-[#F5E1E6]')
          }`}>
            <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
              {children}
            </div>
            {currentScreen !== 'app' && (
              <MobileBottomNavigationIndicator 
                deviceType="ios" 
                currentScreen={currentScreen} 
                activeStoryViewer={activeStoryViewer} 
                theme={statusBarMode} 
                bottomBarStyle={bottomBarStyle}
                isDarkMode={isDarkMode}
              />
            )}
          </div>
        ) : deviceMode === 'wide' ? (
          /* Wide App View (Spacious ~520px) */
          <div className={`w-full max-w-full sm:max-w-lg flex flex-col h-full sm:max-h-[840px] shadow-[0_25px_60px_-15px_rgba(122,46,67,0.3),0_0_30px_rgba(197,139,118,0.15)] overflow-hidden sm:border sm:border-[#E7CCD3] sm:rounded-[38px] relative [transform:translateZ(0)] shrink-0 ${
            currentScreen === 'app' ? (isDarkMode ? 'bg-[#380817]' : 'bg-[#F5E1E6]') : (currentScreen === 'register' || currentScreen === 'login' ? 'bg-white' : 'bg-[#F5E1E6]')
          }`}>
            <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
              {children}
            </div>
            {currentScreen !== 'app' && (
              <MobileBottomNavigationIndicator 
                deviceType="ios" 
                currentScreen={currentScreen} 
                activeStoryViewer={activeStoryViewer} 
                theme={statusBarMode} 
                bottomBarStyle={bottomBarStyle}
                isDarkMode={isDarkMode}
              />
            )}
          </div>
        ) : deviceMode === 'android' ? (
          /* Google Pixel 9 Android Frame */
          <div className="relative w-full sm:w-[395px] h-full sm:max-h-[820px] max-w-full sm:max-w-[95vw] bg-black sm:rounded-[44px] sm:p-2.5 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_40px_rgba(122,46,67,0.18)] sm:ring-1 sm:ring-[#8E5766]/50 sm:border-4 sm:border-slate-900 flex flex-col overflow-hidden shrink-0">
            <div className={`flex-1 flex flex-col sm:rounded-[34px] overflow-hidden relative shadow-inner [transform:translateZ(0)] ${
              currentScreen === 'app' ? (isDarkMode ? 'bg-[#081220]' : 'bg-slate-50') : (currentScreen === 'register' || currentScreen === 'login' ? 'bg-white' : 'bg-[#F5E1E6]')
            }`}>
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                {children}
              </div>
              {currentScreen !== 'app' && (
                <MobileBottomNavigationIndicator 
                  deviceType="android" 
                  currentScreen={currentScreen} 
                  activeStoryViewer={activeStoryViewer} 
                  theme={statusBarMode} 
                  bottomBarStyle={bottomBarStyle}
                  isDarkMode={isDarkMode}
                />
              )}
            </div>
          </div>
        ) : (
          /* iPhone 16 Pro iOS Frame */
          <div className="relative w-full sm:w-[395px] h-full sm:max-h-[820px] max-w-full sm:max-w-[95vw] bg-[#0c0d12] sm:rounded-[48px] sm:p-2.5 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_40px_rgba(122,46,67,0.2)] sm:ring-1 sm:ring-[#8E5766]/60 sm:border-4 sm:border-slate-950 flex flex-col overflow-hidden shrink-0">
            <div className={`flex-1 flex flex-col sm:rounded-[38px] overflow-hidden relative shadow-inner [transform:translateZ(0)] ${
              currentScreen === 'app' ? (isDarkMode ? 'bg-[#081220]' : 'bg-slate-50') : (currentScreen === 'register' || currentScreen === 'login' ? 'bg-white' : 'bg-[#F5E1E6]')
            }`}>
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                {children}
              </div>
              {currentScreen !== 'app' && (
                <MobileBottomNavigationIndicator 
                  deviceType="ios" 
                  currentScreen={currentScreen} 
                  activeStoryViewer={activeStoryViewer} 
                  theme={statusBarMode} 
                  bottomBarStyle={bottomBarStyle}
                  isDarkMode={isDarkMode}
                />
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
