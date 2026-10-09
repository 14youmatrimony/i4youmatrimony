import React, { useMemo, useRef, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  User, 
  Search,
  Flame,
  Bell
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function MobileAppShell({
  children,
  activeTab,
  setActiveTab,
  unreadCount = 1,
  interestCount = 3,
  unreadNotificationsCount = 4,
  onOpenNotifications,
  currentUser,
  onOpenFilter,
  onOpenLogin,
  deviceType = 'ios',
  overlays,
  activeFiltersCount = 0,
  hideFloatingNotification = false,
  hideBottomNav = false
}) {
  const { bottomBarStyle, accent, isDarkMode } = useTheme();
  const mainRef = useRef(null);

  // When switching tabs (e.g. from feed to chat), immediately reset scroll position to 0 so headers are never cut off
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const tabs = [
    { id: 'feed', label: 'Discover', icon: Flame, badge: null },
    { id: 'search', label: 'Search', icon: Search, badge: null },
    { id: 'interests', label: 'Interests', icon: Heart, badge: currentUser && interestCount > 0 ? interestCount : null },
    { id: 'chat', label: 'Messages', icon: MessageCircle, badge: currentUser && unreadCount > 0 ? unreadCount : null },
    { id: 'account', label: 'Profile', icon: User, badge: currentUser && unreadNotificationsCount > 0 ? unreadNotificationsCount : null }
  ];

  // Dynamic styling for bottom navigation container based on selected Theme Setting
  const navContainerClass = useMemo(() => {
    switch (bottomBarStyle) {
      case 'classic':
        return 'w-full bg-[#0B192C] text-white border-t border-[#D4AF37]/35 px-2 py-1.5 flex items-center justify-around shrink-0 z-30 shadow-[0_-4px_24px_rgba(0,0,0,0.35)]';
      case 'glass':
        return 'absolute bottom-0 left-0 right-0 z-30 bg-[#0B192C]/85 backdrop-blur-xl border-t border-white/20 px-2 py-2 flex items-center justify-around shadow-[0_-8px_32px_rgba(0,0,0,0.5)] pointer-events-auto';
      case 'dock':
        return 'absolute bottom-3 left-3 right-3 sm:left-4 sm:right-4 z-30 rounded-3xl bg-[#0B192C]/95 backdrop-blur-2xl border-2 border-[#D4AF37]/40 px-2 py-1.5 flex items-center justify-around shadow-[0_10px_35px_rgba(0,0,0,0.6)] pointer-events-auto';
      case 'transparent':
      default:
        return 'absolute bottom-0 left-0 right-0 z-30 bg-transparent border-0 px-2 py-2 flex items-center justify-around pointer-events-auto';
    }
  }, [bottomBarStyle]);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden relative transition-colors duration-300 ${
      isDarkMode ? 'bg-[#060D17] text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      
      {/* Main Content Area with adaptive background */}
      <main 
        ref={mainRef}
        className={`flex-1 relative transition-colors duration-300 ${
          activeTab === 'chat'
            ? 'flex flex-col min-h-0 overflow-hidden pb-0'
            : `overflow-y-auto scroll-smooth ${bottomBarStyle === 'classic' ? 'pb-6' : 'pb-24'}`
        } ${
          isDarkMode ? 'bg-[#081220]' : 'bg-slate-50'
        }`}
      >
        {children}
      </main>

      {/* Floating Notification Bell Button at Bottom-Right - Hidden when in chat, profile modal is open, or when user is not logged in */}
      {onOpenNotifications && !hideFloatingNotification && activeTab !== 'chat' && currentUser && (
        <button
          type="button"
          onClick={onOpenNotifications}
          className={`absolute ${
            bottomBarStyle === 'dock' 
              ? 'bottom-[84px]' 
              : bottomBarStyle === 'classic' 
                ? 'bottom-[76px]' 
                : 'bottom-[74px]'
          } right-3.5 z-30 w-11 h-11 rounded-2xl bg-[#0B192C]/90 backdrop-blur-md text-white border-2 shadow-2xl flex items-center justify-center cursor-pointer active:scale-95 hover:scale-105 transition-all group`}
          style={{ borderColor: accent.primary }}
          title="Notifications & Alerts"
          aria-label="Open Notifications"
        >
          <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" style={{ color: accent.primaryLight }} />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 px-1 bg-rose-600 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center shadow-md border-2 border-[#0B192C] animate-pulse">
              {unreadNotificationsCount}
            </span>
          )}
        </button>
      )}

      {/* Mobile Bottom Tab Bar with Dynamic Theme Style */}
      {!hideBottomNav && (
        <nav 
          aria-label="Mobile Bottom Navigation"
          className={navContainerClass}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isTransparentBar = bottomBarStyle === 'transparent';
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 cursor-pointer select-none group active:scale-90 ${
                  isTransparentBar
                    ? isActive
                      ? 'bg-black/70 backdrop-blur-md text-white border border-[#D4AF37]/60 shadow-md px-3'
                      : 'bg-black/35 backdrop-blur-sm text-slate-200 hover:bg-black/50 hover:text-white px-2.5'
                    : isActive
                      ? 'bg-white/15 px-3.5 shadow-xs border border-white/10'
                      : 'hover:bg-white/5'
                }`}
              >
                <div className="relative">
                  <Icon 
                    className={`w-5 h-5 transition-transform ${
                      isActive 
                        ? 'stroke-[2.8] scale-110' 
                        : isTransparentBar
                          ? 'stroke-[2.2] text-slate-200 group-hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                          : 'stroke-[2.1] text-slate-300 group-hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]'
                    }`}
                    style={isActive ? {
                      color: accent.primaryLight || accent.primary,
                      filter: `drop-shadow(0 2px 8px ${accent.glowColor})`
                    } : {}}
                  />
                  {tab.badge && (
                    <span 
                      className="absolute -top-1.5 -right-2.5 min-w-[18px] h-4.5 px-1 rounded-full text-[9px] font-black flex items-center justify-center shadow-md border-2 border-[#0B192C] ring-1 ring-black/10"
                      style={{
                        backgroundColor: accent.primary,
                        color: accent.badgeText === 'text-white' ? '#FFFFFF' : '#0B192C'
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span 
                  className={`text-[10.5px] mt-0.5 tracking-tight transition-all ${
                    isActive 
                      ? 'font-black text-white drop-shadow-sm scale-105'
                      : isTransparentBar
                        ? 'font-bold text-slate-200 group-hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                        : 'font-semibold text-slate-300 group-hover:text-white'
                  }`}
                  style={isActive ? { color: accent.primaryLight || '#FFFFFF' } : {}}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span 
                    className="w-1.5 h-1.5 rounded-full mt-0.5"
                    style={{
                      backgroundColor: accent.primary,
                      boxShadow: `0 0 6px ${accent.primary}`
                    }}
                  ></span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* In-App Mobile Sheets, Dialogs & Modals (strictly bounded to phone screen) */}
      {overlays}

    </div>
  );
}
