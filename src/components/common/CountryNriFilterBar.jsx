import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Check, Globe } from 'lucide-react';
import { 
  WORLD_COUNTRIES, 
  findCountryByName, 
  searchWorldCountries 
} from '../../data/worldCountries';

/**
 * CountryNriFilterBar Component
 * 
 * Replaces horizontal country chips with clean primary toggle buttons:
 * [ All Profiles ] [ 🇮🇳 India ] [ ✈️ Abroad (NRI) ]
 * 
 * When ✈️ Abroad (NRI) is clicked:
 * A compact, clean search box appears directly to the RIGHT of ✈️ Abroad (NRI) on the same row.
 * Displays "🔍 Search any country..." placeholder.
 * Autocomplete dropdown contains all ~195 sovereign nations with flags.
 * Selecting a country filters specifically for that country with a small '×' clear button.
 * When cleared, reverts to all Abroad (NRI) profiles.
 */
export default function CountryNriFilterBar({
  selectedCountry = 'All Profiles',
  onSelectCountry,
  currentUser = null,
  className = ''
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditingSelected, setIsEditingSelected] = useState(false);
  const [dropdownCoords, setDropdownCoords] = useState(null);

  const searchBoxRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Active status helpers
  const isAllActive = !selectedCountry || selectedCountry === 'All Profiles';
  const isIndiaActive = selectedCountry === 'India';
  const isAbroadActive = selectedCountry === 'Working Abroad (NRI)' || (!isAllActive && !isIndiaActive);

  // Check if a specific world country is selected
  const selectedCountryObj = useMemo(() => {
    if (!isAbroadActive || selectedCountry === 'Working Abroad (NRI)') {
      return null;
    }
    return findCountryByName(selectedCountry);
  }, [isAbroadActive, selectedCountry]);

  // Filtered countries based on search query (excluding India since India has its own button)
  const matchingCountries = useMemo(() => {
    return searchWorldCountries(searchQuery, { excludeIndia: true });
  }, [searchQuery]);

  // Position the floating dropdown menu using fixed coordinates to prevent clipping
  useEffect(() => {
    if (isDropdownOpen && searchBoxRef.current) {
      const updatePosition = () => {
        if (!searchBoxRef.current) return;
        const rect = searchBoxRef.current.getBoundingClientRect();
        const popoverWidth = Math.min(280, window.innerWidth - 24);
        let left = rect.left;
        if (left + popoverWidth > window.innerWidth - 12) {
          left = window.innerWidth - popoverWidth - 12;
        }
        if (left < 12) left = 12;

        const spaceBelow = window.innerHeight - rect.bottom - 12;
        const showAbove = spaceBelow < 180 && rect.top > spaceBelow;

        setDropdownCoords({
          top: showAbove ? undefined : rect.bottom + 4,
          bottom: showAbove ? window.innerHeight - rect.top + 4 : undefined,
          left,
          width: popoverWidth,
          maxHeight: Math.min(260, showAbove ? rect.top - 20 : spaceBelow)
        });
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isDropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        searchBoxRef.current && !searchBoxRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsDropdownOpen(false);
        setIsEditingSelected(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isDropdownOpen]);

  // Handle clicking "All Profiles"
  const handleAllClick = () => {
    setIsDropdownOpen(false);
    setIsEditingSelected(false);
    setSearchQuery('');
    onSelectCountry && onSelectCountry('All Profiles');
  };

  // Handle clicking "India"
  const handleIndiaClick = () => {
    setIsDropdownOpen(false);
    setIsEditingSelected(false);
    setSearchQuery('');
    onSelectCountry && onSelectCountry('India');
  };

  // Handle clicking "Abroad (NRI)"
  const handleAbroadClick = () => {
    if (!isAbroadActive) {
      onSelectCountry && onSelectCountry('Working Abroad (NRI)');
      setIsDropdownOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    } else if (selectedCountryObj) {
      // Revert to all abroad
      onSelectCountry && onSelectCountry('Working Abroad (NRI)');
    }
  };

  // Handle selecting a specific country from autocomplete dropdown
  const handleCountrySelect = (country) => {
    onSelectCountry && onSelectCountry(country.name);
    setSearchQuery('');
    setIsDropdownOpen(false);
    setIsEditingSelected(false);
  };

  // Handle clicking the '×' clear button inside search box
  const handleClearCountry = (e) => {
    e.stopPropagation();
    onSelectCountry && onSelectCountry('Working Abroad (NRI)');
    setSearchQuery('');
    setIsEditingSelected(false);
    setIsDropdownOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Single-Row Flex Container */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
        
        {/* 1. All Profiles Toggle */}
        <button
          type="button"
          onClick={handleAllClick}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
            isAllActive
              ? 'bg-[#0B192C] text-[#DFB76C] shadow-2xs font-extrabold'
              : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200/70'
          }`}
        >
          All Profiles
        </button>

        {/* 2. India Toggle */}
        <button
          type="button"
          onClick={handleIndiaClick}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
            isIndiaActive
              ? 'bg-[#0B192C] text-[#DFB76C] shadow-2xs font-extrabold'
              : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200/70'
          }`}
        >
          <span>🇮🇳</span>
          <span>India</span>
        </button>

        {/* 3. Abroad (NRI) Toggle */}
        <button
          type="button"
          onClick={handleAbroadClick}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
            isAbroadActive
              ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] shadow-2xs font-extrabold'
              : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200/70'
          }`}
        >
          <span>✈️</span>
          <span>Abroad (NRI)</span>
        </button>

        {/* 4. Compact Country Search Box Directly on the RIGHT Side of Abroad (NRI) */}
        {isAbroadActive && (
          <div 
            ref={searchBoxRef}
            className="relative shrink-0 flex items-center min-w-[155px] sm:min-w-[190px] max-w-[240px] animate-in fade-in duration-150"
          >
            {/* If a specific country is chosen and not currently re-typing: Show country flag & name with '×' */}
            {selectedCountryObj && !isEditingSelected ? (
              <div 
                onClick={() => {
                  setIsEditingSelected(true);
                  setIsDropdownOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 60);
                }}
                className="h-[30px] w-full px-2.5 rounded-xl border border-[#D4AF37] bg-amber-50/95 flex items-center justify-between gap-1 text-[11px] font-bold text-[#8C6D1F] shadow-2xs cursor-pointer hover:bg-amber-100/90 transition-colors"
                title={`Filtered for ${selectedCountryObj.name}. Click to change or × to revert to all NRI.`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-sm shrink-0">{selectedCountryObj.flag}</span>
                  <span className="truncate">{selectedCountryObj.name}</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearCountry}
                  className="p-0.5 rounded-full hover:bg-amber-200 text-[#8C6D1F] hover:text-slate-900 transition-colors shrink-0 cursor-pointer"
                  title="Clear country filter (Show all Abroad/NRI profiles)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              /* Search Input with Search Icon and instant dropdown */
              <div className="h-[30px] w-full px-2 rounded-xl border border-slate-300 bg-white flex items-center gap-1.5 focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/20 shadow-2xs">
                <Search className="w-3 h-3 text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!isDropdownOpen) setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="🔍 Search any country..."
                  className="w-full bg-transparent border-none p-0 text-[11px] font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : selectedCountryObj && isEditingSelected ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingSelected(false);
                      setIsDropdownOpen(false);
                    }}
                    className="p-0.5 text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
                    title="Cancel edit"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Instant Search Dropdown for World Countries */}
      {isDropdownOpen && dropdownCoords && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownCoords.top,
            bottom: dropdownCoords.bottom,
            left: dropdownCoords.left,
            width: dropdownCoords.width,
            maxHeight: dropdownCoords.maxHeight || 260,
            zIndex: 9999
          }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Quick Header */}
          <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span>Select Country (~195 World Nations)</span>
            <span className="text-[#8C6D1F]">
              {matchingCountries.length} found
            </span>
          </div>

          {/* Scrollable World Country Options */}
          <div className="overflow-y-auto p-1 space-y-0.5 divide-y divide-slate-50 max-h-56">
            {matchingCountries.length === 0 ? (
              <div className="py-5 text-center text-xs text-slate-400">
                No country found matching "{searchQuery}"
              </div>
            ) : (
              matchingCountries.map((c) => {
                const isSelected = selectedCountry === c.name;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className={`w-full px-2 py-1.5 rounded-xl text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#0B192C] text-[#DFB76C] font-bold shadow-2xs'
                        : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base leading-none shrink-0">{c.flag}</span>
                      <span className="truncate">{c.name}</span>
                      {c.popular && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                          Popular
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#DFB76C] shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
