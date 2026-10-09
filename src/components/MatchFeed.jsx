import React, { useState } from 'react';
import { 
  Heart, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Send, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  SlidersHorizontal,
  ChevronRight,
  Eye,
  MessageCircle,
  Building2,
  Filter
} from 'lucide-react';

export default function MatchFeed({ 
  profiles, 
  interestsSent, 
  onToggleInterest, 
  shortlisted, 
  onToggleShortlist, 
  onSelectProfile, 
  onStartChat,
  setCurrentScreen 
}) {
  const [activeCategory, setActiveCategory] = useState('all');

  // Filter profiles by category chips
  const filteredProfiles = profiles.filter(p => {
    if (activeCategory === 'high_match') return p.matchScore >= 93;
    if (activeCategory === 'medical') return p.educationCategory.includes('Medical');
    if (activeCategory === 'tech') return p.educationCategory.includes('Engineering') || p.profession.includes('Engineer');
    if (activeCategory === 'govt') return p.educationCategory.includes('Civil') || p.profession.includes('IAS') || p.profession.includes('Advocate');
    return true;
  });

  const categories = [
    { id: 'all', label: `All Matches (${profiles.length})` },
    { id: 'high_match', label: 'High Gunas Match (93%+)' },
    { id: 'tech', label: 'Tech & Engineers' },
    { id: 'medical', label: 'Doctors & Medical' },
    { id: 'govt', label: 'Civil Services & Legal' }
  ];

  return (
    <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 py-8 space-y-8">
      
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#1E3A8A] p-6 sm:p-10 text-white shadow-2xl overflow-hidden border border-[#D4AF37]/30">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#DFB76C] text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pan-India Daily Recommendations</span>
          </div>
          
          <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-white leading-tight">
            Handpicked Matches for You
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-2 font-normal leading-relaxed">
            Verified matrimonial profiles filtered across Tier 1, 2, 3 & 4 cities in India with comprehensive horoscope compatibility and family values.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => setCurrentScreen('search')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-bold text-xs sm:text-sm hover:from-[#dfb76c] hover:to-[#b89228] transition-all shadow-md shadow-[#D4AF37]/30 flex items-center space-x-2 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Open Advanced Search Filters</span>
            </button>

            <button
              onClick={() => setCurrentScreen('register')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm border border-white/20 backdrop-blur-md transition-all flex items-center space-x-1 cursor-pointer"
            >
              <span>Update Preferences</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Decorative Circles */}
        <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full border-2 border-[#D4AF37]/15 pointer-events-none"></div>
        <div className="absolute right-32 -top-16 w-64 h-64 rounded-full border border-white/10 pointer-events-none"></div>
      </div>

      {/* Quick Filter Categories Bar */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar scrollbar-none pb-2 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-[#0B192C] text-[#DFB76C] shadow-md border border-[#D4AF37]/40'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-medium text-slate-500 whitespace-nowrap hidden md:block">
          Showing <span className="font-bold text-[#0B192C]">{filteredProfiles.length}</span> verified profiles
        </span>
      </div>

      {/* Profile Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProfiles.map((profile) => {
          const isInterested = interestsSent.includes(profile.id);
          const isShortlisted = shortlisted.includes(profile.id);

          return (
            <div 
              key={profile.id}
              onClick={() => onSelectProfile(profile)}
              className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group hover:-translate-y-1 relative cursor-pointer"
            >
              {/* Photo Area */}
              <div className="relative h-64 overflow-hidden bg-slate-100">
                <img 
                  src={profile.photo} 
                  alt={profile.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"></div>

                {/* Match Score Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#D4AF37] text-[#0B192C] shadow-md flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-[#0B192C]" />
                    <span>{profile.matchScore}% Match</span>
                  </span>
                </div>

                {/* Shortlist Heart Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleShortlist(profile.id);
                  }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md hover:bg-white flex items-center justify-center transition-transform hover:scale-110 shadow-md cursor-pointer"
                  title={isShortlisted ? 'Remove from shortlist' : 'Shortlist profile'}
                >
                  <Heart className={`w-4 h-4 ${isShortlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
                </button>

                {/* Bottom Overlay Info on Photo */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <div className="flex items-center space-x-1.5">
                    <h3 className="font-serif font-bold text-lg leading-tight truncate drop-shadow-sm">
                      {profile.name}
                    </h3>
                    {profile.verified && (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" title="Verified Profile" />
                    )}
                  </div>
                  <p className="text-xs text-slate-200 mt-0.5 flex items-center gap-1.5">
                    <span>{profile.age} yrs</span>
                    <span>•</span>
                    <span>{profile.height}</span>
                  </p>
                </div>
              </div>

              {/* Card Body Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                
                <div className="space-y-2 text-xs">
                  {/* Location & Tier Badge */}
                  <div className="flex items-center justify-between text-slate-600">
                    <div className="flex items-center space-x-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#8C6D1F] shrink-0" />
                      <span className="font-medium truncate">{profile.city}, {profile.state}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 bg-amber-50 text-[#8C6D1F] border border-amber-200">
                      {profile.district} Dist.
                    </span>
                  </div>

                  {/* Profession & Company */}
                  <div className="flex items-start space-x-1.5 text-slate-700">
                    <Briefcase className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0 mt-0.5" />
                    <div className="truncate">
                      <p className="font-semibold text-slate-900 truncate">{profile.profession}</p>
                      <p className="text-[11px] text-slate-500 truncate">{profile.company}</p>
                    </div>
                  </div>

                  {/* Education */}
                  <div className="flex items-center space-x-1.5 text-slate-600">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{profile.education}</span>
                  </div>

                  {/* Cultural Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-medium">
                      {profile.religion}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-medium">
                      {profile.motherTongue}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                      {profile.diet}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center space-x-2">
                  
                  {/* View Full Profile (Profile Switch) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProfile(profile);
                    }}
                    className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="View Full Profile Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Direct Chat Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartChat(profile.id);
                    }}
                    className="p-2 rounded-xl border border-slate-200 text-[#1E3A8A] hover:bg-blue-50 transition-colors cursor-pointer"
                    title="Open Chat"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>

                  {/* Connect / Send Interest Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleInterest(profile.id);
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer ${
                      isInterested 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] text-[#0B192C] shadow-md shadow-[#D4AF37]/25'
                    }`}
                  >
                    {isInterested ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Interest Sent</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Connect</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
