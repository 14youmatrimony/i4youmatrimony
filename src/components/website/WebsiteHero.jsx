import React from 'react';
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
  Lock, 
  Smartphone
} from 'lucide-react';

export default function WebsiteHero({
  onSelectProfile,
  featuredProfile,
  onToggleInterest,
  onRequestSendInterest,
  isInterested,
  onScrollToSection,
  setViewMode,
  onOpenOffers,
  offers = []
}) {
  const activeOffer = Array.isArray(offers)
    ? offers.find(o => o && (o.is_active === 1 || o.is_active === true || o.is_active === '1'))
    : null;

  return (
    <section id="hero-section" className="relative bg-gradient-to-b from-[#FFF9F6] via-[#FFFBF9] to-[#FDECE4] text-[#5A4649] pt-4 pb-8 lg:pt-6 lg:pb-10 overflow-hidden border-b border-[#E5D0C6]">
      
      {/* Background Decorative Rose Gold & Peach Ambient Accents */}
      <div className="absolute top-0 left-1/4 w-[450px] h-[450px] bg-[#C58B76]/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow"></div>
      <div className="absolute bottom-0 right-10 w-[550px] h-[550px] bg-[#7A2E43]/06 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[#E6B8A2]/15 rounded-full blur-2xl pointer-events-none animate-float-slow"></div>

      <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 lg:px-6 relative z-10">
        
        {/* Top Trust Badge Chip */}
        <div className="flex justify-center mb-2 sm:mb-2.5">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-white border border-[#E5D0C6] text-[#7A2E43] text-[10px] sm:text-[11px] font-medium shadow-xs backdrop-blur-md">
            <Crown className="w-3 h-3 text-[#C58B76] shrink-0 fill-[#C58B76]" />
            <span>India's Premier Luxury Matrimony • Over 14,800 Blessed Marriages</span>
            <span className="w-1 h-1 rounded-full bg-[#C58B76] hidden sm:inline-block"></span>
            <span className="text-emerald-700 font-semibold hidden sm:flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> 100% Aadhaar Verified
            </span>
          </div>
        </div>

        {/* Festive Live Offer Badge */}
        {activeOffer && (
          <div className="flex justify-center mb-3">
            <button
              type="button"
              onClick={onOpenOffers || (() => onScrollToSection?.('plans-section'))}
              className="group inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-white border border-[#E5D0C6] text-[#7A2E43] text-xs font-bold shadow-xs backdrop-blur-md transition-all cursor-pointer hover:scale-102 active:scale-98"
              title={`Special Matrimony Offer: ${activeOffer.discount_percent}% OFF with code ${activeOffer.code}`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
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

        {/* Hero Main Header Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          
          {/* Left Column: Headlines & High-Converting Pitch */}
          <div className="lg:col-span-7 space-y-3.5 text-center lg:text-left">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white border border-[#E5D0C6] text-[#7A2E43] text-[10.5px] font-medium shadow-xs">
              <Sparkles className="w-3 h-3 text-[#C58B76]" />
              <span>Where Sacred Traditions Meet Modern Hearts</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-serif font-extrabold tracking-tight text-[#2C1A1D] leading-tight sm:leading-tight lg:leading-[1.18]">
              Find Your <span className="text-[#7A2E43]">Sacred Match</span> With Dignity & <span className="text-[#C58B76]">Trust</span>
            </h1>

            {/* Quick Value Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
              <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-[#E5D0C6] hover:border-[#C58B76] text-left transition-all hover:-translate-y-0.5 shadow-xs group">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-base sm:text-lg font-serif font-bold text-[#7A2E43]">100%</p>
                  <ShieldCheck className="w-3 h-3 text-emerald-600 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-[9.5px] sm:text-[10px] text-[#5A4649] font-medium">Aadhaar UIDAI Verified</p>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-[#E5D0C6] hover:border-[#C58B76] text-left transition-all hover:-translate-y-0.5 shadow-xs group">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-base sm:text-lg font-serif font-bold text-[#7A2E43]">36 Gunas</p>
                  <Sparkles className="w-3 h-3 text-[#C58B76] group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-[9.5px] sm:text-[10px] text-[#5A4649] font-medium">Ashtakoot Vedic Milan</p>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-[#E5D0C6] hover:border-[#C58B76] text-left transition-all hover:-translate-y-0.5 shadow-xs group">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-base sm:text-lg font-serif font-bold text-[#7A2E43]">700+ Dist.</p>
                  <MapPin className="w-3 h-3 text-[#C58B76] group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-[9.5px] sm:text-[10px] text-[#5A4649] font-medium">All India Access</p>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-[#E5D0C6] hover:border-[#C58B76] text-left transition-all hover:-translate-y-0.5 shadow-xs group">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-base sm:text-lg font-serif font-bold text-emerald-700">0% Fake</p>
                  <Lock className="w-3 h-3 text-emerald-600 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-[9.5px] sm:text-[10px] text-[#5A4649] font-medium">Photo Privacy Shield</p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-0.5">
              <button
                type="button"
                onClick={() => onScrollToSection?.('matches-section')}
                className="px-4.5 py-2.5 rounded-xl bg-[#7A2E43] hover:bg-[#612234] text-white font-bold text-xs sm:text-[13px] transition-all shadow-md shadow-[#7A2E43]/20 flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <span>Browse 100% Verified Matches</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>

              {setViewMode && (
                <button
                  type="button"
                  onClick={() => setViewMode('app')}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FDF2EE] text-[#7A2E43] font-bold text-xs sm:text-[13px] border-2 border-[#7A2E43] transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#7A2E43]" />
                  <span>Open Matrimony App</span>
                </button>
              )}
              
              <button
                type="button"
                onClick={() => onScrollToSection('matches-section')}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FDF2EE] text-[#7A2E43] font-semibold text-xs sm:text-[13px] border border-[#7A2E43] transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Search className="w-3.5 h-3.5 text-[#7A2E43]" />
                <span>Explore Live Profiles</span>
              </button>
            </div>
          </div>

          {/* Right Column: Featured Candidate Hero Card */}
          {featuredProfile && (
            <div className="lg:col-span-5 flex justify-center relative">
              {/* Background ambient glow behind card */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-[#C58B76]/20 via-[#7A2E43]/15 to-[#E6B8A2]/20 blur-2xl opacity-60 group-hover:opacity-100 transition duration-700 -z-10 pointer-events-none" />

              <div className="relative w-full max-w-sm sm:max-w-[360px] bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E5D0C6] shadow-xl group transition-all duration-300 hover:-translate-y-1">
                
                {/* Floating Top Match Seal */}
                <div className="absolute -top-3 left-5 bg-[#7A2E43] text-white text-[11px] font-extrabold px-3 py-0.5 rounded-full shadow-md flex items-center space-x-1.5">
                  <Crown className="w-3 h-3 fill-current text-white" />
                  <span>Featured Profile of the Day</span>
                </div>

                {/* Candidate Image Container */}
                <div className="relative h-56 sm:h-64 rounded-xl overflow-hidden shadow-inner mt-1">
                  <img 
                    src={featuredProfile.photo} 
                    alt={featuredProfile.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2C1A1D]/80 via-transparent to-transparent"></div>

                  {/* High Match Score Badge */}
                  <div className="absolute top-2.5 right-2.5 flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/95 text-[#7A2E43] border border-[#E5D0C6] font-bold text-[11px] shadow-sm backdrop-blur-md">
                    <Sparkles className="w-3 h-3 text-[#C58B76]" />
                    <span>{featuredProfile.matchScore}% Match</span>
                  </div>

                  {/* Aadhaar Verified Badge */}
                  <div className="absolute bottom-2.5 left-2.5 flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-emerald-950/85 border border-emerald-500/60 text-emerald-300 text-[11px] font-semibold backdrop-blur-md shadow-md">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>UIDAI Aadhaar Verified</span>
                  </div>
                </div>

                {/* Candidate Bio & Details */}
                <div className="mt-3 space-y-1.5">
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
                      {isInterested ? '💖 Interest Sent' : 'Send Free Interest'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

    </section>
  );
}
