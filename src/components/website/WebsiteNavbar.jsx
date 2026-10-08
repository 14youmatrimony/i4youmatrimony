import React, { useState } from 'react';
import { 
  Sparkles, 
  Crown, 
  Bell, 
  ShieldCheck, 
  CheckCircle2,
  LogIn, 
  UserPlus, 
  Menu, 
  X, 
  PhoneCall, 
  Check, 
  Copy,
  Heart,
  Search,
  Flame,
  LogOut
} from 'lucide-react';

export default function WebsiteNavbar({
  viewMode,
  setViewMode,
  onOpenLogin,
  onOpenRegister,
  onOpenOffers,
  offers = [],
  onOpenNotifications,
  unreadNotificationsCount = 0,
  currentUser,
  currentScreen = 'app',
  onScrollToSection,
  onOpenAadhaarVerification,
  isProduction = false,
  onToggleProductionMode,
  onLogout,
  onOpenAppModal
}) {
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const hasPaidPlan = Boolean(currentUser?.membership && currentUser?.membership !== 'free');

  // Dynamic active offer from Python Admin Database
  const featuredOffer = (offers && offers.length > 0)
    ? (offers.find(o => o.is_active === 1 || o.is_active === true || o.is_active === '1') || null)
    : null;

  const handleCopyCoupon = () => {
    if (featuredOffer?.code) {
      navigator.clipboard?.writeText(featuredOffer.code);
      setCopiedCoupon(true);
      setTimeout(() => setCopiedCoupon(false), 2000);
    }
  };

  const navLinks = [
    { label: 'Browse Matches', id: 'matches-section' },
    { label: 'Download App', id: 'download-section' },
    ...(currentUser ? [{ label: 'Candidate Stories', id: 'stories-section' }] : []),
    { label: 'Why I 4 You', id: 'why-section' },
    { label: 'Success Stories', id: 'testimonials-section' },
    { label: 'Membership Plans', id: 'plans-section' }
  ];

  return (
    <header className="sticky top-0 z-50 w-full shadow-xl">
      {/* 1. Global Announcement / Live Offer Bar */}
      <div className="bg-gradient-to-r from-[#8C6D1F] via-[#DFB76C] to-[#8C6D1F] text-[#0B192C] px-3 py-1.5 text-xs font-semibold">
        <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 flex items-center justify-between gap-2">
          {featuredOffer ? (
            <div className="flex items-center space-x-2 truncate">
              <span className="bg-[#0B192C] text-[#DFB76C] text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <Crown className="w-3 h-3 fill-current" /> {featuredOffer.title || 'Festive Vivah Offer'}
              </span>
              <span className="truncate hidden sm:inline">
                Celebrate with <strong>Flat {featuredOffer.discount_percent}% OFF</strong> on all Quarterly & Annual plans!
              </span>
              <button
                onClick={handleCopyCoupon}
                className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#0B192C]/10 hover:bg-[#0B192C]/20 rounded border border-[#0B192C]/20 text-[11px] transition-all cursor-pointer font-bold shrink-0"
                title="Click to copy coupon"
              >
                {copiedCoupon ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-900" />
                    <span>COPIED!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Use: <strong>{featuredOffer.code}</strong></span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 truncate">
              <span className="bg-[#0B192C] text-[#DFB76C] text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <Crown className="w-3 h-3 fill-current" /> I 4 You Matrimony
              </span>
              <span className="truncate text-xs font-semibold">
                Official Indian Matrimonial Platform • 100% Verified Profiles & Family Backgrounds
              </span>
            </div>
          )}

          <div className="hidden md:flex items-center space-x-4 text-[11px] text-[#0B192C] shrink-0 font-medium">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-900" /> 100% UIDAI Aadhaar Verified
            </span>
            <a href="tel:8968926566" className="flex items-center gap-1 hover:underline text-[#0B192C]">
              <PhoneCall className="w-3.5 h-3.5" /> Helpline: <strong>8968926566</strong>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Main Luxury Matrimonial Navbar */}
      <nav className="bg-[#0B192C]/95 backdrop-blur-md border-b border-[#D4AF37]/30 text-white px-2 sm:px-4 py-2.5 transition-all">
        <div className="w-[90%] max-w-[1800px] mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Brand Logo & Tagline */}
          <div 
            onClick={() => onScrollToSection('hero-section')} 
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group shrink-0"
          >
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-[#D4AF37] via-[#DFB76C] to-[#8C6D1F] p-0.5 shadow-lg shadow-[#D4AF37]/25 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
              <img 
                src="/brand-logo.png" 
                alt="I 4 You Logo" 
                className="w-full h-full object-cover rounded-full" 
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="w-full h-full bg-[#0B192C] text-[#DFB76C] font-serif font-black flex items-center justify-center text-sm">I4U</div>';
                }}
              />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#DFB76C]"></span>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-xl sm:text-2xl font-serif font-extrabold tracking-wide text-white drop-shadow-sm whitespace-nowrap">
                  I 4 You
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#DFB76C] border border-[#D4AF37]/40 shadow-xs whitespace-nowrap">
                  Matrimony
                </span>
              </div>
              <p className="text-[10px] sm:text-[10.5px] text-slate-300 font-medium tracking-wide hidden 2xl:flex items-center gap-1 truncate">
                <Sparkles className="w-3 h-3 text-[#DFB76C] shrink-0" /> Pan-India Trusted Vedic Matchmaking
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden xl:flex items-center space-x-1 2xl:space-x-2">
            {navLinks.map((link, idx) => (
              <button
                key={link.id}
                onClick={() => onScrollToSection(link.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer whitespace-nowrap ${
                  idx >= 3 ? 'hidden 2xl:inline-block' : ''
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            




            {/* Notification Bell - Visible only when logged in and hidden on registration page */}
            {onOpenNotifications && currentUser && currentScreen !== 'register' && (
              <button
                onClick={onOpenNotifications}
                className="relative p-1.5 sm:p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-[#DFB76C] transition-colors cursor-pointer shrink-0"
                title="View Match & Interest Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Promotional Offers Quick Trigger - Only if offer is active and user is not paid */}
            {!hasPaidPlan && featuredOffer && (
              <button
                onClick={onOpenOffers}
                className="hidden 2xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-[#DFB76C] border border-[#D4AF37]/50 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                <Crown className="w-3.5 h-3.5 fill-[#DFB76C]" />
                <span>{featuredOffer.discount_percent}% OFF</span>
              </button>
            )}

            {/* User Auth: Login/Register or Profile Pill + Logout */}
            {/* User Auth: Login/Register or Logout */}
            {currentUser ? (
              <div className="flex items-center space-x-1.5 shrink-0">
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="px-3 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-rose-300 text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
                    title="Log Out of your account"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-extrabold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] transition-all cursor-pointer flex items-center space-x-1.5 shadow-md shadow-[#D4AF37]/30 border border-yellow-200/60 active:scale-95 shrink-0 btn-luxury-shimmer"
                  title="Member Login"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#0B192C] stroke-[2.5]" />
                  <span>Login</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="hidden sm:inline-flex px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 border border-[#D4AF37]/50 hover:border-[#D4AF37] text-[#DFB76C] transition-all cursor-pointer items-center space-x-1 active:scale-95 shrink-0"
                  title="Register Free Profile"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#DFB76C]" />
                  <span>Register Free</span>
                </button>
              </div>
            )}

            {/* Mobile / Tablet Hamburger Menu */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="xl:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 shrink-0"
              aria-label="Toggle Navigation"
            >
              {mobileNavOpen ? <X className="w-5 h-5 text-[#DFB76C]" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div className="xl:hidden mt-3 pt-3 border-t border-white/10 space-y-1 animate-in fade-in slide-in-from-top-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  onScrollToSection(link.id);
                  setMobileNavOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10 flex items-center justify-between"
              >
                <span>{link.label}</span>
                <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" />
              </button>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              {currentUser ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-[#D4AF37]/30">
                    <div className="flex items-center space-x-2.5">
                      <div className="relative">
                        <img 
                          src={currentUser.photo || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150"} 
                          alt={currentUser.name} 
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-emerald-400"
                        />
                        {currentUser.aadhaarVerified && (
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center ring-1 ring-[#0B192C]">
                            <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{currentUser.name}</p>
                        <p className="text-[10px] text-emerald-400 font-medium">
                          {currentUser.aadhaarVerified ? '✓ Aadhaar Verified' : 'Logged In Member'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenAppModal) {
                          onOpenAppModal();
                        } else {
                          setViewMode?.('app');
                        }
                        setMobileNavOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] text-xs font-bold shadow-sm cursor-pointer"
                    >
                      Open App
                    </button>
                  </div>
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        setMobileNavOpen(false);
                      }}
                      className="w-full py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-rose-300 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Log Out</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenLogin();
                      setMobileNavOpen(false);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] text-[#0B192C] text-xs font-extrabold flex items-center justify-center space-x-1.5 shadow-md shadow-[#D4AF37]/25 border border-yellow-200/60 transition-all active:scale-95 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-[#0B192C] stroke-[2.5]" />
                    <span>Member Login</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenRegister();
                      setMobileNavOpen(false);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-[#D4AF37]/50 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-[#DFB76C]" />
                    <span>Register Free</span>
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  onOpenOffers();
                  setMobileNavOpen(false);
                }}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-[#DFB76C] border border-[#D4AF37]/40 text-xs font-bold flex items-center justify-center space-x-1.5"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>{featuredOffer ? `Special Offers & Membership Plans (${featuredOffer.discount_percent}% OFF)` : 'Membership Plans & Pricing'}</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
