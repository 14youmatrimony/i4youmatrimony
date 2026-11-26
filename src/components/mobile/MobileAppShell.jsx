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
  unreadCount = 0,
  interestCount = 0,
  unreadNotificationsCount = 0,
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
    const baseNav = 'mobile-bottom-nav fixed bottom-0 left-0 right-0 w-full z-50 flex items-center justify-around pointer-events-auto';
    switch (bottomBarStyle) {
      case 'classic':
        return `${baseNav} bg-[#FFFBF9] text-[#2C1A1D] border-t border-[#E5D0C6] px-2 py-2 shadow-[0_-4px_24px_rgba(122,46,67,0.06)]`;
      case 'glass':
        return `${baseNav} bg-[#FFFBF9]/95 backdrop-blur-xl border-t border-[#E5D0C6] px-2 py-2 shadow-[0_-8px_32px_rgba(122,46,67,0.08)]`;
      case 'dock':
        return `${baseNav} bg-[#FFFBF9]/95 backdrop-blur-2xl border-t border-[#E5D0C6] px-2 py-2 shadow-[0_10px_35px_rgba(122,46,67,0.1)]`;
      case 'transparent':
      default:
        return `${baseNav} bg-[#FFFBF9]/85 backdrop-blur-md border-t border-[#E5D0C6] px-2 py-2 text-[#5A4649]`;
    }
  }, [bottomBarStyle]);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden relative transition-colors duration-300 ${
      isDarkMode ? 'bg-[#2C1A1D] text-slate-100' : 'bg-[#FFF9F6] text-[#5A4649]'
    }`}>
      
      {/* Main Content Area with adaptive background */}
      <main 
        ref={mainRef}
        className={`flex-1 relative transition-colors duration-300 ${
          activeTab === 'chat'
            ? 'flex flex-col min-h-0 overflow-hidden pb-0'
            : 'overflow-y-auto scroll-smooth pb-24 sm:pb-28'
        } ${
          isDarkMode ? 'bg-[#2C1A1D]' : 'bg-[#FFF9F6]'
        }`}
      >
        {children}
      </main>

      {/* Floating Notification Bell Button at Bottom-Right - Hidden when in chat, profile modal is open, or when user is not logged in */}
      {onOpenNotifications && !hideFloatingNotification && activeTab !== 'chat' && currentUser && (
        <button
          type="button"
          onClick={onOpenNotifications}
          className="absolute bottom-[76px] right-3.5 z-40 w-11 h-11 rounded-2xl bg-white/95 backdrop-blur-md text-[#7A2E43] border border-[#E5D0C6] shadow-xl flex items-center justify-center cursor-pointer active:scale-95 hover:scale-105 transition-all group"
          style={{ borderColor: accent.primary }}
          title="Notifications & Alerts"
          aria-label="Open Notifications"
        >
          <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform drop-shadow-[0_1px_2px_rgba(122,46,67,0.15)]" style={{ color: accent.primary }} />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 px-1 bg-[#7A2E43] text-white font-extrabold text-[10px] rounded-full flex items-center justify-center shadow-md border-2 border-white animate-pulse">
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
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            zIndex: 50,
            paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom, 0px))'
          }}
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
                      ? 'bg-white/90 backdrop-blur-md text-[#7A2E43] border border-[#E5D0C6] shadow-sm px-3'
                      : 'bg-white/40 backdrop-blur-sm text-[#5A4649] hover:bg-white/60 hover:text-[#7A2E43] px-2.5'
                    : isActive
                      ? 'bg-[#FDECE4] px-3.5 shadow-xs border border-[#E5D0C6]'
                      : 'hover:bg-[#FDECE4]/50'
                }`}
              >
                <div className="relative">
                  <Icon 
                    className={`w-5 h-5 transition-transform ${
                      isActive 
                        ? 'stroke-[2.8] scale-110 text-[#7A2E43]' 
                        : isTransparentBar
                          ? 'stroke-[2.2] text-[#8E797C] group-hover:text-[#7A2E43]'
                          : 'stroke-[2.1] text-[#8E797C] group-hover:text-[#7A2E43]'
                    }`}
                    style={isActive ? {
                      color: accent.primary || '#7A2E43',
                      filter: `drop-shadow(0 2px 8px ${accent.glowColor})`
                    } : {}}
                  />
                  {tab.badge && (
                    <span 
                      className="absolute -top-1.5 -right-2.5 min-w-[18px] h-4.5 px-1 rounded-full text-[9px] font-black flex items-center justify-center shadow-md border-2 border-white"
                      style={{
                        backgroundColor: accent.primary,
                        color: '#FFFFFF'
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span 
                  className={`text-[10.5px] mt-0.5 tracking-tight transition-all ${
                    isActive 
                      ? 'font-black text-[#7A2E43] scale-105'
                      : isTransparentBar
                        ? 'font-bold text-[#8E797C] group-hover:text-[#7A2E43]'
                        : 'font-semibold text-[#8E797C] group-hover:text-[#7A2E43]'
                  }`}
                  style={isActive ? { color: accent.primary || '#7A2E43' } : {}}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span 
                    className="w-1.5 h-1.5 rounded-full mt-0.5"
                    style={{
                      backgroundColor: accent.primary || '#7A2E43',
                      boxShadow: `0 0 6px ${accent.primary || '#7A2E43'}`
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
