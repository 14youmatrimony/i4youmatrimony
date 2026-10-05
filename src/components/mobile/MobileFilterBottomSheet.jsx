import React, { useMemo } from 'react';
import { 
  X, 
  RotateCcw, 
  Filter, 
  MapPin, 
  ShieldCheck, 
  GraduationCap, 
  Briefcase, 
  Sparkles,
  Heart,
  Calendar,
  DollarSign,
  UserCheck,
  Camera,
  Users,
  Laptop,
  Wine,
  Cigarette,
  Crown
} from 'lucide-react';
import { STATES_AND_CITIES, getDistrictsForState } from '../../data/locationData';
import { RELIGION_COMMUNITIES } from '../../data/religionData';
import { RELIGIONS, MOTHER_TONGUES, EDUCATION_CATEGORIES } from '../RegistrationWizard';
import SearchableSelect from '../common/SearchableSelect';
import DualRangeSlider from '../common/DualRangeSlider';

export const PROFESSION_OPTIONS = [
  'All Professions',
  'Doctor / Healthcare',
  'Software / IT / Tech',
  'Corporate / Management',
  'CA / Finance / Banking',
  'Advocate / Legal',
  'Civil Services / Govt',
  'Business / Entrepreneur',
  'Defence / Armed Forces',
  'Teaching / Academic',
  'Architect / Designer'
];

export const INCOME_FILTER_OPTIONS = [
  'All Incomes',
  '₹ 10+ LPA',
  '₹ 20+ LPA',
  '₹ 30+ LPA',
  '₹ 50+ LPA',
  '₹ 75+ LPA',
  '₹ 1 Crore+'
];

export const WORK_MODE_OPTIONS = [
  { id: 'All', label: 'All Modes' },
  { id: 'Hybrid / Remote', label: 'Hybrid / Remote' },
  { id: 'On-site / Office', label: 'On-site / Office' }
];

export const FAMILY_TYPE_OPTIONS = [
  'All Family Types',
  'Nuclear Family',
  'Joint Family'
];

export const FAMILY_STATUS_OPTIONS = [
  'All Financial Statuses',
  'Middle Class',
  'Upper Middle Class',
  'Rich / Affluent'
];

export const PREFERRED_HEIGHT_OPTIONS = [
  'Any Height (No Preference)',
  '4\'3" to 4\'10" (130 - 147 cm)',
  '4\'8" to 5\'2" (142 - 157 cm)',
  '5\'0" to 5\'5" (152 - 165 cm)',
  '5\'3" to 5\'8" (160 - 173 cm)',
  '5\'5" to 5\'11" (165 - 180 cm)',
  '5\'7" to 6\'2" (170 - 188 cm)',
  '5\'10" to 6\'5" (178 - 195 cm)',
  '6\'0" to 6\'11" (183 - 210 cm)',
  '6\'5"+ (195 cm and above)'
];

export const MARITAL_STATUS_REQUIREMENTS = [
  { id: 'All', label: 'All Statuses' },
  { id: 'Never Married', label: 'Never Married Only' },
  { id: 'Divorced', label: 'Divorced / Widowed OK' },
  { id: 'Awaiting Divorce', label: 'Awaiting Divorce Considered' }
];

export const DIET_OPTIONS = [
  { id: 'All', label: 'All' },
  { id: 'Vegetarian', label: 'Vegetarian' },
  { id: 'Pure Vegetarian', label: 'Pure Veg' },
  { id: 'Eggetarian', label: 'Eggetarian' },
  { id: 'Non-Vegetarian', label: 'Non-Veg' },
  { id: 'Strict Jain', label: 'Jain' }
];

export const DRINKING_OPTIONS = [
  { id: 'All', label: 'All' },
  { id: 'Never Drinks', label: 'Never Drinks (Teetotaler)' },
  { id: 'Social / Occasional OK', label: 'Socially / Occasional OK' }
];

export const SMOKING_OPTIONS = [
  { id: 'All', label: 'All' },
  { id: 'Non-Smoker Only', label: 'Non-Smoker Only' }
];

export const MARITAL_STATUS_OPTIONS = [
  { id: 'All', label: 'All' },
  { id: 'Never Married', label: 'Never Married' },
  { id: 'Divorced', label: 'Divorced' },
  { id: 'Widowed', label: 'Widowed' }
];

