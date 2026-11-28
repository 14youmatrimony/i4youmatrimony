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
  LogOut,
  Edit3,
  Store
} from 'lucide-react';
import SafeAvatar from '../common/SafeAvatar';
import { resolveProfilePhoto } from '../../services/api';

export default function WebsiteNavbar({
  viewMode,
  setViewMode,
  onOpenLogin,
  onOpenRegister,
  onOpenEditProfile,
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
  onOpenAppModal,
  onOpenServices
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
    ...(currentUser ? [{ label: 'Candidate Stories', id: 'stories-section' }] : []),
    { label: 'Success Stories', id: 'testimonials-section' },
    { label: 'Membership Plans', id: 'plans-section' }
  ];

  return (
    <header className="sticky top-0 z-50 w-full shadow-md">
      {/* 1. Global Announcement / Live Offer Bar */}
      <div className="bg-[#2E1A36] text-[#FFF7FA] px-3 py-1.5 text-xs font-semibold">
        <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 flex items-center justify-between gap-2">
          {featuredOffer ? (
            <div className="flex items-center space-x-2 truncate">
              <span className="bg-[#FFFFFF] text-[#8064A2] text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 shadow-xs">
                <Crown className="w-3 h-3 fill-current" /> {featuredOffer.title || 'Festive Vivah Offer'}
              </span>
              <span className="truncate hidden sm:inline text-[#FFF7FA]">
                Celebrate with <strong>Flat {featuredOffer.discount_percent}% OFF</strong> on all Quarterly & Annual plans!
              </span>
              <button
                onClick={handleCopyCoupon}
                className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#E8C6D1] hover:bg-[#DFB2C1] rounded border border-[#E8C6D1] text-[11px] transition-all cursor-pointer font-bold shrink-0 text-[#2E1A36]"
                title="Click to copy coupon"
              >
                {copiedCoupon ? (
                  <>
                    <Check className="w-3 h-3 text-[#2E1A36]" />
                    <span>COPIED!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-[#2E1A36]" />
                    <span>Use: <strong>{featuredOffer.code}</strong></span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 truncate">
              <span className="bg-[#FFFFFF] text-[#8064A2] text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 shadow-xs">
                <Crown className="w-3 h-3 fill-current" /> I 4 You Matrimony
              </span>
              <span className="truncate text-xs font-semibold text-[#FFF7FA]">
                Official Indian Matrimonial Platform • 100% Verified Profiles & Family Backgrounds
              </span>
            </div>
          )}

          <div className="hidden md:flex items-center space-x-4 text-[11px] text-[#FFF7FA] shrink-0 font-medium">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E6E6FA]" /> 100% UIDAI Aadhaar Verified
            </span>
            <a href="tel:8968926566" className="flex items-center gap-1 hover:underline text-[#FFF7FA]">
              <PhoneCall className="w-3.5 h-3.5 text-[#E6E6FA]" /> Helpline: <strong>8968926566</strong>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Main Luxury Matrimonial Navbar */}
      <nav className="bg-[#FFFFFF] border-b border-[#E8C6D1] text-[#2E1A36] px-2 sm:px-4 py-2.5 transition-all">
        <div className="w-[90%] max-w-[1800px] mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Brand Logo & Tagline */}
          <div 
            onClick={() => onScrollToSection('hero-section')} 
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group shrink-0"
          >
            <div className="relative h-10 sm:h-11 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 bg-transparent">
              <img 
                src="/logo.png" 
                alt="I 4 You Logo" 
                className="h-9 sm:h-10 w-auto object-contain golden-hearts-pulse" 
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="px-2.5 py-1.5 rounded-xl bg-[#FDF2F6] text-[#C76B85] font-serif font-black flex items-center justify-center text-sm">I4U</div>';
                }}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-xl sm:text-2xl font-serif font-extrabold tracking-wide text-[#2E1A36] drop-shadow-xs whitespace-nowrap">
                  I 4 You
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#F9EBF0] text-[#C76B85] border border-[#E8C6D1] shadow-xs whitespace-nowrap">
                  Matrimony
                </span>
              </div>
              <p className="text-[10px] sm:text-[10.5px] text-[#5A4463] font-medium tracking-wide hidden 2xl:flex items-center gap-1 truncate">
                <Sparkles className="w-3 h-3 text-[#8064A2] shrink-0" /> Pan-India Trusted Vedic Matchmaking
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden xl:flex items-center space-x-1 2xl:space-x-2">
            {navLinks.map((link, idx) => (
              <button
                key={link.id}
                onClick={() => onScrollToSection(link.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#2E1A36] hover:text-[#C76B85] hover:bg-[#F9EBF0] transition-all cursor-pointer whitespace-nowrap ${
                  idx >= 3 ? 'hidden 2xl:inline-block' : ''
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            
            {/* Notification Bell */}
            {onOpenNotifications && currentUser && currentScreen !== 'register' && (
              <button
                onClick={onOpenNotifications}
                className="relative p-1.5 sm:p-2 rounded-full bg-white hover:bg-[#F9EBF0] border border-[#E8C6D1] text-[#5A4463] hover:text-[#C76B85] transition-colors cursor-pointer shrink-0 shadow-xs"
                title="View Match & Interest Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C76B85] text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Promotional Offers Quick Trigger */}
            {!hasPaidPlan && featuredOffer && (
              <button
                type="button"
                onClick={onOpenOffers}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#F9EBF0] via-[#FFF7FA] to-[#F9EBF0] hover:bg-[#F9EBF0] text-[#C76B85] border border-[#E8C6D1] text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                title={`Claim ${featuredOffer.discount_percent}% OFF with code ${featuredOffer.code}`}
              >
                <Crown className="w-3.5 h-3.5 fill-[#8064A2] text-[#8064A2]" />
                <span>Special Offer • {featuredOffer.discount_percent}% OFF</span>
              </button>
            )}

            {/* User Auth: Login/Register or Profile Pill + Logout */}
            {currentUser ? (
              <div className="flex items-center space-x-1.5 shrink-0">
                {onOpenServices && (
                  <button
                    type="button"
                    onClick={onOpenServices}
                    className="px-3 py-1.5 rounded-full bg-[#F3EEFA] hover:bg-[#EAE1F7] border border-[#D8CBEF] text-[#5B3E8C] text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 shrink-0 shadow-xs"
                    title="Browse Wedding Services"
                  >
                    <Store className="w-3.5 h-3.5 text-[#5B3E8C]" />
                    <span>Services</span>
                  </button>
                )}
                {onOpenEditProfile && (
                  <button
                    type="button"
                    onClick={onOpenEditProfile}
                    className="px-3 py-1.5 rounded-full bg-white hover:bg-[#F9EBF0] border border-[#C76B85] text-[#C76B85] text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 shrink-0 shadow-xs"
                    title="Edit your Matrimony Profile"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#C76B85]" />
                    <span>Edit Profile</span>
                  </button>
                )}
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
                    title="Log Out of your account"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-extrabold text-white bg-[#C76B85] hover:bg-[#B35872] transition-all cursor-pointer flex items-center space-x-1.5 shadow-md shadow-[#C76B85]/20 border border-[#C76B85] active:scale-95 shrink-0"
                  title="Member Login"
                >
                  <LogIn className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                  <span>Login</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="hidden sm:inline-flex px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-[#F9EBF0] border border-[#C76B85] text-[#C76B85] transition-all cursor-pointer items-center space-x-1 active:scale-95 shrink-0 shadow-xs"
                  title="Register Free Profile"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#C76B85]" />
                  <span>Register Free</span>
                </button>
              </div>
            )}

            {/* Mobile / Tablet Hamburger Menu */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="xl:hidden p-2 rounded-lg text-[#5A4463] hover:text-[#C76B85] hover:bg-[#F9EBF0]/60 shrink-0"
              aria-label="Toggle Navigation"
            >
              {mobileNavOpen ? <X className="w-5 h-5 text-[#C76B85]" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div className="xl:hidden mt-3 pt-3 border-t border-[#E8C6D1] space-y-1 animate-in fade-in slide-in-from-top-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  onScrollToSection(link.id);
                  setMobileNavOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#5A4463] hover:text-[#C76B85] hover:bg-[#F9EBF0]/60 flex items-center justify-between"
              >
                <span>{link.label}</span>
                <Sparkles className="w-3.5 h-3.5 text-[#8064A2]" />
              </button>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              {currentUser ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E8C6D1] shadow-xs">
                    <div className="flex items-center space-x-2.5">
                      <div className="relative">
                        <SafeAvatar
                          src={resolveProfilePhoto(currentUser)}
                          alt={currentUser.name || "Member"}
                          gender={currentUser.gender}
                          size="sm"
                          className="w-9 h-9 ring-1 ring-emerald-500"
                        />
                        {currentUser.aadhaarVerified && (
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-600 text-white rounded-full flex items-center justify-center ring-1 ring-white">
                            <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#2E1A36]">{currentUser.name}</p>
                        <p className="text-[10px] text-emerald-600 font-medium">
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
                      className="px-3 py-1.5 rounded-lg bg-[#C76B85] hover:bg-[#B35872] text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Open App
                    </button>
                  </div>
                  {onOpenServices && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenServices();
                        setMobileNavOpen(false);
                      }}
                      className="w-full py-2 rounded-xl bg-[#F3EEFA] hover:bg-[#EAE1F7] border border-[#D8CBEF] text-[#5B3E8C] text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Store className="w-4 h-4 text-[#5B3E8C]" />
                      <span>Services</span>
                    </button>
                  )}
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        setMobileNavOpen(false);
                      }}
                      className="w-full py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
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
                    className="w-full py-2.5 px-3 rounded-xl bg-[#C76B85] hover:bg-[#B35872] text-white text-xs font-extrabold flex items-center justify-center space-x-1.5 shadow-md shadow-[#C76B85]/20 border border-[#C76B85] transition-all active:scale-95 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-white stroke-[2.5]" />
                    <span>Member Login</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenRegister();
                      setMobileNavOpen(false);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-[#F9EBF0] border border-[#C76B85] text-[#C76B85] text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <UserPlus className="w-4 h-4 text-[#C76B85]" />
                    <span>Register Free</span>
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  onOpenOffers();
                  setMobileNavOpen(false);
                }}
                className="w-full py-2 rounded-xl bg-[#F9EBF0] hover:bg-[#f7ddd4] text-[#C76B85] border border-[#E8C6D1] text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs"
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
