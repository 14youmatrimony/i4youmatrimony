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
  isInterested,
  onScrollToSection,
  setViewMode
}) {

  return (
    <section id="hero-section" className="relative bg-gradient-to-b from-[#060D17] via-[#0B192C] to-[#07111E] text-white pt-4 pb-8 lg:pt-6 lg:pb-10 overflow-hidden border-b border-[#D4AF37]/30">
      
      {/* Background Decorative Gold Light Glows & Cultural Geometry */}
      <div className="absolute top-0 left-1/4 w-[450px] h-[450px] bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none animate-pulse-glow"></div>
      <div className="absolute bottom-0 right-10 w-[550px] h-[550px] bg-[#1E3A8A]/35 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[#DFB76C]/12 rounded-full blur-2xl pointer-events-none animate-float-slow"></div>

      <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 lg:px-6 relative z-10">
        
        {/* Top Trust Badge Chip */}
        <div className="flex justify-center mb-2 sm:mb-2.5">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#D4AF37]/15 via-[#DFB76C]/10 to-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#DFB76C] text-[10px] sm:text-[11px] font-medium shadow-md backdrop-blur-md">
            <Crown className="w-3 h-3 text-[#DFB76C] shrink-0 fill-[#DFB76C]" />
            <span>India's Premier Luxury Matrimony • Over 14,800 Blessed Marriages</span>
            <span className="w-1 h-1 rounded-full bg-[#DFB76C] hidden sm:inline-block"></span>
            <span className="text-emerald-400 font-semibold hidden sm:flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> 100% Aadhaar Verified
            </span>
          </div>
        </div>

        {/* Hero Main Header Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          
          {/* Left Column: Headlines & High-Converting Pitch */}
          <div className="lg:col-span-7 space-y-3.5 text-center lg:text-left">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10.5px] font-medium">
              <Sparkles className="w-3 h-3 text-[#DFB76C]" />
              <span>Where Sacred Traditions Meet Modern Hearts</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-serif font-extrabold tracking-tight text-white leading-tight sm:leading-tight lg:leading-[1.18]">
              Find Your <span className="gold-gradient-text text-glow-gold drop-shadow-sm">Sacred Match</span> With Dignity & <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-rose-300 bg-clip-text text-transparent">Trust</span>
            </h1>

            {/* Quick Value Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-[#D4AF37]/30 hover:border-[#D4AF37] backdrop-blur-xs text-left transition-all hover:-translate-y-0.5 shadow-md group">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-base sm:text-lg font-serif font-bold text-[#DFB76C]">100%</p>
                  <ShieldCheck className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-[9.5px] sm:text-[10px] text-slate-300 font-medium">Aadhaar UIDAI Verified</p>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-[#D4AF37]/30 hover:border-[#D4AF37] backdrop-blur-xs text-left transition-all hover:-translate-y-0.5 shadow-md group">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-base sm:text-lg font-serif font-bold text-[#DFB76C]">36 Gunas</p>
                  <Sparkles className="w-3 h-3 text-[#DFB76C] group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-[9.5px] sm:text-[10px] text-slate-300 font-medium">Ashtakoot Vedic Milan</p>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-[#D4AF37]/30 hover:border-[#D4AF37] backdrop-blur-xs text-left transition-all hover:-translate-y-0.5 shadow-md group">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-base sm:text-lg font-serif font-bold text-[#DFB76C]">700+ Dist.</p>
                  <MapPin className="w-3 h-3 text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-[9.5px] sm:text-[10px] text-slate-300 font-medium">All India Access</p>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-[#D4AF37]/30 hover:border-[#D4AF37] backdrop-blur-xs text-left transition-all hover:-translate-y-0.5 shadow-md group">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-base sm:text-lg font-serif font-bold text-emerald-400">0% Fake</p>
                  <Lock className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-[9.5px] sm:text-[10px] text-slate-300 font-medium">Photo Privacy Shield</p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-0.5">
              <button
                type="button"
                onClick={() => onScrollToSection?.('matches-section')}
                className="px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#B89228] text-[#0B192C] font-bold text-xs sm:text-[13px] hover:opacity-95 transition-all shadow-md shadow-[#D4AF37]/25 flex items-center space-x-1.5 cursor-pointer active:scale-95 btn-luxury-shimmer"
              >
                <span>Browse 100% Verified Matches</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {setViewMode && (
                <button
                  type="button"
                  onClick={() => setViewMode('app')}
                  className="px-4 py-2.5 rounded-xl bg-[#0B192C]/80 hover:bg-[#152E52] text-white font-bold text-xs sm:text-[13px] border-2 border-[#D4AF37] hover:border-[#DFB76C] backdrop-blur-md transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-[#D4AF37]/20 active:scale-95 hover:scale-105"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#DFB76C]" />
                  <span>Open Matrimony App</span>
                </button>
              )}
              
              <button
                type="button"
                onClick={() => onScrollToSection('matches-section')}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-[13px] border border-white/20 backdrop-blur-md transition-all flex items-center space-x-1.5 cursor-pointer hover:border-[#DFB76C]/60"
              >
                <Search className="w-3.5 h-3.5 text-[#DFB76C]" />
                <span>Explore Live Profiles</span>
              </button>
            </div>
          </div>

          {/* Right Column: Featured Candidate Hero Card */}
          {featuredProfile && (
            <div className="lg:col-span-5 flex justify-center relative">
              {/* Background ambient glow behind card */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-[#D4AF37]/30 via-rose-500/20 to-[#D4AF37]/30 blur-2xl opacity-60 group-hover:opacity-100 transition duration-700 -z-10 animate-pulse-glow pointer-events-none" />

              <div className="relative w-full max-w-sm sm:max-w-[360px] luxury-glass-card rounded-2xl p-3.5 sm:p-4 gold-shine-border shadow-2xl group transition-all duration-300 hover:-translate-y-1">
                
                {/* Floating Top Match Seal */}
                <div className="absolute -top-3 left-5 bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] text-[11px] font-extrabold px-3 py-0.5 rounded-full shadow-lg flex items-center space-x-1.5">
                  <Crown className="w-3 h-3 fill-current" />
                  <span>Featured Profile of the Day</span>
                </div>

                {/* Candidate Image Container */}
                <div className="relative h-56 sm:h-64 rounded-xl overflow-hidden shadow-inner mt-1">
                  <img 
                    src={featuredProfile.photo} 
                    alt={featuredProfile.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B192C] via-transparent to-transparent"></div>

                  {/* High Match Score Badge */}
                  <div className="absolute top-2.5 right-2.5 flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#0B192C]/90 text-[#DFB76C] border border-[#D4AF37]/60 font-bold text-[11px] shadow-lg backdrop-blur-md">
                    <Sparkles className="w-3 h-3 text-[#DFB76C]" />
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
                      <h3 className="text-lg sm:text-xl font-serif font-bold text-white group-hover:text-[#DFB76C] transition-colors leading-tight">
                        {featuredProfile.name}
                      </h3>
                      <p className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5 font-medium">
                        <span>{featuredProfile.age} Yrs, {featuredProfile.height}</span>
                        <span>•</span>
                        <MapPin className="w-3 h-3 text-[#DFB76C]" />
                        <span>{featuredProfile.district || featuredProfile.city}, {featuredProfile.state}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => onToggleInterest(featuredProfile.id)}
                      className={`p-2 rounded-full transition-all cursor-pointer shadow-md ${
                        isInterested
                          ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse'
                          : 'bg-white/10 hover:bg-white/20 text-[#DFB76C] border border-white/20'
                      }`}
                      title={isInterested ? 'Interest Sent' : 'Send Interest'}
                    >
                      <Heart className={`w-4 h-4 ${isInterested ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-300 flex items-center gap-1.5 line-clamp-1 font-medium">
                    <GraduationCap className="w-3 h-3 text-[#DFB76C] shrink-0" />
                    <span className="truncate">{featuredProfile.education}</span>
                  </p>

                  <p className="text-[11px] text-slate-300 flex items-center gap-1.5 line-clamp-1 font-medium">
                    <Briefcase className="w-3 h-3 text-[#DFB76C] shrink-0" />
                    <span className="truncate">{featuredProfile.profession} • {featuredProfile.company}</span>
                  </p>

                  <div className="pt-1.5 flex items-center gap-2">
                    <button
                      onClick={() => onSelectProfile(featuredProfile)}
                      className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all text-center cursor-pointer shadow-xs active:scale-95"
                    >
                      View Horoscope
                    </button>
                    <button
                      onClick={() => onToggleInterest(featuredProfile.id)}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-extrabold text-xs transition-all text-center cursor-pointer shadow-md hover:brightness-110 btn-luxury-shimmer active:scale-95"
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