export default function MobileFilterBottomSheet({
  isOpen,
  onClose,
  selectedState,
  setSelectedState,
  selectedDistrict,
  setSelectedDistrict,
  selectedReligion,
  setSelectedReligion,
  selectedCaste,
  setSelectedCaste,
  minAge,
  setMinAge,
  maxAge,
  setMaxAge,
  minHeight,
  setMinHeight,
  selectedMaritalStatus,
  setSelectedMaritalStatus,
  selectedEducation,
  setSelectedEducation,
  selectedProfession,
  setSelectedProfession,
  minIncome,
  setMinIncome,
  selectedWorkMode,
  setSelectedWorkMode,
  selectedFamilyType,
  setSelectedFamilyType,
  selectedFamilyStatus,
  setSelectedFamilyStatus,
  selectedDiet,
  setSelectedDiet,
  selectedDrinking,
  setSelectedDrinking,
  selectedSmoking,
  setSelectedSmoking,
  verifiedOnly,
  setVerifiedOnly,
  photoOnly,
  setPhotoOnly,
  membershipFilter = 'All',
  setMembershipFilter,
  phoneOnly = false,
  setPhoneOnly,
  mobileSearchNumber = '',
  setMobileSearchNumber,
  onReset,
  totalMatching,
  activeFiltersCount = 0,
  currentUser
}) {
  const districts = useMemo(() => {
    return getDistrictsForState(selectedState);
  }, [selectedState]);

  const availableCastes = useMemo(() => {
    if (selectedReligion && selectedReligion !== 'All Religions' && RELIGION_COMMUNITIES[selectedReligion]) {
      return RELIGION_COMMUNITIES[selectedReligion];
    }
    const allCastes = Array.from(new Set(Object.values(RELIGION_COMMUNITIES).flat()));
    return allCastes.sort();
  }, [selectedReligion]);

  if (!isOpen) return null;

  const handleStateChange = (newState) => {
    setSelectedState(newState);
    if (setSelectedDistrict) {
      setSelectedDistrict('All Districts');
    }
  };

  const handleReligionChange = (newReligion) => {
    if (setSelectedReligion) setSelectedReligion(newReligion);
    if (setSelectedCaste) setSelectedCaste('All Castes & Communities');
  };

  return (
    <div 
      className="absolute inset-0 z-50 bg-white flex flex-col h-full w-full overflow-hidden animate-in slide-in-from-bottom-3 duration-200"
    >
      {/* Top Mobile Full-Screen App Bar */}
      <header className="bg-[#0B192C] text-white px-3.5 py-3 flex items-center justify-between border-b border-[#D4AF37]/40 shadow-md shrink-0 z-20">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#DFB76C] text-[#0B192C] flex items-center justify-center shadow-xs shrink-0">
            <Filter className="w-4 h-4 fill-[#0B192C]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="font-serif font-bold text-sm sm:text-base text-white tracking-wide truncate">
                Match Filters
              </h2>
              {activeFiltersCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-[#D4AF37] text-[#0B192C] shadow-xs">
                  {activeFiltersCount} Active
                </span>
              )}
            </div>
            <p className="text-[10.5px] text-slate-300 truncate">
              {currentUser?.gender 
                ? `Showing ${currentUser.gender.toLowerCase() === 'male' ? 'Brides (Female)' : 'Grooms (Male)'} only` 
                : 'Refine candidates by preferences'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {activeFiltersCount > 0 && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[#DFB76C] border border-[#DFB76C]/30 flex items-center gap-1 transition-all cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Form Body Controls */}
      <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs bg-slate-50/40">

          {/* 1. TRUST, MEMBERSHIP & PHOTO QUICK SWITCHES */}
          <div className="grid grid-cols-2 gap-2">
            {/* Verified Profiles */}
            <div 
              onClick={() => setVerifiedOnly && setVerifiedOnly(!verifiedOnly)}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                verifiedOnly 
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                  verifiedOnly ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${verifiedOnly ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${verifiedOnly ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                </div>
              </div>
              <div>
                <div className="font-bold text-[11px] leading-tight flex items-center gap-1">
                  <span>Verified Only</span>
                  {verifiedOnly && (
                    <span className="text-[8px] px-1 py-0.2 rounded-full bg-emerald-200 text-emerald-800 font-bold">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[9.5px] text-slate-500 mt-0.5 leading-tight">Govt ID & Aadhaar verified</p>
              </div>
            </div>

            {/* Public Photos Only */}
            <div 
              onClick={() => setPhotoOnly && setPhotoOnly(!photoOnly)}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                photoOnly 
                  ? 'bg-amber-50/90 border-[#D4AF37] text-amber-950 shadow-xs' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                  photoOnly ? 'bg-[#D4AF37] text-[#0B192C]' : 'bg-slate-200 text-slate-500'
                }`}>
                  <Camera className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${photoOnly ? 'bg-[#D4AF37]' : 'bg-slate-300'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${photoOnly ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                </div>
              </div>
              <div>
                <div className="font-bold text-[11px] leading-tight flex items-center gap-1">
                  <span>Visible Photo</span>
                  {photoOnly && (
                    <span className="text-[8px] px-1 py-0.2 rounded-full bg-amber-200 text-amber-900 font-bold">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[9.5px] text-slate-500 mt-0.5 leading-tight">Public face photo visible</p>
              </div>
            </div>

            {/* Paid Members Switch */}
            <div 
              onClick={() => {
                if (setMembershipFilter) {
                  setMembershipFilter(membershipFilter === 'Paid' ? 'All' : 'Paid');
                }
              }}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                membershipFilter === 'Paid'
                  ? 'bg-amber-50/90 border-[#D4AF37] text-amber-950 shadow-xs' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                  membershipFilter === 'Paid' ? 'bg-[#0B192C] text-[#DFB76C]' : 'bg-slate-200 text-slate-500'
                }`}>
                  <Crown className="w-4 h-4 fill-current" />
                </div>
                <div className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${membershipFilter === 'Paid' ? 'bg-[#0B192C]' : 'bg-slate-300'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-[#DFB76C] transition-transform ${membershipFilter === 'Paid' ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                </div>
              </div>
              <div>
                <div className="font-bold text-[11px] leading-tight flex items-center gap-1">
                  <span>Paid Members</span>
                  {membershipFilter === 'Paid' && (
                    <span className="text-[8px] px-1 py-0.2 rounded-full bg-[#D4AF37] text-[#0B192C] font-extrabold">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[9.5px] text-slate-500 mt-0.5 leading-tight">VIP, Gold & Diamond</p>
              </div>
            </div>

            {/* Mobile Number Available Switch */}
            <div 
              onClick={() => setPhoneOnly && setPhoneOnly(!phoneOnly)}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                phoneOnly 
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                  phoneOnly ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  <Phone className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${phoneOnly ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${phoneOnly ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                </div>
              </div>
              <div>
                <div className="font-bold text-[11px] leading-tight flex items-center gap-1">
                  <span>Mobile Number</span>
                  {phoneOnly && (
                    <span className="text-[8px] px-1 py-0.2 rounded-full bg-emerald-200 text-emerald-800 font-bold">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[9.5px] text-slate-500 mt-0.5 leading-tight">Verified mobile contact</p>
              </div>
            </div>
          </div>

          {/* 1.5 DEDICATED MEMBERSHIP SELECTOR (PAID & FREE) */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-slate-700">
                <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                <label className="uppercase text-[9.5px] font-bold tracking-wider text-slate-700">
                  Membership Plan (Paid & Free)
                </label>
              </div>
              {membershipFilter !== 'All' && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#0B192C] text-[#DFB76C] font-extrabold shadow-2xs">
                  {membershipFilter === 'Paid' ? '👑 Paid Only' : '🆓 Not Paid'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              {[
                { id: 'All', label: 'All Plans', icon: '🌟' },
                { id: 'Paid', label: '👑 Paid Only', icon: '👑' },
                { id: 'Not Paid', label: '🆓 Not Paid', icon: '🆓' }
              ].map(plan => {
                const isActive = membershipFilter === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setMembershipFilter && setMembershipFilter(plan.id)}
                    className={`py-2 px-1 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      isActive 
                        ? 'bg-[#0B192C] text-[#DFB76C] border-[#0B192C] shadow-xs scale-[1.01]' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{plan.label}</span>
                  </button>
                );
              })}
            </div>
          </div>


          {/* 2. LOCATION & DISTRICT FILTERS */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center space-x-1.5 text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-[#8C6D1F]" />
              <label className="uppercase text-[9px] font-bold tracking-wider text-slate-600">
                Location & District
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* State / UT */}
              <div>
                <SearchableSelect
                  label="State / Territory"
                  title="Select State / Territory"
                  value={selectedState}
                  onChange={(val) => handleStateChange(val)}
                  options={['All States', ...STATES_AND_CITIES.map(s => s.state)]}
                  searchPlaceholder="Search state..."
                  buttonClassName="px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium"
                />
              </div>

              {/* District (Dynamic) */}
              <div>
                <SearchableSelect
                  label="District"
                  title="Select District"
                  value={selectedDistrict || 'All Districts'}
                  onChange={(val) => setSelectedDistrict && setSelectedDistrict(val)}
                  options={['All Districts', ...districts]}
                  searchPlaceholder="Search district..."
                  buttonClassName="px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* 3. AGE, HEIGHT & MARITAL STATUS */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            
            {/* Preferred Age Range Slider Box */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  Preferred Age Range
                </label>
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-[#D4AF37]/20 text-[#8C6D1F] border border-[#D4AF37]/30 text-xs">
                  {minAge} to {maxAge} yrs
                </span>
              </div>
              
              <div className="flex items-center space-x-2.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400 shrink-0">21</span>
                <DualRangeSlider 
                  min={21}
                  max={45}
                  minVal={minAge}
                  maxVal={maxAge}
                  onChange={({ min, max }) => {
                    setMinAge && setMinAge(min);
                    setMaxAge && setMaxAge(max);
                  }}
                />
                <span className="text-[11px] font-bold text-slate-400 shrink-0">45</span>
              </div>
            </div>

            {/* Height & Marital Status - Symmetrically Aligned Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <SearchableSelect
                  label="Preferred Height"
                  title="Select Preferred Height"
                  value={minHeight || 'Any Height (No Preference)'}
                  onChange={(val) => setMinHeight && setMinHeight(val)}
                  options={PREFERRED_HEIGHT_OPTIONS}
                  searchPlaceholder="Search height (e.g. 5'5, 165)..."
                  buttonClassName="w-full h-10 px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium text-slate-800 truncate"
                />
              </div>

              <div>
                <SearchableSelect
                  label="Marital Status"
                  title="Select Marital Status"
                  value={selectedMaritalStatus}
                  onChange={(val) => setSelectedMaritalStatus && setSelectedMaritalStatus(val)}
                  options={MARITAL_STATUS_REQUIREMENTS.map(m => ({ label: m.label, value: m.id }))}
                  searchPlaceholder="Search marital status..."
                  buttonClassName="w-full h-10 px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium text-slate-800 truncate"
                />
              </div>
            </div>

          </div>

          {/* 4. COMMUNITY & CASTE */}
          <div className="space-y-2.5 pt-1 border-t border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-[#8C6D1F]" />
              <label className="uppercase text-[9px] font-bold tracking-wider text-slate-600">
                Religion, Community & Caste
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Religion */}
              <div>
                <SearchableSelect
                  label="Religion"
                  title="Select Religion"
                  value={selectedReligion}
                  onChange={(val) => handleReligionChange(val)}
                  options={['All Religions', ...RELIGIONS]}
                  searchPlaceholder="Search religion..."
                  buttonClassName="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium truncate"
                />
              </div>

              {/* Community & Caste */}
              <div>
                <SearchableSelect
                  label="Community & Caste"
                  title="Select Community & Caste"
                  value={selectedCaste || 'All Castes & Communities'}
                  onChange={(val) => setSelectedCaste && setSelectedCaste(val)}
                  options={['All Castes & Communities', ...availableCastes]}
                  searchPlaceholder="Search community or caste..."
                  buttonClassName="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium truncate"
                />
              </div>
            </div>
          </div>

          {/* 5. EDUCATION, CAREER & WORK SETUP */}
          <div className="space-y-2.5 pt-1 border-t border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-700">
              <GraduationCap className="w-3.5 h-3.5 text-[#8C6D1F]" />
              <label className="uppercase text-[9px] font-bold tracking-wider text-slate-600">
                Education & Career
              </label>
            </div>

            {/* Education Stream */}
            <div>
              <SearchableSelect
                label="Education Stream"
                title="Select Education Stream"
                value={selectedEducation || 'All Educations'}
                onChange={(val) => setSelectedEducation && setSelectedEducation(val)}
                options={['All Educations', ...EDUCATION_CATEGORIES]}
                searchPlaceholder="Search education..."
                buttonClassName="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Working Sector / Profession */}
              <div>
                <SearchableSelect
                  label="Working Sector"
                  title="Select Working Sector"
                  value={selectedProfession || 'All Professions'}
                  onChange={(val) => setSelectedProfession && setSelectedProfession(val)}
                  options={PROFESSION_OPTIONS}
                  searchPlaceholder="Search profession..."
                  buttonClassName="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium"
                />
              </div>

              {/* Minimum Annual Income */}
              <div>
                <SearchableSelect
                  label="Annual Income"
                  title="Select Minimum Income"
                  value={minIncome || 'All Incomes'}
                  onChange={(val) => setMinIncome && setMinIncome(val)}
                  options={INCOME_FILTER_OPTIONS}
                  searchPlaceholder="Search income..."
                  buttonClassName="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium"
                />
              </div>
            </div>

            {/* Work Mode / Setup */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                <Laptop className="w-3 h-3 text-[#8C6D1F]" />
                <span>Work Setup / Mode</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {WORK_MODE_OPTIONS.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedWorkMode && setSelectedWorkMode(m.id)}
                    className={`py-1.5 px-1 rounded-xl border text-[10px] font-bold transition-all text-center truncate cursor-pointer ${
                      selectedWorkMode === m.id
                        ? 'bg-[#0B192C] text-[#DFB76C] border-[#0B192C] shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 6. FAMILY BACKGROUND & STATUS */}
          <div className="space-y-2.5 pt-1 border-t border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-700">
              <Users className="w-3.5 h-3.5 text-[#8C6D1F]" />
              <label className="uppercase text-[9px] font-bold tracking-wider text-slate-600">
                Family Background & Status
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Family Type */}
              <div>
                <SearchableSelect
                  label="Family Type"
                  title="Select Family Type"
                  value={selectedFamilyType || 'All Family Types'}
                  onChange={(val) => setSelectedFamilyType && setSelectedFamilyType(val)}
                  options={FAMILY_TYPE_OPTIONS}
                  searchPlaceholder="Search family type..."
                  buttonClassName="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium truncate"
                />
              </div>

              {/* Family Financial Status */}
              <div>
                <SearchableSelect
                  label="Family Status"
                  title="Select Family Financial Status"
                  value={selectedFamilyStatus || 'All Financial Statuses'}
                  onChange={(val) => setSelectedFamilyStatus && setSelectedFamilyStatus(val)}
                  options={FAMILY_STATUS_OPTIONS}
                  searchPlaceholder="Search financial status..."
                  buttonClassName="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium truncate"
                />
              </div>
            </div>
          </div>

          {/* 7. LIFESTYLE & PERSONAL HABITS */}
          <div className="space-y-2.5 pt-1 border-t border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-700">
              <Heart className="w-3.5 h-3.5 text-[#8C6D1F]" />
              <label className="uppercase text-[9px] font-bold tracking-wider text-slate-600">
                Lifestyle & Habits
              </label>
            </div>

            {/* Diet Pills */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1.5">Dietary Preference</label>
              <div className="flex flex-wrap gap-1.5">
                {DIET_OPTIONS.map(diet => (
                  <button
                    key={diet.id}
                    type="button"
                    onClick={() => setSelectedDiet && setSelectedDiet(diet.id)}
                    className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                      selectedDiet === diet.id
                        ? 'bg-[#0B192C] text-[#DFB76C] border-[#0B192C] shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {diet.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drinking Habit */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                <Wine className="w-3 h-3 text-[#8C6D1F]" />
                <span>Drinking Habit</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DRINKING_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedDrinking && setSelectedDrinking(opt.id)}
                    className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                      selectedDrinking === opt.id
                        ? 'bg-[#0B192C] text-[#DFB76C] border-[#0B192C] shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Smoking Habit */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                <Cigarette className="w-3 h-3 text-[#8C6D1F]" />
                <span>Smoking Habit</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SMOKING_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedSmoking && setSelectedSmoking(opt.id)}
                    className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                      selectedSmoking === opt.id
                        ? 'bg-[#0B192C] text-[#DFB76C] border-[#0B192C] shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Footer with Apply Button */}
        <div className="p-3.5 border-t border-slate-200 bg-white flex items-center space-x-2.5 shrink-0 shadow-lg z-20">
          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold flex items-center space-x-1.5 hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] text-xs font-extrabold shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer hover:from-[#dfb76c] hover:to-[#b89228] transition-all"
          >
            <span>Apply Filters ({totalMatching} Matches)</span>
          </button>
        </div>

    </div>
  );
}
