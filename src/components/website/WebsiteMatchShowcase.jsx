import React, { useState, useMemo, useEffect } from 'react';
import { 
  Heart, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  ShieldCheck, 
  Sparkles, 
  SlidersHorizontal, 
  MessageCircle, 
  Search, 
  IndianRupee, 
  RotateCcw, 
  Compass,
  X,
  Utensils,
  ChevronDown,
  ChevronUp,
  Calendar,
  Ruler
} from 'lucide-react';
import { STATES_AND_CITIES, getDistrictsForState } from '../../data/locationData';
import { RELIGIONS } from '../RegistrationWizard';
import { sanitizeSearchTerm } from '../../utils/security';
import { 
  getTargetCandidateGender, 
  isCandidateMatchingTarget, 
  isSelfProfile 
} from '../../utils/genderMatch';
import { isDemoProfile, isPlaceholderOrIncompleteProfile } from '../../services/api';

export function parseHeightInches(hStr) {
  if (!hStr) return null;
  const match = String(hStr).match(/(\d+)\s*['’′ft\.]+\s*(\d+)?/i);
  if (match) {
    const feet = parseInt(match[1], 10);
    const inches = match[2] ? parseInt(match[2], 10) : 0;
    return feet * 12 + inches;
  }
  const cmMatch = String(hStr).match(/(\d+)\s*cm/i);
  if (cmMatch) {
    return Math.round(parseInt(cmMatch[1], 10) / 2.54);
  }
  return null;
}

export const HEIGHT_FILTER_OPTIONS = [
  { value: 'All', label: 'All Heights' },
  { value: "4'10\"+", label: "4'10\" (147 cm) & above" },
  { value: "5'0\"+", label: "5'0\" (152 cm) & above" },
  { value: "5'2\"+", label: "5'2\" (157 cm) & above" },
  { value: "5'3\"+", label: "5'3\" (160 cm) & above" },
  { value: "5'4\"+", label: "5'4\" (163 cm) & above" },
  { value: "5'5\"+", label: "5'5\" (165 cm) & above" },
  { value: "5'6\"+", label: "5'6\" (168 cm) & above" },
  { value: "5'7\"+", label: "5'7\" (170 cm) & above" },
  { value: "5'8\"+", label: "5'8\" (173 cm) & above" },
  { value: "5'9\"+", label: "5'9\" (175 cm) & above" },
  { value: "5'10\"+", label: "5'10\" (178 cm) & above" },
  { value: "5'11\"+", label: "5'11\" (180 cm) & above" },
  { value: "6'0\"+", label: "6'0\" (183 cm) & above" },
  { value: "6'2\"+", label: "6'2\" (188 cm) & above" },
  { value: "Under 5'0\"", label: "Under 5'0\" (Petite)" },
  { value: "4'8\" to 5'2\"", label: "4'8\" to 5'2\" (142 - 157 cm)" },
  { value: "5'0\" to 5'5\"", label: "5'0\" to 5'5\" (152 - 165 cm)" },
  { value: "5'3\" to 5'8\"", label: "5'3\" to 5'8\" (160 - 173 cm)" },
  { value: "5'5\" to 5'11\"", label: "5'5\" to 5'11\" (165 - 180 cm)" },
  { value: "5'7\" to 6'2\"", label: "5'7\" to 6'2\" (170 - 188 cm)" },
  { value: "5'10\" to 6'5\"", label: "5'10\" to 6'5\" (178 - 195 cm)" },
  { value: "6'0\" to 6'11\"", label: "6'0\" to 6'11\" (183 - 210 cm)" },
  { value: "6'5\"+", label: "6'5\"+ (195 cm and above)" }
];

export default function WebsiteMatchShowcase({
  profiles,
  interestsSent,
  onToggleInterest,
  onRequestSendInterest,
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
  const [filterHeight, setFilterHeight] = useState('All');
  const [filterMinAge, setFilterMinAge] = useState(18);
  const [filterMaxAge, setFilterMaxAge] = useState(45);
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
    if (filterHeight !== 'All') count++;
    if (verifiedOnly) count++;
    if (filterMinAge !== 18 || filterMaxAge !== 45) count++;
    return count;
  }, [searchTerm, filterState, filterDistrict, filterReligion, filterDiet, filterHeight, verifiedOnly, filterMinAge, filterMaxAge]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterState('All States');
    setFilterDistrict('All Districts');
    setFilterReligion('All Religions');
    onSelectReligion?.('All Religions');
    onClearExternalCity?.();
    setFilterDiet('All');
    setFilterHeight('All');
    setFilterMinAge(18);
    setFilterMaxAge(45);
    setVerifiedOnly(false);
  };

  // Filter computation
  const filteredProfiles = useMemo(() => {
    const isUserLoggedIn = Boolean(currentUser && currentUser.gender);
    const targetGender = isUserLoggedIn ? getTargetCandidateGender(currentUser) : null;

    return (profiles || [])
      .filter((p) => !isDemoProfile(p) && !isPlaceholderOrIncompleteProfile(p))
      .filter((p) => {
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
        const matchesEducation = (p.education || '').toLowerCase().includes(cleanTerm);
        if (!matchesName && !matchesCity && !matchesDistrict && !matchesProfession && !matchesEducation) {
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

      // 5. Height Selection Filter
      if (filterHeight && filterHeight !== 'All') {
        const pInches = parseHeightInches(p.height);
        if (pInches) {
          if (filterHeight.toLowerCase().startsWith('under')) {
            const matches = [...filterHeight.matchAll(/(\d+)'(\d+)/g)];
            if (matches.length > 0) {
              const maxH = parseInt(matches[0][1], 10) * 12 + parseInt(matches[0][2], 10);
              if (pInches >= maxH) return false;
            }
          } else {
            const matches = [...filterHeight.matchAll(/(\d+)'(\d+)/g)];
            if (matches.length >= 2) {
              const minH = parseInt(matches[0][1], 10) * 12 + parseInt(matches[0][2], 10);
              const maxH = parseInt(matches[1][1], 10) * 12 + parseInt(matches[1][2], 10);
              if (pInches < minH || pInches > maxH) return false;
            } else if (matches.length === 1) {
              const minH = parseInt(matches[0][1], 10) * 12 + parseInt(matches[0][2], 10);
              if (pInches < minH) return false;
            }
          }
        } else {
          return false;
        }
      }

      // 6. Age (Only filter if candidate's age is a valid positive number)
      const candAge = Number(p.age);
      if (!isNaN(candAge) && candAge > 0) {
        if (candAge < filterMinAge || candAge > filterMaxAge) return false;
      }

      // 7. Verified Only
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
    filterHeight,
    filterMinAge,
    filterMaxAge,
    verifiedOnly
  ]);

  return (
    <section id="matches-section" className="pt-1 pb-3 md:pt-2 md:pb-4 bg-[#FFF9F6] text-[#5A4649]">
      <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 space-y-3">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mt-0 mb-1">
          <h2 className="text-2xl sm:text-4xl font-serif font-extrabold text-[#2C1A1D] tracking-tight">
            Handpicked Matches for You
          </h2>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="relative bg-white rounded-3xl p-4 sm:p-6 shadow-md shadow-[#7A2E43]/05 border border-[#E5D0C6] transition-all space-y-4 overflow-hidden">
          
          {/* Subtle Rose Gold Top Accent */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#C58B76] to-transparent opacity-90" />
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-gradient-to-br from-[#E6B8A2]/15 via-[#C58B76]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Search Input & Action Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 relative z-10">
            
            {/* Quick Keyword Search Input */}
            <div className="relative flex-1 group/search">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-[#FDECE4] border border-[#E5D0C6] flex items-center justify-center text-[#7A2E43] group-focus-within/search:bg-[#7A2E43] group-focus-within/search:text-white group-focus-within/search:border-[#7A2E43] transition-all">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search candidate name, hometown, profession, or education..."
                className="w-full pl-13 pr-24 py-3 rounded-2xl bg-[#FFF9F6] hover:bg-white focus:bg-white text-xs sm:text-sm font-medium text-[#2C1A1D] placeholder:text-[#8E797C] border border-[#E5D0C6] hover:border-[#C58B76] focus:outline-hidden focus:border-[#C58B76] focus:ring-4 focus:ring-[#C58B76]/15 transition-all shadow-inner"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#FDECE4] hover:bg-[#f7ddd4] text-xs font-bold text-[#7A2E43] cursor-pointer transition-colors flex items-center space-x-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Clear</span>
                </button>
              ) : (
                <div className="hidden md:flex items-center space-x-1 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[11px] font-semibold text-[#8E797C] bg-white px-2 py-0.5 rounded-lg border border-[#E5D0C6] shadow-2xs">
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
                    ? 'bg-[#7A2E43] text-white border-[#7A2E43] shadow-md shadow-[#7A2E43]/20 ring-2 ring-[#C58B76]/30'
                    : 'bg-white hover:bg-[#FDF2EE] text-[#5A4649] hover:text-[#7A2E43] border-[#E5D0C6] hover:border-[#7A2E43] hover:shadow-xs'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-[#C58B76]" />
                <span>{isFilterExpanded ? 'Hide Filters' : 'More Filters'}</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#C58B76] text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
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
                className="p-3 rounded-2xl border border-[#E5D0C6] text-[#8E797C] hover:text-[#7A2E43] bg-[#FFF9F6] hover:bg-[#FDF2EE] hover:border-[#7A2E43] shadow-2xs hover:shadow-xs transition-all group/reset cursor-pointer active:scale-90"
                title="Reset All Filters"
              >
                <RotateCcw className="w-4 h-4 group-hover/reset:-rotate-180 transition-transform duration-500 text-[#8E797C] group-hover/reset:text-[#7A2E43]" />
              </button>
            </div>

          </div>


          {/* Row 3: Expandable Advanced Filters Drawer */}
          {isFilterExpanded && (
            <div className="pt-4 border-t border-[#E5D0C6] bg-[#FFFBF9] rounded-2xl p-4 sm:p-5 border border-[#E5D0C6] shadow-inner grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
              
              {/* State */}
              <div>
                <label className="flex items-center space-x-1 text-[11px] font-bold text-[#5A4649] uppercase mb-1.5">
                  <MapPin className="w-3 h-3 text-[#C58B76]" />
                  <span>State</span>
                </label>
                <select
                  value={filterState}
                  onChange={(e) => {
                    setFilterState(e.target.value);
                    setFilterDistrict('All Districts');
                  }}
                  className="w-full bg-white border border-[#E5D0C6] hover:border-[#C58B76] text-xs rounded-xl p-2.5 font-medium text-[#2C1A1D] focus:outline-hidden focus:border-[#C58B76] focus:ring-2 focus:ring-[#C58B76]/20 shadow-2xs cursor-pointer"
                >
                  <option value="All States">All States</option>
                  {STATES_AND_CITIES.map(s => (
                    <option key={s.state} value={s.state}>{s.state}</option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div>
                <label className="flex items-center space-x-1 text-[11px] font-bold text-[#5A4649] uppercase mb-1.5">
                  <Compass className="w-3 h-3 text-[#C58B76]" />
                  <span>District</span>
                </label>
                <select
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}
                  disabled={districts.length === 0}
                  className="w-full bg-white border border-[#E5D0C6] hover:border-[#C58B76] text-xs rounded-xl p-2.5 font-medium text-[#2C1A1D] focus:outline-hidden focus:border-[#C58B76] focus:ring-2 focus:ring-[#C58B76]/20 disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  <option value="All Districts">{filterState === 'All States' ? 'Select State First' : 'All Districts'}</option>
                  {districts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Religion */}
              <div>
                <label className="flex items-center space-x-1 text-[11px] font-bold text-[#5A4649] uppercase mb-1.5">
                  <Sparkles className="w-3 h-3 text-[#C58B76]" />
                  <span>Religion</span>
                </label>
                <select
                  value={filterReligion}
                  onChange={(e) => {
                    setFilterReligion(e.target.value);
                    onSelectReligion?.(e.target.value);
                  }}
                  className="w-full bg-white border border-[#E5D0C6] hover:border-[#C58B76] text-xs rounded-xl p-2.5 font-medium text-[#2C1A1D] focus:outline-hidden focus:border-[#C58B76] focus:ring-2 focus:ring-[#C58B76]/20 shadow-2xs cursor-pointer"
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
                <label className="flex items-center space-x-1 text-[11px] font-bold text-[#5A4649] uppercase mb-1.5">
                  <Utensils className="w-3 h-3 text-[#C58B76]" />
                  <span>Diet</span>
                </label>
                <select
                  value={filterDiet}
                  onChange={(e) => setFilterDiet(e.target.value)}
                  className="w-full bg-white border border-[#E5D0C6] hover:border-[#C58B76] text-xs rounded-xl p-2.5 font-medium text-[#2C1A1D] focus:outline-hidden focus:border-[#C58B76] focus:ring-2 focus:ring-[#C58B76]/20 shadow-2xs cursor-pointer"
                >
                  <option value="All">All Diets</option>
                  <option value="Vegetarian">Pure Vegetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Eggetarian">Eggetarian</option>
                  <option value="Jain Vegetarian">Jain Vegetarian</option>
                </select>
              </div>

              {/* Height Selection */}
              <div>
                <label className="flex items-center space-x-1 text-[11px] font-bold text-[#5A4649] uppercase mb-1.5">
                  <Ruler className="w-3 h-3 text-[#C58B76]" />
                  <span>Height</span>
                </label>
                <select
                  value={filterHeight}
                  onChange={(e) => setFilterHeight(e.target.value)}
                  className="w-full bg-white border border-[#E5D0C6] hover:border-[#C58B76] text-xs rounded-xl p-2.5 font-medium text-[#2C1A1D] focus:outline-hidden focus:border-[#C58B76] focus:ring-2 focus:ring-[#C58B76]/20 shadow-2xs cursor-pointer"
                >
                  {HEIGHT_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Age Range */}
              <div>
                <label className="flex items-center space-x-1 text-[11px] font-bold text-[#5A4649] uppercase mb-1.5">
                  <Calendar className="w-3 h-3 text-[#C58B76]" />
                  <span>Age Range</span>
                </label>
                <div className="flex items-center space-x-1.5">
                  <select
                    value={filterMinAge}
                    onChange={(e) => setFilterMinAge(Number(e.target.value))}
                    className="w-1/2 bg-white border border-[#E5D0C6] text-xs rounded-xl p-2.5 font-medium text-[#2C1A1D] focus:outline-hidden focus:border-[#C58B76] cursor-pointer"
                  >
                    {[21, 23, 25, 27, 29, 31, 33, 35].map(a => (
                      <option key={a} value={a}>{a} yrs</option>
                    ))}
                  </select>
                  <span className="text-slate-400 text-xs font-bold">-</span>
                  <select
                    value={filterMaxAge}
                    onChange={(e) => setFilterMaxAge(Number(e.target.value))}
                    className="w-1/2 bg-white border border-[#E5D0C6] text-xs rounded-xl p-2.5 font-medium text-[#2C1A1D] focus:outline-hidden focus:border-[#C58B76] cursor-pointer"
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
                    : 'bg-white hover:bg-[#FDF2EE] text-[#5A4649] border-[#E5D0C6]'
                }`}>
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-[#7A2E43] accent-emerald-600 cursor-pointer"
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7A2E43] text-white border border-[#C58B76]/50 text-xs font-bold shadow-xs">
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
                  <Search className="w-3 h-3 text-[#7A2E43]" />
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

              {filterHeight !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300/70 text-xs font-semibold">
                  <Ruler className="w-3 h-3 text-slate-600" />
                  <span>Height: {filterHeight}</span>
                  <button
                    type="button"
                    onClick={() => setFilterHeight('All')}
                    className="hover:text-rose-600 cursor-pointer ml-0.5 flex items-center"
                    title="Clear height filter"
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
                className="text-xs text-[#7A2E43] hover:text-[#612234] font-extrabold cursor-pointer ml-auto flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100/70 border border-amber-200 transition-colors"
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
              Showing <strong className="text-[#2C1A1D] font-extrabold text-sm">{filteredProfiles.length}</strong> verified matching candidate profiles
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
              if (!profile || isPlaceholderOrIncompleteProfile(profile)) return null;
              const isInterested = interestsSent.includes(profile.id);
              const isShortlisted = shortlisted.includes(profile.id);

              return (
                <article
                  key={profile.id}
                  onClick={() => onSelectProfile(profile)}
                  className="bg-white rounded-3xl overflow-hidden border border-[#E5D0C6] shadow-sm hover:shadow-xl hover:border-[#C58B76] transition-all duration-300 flex flex-col group hover:-translate-y-2 relative cursor-pointer"
                >
                  
                  {/* Photo Container */}
                  <div className="relative h-72 sm:h-80 overflow-hidden bg-slate-100">
                    <img
                      src={profile.photo}
                      alt={profile.name}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2C1A1D] via-[#2C1A1D]/25 to-transparent"></div>

                    {/* Top Badge: Match Score */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#7A2E43] text-white shadow-md flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 fill-white text-white" />
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
                      </div>

                      <h3 className="text-xl font-serif font-bold text-white tracking-wide truncate group-hover:text-[#E6B8A2] transition-colors drop-shadow-sm">
                        {profile.name}
                      </h3>
                      
                      <p className="text-xs text-slate-200 flex items-center gap-1 font-medium mt-0.5">
                        <span>{profile.age} Yrs, {profile.height}</span>
                        <span>•</span>
                        <MapPin className="w-3 h-3 text-[#E6B8A2] shrink-0" />
                        <span className="truncate">{profile.district || profile.city}, {profile.state}</span>
                      </p>
                    </div>

                  </div>

                  {/* Card Body Specs */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-white">
                    
                    <div className="space-y-2 text-xs text-[#5A4649]">
                      {/* Religion */}
                      <p className="flex items-center gap-1.5 text-[#2C1A1D] font-bold truncate">
                        <span className="w-2 h-2 rounded-full bg-[#C58B76] shrink-0"></span>
                        <span>{profile.religion}</span>
                      </p>

                      {/* Education */}
                      <p className="flex items-start gap-2 line-clamp-1 font-medium">
                        <GraduationCap className="w-3.5 h-3.5 text-[#C58B76] shrink-0 mt-0.5" />
                        <span className="truncate">{profile.education}</span>
                      </p>

                      {/* Profession & Company */}
                      <p className="flex items-start gap-2 line-clamp-1 font-medium">
                        <Briefcase className="w-3.5 h-3.5 text-[#C58B76] shrink-0 mt-0.5" />
                        <span className="truncate">{profile.profession}</span>
                      </p>

                      {/* Income */}
                      {profile.annualIncome && (
                        <p className="flex items-center gap-2 text-[#2C1A1D] font-semibold">
                          <IndianRupee className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{profile.annualIncome}</span>
                        </p>
                      )}

                      {/* Astrology Rashi & Nakshatra */}
                      {profile.astronomy && (
                        <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-[#FFF9F6] text-[#7A2E43] text-[10px] font-bold border border-[#E5D0C6]">
                            Rashi: {profile.astronomy.rashi?.split(' ')[0]}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#FDECE4] text-[#5A4649] text-[10px] font-bold border border-[#E5D0C6]">
                            Nakshatra: {profile.astronomy.nakshatra}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Row */}
                    <div className="pt-3 border-t border-[#E5D0C6] flex items-center gap-2">
                      
                      {/* Send Interest Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isInterested) {
                            onToggleInterest(profile.id);
                          } else if (onRequestSendInterest) {
                            onRequestSendInterest(profile);
                          } else {
                            onToggleInterest(profile.id);
                          }
                        }}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm active:scale-95 ${
                          isInterested
                            ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                            : 'bg-[#7A2E43] hover:bg-[#612234] text-white shadow-md shadow-[#7A2E43]/20'
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
                        className="p-2.5 rounded-xl bg-[#FFF9F6] hover:bg-[#7A2E43] hover:text-white text-[#5A4649] border border-[#E5D0C6] transition-colors cursor-pointer"
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
          <div className="bg-white rounded-3xl p-10 text-center border border-[#E5D0C6] max-w-md mx-auto space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#FDECE4] text-[#7A2E43] flex items-center justify-center mx-auto">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-serif font-bold text-[#2C1A1D]">
              No matching profiles found
            </h3>
            <p className="text-xs text-[#5A4649]">
              We couldn't find any profiles matching your search criteria. Try adjusting your age, location, or religion filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-5 py-2 rounded-xl bg-[#7A2E43] hover:bg-[#612234] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Reset All Filters
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
