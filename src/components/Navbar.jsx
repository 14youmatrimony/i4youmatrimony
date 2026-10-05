import React, { useState } from 'react';
import { 
  Heart, 
  Search, 
  MessageCircle, 
  UserPlus, 
  LogIn, 
  Bell, 
  Menu, 
  X, 
  ShieldCheck, 
  Sparkles,
  Users
} from 'lucide-react';

export default function Navbar({ 
  currentScreen, 
  setCurrentScreen, 
  unreadChatCount = 1,
  interestCount = 3,
  currentUser
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const isLoggedIn = Boolean(currentUser && (currentUser.id || currentUser.name || currentUser.mobile));

  const navItems = [
    { id: 'feed', label: 'Match Feed', icon: Users, badge: null },
    { id: 'search', label: 'Advanced Search', icon: Search, badge: null },
    { id: 'chat', label: 'Messages', icon: MessageCircle, badge: unreadChatCount > 0 ? unreadChatCount : null },
    ...(!isLoggedIn ? [
      { id: 'register', label: 'Registration Wizard', icon: UserPlus, badge: 'New' },
      { id: 'login', label: 'Login / OTP', icon: LogIn, badge: null }
    ] : [])
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0B192C]/95 backdrop-blur-md border-b border-[#D4AF37]/30 shadow-lg text-white">
      <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setCurrentScreen('feed')}
          >
            <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-[#D4AF37] via-[#DFB76C] to-[#8C6D1F] p-0.5 shadow-md shadow-[#D4AF37]/20 group-hover:scale-105 transition-transform overflow-hidden">
              <img src="/brand-logo.png" alt="I 4 You Logo" className="w-full h-full object-cover rounded-full" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#DFB76C]"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-2xl font-serif font-extrabold tracking-wide text-white">
                  I 4 You
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#DFB76C] border border-[#D4AF37]/40 font-medium">
                  Matrimony
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium tracking-wide flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#DFB76C]" /> Pan-India Trusted Matchmaking
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentScreen(item.id)}
                  className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#DFB76C]/10 text-[#DFB76C] border border-[#D4AF37]/40 shadow-inner' 
                      : 'text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#DFB76C]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#D4AF37] text-[#0B192C]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Section: User & Alerts */}
          <div className="hidden sm:flex items-center space-x-3">
            {/* Notification Bell - Only visible when logged in and hidden on registration page */}
            {isLoggedIn && currentScreen !== 'register' && (
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#DFB76C] rounded-full ring-2 ring-[#0B192C]"></span>
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 text-slate-800 p-3 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-semibold text-sm text-[#0B192C]">Matrimony Alerts</span>
                      <span className="text-xs text-[#DFB76C] font-medium cursor-pointer">Mark read</span>
                    </div>
                    <div className="divide-y divide-slate-100 text-xs py-1">
                      <div className="py-2.5 flex items-start space-x-2.5 hover:bg-slate-50 p-1.5 rounded cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                          AK
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Dr. Ananya Kulkarni accepted your interest!</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">33/36 Gunas match • 10m ago</p>
                        </div>
                      </div>
                      <div className="py-2.5 flex items-start space-x-2.5 hover:bg-slate-50 p-1.5 rounded cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-[#DFB76C]/20 text-[#8C6D1F] flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">4 New matches found in Tier 2 & 3 cities</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Nashik, Mysuru, Salem • 1h ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile Mini Badge */}
            <div 
              onClick={() => setCurrentScreen('login')}
              className="flex items-center space-x-2.5 pl-2 py-1 pr-3 rounded-full bg-white/5 border border-[#D4AF37]/30 hover:border-[#D4AF37] cursor-pointer transition-all"
            >
              <div className="relative">
                <img 
                  src={currentUser?.photo || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150"} 
                  alt={currentUser?.name || "User"} 
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-[#DFB76C]"
                />
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 absolute -bottom-0.5 -right-0.5 bg-[#0B192C] rounded-full" />
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-xs font-semibold text-white leading-tight">{currentUser?.name || "Priya Sharma"}</p>
                <p className="text-[10px] text-[#DFB76C] leading-tight">Verified Profile</p>
              </div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-[#DFB76C]" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0B192C] border-b border-[#D4AF37]/30 px-4 pt-2 pb-5 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentScreen(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium ${
                  isActive 
                    ? 'bg-[#D4AF37]/20 text-[#DFB76C] border border-[#D4AF37]/40' 
                    : 'text-slate-200 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#DFB76C]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37] text-[#0B192C]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
