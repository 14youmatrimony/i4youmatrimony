import React, { useState, useMemo } from 'react';
import { 
  Search, 
  RotateCcw, 
  MapPin, 
  Filter, 
  SlidersHorizontal, 
  Sparkles, 
  ShieldCheck, 
  Heart, 
  Send, 
  Check, 
  Eye, 
  MessageCircle,
  Building2,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { REGIONS, STATES_AND_CITIES, getDistrictsForState } from '../data/locationData';
import { RELIGIONS, MOTHER_TONGUES } from './RegistrationWizard';
import SearchableSelect from './common/SearchableSelect';
import { sanitizeSearchTerm } from '../utils/security';
import { parseHeightInches, HEIGHT_FILTER_OPTIONS } from './website/WebsiteMatchShowcase';

export default function SearchFilter({ 
  profiles, 
  interestsSent, 
  onToggleInterest, 
  shortlisted, 
  onToggleShortlist, 
  onSelectProfile, 
  onStartChat 
}) {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [selectedReligion, setSelectedReligion] = useState('All Religions');
  const [selectedEducation, setSelectedEducation] = useState('All Educations');
  const [selectedDiet, setSelectedDiet] = useState('All Diets');
  const [selectedHeight, setSelectedHeight] = useState('All');
  const [ageRange, setAgeRange] = useState({ min: 21, max: 35 });
  const [manglikFilter, setManglikFilter] = useState('All');

  const districts = useMemo(() => {
    return getDistrictsForState(selectedState);
  }, [selectedState]);

  // Education categories (aligned with EDUCATION_CATEGORIES in RegistrationWizard)
  const educationOptions = [
    'All Educations',
    // Medical & Health
    'Medical / Healthcare',
    'Dental & Allied Dental',
    'Pharmacy & Pharmaceutical',
    'Nursing & Paramedical',
    'Ayurveda / Homeopathy / BAMS',
    'Physiotherapy & Rehabilitation',
    // Engineering & Technology
    'Engineering / IT',
    'Computer Science & AI / ML',
    'Electronics & Communication',
    'Civil & Structural Engineering',
    'Mechanical & Automotive',
    'Architecture & Urban Planning',
    // Business & Management
    'Management / Corporate (MBA)',
    'Business Administration (BBA)',
    'Entrepreneurship & Startup',
    // Finance, Law & Accounting
    'Finance / Banking / CA',
    'Law / Legal Services',
    'Company Secretary / CMA',
    // Science & Research
    'Science & Research',
    'Biotechnology & Life Sciences',
    'Agriculture & Horticulture',
    // Arts & Humanities
    'Arts / Humanities / Social Science',
    'Psychology & Counselling',
    'Economics & Development Studies',
    'Political Science & Public Policy',
    // Civil Services & Defence
    'Civil Services / Govt (IAS/IPS/IFS)',
    'Defence / Armed Forces',
    'Police Services / Paramilitary',
    // Design, Media & Creative
    'Design & Fine Arts (NID/NIFT)',
    'Mass Communication & Journalism',
    'Film, Media & Entertainment',
    // Aviation & Maritime
    'Aviation / Commercial Pilot',
    'Merchant Navy / Maritime',
    // Hospitality & Tourism
    'Hotel Management & Hospitality',
    'Tourism & Travel Management',
    // Education & Sports
    'Teaching / Education (B.Ed)',
    'Sports & Physical Education',
    // Others
    'Diploma / Polytechnic / ITI',
    'Other / Not Listed',
  ];

  // Reset all filters
  const handleReset = () => {
    setSearchTerm('');
    setSelectedRegion('All Regions');
    setSelectedState('All States');
    setSelectedDistrict('All Districts');
    setSelectedReligion('All Religions');
    setSelectedEducation('All Educations');
    setSelectedDiet('All Diets');
    setSelectedHeight('All');
    setAgeRange({ min: 21, max: 35 });
    setManglikFilter('All');
  };

  // Filter profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter(profile => {
      // Search term (sanitized against SQL injection and XSS)
      const cleanTerm = sanitizeSearchTerm(searchTerm);
      if (cleanTerm) {
        const query = cleanTerm.toLowerCase();
        const matchesName = profile.name.toLowerCase().includes(query);
        const matchesCity = profile.city.toLowerCase().includes(query);
        const matchesProfession = profile.profession.toLowerCase().includes(query);
        const matchesCompany = profile.company.toLowerCase().includes(query);
        const matchesCaste = profile.caste.toLowerCase().includes(query);
        if (!matchesName && !matchesCity && !matchesProfession && !matchesCompany && !matchesCaste) {
          return false;
        }
      }

      // Region / State
      if (selectedState !== 'All States' && profile.state !== selectedState) {
        return false;
      }

      // District filter (if specified)
      if (selectedDistrict && selectedDistrict !== 'All Districts' && profile.district !== selectedDistrict) {
        return false;
      }

      // Religion
      if (selectedReligion !== 'All Religions' && profile.religion !== selectedReligion) {
        return false;
      }

      // Education category — flexible keyword match against profile.educationCategory
      if (selectedEducation !== 'All Educations') {
        const sel = selectedEducation.toLowerCase();
        const cat = (profile.educationCategory || '').toLowerCase();
        // Try matching the first word/token of selected option against the category
        const firstToken = sel.split(/[\s\/&(]/)[0];
        if (!cat.includes(firstToken) && !sel.split(' / ').some(part => cat.includes(part.trim().toLowerCase()))) {
          return false;
        }
      }

      // Diet
      if (selectedDiet !== 'All Diets') {
        if (selectedDiet === 'Vegetarian' && !profile.diet.includes('Vegetarian')) return false;
        if (selectedDiet === 'Non-Vegetarian' && !profile.diet.includes('Non-Vegetarian')) return false;
        if (selectedDiet === 'Jain' && !profile.diet.includes('Jain')) return false;
      }

      // Height
      if (selectedHeight && selectedHeight !== 'All' && selectedHeight !== 'All Heights') {
        const pInches = parseHeightInches(profile.height);
        if (pInches) {
          if (selectedHeight.toLowerCase().startsWith('under')) {
            const matches = [...selectedHeight.matchAll(/(\d+)'(\d+)/g)];
            if (matches.length > 0) {
              const maxH = parseInt(matches[0][1], 10) * 12 + parseInt(matches[0][2], 10);
              if (pInches >= maxH) return false;
            }
          } else {
            const matches = [...selectedHeight.matchAll(/(\d+)'(\d+)/g)];
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

      // Age range
      if (profile.age < ageRange.min || profile.age > ageRange.max) {
        return false;
      }

      // Manglik
      if (manglikFilter !== 'All') {
        if (manglikFilter === 'Non-Manglik' && profile.manglik !== 'Non-Manglik') return false;
        if (manglikFilter === 'Manglik' && !profile.manglik.includes('Manglik')) return false;
      }

      return true;
    });
  }, [
    profiles, 
    searchTerm, 
    selectedState, 
    selectedDistrict, 
    selectedReligion, 
    selectedEducation, 
    selectedDiet, 
    selectedHeight,
    ageRange, 
    manglikFilter
  ]);

  return (
    <div className="w-[90%] max-w-[1800px] mx-auto px-2 sm:px-4 py-8 space-y-8">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 text-[#8C6D1F] border border-[#D4AF37]/30 text-xs font-semibold mb-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Smart Match Filters</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0B192C]">
            Pan-India Advanced Search & Filter
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Refine matches by Indian State, District, Religion, Education, Age and Lifestyle.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="self-start md:self-auto px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All Filters</span>
        </button>
      </div>

      {/* Main Search & Filter Control Panel */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5 sm:p-6 space-y-5">
        
        {/* Keyword Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by candidate name, company (e.g. Google, AIIMS), city (e.g. Nashik, Salem, Udupi), or caste..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:outline-none text-sm"
          />
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* State Filter */}
          <div>
            <SearchableSelect
              label="Indian State / UT"
              value={selectedState}
              onChange={(val) => {
                setSelectedState(val);
                setSelectedDistrict('All Districts');
              }}
              options={['All States', ...STATES_AND_CITIES.map(st => st.state)]}
              placeholder="Select State"
              searchPlaceholder="Search state..."
              buttonClassName="h-10 font-medium"
            />
          </div>

          {/* District Filter */}
          <div>
            <SearchableSelect
              label="District"
              value={selectedDistrict}
              onChange={(val) => setSelectedDistrict(val)}
              options={['All Districts', ...districts]}
              placeholder="Select District"
              searchPlaceholder="Search district..."
              buttonClassName="h-10 font-medium"
            />
          </div>

          {/* Religion Filter */}
          <div>
            <SearchableSelect
              label="Religion & Faith"
              value={selectedReligion}
              onChange={(val) => setSelectedReligion(val)}
              options={['All Religions', ...RELIGIONS]}
              placeholder="Select Religion"
              searchPlaceholder="Search religion..."
              buttonClassName="h-10 font-medium"
            />
          </div>

          {/* Education Category Filter */}
          <div>
            <SearchableSelect
              label="Education / Profession"
              value={selectedEducation}
              onChange={(val) => setSelectedEducation(val)}
              options={educationOptions}
              placeholder="Select Education"
              searchPlaceholder="Search education..."
              buttonClassName="h-10 font-medium"
            />
          </div>

        </div>

        {/* Secondary Filters Bar */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          
          {/* Age Range Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Age Range:</span>
              <span className="text-[#0B192C] font-bold">{ageRange.min} to {ageRange.max} yrs</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-slate-400">21</span>
              <input 
                type="range"
                min="21"
                max="40"
                value={ageRange.max}
                onChange={(e) => setAgeRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                className="w-full accent-[#D4AF37] cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">40</span>
            </div>
          </div>

          {/* Height Filter */}
          <div>
            <SearchableSelect
              label="Height"
              value={selectedHeight}
              onChange={(val) => setSelectedHeight(val)}
              options={HEIGHT_FILTER_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
              placeholder="Select Height"
              searchPlaceholder="Search height..."
              buttonClassName="h-9 font-medium"
            />
          </div>

          {/* Diet Filter */}
          <div>
            <SearchableSelect
              label="Dietary Habit"
              value={selectedDiet}
              onChange={(val) => setSelectedDiet(val)}
              options={[
                { value: 'All Diets', label: 'All Diets' },
                { value: 'Vegetarian', label: 'Pure Vegetarian' },
                { value: 'Jain', label: 'Strict Jain' },
                { value: 'Non-Vegetarian', label: 'Non-Vegetarian' }
              ]}
              placeholder="Select Diet"
              searchPlaceholder="Search diet..."
              buttonClassName="h-9 font-medium"
            />
          </div>

          {/* Manglik Filter */}
          <div>
            <SearchableSelect
              label="Kundali Manglik Status"
              value={manglikFilter}
              onChange={(val) => setManglikFilter(val)}
              options={[
                { value: 'All', label: 'All Kundali Types' },
                { value: 'Non-Manglik', label: 'Non-Manglik' },
                { value: 'Manglik', label: 'Manglik' }
              ]}
              placeholder="Select Manglik"
              searchPlaceholder="Search Manglik..."
              buttonClassName="h-9 font-medium"
            />
          </div>

        </div>

      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-serif font-bold text-[#0B192C]">
          Matching Profiles ({filteredProfiles.length})
        </h2>
        <span className="text-xs text-slate-500">
          Filtered by Pan-India database
        </span>
      </div>

      {/* Filtered Grid */}
      {filteredProfiles.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-[#8C6D1F] flex items-center justify-center mx-auto">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-serif font-bold text-slate-800">No profiles found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your state, district, or religion filters to explore more matches across India.
          </p>
          <button
            onClick={handleReset}
            className="mt-2 px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProfiles.map(profile => {
            const isInterested = interestsSent.includes(profile.id);
            const isShortlisted = shortlisted.includes(profile.id);

            return (
              <div 
                key={profile.id}
                onClick={() => onSelectProfile(profile)}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group cursor-pointer"
              >
                {/* Photo Area */}
                <div className="relative h-60 overflow-hidden bg-slate-100">
                  <img 
                    src={profile.photo} 
                    alt={profile.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"></div>

                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37] text-[#0B192C] shadow-md flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" />
                      <span>{profile.matchScore}% Match</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-black/60 text-white backdrop-blur-md">
                      {profile.gunasMatch}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleShortlist(profile.id);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md hover:bg-white flex items-center justify-center shadow-md cursor-pointer"
                  >
                    <Heart className={`w-4 h-4 ${isShortlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
                  </button>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="flex items-center space-x-1.5">
                      <h3 className="font-serif font-bold text-base leading-tight truncate">
                        {profile.name}
                      </h3>
                      {profile.verified && (
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-200 mt-0.5">
                      {profile.age} yrs • {profile.height}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <div className="flex items-center space-x-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#8C6D1F] shrink-0" />
                        <span className="truncate">{profile.city}, {profile.state}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 bg-amber-50 text-[#8C6D1F] border border-amber-200">
                        {profile.district} Dist.
                      </span>
                    </div>

                    <div className="flex items-start space-x-1.5 text-slate-700">
                      <Briefcase className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0 mt-0.5" />
                      <div className="truncate">
                        <p className="font-semibold text-slate-900 truncate">{profile.profession}</p>
                        <p className="text-[11px] text-slate-500 truncate">{profile.company}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 text-slate-600">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{profile.education}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-medium">
                        {profile.religion}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                        {profile.diet}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProfile(profile);
                      }}
                      className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      title="View Profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartChat(profile.id);
                      }}
                      className="p-2 rounded-xl border border-slate-200 text-[#1E3A8A] hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Send Message"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleInterest(profile.id);
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                        isInterested 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] hover:from-[#dfb76c] hover:to-[#b89228] text-[#0B192C]'
                      }`}
                    >
                      {isInterested ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Sent</span>
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
      )}

    </div>
  );
}
