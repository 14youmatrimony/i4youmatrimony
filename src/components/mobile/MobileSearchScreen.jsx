import React, { useState, useMemo } from 'react';
import { 
  Search, 
  RotateCcw, 
  MapPin, 
  Heart, 
  Send, 
  Check, 
  MessageCircle,
  CheckCircle2,
  SlidersHorizontal,
  Crown
} from 'lucide-react';
import { STATES_AND_CITIES, getDistrictsForState, calculateLocationMatch } from '../../data/locationData';
import { RELIGIONS } from '../RegistrationWizard';
import { usePhotoPrivacy } from '../../context/PhotoPrivacyContext';
import SearchableSelect from '../common/SearchableSelect';
import { sanitizeSearchTerm } from '../../utils/security';
import { getTargetCandidateGender, isCandidateMatchingTarget } from '../../utils/genderMatch';
import { isDemoProfile } from '../../services/api';

export default function MobileSearchScreen({
  profiles,
  currentUser,
  interestsSent,
  onToggleInterest,
  shortlisted,
  onToggleShortlist,
  onSelectProfile,
  onStartChat,
  onOpenFilter,
  activeFiltersCount = 0
}) {
  const { triggerScreenshotBlock, screenshotRestricted } = usePhotoPrivacy();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [selectedReligion, setSelectedReligion] = useState('All Religions');

  // Dynamic districts based on selected state
  const availableDistricts = useMemo(() => {
    return getDistrictsForState(selectedState);
  }, [selectedState]);

  const handleStateChange = (newState) => {
    setSelectedState(newState);
    setSelectedDistrict('All Districts'); // reset district when state changes
  };

  const targetCandidateGender = useMemo(() => {
    return getTargetCandidateGender(currentUser);
  }, [currentUser]);

  const filteredProfiles = useMemo(() => {
    const cleanSearch = sanitizeSearchTerm(searchTerm);
    return (profiles || [])
      .filter(p => !isDemoProfile(p))
      .filter(p => {
        // 0. Exclude own profile
        if (currentUser?.id && p.id === currentUser.id) return false;
      if (currentUser?.mobile && (p.mobile === currentUser.mobile || p.phone === currentUser.mobile)) return false;

      // 0.1 Strict Opposite Gender Matchmaking Rule
      if (!isCandidateMatchingTarget(p.gender, targetCandidateGender)) return false;

      if (cleanSearch) {
        const q = cleanSearch.toLowerCase();
        const cleanQuery = q.replace(/[\s\+\-]/g, '');
        const phoneMatch = p.phone && p.phone.replace(/[\s\+\-]/g, '').includes(cleanQuery);
        const mobileMatch = p.mobile && p.mobile.replace(/[\s\+\-]/g, '').includes(cleanQuery);
        const hit = p.name.toLowerCase().includes(q) || 
                    p.city.toLowerCase().includes(q) || 
                    (p.district && p.district.toLowerCase().includes(q)) ||
                    p.profession.toLowerCase().includes(q) || 
                    p.caste.toLowerCase().includes(q) ||
                    phoneMatch ||
                    mobileMatch;
        if (!hit) return false;
      }
      if (selectedState !== 'All States' && p.state !== selectedState) return false;
      if (selectedDistrict !== 'All Districts' && p.district !== selectedDistrict) return false;
      if (selectedReligion !== 'All Religions' && p.religion !== selectedReligion) return false;

      return true;
    });
  }, [profiles, currentUser, searchTerm, selectedState, selectedDistrict, selectedReligion]);

  const handleReset = () => {
    setSearchTerm('');
    setSelectedState('All States');
    setSelectedDistrict('All Districts');
    setSelectedReligion('All Religions');
  };

  return (
    <div className="p-3 space-y-3 pb-6">
      
      {/* Mobile Search Bar + Filter Button */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-2.5">
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search mobile number, name, district, caste..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none"
            />
          </div>

          {onOpenFilter && (
            <button
              type="button"
              onClick={onOpenFilter}
              className={`h-[35px] px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-2xs ${
                activeFiltersCount > 0
                  ? 'border-[#D4AF37] bg-amber-50/90 text-[#8C6D1F]'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-[#D4AF37]/40'
              }`}
              title="Filter Matches"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8C6D1F]" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="min-w-4 h-4 px-1 bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-extrabold text-[9px] rounded-full flex items-center justify-center shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          )}
        </div>


        {/* Filter Controls - State, District, Religion (1 Row, 3 Columns, 100% Screen-Fit) */}
        <div className="grid grid-cols-3 gap-1.5 w-full text-xs">
          
          {/* State Searchable Select */}
          <SearchableSelect
            title="Select State"
            displayLabel={selectedState !== 'All States' ? selectedState : 'State'}
            value={selectedState}
            onChange={(val) => handleStateChange(val)}
            options={['All States', ...STATES_AND_CITIES.map(s => s.state)]}
            searchPlaceholder="Search state..."
            buttonClassName={`h-9 px-2 rounded-xl border text-[11px] font-semibold ${
              selectedState !== 'All States'
                ? 'border-[#D4AF37] bg-amber-50/90 text-[#8C6D1F] shadow-2xs font-bold'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          />

          {/* District Searchable Select (Dynamic) */}
          <SearchableSelect
            title="Select District"
            displayLabel={selectedDistrict !== 'All Districts' ? selectedDistrict : 'District'}
            value={selectedDistrict}
            onChange={(val) => setSelectedDistrict(val)}
            options={['All Districts', ...availableDistricts]}
            searchPlaceholder="Search district..."
            buttonClassName={`h-9 px-2 rounded-xl border text-[11px] font-semibold ${
              selectedDistrict !== 'All Districts'
                ? 'border-[#D4AF37] bg-amber-50/90 text-[#8C6D1F] shadow-2xs font-bold'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          />

          {/* Religion Searchable Select */}
          <SearchableSelect
            title="Select Religion"
            displayLabel={selectedReligion !== 'All Religions' ? selectedReligion : 'Religion'}
            value={selectedReligion}
            onChange={(val) => setSelectedReligion(val)}
            options={['All Religions', ...RELIGIONS]}
            searchPlaceholder="Search religion..."
            buttonClassName={`h-9 px-2 rounded-xl border text-[11px] font-semibold ${
              selectedReligion !== 'All Religions'
                ? 'border-[#D4AF37] bg-amber-50/90 text-[#8C6D1F] shadow-2xs font-bold'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          />
        </div>


      </div>

      {/* Result Count & Location Indicator */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-800">
            Matches Found ({filteredProfiles.length})
          </span>
          {(selectedState !== 'All States' || selectedDistrict !== 'All Districts' || selectedReligion !== 'All Religions' || searchTerm) && (
            <button 
              type="button"
              onClick={handleReset}
              className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
        <span className="text-[11px] text-[#8C6D1F] font-semibold">
          {selectedDistrict !== 'All Districts'
            ? `📍 ${selectedDistrict} Dist.`
            : selectedState !== 'All States'
            ? `📍 ${selectedState} Only`
            : 'Pan-India Database'}
        </span>
      </div>

      {/* Profile Mini Cards for Search */}
      <div className="space-y-3">
        {filteredProfiles.map(profile => {
          const isInterested = interestsSent.includes(profile.id);
          const isShortlisted = shortlisted.includes(profile.id);
          const locMatch = calculateLocationMatch(currentUser, profile);

          return (
            <div 
              key={profile.id}
              className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm flex items-center space-x-3"
            >
              <div 
                className="relative w-20 h-24 shrink-0 rounded-xl overflow-hidden cursor-pointer bg-slate-100 select-none photo-protected group"
                onClick={() => onSelectProfile(profile)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (screenshotRestricted) triggerScreenshotBlock('right-click');
                }}
              >
                <img 
                  src={profile.photo} 
                  alt={profile.name}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className="w-full h-full object-cover select-none pointer-events-none" 
                />
                <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded-full text-[8px] font-bold bg-[#D4AF37] text-[#0B192C]">
                  {profile.matchScore}%
                </span>
              </div>

              <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 min-w-0">
                      <h4 
                        onClick={() => onSelectProfile(profile)}
                        className="font-serif font-bold text-sm text-slate-900 truncate cursor-pointer hover:underline"
                      >
                        {profile.name}
                      </h4>
                      {profile.aadhaarVerified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" title="Aadhaar Verified" />
                      )}
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${locMatch.badgeClass}`}>
                      {locMatch.shortLabel}
                    </span>
                  </div>

                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[11px] text-slate-500">
                    {profile.age} yrs • {profile.height}
                  </p>
                  {Boolean(profile.isPaid || (profile.membership && profile.membership !== 'free')) ? (
                    <span className="text-[8px] px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80 font-black flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5 text-[#D4AF37] fill-current" />
                      <span>Paid</span>
                    </span>
                  ) : (
                    <span className="text-[8px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-medium">
                      Free
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#DFB76C] shrink-0" />
                  <span><strong className="text-slate-800">{profile.district || profile.city}</strong>{profile.state ? `, ${profile.state}` : ''}</span>
                </p>

                <p className="text-[11px] text-slate-700 truncate font-semibold mt-0.5">
                  {profile.profession}
                </p>

                {/* Micro Actions */}
                <div className="flex items-center space-x-2 mt-2 pt-1.5 border-t border-slate-100">
                  <button
                    onClick={() => onToggleInterest(profile.id)}
                    className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1 cursor-pointer ${
                      isInterested 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-[#D4AF37] text-[#0B192C]'
                    }`}
                  >
                    {isInterested ? <Check className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                    <span>{isInterested ? 'Sent' : 'Connect'}</span>
                  </button>

                  <button
                    onClick={() => onToggleShortlist(profile.id)}
                    className="p-1 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
                    title="Shortlist"
                  >
                    <Heart className={`w-3.5 h-3.5 ${isShortlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>

                  <button
                    onClick={() => onStartChat(profile.id)}
                    className="p-1 rounded-lg border border-slate-200 text-[#1E3A8A] cursor-pointer"
                    title="Chat"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
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
