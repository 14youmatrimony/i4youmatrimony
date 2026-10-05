import React, { useState, useMemo, useEffect } from 'react';
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
  MessageCircle, 
  Building2, 
  Filter, 
  Search, 
  IndianRupee, 
  RotateCcw, 
  Star, 
  Compass,
  X,
  Utensils,
  ChevronDown,
  ChevronUp,
  Calendar
} from 'lucide-react';
import { STATES_AND_CITIES, getDistrictsForState } from '../../data/locationData';
import { RELIGIONS } from '../RegistrationWizard';
import { sanitizeSearchTerm } from '../../utils/security';
import { 
  getTargetCandidateGender, 
  isCandidateMatchingTarget, 
  normalizeGender, 
  isSelfProfile, 
  resolveProfileGender 
} from '../../utils/genderMatch';

export default function WebsiteMatchShowcase({
  profiles,
  interestsSent,
  onToggleInterest,
  shortlisted,
  onToggleShortlist,
  onSelectProfile,
  onStartChat,
  onOpenRegister,
  onOpenOffers,
  externalReligion = 'All Religions',
  onSelectReligion,
  externalCity = '',
  onClearExternalCity,
  currentUser
}) {
  const [searchTerm, setSearchTerm] = useState(externalCity || '');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // Advanced Filter States
  const [filterState, setFilterState] = useState('All States');
  const [filterDistrict, setFilterDistrict] = useState('All Districts');
  const [filterReligion, setFilterReligion] = useState(externalReligion || 'All Religions');

  // Sync with external religion selection (e.g. from footer click)
  useEffect(() => {
    if (externalReligion) {
      setFilterReligion(externalReligion);
    }
  }, [externalReligion]);

  // Sync with external city selection
  useEffect(() => {
    if (externalCity) {
      setSearchTerm(externalCity);
    }
  }, [externalCity]);
  const [filterDiet, setFilterDiet] = useState('All');
  const [filterMinAge, setFilterMinAge] = useState(21);
  const [filterMaxAge, setFilterMaxAge] = useState(38);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const districts = useMemo(() => {
    if (filterState === 'All States') return [];
    return getDistrictsForState(filterState);
  }, [filterState]);

  // Total active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (filterState !== 'All States') count++;
    if (filterDistrict !== 'All Districts') count++;
    if (filterReligion !== 'All Religions') count++;
    if (filterDiet !== 'All') count++;
    if (verifiedOnly) count++;
    if (filterMinAge !== 21 || filterMaxAge !== 38) count++;
    return count;
  }, [searchTerm, filterState, filterDistrict, filterReligion, filterDiet, verifiedOnly, filterMinAge, filterMaxAge]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterState('All States');
    setFilterDistrict('All Districts');
    setFilterReligion('All Religions');
    onSelectReligion?.('All Religions');
    onClearExternalCity?.();
    setFilterDiet('All');
    setFilterMinAge(21);
    setFilterMaxAge(38);
    setVerifiedOnly(false);
  };

  // Filter computation
  const filteredProfiles = useMemo(() => {
    const isUserLoggedIn = Boolean(currentUser && currentUser.gender);
    const targetGender = isUserLoggedIn ? getTargetCandidateGender(currentUser) : null;

    return profiles.filter((p) => {
      // 0. Exclude own profile (by ID, Name, and Phone)
      if (isSelfProfile(p, currentUser)) return false;

      // 0.1 Strict Opposite Gender Matchmaking Rule:
      // Male users can ONLY see Female profiles (Brides)
      // Female users can ONLY see Male profiles (Grooms)
      // Guests see all verified profiles
      if (targetGender && !isCandidateMatchingTarget(p, targetGender)) return false;

      // 1. Search query (name, city, district, profession, company, caste, education)
      const cleanTerm = sanitizeSearchTerm(searchTerm).toLowerCase();
      if (cleanTerm) {
        const matchesName = p.name.toLowerCase().includes(cleanTerm);
        const matchesCity = (p.city || '').toLowerCase().includes(cleanTerm);
        const matchesDistrict = (p.district || '').toLowerCase().includes(cleanTerm);
        const matchesProfession = (p.profession || '').toLowerCase().includes(cleanTerm);
        const matchesCaste = (p.caste || '').toLowerCase().includes(cleanTerm);
        const matchesEducation = (p.education || '').toLowerCase().includes(cleanTerm);
        if (!matchesName && !matchesCity && !matchesDistrict && !matchesProfession && !matchesCaste && !matchesEducation) {
          return false;
        }
      }

      // 2. State & District
      if (filterState !== 'All States' && p.state !== filterState) return false;
      if (filterDistrict !== 'All Districts' && p.district !== filterDistrict) return false;

      // 3. Religion
      if (filterReligion !== 'All Religions') {
        if (filterReligion === 'Buddhist & Parsi') {
          if (p.religion !== 'Buddhist' && p.religion !== 'Parsi') return false;
        } else if (p.religion !== filterReligion) {
          return false;
        }
      }

      // 4. Diet
      if (filterDiet !== 'All' && p.diet !== filterDiet) return false;

      // 5. Age
      if (p.age < filterMinAge || p.age > filterMaxAge) return false;

      // 6. Verified Only
      if (verifiedOnly && !p.verified && !p.aadhaarVerified) return false;

      return true;
    });
  }, [
    profiles,
    currentUser,
    searchTerm,
    filterState,
    filterDistrict,
    filterReligion,
    filterDiet,
    filterMinAge,
    filterMaxAge,
    verifiedOnly
  ]);

  return (
    <section id="matches-section" className="py-12 lg:py-20 bg-slate-50 text-slate-900 border-b border-slate-200">
      <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 space-y-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#DFB76C]/15 border border-[#D4AF37]/30 text-[#8C6D1F] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#8C6D1F]" />
            <span>Curated Matrimonial Feed</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-serif font-extrabold text-[#0B192C] tracking-tight">
            Handpicked Matches for You
          </h2>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="relative bg-gradient-to-b from-white via-white to-amber-50/15 rounded-3xl p-4 sm:p-6 shadow-xl shadow-slate-200/50 border border-slate-200/90 transition-all space-y-4 overflow-hidden">
          
          {/* Subtle Royal Gold Top Aura */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#DFB76C] to-transparent opacity-90" />
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-gradient-to-br from-[#DFB76C]/10 via-[#D4AF37]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Search Input & Action Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 relative z-10">
            
            {/* Quick Keyword Search Input */}
            <div className="relative flex-1 group/search">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-amber-500/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#8C6D1F] group-focus-within/search:bg-[#0B192C] group-focus-within/search:text-[#DFB76C] group-focus-within/search:border-[#DFB76C] transition-all">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search candidate name, hometown, profession, caste, or education..."
                className="w-full pl-13 pr-24 py-3 rounded-2xl bg-slate-50/90 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 border border-slate-200/90 hover:border-[#DFB76C]/60 focus:outline-hidden focus:border-[#D4AF37] focus:ring-4 focus:ring-[#DFB76C]/15 transition-all shadow-inner"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer transition-colors flex items-center space-x-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Clear</span>
                </button>
              ) : (
                <div className="hidden md:flex items-center space-x-1 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[11px] font-semibold text-slate-400 bg-white/80 px-2 py-0.5 rounded-lg border border-slate-200/60 shadow-2xs">
                  <span>Quick Finder</span>
                </div>
              )}
            </div>

            {/* Filter Toggle & Reset Buttons */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center space-x-2 border transition-all cursor-pointer shadow-xs active:scale-95 ${
                  isFilterExpanded
                    ? 'bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#0B192C] text-[#DFB76C] border-[#D4AF37] shadow-lg shadow-[#0B192C]/20 ring-2 ring-[#DFB76C]/25'
                    : 'bg-white hover:bg-gradient-to-r hover:from-amber-50/60 hover:to-white text-slate-700 hover:text-[#0B192C] border-slate-200/90 hover:border-[#DFB76C] hover:shadow-md'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-[#DFB76C]" />
                <span>{isFilterExpanded ? 'Hide Filters' : 'More Filters'}</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#DFB76C] text-[#0B192C] text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                    {activeFiltersCount}
                  </span>
                )}
                {isFilterExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              <button
                type="button"
                onClick={handleResetFilters}
                className="p-3 rounded-2xl border border-slate-200/90 text-slate-500 hover:text-[#0B192C] bg-slate-50 hover:bg-amber-50/80 hover:border-[#DFB76C] shadow-2xs hover:shadow-sm transition-all group/reset cursor-pointer active:scale-90"
                title="Reset All Filters"
              >
                <RotateCcw className="w-4 h-4 group-hover/reset:-rotate-180 transition-transform duration-500 text-slate-500 group-hover/reset:text-[#8C6D1F]" />
              </button>
            </div>

          </div>


          {/* Row 3: Expandable Advanced Filters Drawer */}
          {isFilterExpanded && (
            <div className="pt-4 border-t border-slate-200/80 bg-gradient-to-b from-slate-50/70 to-amber-50/20 rounded-2xl p-4 sm:p-5 border border-slate-200/60 shadow-inner grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
              
              {/* State */}
              <div>
                <label className="flex items-center space-x-1 text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  <MapPin className="w-3 h-3 text-[#DFB76C]" />
                  <span>State</span>
                </label>
                <select
                  value={filterState}
                  onChange={(e) => {
                    setFilterState(e.target.value);
                    setFilterDistrict('All Districts');
                  }}
                  className="w-full bg-white border border-slate-200 hover:border-[#DFB76C]/60 text-xs rounded-xl p-2.5 font-medium text-slate-800 focus:outline-hidden focus:border-[#D4AF37] focus:ring-2 focus:ring-[#DFB76C]/20 shadow-2xs cursor-pointer"
                >
                  <option value="All States">All States</option>
                  {STATES_AND_CITIES.map(s => (
                    <option key={s.state} value={s.state}>{s.state}</option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div>
                <label className="flex items-center space-x-1 text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  <Compass className="w-3 h-3 text-[#DFB76C]" />
                  <span>District</span>
                </label>
                <select
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}
                  disabled={districts.length === 0}
                  className="w-full bg-white border border-slate-200 hover:border-[#DFB76C]/60 text-xs rounded-xl p-2.5 font-medium text-slate-800 focus:outline-hidden focus:border-[#D4AF37] focus:ring-2 focus:ring-[#DFB76C]/20 disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  <option value="All Districts">{filterState === 'All States' ? 'Select State First' : 'All Districts'}</option>
                  {districts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Religion */}
              <div>
                <label className="flex items-center space-x-1 text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  <Sparkles className="w-3 h-3 text-[#DFB76C]" />
                  <span>Religion</span>
                </label>
                <select
                  value={filterReligion}
                  onChange={(e) => {
                    setFilterReligion(e.target.value);
                    onSelectReligion?.(e.target.value);
                  }}
                  className="w-full bg-white border border-slate-200 hover:border-[#DFB76C]/60 text-xs rounded-xl p-2.5 font-medium text-slate-800 focus:outline-hidden focus:border-[#D4AF37] focus:ring-2 focus:ring-[#DFB76C]/20 shadow-2xs cursor-pointer"
                >
                  <option value="All Religions">All Religions</option>
                  {RELIGIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="Buddhist & Parsi">Buddhist & Parsi</option>
                </select>
              </div>

              {/* Diet */}
              <div>
                <label className="flex items-center space-x-1 text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  <Utensils className="w-3 h-3 text-[#DFB76C]" />
                  <span>Diet</span>
                </label>
                <select
                  value={filterDiet}
                  onChange={(e) => setFilterDiet(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-[#DFB76C]/60 text-xs rounded-xl p-2.5 font-medium text-slate-800 focus:outline-hidden focus:border-[#D4AF37] focus:ring-2 focus:ring-[#DFB76C]/20 shadow-2xs cursor-pointer"
                >
                  <option value="All">All Diets</option>
                  <option value="Vegetarian">Pure Vegetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Eggetarian">Eggetarian</option>
                  <option value="Jain Vegetarian">Jain Vegetarian</option>
                </select>
              </div>

              {/* Age Range */}
              <div>
                <label className="flex items-center space-x-1 text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  <Calendar className="w-3 h-3 text-[#DFB76C]" />
                  <span>Age Range</span>
                </label>
                <div className="flex items-center space-x-1.5">
                  <select
                    value={filterMinAge}
                    onChange={(e) => setFilterMinAge(Number(e.target.value))}
                    className="w-1/2 bg-white border border-slate-200 text-xs rounded-xl p-2.5 font-medium text-slate-800 focus:outline-hidden focus:border-[#D4AF37] cursor-pointer"
                  >
                    {[21, 23, 25, 27, 29, 31, 33, 35].map(a => (
                      <option key={a} value={a}>{a} yrs</option>
                    ))}
                  </select>
                  <span className="text-slate-400 text-xs font-bold">-</span>
                  <select
                    value={filterMaxAge}
                    onChange={(e) => setFilterMaxAge(Number(e.target.value))}
                    className="w-1/2 bg-white border border-slate-200 text-xs rounded-xl p-2.5 font-medium text-slate-800 focus:outline-hidden focus:border-[#D4AF37] cursor-pointer"
                  >
                    {[25, 28, 30, 32, 35, 38, 42, 45].map(a => (
                      <option key={a} value={a}>{a} yrs</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Verified Only Pill */}
              <div className="flex flex-col justify-end">
                <label className={`w-full h-[42px] px-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold cursor-pointer transition-all shadow-2xs select-none ${
                  verifiedOnly
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 ring-2 ring-emerald-500/20'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-[#D4AF37] accent-emerald-600 cursor-pointer"
                  />
                  <ShieldCheck className={`w-4 h-4 ${verifiedOnly ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="truncate">Aadhaar Verified</span>
                </label>
              </div>

            </div>
          )}

          {/* Row 4: Active Filter Tags Ribbon */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Applied:</span>
              


              {filterReligion !== 'All Religions' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#0B192C] to-[#152E52] text-[#DFB76C] border border-[#D4AF37]/50 text-xs font-bold shadow-xs">
                  <span>🙏 {filterReligion === 'Buddhist & Parsi' ? 'Buddhist & Parsi' : filterReligion}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterReligion('All Religions');
                      onSelectReligion?.('All Religions');
                    }}
                    className="hover:text-white cursor-pointer ml-1 font-extrabold flex items-center"
                    title="Clear religion filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchTerm && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-900 border border-amber-300/60 text-xs font-bold shadow-2xs">
                  <Search className="w-3 h-3 text-[#8C6D1F]" />
                  <span>"{searchTerm}"</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      onClearExternalCity?.();
                    }}
                    className="hover:text-rose-600 cursor-pointer ml-1 font-bold flex items-center"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filterState !== 'All States' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300/70 text-xs font-semibold">
                  <MapPin className="w-3 h-3 text-slate-600" />
                  <span>State: {filterState}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterState('All States');
                      setFilterDistrict('All Districts');
                    }}
                    className="hover:text-rose-600 cursor-pointer ml-0.5 flex items-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filterDistrict !== 'All Districts' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300/70 text-xs font-semibold">
                  <span>District: {filterDistrict}</span>
                  <button
                    type="button"
                    onClick={() => setFilterDistrict('All Districts')}
                    className="hover:text-rose-600 cursor-pointer ml-0.5 flex items-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filterDiet !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300/70 text-xs font-semibold">
                  <Utensils className="w-3 h-3 text-slate-600" />
                  <span>{filterDiet}</span>
                  <button
                    type="button"
                    onClick={() => setFilterDiet('All')}
                    className="hover:text-rose-600 cursor-pointer ml-0.5 flex items-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {verifiedOnly && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300/70 text-xs font-semibold">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  <span>Aadhaar Verified</span>
                  <button
                    type="button"
                    onClick={() => setVerifiedOnly(false)}
                    className="hover:text-rose-600 cursor-pointer ml-0.5 flex items-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-[#8C6D1F] hover:text-[#0B192C] font-extrabold cursor-pointer ml-auto flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100/70 border border-amber-200 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}

        </div>

        {/* Matches Status Count Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 px-1 font-medium">
          <div className="inline-flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>
              Showing <strong className="text-[#0B192C] font-extrabold text-sm">{filteredProfiles.length}</strong> verified matching candidate profiles
            </span>
          </div>
          
          <div className="inline-flex items-center space-x-1.5 text-xs text-slate-500 bg-white/90 px-3.5 py-1.5 rounded-full border border-slate-200 shadow-2xs self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Protected by Photo Screenshot Privacy Shield</span>
          </div>
        </div>

        {/* Profile Cards Responsive Grid */}
        {filteredProfiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 min-[1800px]:grid-cols-5 gap-6">
            {filteredProfiles.map((profile) => {
              const isInterested = interestsSent.includes(profile.id);
              const isShortlisted = shortlisted.includes(profile.id);

              return (
                <article
                  key={profile.id}
                  onClick={() => onSelectProfile(profile)}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-md hover:shadow-2xl hover:border-[#D4AF37]/60 transition-all duration-300 flex flex-col group hover:-translate-y-2 relative cursor-pointer"
                >
                  
                  {/* Photo Container */}
                  <div className="relative h-72 sm:h-80 overflow-hidden bg-slate-100">
                    <img
                      src={profile.photo}
                      alt={profile.name}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B192C] via-[#0B192C]/25 to-transparent"></div>

                    {/* Top Badges: Match Score & Gunas */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                      <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] shadow-lg flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 fill-[#0B192C]" />
                        <span>{profile.matchScore}% Match</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-black/70 text-[#DFB76C] backdrop-blur-md border border-white/20 shadow-xs">
                        {profile.gunasMatch}
                      </span>
                    </div>

                    {/* Shortlist Heart Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleShortlist(profile.id);
                      }}
                      className={`absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-lg z-10 hover:scale-110 active:scale-95 ${
                        isShortlisted
                          ? 'bg-rose-600 text-white'
                          : 'bg-white/85 hover:bg-white text-slate-700 hover:text-rose-600'
                      }`}
                      title={isShortlisted ? 'Remove from shortlist' : 'Shortlist profile'}
                    >
                      <Heart className={`w-4 h-4 ${isShortlisted ? 'fill-current' : ''}`} />
                    </button>

                    {/* Verified & Aadhaar Badges over Photo Bottom */}
                    <div className="absolute bottom-3 left-3 right-3 text-white z-10">
                      <div className="flex items-center space-x-1.5 mb-1.5 flex-wrap gap-y-1">
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/85 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] flex items-center gap-1 shadow-xs backdrop-blur-xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> UIDAI Verified
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] shadow-xs backdrop-blur-xs flex items-center gap-1 ${
                          resolveProfileGender(profile) === 'female'
                            ? 'bg-rose-950/85 border border-rose-400/40 text-rose-200'
                            : 'bg-blue-950/85 border border-blue-400/40 text-blue-200'
                        }`}>
                          <span>{resolveProfileGender(profile) === 'female' ? '👰 Bride' : '🤵 Groom'}</span>
                        </span>
                        {profile.manglik && profile.manglik !== 'Not Manglik' && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-white font-bold text-[10px] shadow-xs">
                            {profile.manglik}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-serif font-bold text-white tracking-wide truncate group-hover:text-[#DFB76C] transition-colors drop-shadow-sm">
                        {profile.name}
                      </h3>
                      
                      <p className="text-xs text-slate-200 flex items-center gap-1 font-medium mt-0.5">
                        <span>{profile.age} Yrs, {profile.height}</span>
                        <span>•</span>
                        <MapPin className="w-3 h-3 text-[#DFB76C] shrink-0" />
                        <span className="truncate">{profile.district || profile.city}, {profile.state}</span>
                      </p>
                    </div>

                  </div>

                  {/* Card Body Specs */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-white">
                    
                    <div className="space-y-2 text-xs text-slate-600">
                      {/* Religion & Caste */}
                      <p className="flex items-center gap-1.5 text-slate-900 font-bold truncate">
                        <span className="w-2 h-2 rounded-full bg-[#D4AF37] shrink-0"></span>
                        <span>{profile.religion}</span>
                        <span className="text-slate-400">•</span>
                        <span className="truncate text-slate-700 font-semibold">{profile.caste}</span>
                      </p>

                      {/* Education */}
                      <p className="flex items-start gap-2 line-clamp-1 font-medium">
                        <GraduationCap className="w-3.5 h-3.5 text-[#B8860B] shrink-0 mt-0.5" />
                        <span className="truncate">{profile.education}</span>
                      </p>

                      {/* Profession & Company */}
                      <p className="flex items-start gap-2 line-clamp-1 font-medium">
                        <Briefcase className="w-3.5 h-3.5 text-[#B8860B] shrink-0 mt-0.5" />
                        <span className="truncate">{profile.profession}</span>
                      </p>

                      {/* Income */}
                      {profile.annualIncome && (
                        <p className="flex items-center gap-2 text-slate-800 font-semibold">
                          <IndianRupee className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{profile.annualIncome}</span>
                        </p>
                      )}

                      {/* Astrology Rashi & Nakshatra */}
                      {profile.astronomy && (
                        <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-200">
                            Rashi: {profile.astronomy.rashi?.split(' ')[0]}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-900 text-[10px] font-bold border border-sky-200">
                            Nakshatra: {profile.astronomy.nakshatra}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Row */}
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      
                      {/* Send Interest Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleInterest(profile.id);
                        }}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md active:scale-95 ${
                          isInterested
                            ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                            : 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] hover:brightness-105 btn-luxury-shimmer'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isInterested ? 'fill-rose-600' : ''}`} />
                        <span>{isInterested ? 'Interest Sent' : 'Connect'}</span>
                      </button>

                      {/* Chat Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartChat(profile.id);
                        }}
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-[#0B192C] hover:text-[#DFB76C] text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                        title="Open Matrimonial Chat"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>

                    </div>

                  </div>

                </article>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-[#8C6D1F] flex items-center justify-center mx-auto">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-serif font-bold text-slate-900">
              No matching profiles found
            </h3>
            <p className="text-xs text-slate-500">
              We couldn't find any profiles matching your search criteria. Try adjusting your age, location, or religion filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-5 py-2 rounded-xl bg-[#0B192C] text-[#DFB76C] text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
