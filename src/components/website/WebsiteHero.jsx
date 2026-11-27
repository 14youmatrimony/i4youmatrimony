import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  ShieldCheck,
  Heart,
  MapPin,
  Briefcase,
  GraduationCap,
  Crown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Lock,
  Smartphone,
  Store
} from 'lucide-react';

const HERO_COUPLE_SLIDES = [
  'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1920&q=85',
  'https://images.unsplash.com/photo-1610173827043-9db50e0d8ef9?auto=format&fit=crop&w=1920&q=85',
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1920&q=85',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1920&q=85'
];

export default function WebsiteHero({
  onSelectProfile,
  featuredProfile,
  onToggleInterest,
  onRequestSendInterest,
  isInterested,
  onScrollToSection,
  setViewMode,
  onOpenVendorPortal,
  onOpenServices,
  onOpenOffers,
  offers = [],
  banners = [],
  currentUser = null
}) {
  const slides = React.useMemo(() => {
    if (Array.isArray(banners) && banners.length > 0) {
      return banners
        .filter(b => b && b.image_url)
        .map(b => ({ url: b.image_url, alt: b.title || 'Indian wedding couple celebration' }));
    }
    return HERO_COUPLE_SLIDES.map(url => ({ url, alt: 'Indian wedding couple celebration' }));
  }, [banners]);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setActiveSlideIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || isHovered) return undefined;
    const timer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length, isHovered]);

  const handlePrevSlide = () => {
    setActiveSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNextSlide = () => {
    setActiveSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const activeOffer = Array.isArray(offers)
    ? offers.find(o => o && (o.is_active === 1 || o.is_active === true || o.is_active === '1'))
    : null;

  return (
    <section
      id="hero-section"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full min-h-[460px] lg:h-[65vh] lg:min-h-[460px] lg:max-h-[640px] flex items-center py-6 md:py-8 overflow-hidden border-b border-[#E5D0C6]"
    >
      {/* Full-Bleed Rotating Newlywed Indian Couple Slideshow */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#2C1A1D]">
        {slides.map((slide, idx) => {
          const isActive = idx === activeSlideIndex % slides.length;
          return (
            <img
              key={slide.url + '_' + idx}
              src={slide.url}
              alt={slide.alt}
              className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
            />
          );
        })}
        {/* Clean dark/warm gradient scrim for crisp foreground legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-black/45" />
      </div>

      {/* Carousel Left/Right Arrows & Indicator Dots */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrevSlide}
            aria-label="Previous banner"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/45 hover:bg-black/70 text-white border border-white/20 items-center justify-center backdrop-blur-sm transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNextSlide}
            aria-label="Next banner"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/45 hover:bg-black/70 text-white border border-white/20 items-center justify-center backdrop-blur-sm transition-all cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/15">
            {slides.map((_, idx) => {
              const isDotActive = idx === activeSlideIndex % slides.length;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlideIndex(idx)}
                  aria-label={`Go to banner ${idx + 1}`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    isDotActive ? 'w-6 bg-[#E6B8A2]' : 'w-2 bg-white/50 hover:bg-white/80'
                  }`}
                />
              );
            })}
          </div>
        </>
      )}

      {/* Foreground Content Container */}
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        {/* Festive Live Offer Badge */}
        {activeOffer && (
          <div className="flex justify-center lg:justify-start mb-4">
            <button
              type="button"
              onClick={onOpenOffers || (() => onScrollToSection?.('plans-section'))}
              className="group inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-white border border-[#E5D0C6] text-[#7A2E43] text-xs font-bold shadow-md backdrop-blur-md transition-all cursor-pointer"
              title={`Special Matrimony Offer: ${activeOffer.discount_percent}% OFF with code ${activeOffer.code}`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[#7A2E43] font-extrabold uppercase tracking-wide">
                Special Offer: {activeOffer.discount_percent}% OFF
              </span>
              <span className="text-[#5A4649] font-normal hidden sm:inline">
                {activeOffer.title || 'Limited Time Festive Savings'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#7A2E43] text-white font-mono font-black text-[11px] uppercase group-hover:bg-[#612234] transition-colors">
                {activeOffer.code}
              </span>
              <span className="text-[#7A2E43] font-bold flex items-center gap-0.5 text-[11px]">
                <span>Claim Now</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          </div>
        )}

        {/* Hero Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Column: Frosted-Glass Featured Candidate Card (2cm-3cm from left edge, +10% height) */}
          {featuredProfile && (
            <div className="lg:col-span-5 lg:order-1 flex justify-center lg:justify-start relative lg:ml-6">
              <div className="relative w-full max-w-sm sm:max-w-[360px] backdrop-blur-md bg-white/90 rounded-2xl py-4 sm:py-5 px-3.5 sm:px-4 border border-[#E6B8A2]/80 shadow-2xl group transition-all duration-300 hover:-translate-y-1">
                {/* Floating Top Match Seal */}
                <div className="absolute -top-3 left-5 bg-[#7A2E43] text-white text-[11px] font-extrabold px-3 py-0.5 rounded-full shadow-md flex items-center space-x-1.5">
                  <Crown className="w-3 h-3 fill-current text-white" />
                  <span>Featured Profile of the Day</span>
                </div>

                {/* Candidate Image Container (+10% height) */}
                <div className="relative h-44 sm:h-[212px] rounded-xl overflow-hidden shadow-inner mt-1">
                  <img
                    src={featuredProfile.photo}
                    alt={featuredProfile.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2C1A1D]/80 via-transparent to-transparent" />

                  {/* High Match Score Badge (Logged-in users only) */}
                  {Boolean(currentUser && !currentUser.isGuest && featuredProfile.matchScore) && (
                    <div className="absolute top-2.5 right-2.5 flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/95 text-[#7A2E43] border border-[#E5D0C6] font-bold text-[11px] shadow-sm backdrop-blur-md">
                      <Sparkles className="w-3 h-3 text-[#C58B76]" />
                      <span>{featuredProfile.matchScore}% Match</span>
                    </div>
                  )}

                  {/* Aadhaar Verified Badge */}
                  <div className="absolute bottom-2.5 left-2.5 flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-emerald-950/85 border border-emerald-500/60 text-emerald-300 text-[11px] font-semibold backdrop-blur-md shadow-md">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>UIDAI Aadhaar Verified</span>
                  </div>
                </div>

                {/* Candidate Bio & Details */}
                <div className="mt-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg sm:text-xl font-serif font-bold text-[#2C1A1D] group-hover:text-[#7A2E43] transition-colors leading-tight">
                        {featuredProfile.name}
                      </h3>
                      <p className="text-[11px] text-[#5A4649] flex items-center gap-1 mt-0.5 font-medium">
                        <span>{featuredProfile.age} Yrs, {featuredProfile.height}</span>
                        <span>•</span>
                        <MapPin className="w-3 h-3 text-[#C58B76]" />
                        <span>{featuredProfile.district || featuredProfile.city}, {featuredProfile.state}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (isInterested) {
                          onToggleInterest(featuredProfile.id);
                        } else if (onRequestSendInterest) {
                          onRequestSendInterest(featuredProfile);
                        } else {
                          onToggleInterest(featuredProfile.id);
                        }
                      }}
                      className={`p-2 rounded-full transition-all cursor-pointer shadow-sm ${
                        isInterested
                          ? 'bg-[#7A2E43] text-white hover:bg-[#612234] animate-pulse'
                          : 'bg-[#FDECE4] hover:bg-[#f7ddd4] text-[#7A2E43] border border-[#E5D0C6]'
                      }`}
                      title={isInterested ? 'Interest Sent' : 'Send Interest'}
                    >
                      <Heart className={`w-4 h-4 ${isInterested ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <p className="text-[11px] text-[#5A4649] flex items-center gap-1.5 line-clamp-1 font-medium">
                    <GraduationCap className="w-3 h-3 text-[#C58B76] shrink-0" />
                    <span className="truncate">{featuredProfile.education}</span>
                  </p>

                  <p className="text-[11px] text-[#5A4649] flex items-center gap-1.5 line-clamp-1 font-medium">
                    <Briefcase className="w-3 h-3 text-[#C58B76] shrink-0" />
                    <span className="truncate">{featuredProfile.profession} • {featuredProfile.company}</span>
                  </p>

                  <div className="pt-1.5 flex items-center gap-2">
                    <button
                      onClick={() => onSelectProfile(featuredProfile)}
                      className="flex-1 py-2 rounded-xl bg-white hover:bg-[#FDF2EE] text-[#7A2E43] font-semibold text-xs border border-[#E5D0C6] transition-all text-center cursor-pointer shadow-xs active:scale-95"
                    >
                      View Horoscope
                    </button>
                    <button
                      onClick={() => {
                        if (isInterested) {
                          onToggleInterest(featuredProfile.id);
                        } else if (onRequestSendInterest) {
                          onRequestSendInterest(featuredProfile);
                        } else {
                          onToggleInterest(featuredProfile.id);
                        }
                      }}
                      className="flex-1 py-2 rounded-xl bg-[#7A2E43] hover:bg-[#612234] text-white font-extrabold text-xs transition-all text-center cursor-pointer shadow-sm active:scale-95"
                    >
                      {isInterested ? 'Interest Sent' : 'Send Free Interest'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right Column: Headline, 4 Frosted-Glass Switches & CTAs */}
          <div className="lg:col-span-7 lg:order-2 space-y-5 text-center lg:text-left">
            <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-serif font-extrabold tracking-tight text-white drop-shadow-md leading-tight lg:leading-[1.16]">
              Find Your <span className="text-[#FDECE4]">Sacred Match</span> With Dignity &amp;{' '}
              <span className="text-[#E6B8A2]">Trust</span>
            </h1>

            {/* 4 Uniform Frosted-Glass Switches Floating Over Full-Bleed Photo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 auto-rows-fr gap-2.5 pt-0.5">
              <div className="h-full min-h-[74px] flex flex-col justify-center p-2.5 sm:p-3 rounded-xl backdrop-blur-md bg-white/85 border border-[#E6B8A2]/80 hover:border-[#C58B76] text-left transition-all hover:-translate-y-0.5 shadow-lg group">
                <div className="flex items-center justify-between mb-0.5 w-full">
                  <p className="text-base sm:text-lg font-serif font-bold text-[#7A2E43]">100%</p>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform shrink-0" />
                </div>
                <p className="text-[10px] text-[#2C1A1D] font-semibold leading-tight">Aadhaar UIDAI Verified</p>
              </div>

              <div className="h-full min-h-[74px] flex flex-col justify-center p-2.5 sm:p-3 rounded-xl backdrop-blur-md bg-white/85 border border-[#E6B8A2]/80 hover:border-[#C58B76] text-left transition-all hover:-translate-y-0.5 shadow-lg group">
                <div className="flex items-center justify-between mb-0.5 w-full">
                  <p className="text-base sm:text-lg font-serif font-bold text-[#7A2E43]">700+ Dist.</p>
                  <MapPin className="w-3.5 h-3.5 text-[#C58B76] group-hover:scale-110 transition-transform shrink-0" />
                </div>
                <p className="text-[10px] text-[#2C1A1D] font-semibold leading-tight">All India Access</p>
              </div>

              <div className="h-full min-h-[74px] flex flex-col justify-center p-2.5 sm:p-3 rounded-xl backdrop-blur-md bg-white/85 border border-[#E6B8A2]/80 hover:border-[#C58B76] text-left transition-all hover:-translate-y-0.5 shadow-lg group">
                <div className="flex items-center justify-between mb-0.5 w-full">
                  <p className="text-base sm:text-lg font-serif font-bold text-emerald-700">0% Fake</p>
                  <Lock className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform shrink-0" />
                </div>
                <p className="text-[10px] text-[#2C1A1D] font-semibold leading-tight">Photo Privacy Shield</p>
              </div>

              <button
                type="button"
                onClick={() => (onOpenVendorPortal ? onOpenVendorPortal() : onOpenServices?.())}
                className="h-full min-h-[74px] flex flex-col justify-center p-2.5 sm:p-3 rounded-xl backdrop-blur-md bg-white/85 hover:bg-white/95 border border-[#E6B8A2]/80 hover:border-[#C58B76] text-left transition-all hover:-translate-y-0.5 shadow-lg group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-0.5 w-full">
                  <p className="text-base sm:text-lg font-serif font-bold text-[#7A2E43]">Services</p>
                  <Store className="w-3.5 h-3.5 text-[#C58B76] group-hover:scale-110 transition-transform shrink-0" />
                </div>
                <p className="text-[10px] text-[#2C1A1D] font-semibold leading-tight">Matrimony Services</p>
              </button>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => onScrollToSection?.('matches-section')}
                className="px-4.5 py-2.5 rounded-xl bg-[#7A2E43] hover:bg-[#612234] text-white font-bold text-xs sm:text-[13px] transition-all shadow-lg shadow-black/25 flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <span>Browse 100% Verified Matches</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>

              {setViewMode && (
                <button
                  type="button"
                  onClick={() => setViewMode('app')}
                  className="px-4 py-2.5 rounded-xl bg-white/90 hover:bg-white backdrop-blur-md text-[#7A2E43] font-bold text-xs sm:text-[13px] border-2 border-[#E6B8A2] transition-all flex items-center space-x-1.5 cursor-pointer shadow-md active:scale-95"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#7A2E43]" />
                  <span>Open Matrimony App</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onScrollToSection('matches-section')}
                className="px-4 py-2.5 rounded-xl bg-white/90 hover:bg-white backdrop-blur-md text-[#7A2E43] font-semibold text-xs sm:text-[13px] border border-[#E6B8A2] transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Search className="w-3.5 h-3.5 text-[#7A2E43]" />
                <span>Explore Live Profiles</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
