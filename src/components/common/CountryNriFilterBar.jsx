import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';
import { 
  TOP_100_WORLD_COUNTRIES,
  findCountryByName, 
  searchWorldCountries 
} from '../../data/worldCountries.js';

/**
 * CountryNriFilterBar Component
 * 
 * Clean primary toggle buttons:
 * [ All Profiles ] [ ✈️ Abroad (NRI) ]
 * (Note: "IN India" button has been completely removed)
 * 
 * Directly to the right of ✈️ Abroad (NRI), provides a full Combobox:
 * - Placeholder: "Search or select country..." (no duplicate emoji)
 * - Search icon on left, Up/Down Chevron arrow on right
 * - Floating, smoothly scrollable dropdown list of Top 100 countries (top NRI destinations first)
 * - Top option: "🌍 All Abroad (NRI) Countries"
 * - Full Keyboard Navigation (ArrowUp, ArrowDown, Enter, Escape) + real-time instant typing search
 * - Laptop-optimized mouse interaction: onMouseDown preventDefault ensures clicks and scrollbar drags never trigger input onBlur
 * - onWheel stopPropagation ensures smooth mouse-wheel scrolling on laptops
 * - Positioned with high z-index and overflow-visible wrapper to prevent any clipping on laptop screens
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
  const [highlightIndex, setHighlightIndex] = useState(0);

  const searchBoxRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);

  // Active status helpers (only "All Profiles" and "Abroad (NRI)" exist)
  const isAllActive = !selectedCountry || selectedCountry === 'All Profiles' || selectedCountry === 'India';
  const isAbroadActive = selectedCountry === 'Working Abroad (NRI)' || (!isAllActive && selectedCountry !== 'All Profiles');

  // Check if a specific world country is selected
  const selectedCountryObj = useMemo(() => {
    if (!isAbroadActive || selectedCountry === 'Working Abroad (NRI)') {
      return null;
    }
    return findCountryByName(selectedCountry);
  }, [isAbroadActive, selectedCountry]);

  // Filtered countries based on search query (excluding India from abroad dropdown)
  const matchingCountries = useMemo(() => {
    return searchWorldCountries(searchQuery, { excludeIndia: true });
  }, [searchQuery]);

  // Combined options list for keyboard navigation:
  // Item 0 is "🌍 All Abroad (NRI) Countries", followed by matchingCountries
  const shouldShowAllAbroadOption = !searchQuery || 
    'all abroad nri countries'.includes(searchQuery.toLowerCase()) ||
    'abroad'.includes(searchQuery.toLowerCase()) ||
    'nri'.includes(searchQuery.toLowerCase());

  const totalNavItems = (shouldShowAllAbroadOption ? 1 : 0) + matchingCountries.length;

  // Reset highlight index when query changes or dropdown opens
  useEffect(() => {
    setHighlightIndex(0);
  }, [searchQuery, isDropdownOpen]);

  // Scroll highlighted item into view during keyboard navigation
  useEffect(() => {
    if (isDropdownOpen && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${highlightIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex, isDropdownOpen]);

  // Clean document outside click listener: closes dropdown only when clicking outside the entire search box
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        searchBoxRef.current && 
        !searchBoxRef.current.contains(e.target)
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

  // Keyboard navigation handler
  const handleKeyDown = (e) => {
    if (!isDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsDropdownOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1 >= totalNavItems ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 < 0 ? Math.max(0, totalNavItems - 1) : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (shouldShowAllAbroadOption && highlightIndex === 0) {
        handleSelectAllAbroad();
      } else {
        const countryIndex = shouldShowAllAbroadOption ? highlightIndex - 1 : highlightIndex;
        if (matchingCountries[countryIndex]) {
          handleCountrySelect(matchingCountries[countryIndex]);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
      setIsEditingSelected(false);
    }
  };

  // Handle clicking "All Profiles"
  const handleAllClick = () => {
    setIsDropdownOpen(false);
    setIsEditingSelected(false);
    setSearchQuery('');
    onSelectCountry && onSelectCountry('All Profiles');
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
    } else {
      setIsDropdownOpen((prev) => !prev);
    }
  };

  // Select all abroad / NRI option
  const handleSelectAllAbroad = () => {
    onSelectCountry && onSelectCountry('Working Abroad (NRI)');
    setSearchQuery('');
    setIsDropdownOpen(false);
    setIsEditingSelected(false);
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
    <div className={`relative overflow-visible z-30 ${className}`}>
      {/* Main Single-Row Flex Container: overflow-visible ensures no clipping on laptops/desktops */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 pb-1 select-none overflow-visible relative">
        
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

        {/* 2. Abroad (NRI) Toggle */}
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

        {/* 3. Searchable & Scrollable Top 100 World Countries Dropdown Combobox */}
        {isAbroadActive && (
          <div 
            ref={searchBoxRef}
            className="relative shrink-0 flex items-center min-w-[170px] sm:min-w-[210px] max-w-[270px] z-50 animate-in fade-in duration-150"
          >
            {/* If a specific country is chosen and not currently editing query: Display country with '×' and Chevron */}
            {selectedCountryObj && !isEditingSelected ? (
              <div 
                onClick={() => {
                  setIsEditingSelected(true);
                  setIsDropdownOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 60);
                }}
                className="h-[30px] w-full px-2.5 rounded-xl border border-[#D4AF37] bg-amber-50/95 flex items-center justify-between gap-1.5 text-[11px] font-bold text-[#8C6D1F] shadow-2xs cursor-pointer hover:bg-amber-100/90 transition-colors"
                title={`Filtered for ${selectedCountryObj.name}. Click to change or × to revert to all NRI.`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Search className="w-3.5 h-3.5 text-[#8C6D1F] shrink-0" />
                  <span className="text-sm shrink-0">{selectedCountryObj.flag}</span>
                  <span className="truncate">{selectedCountryObj.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleClearCountry(e);
                    }}
                    onClick={handleClearCountry}
                    className="p-0.5 rounded-full hover:bg-amber-200 text-[#8C6D1F] hover:text-slate-900 transition-colors shrink-0 cursor-pointer"
                    title="Clear country filter (revert to all NRI)"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#8C6D1F] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            ) : (
              /* Search Input with Search Icon on Left, Clean Placeholder, and Chevron on Right */
              <div 
                onClick={() => {
                  setIsDropdownOpen(true);
                  searchInputRef.current?.focus();
                }}
                className={`h-[30px] w-full px-2 rounded-xl border bg-white flex items-center gap-1.5 transition-all shadow-2xs cursor-text ${
                  isDropdownOpen 
                    ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/20' 
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!isDropdownOpen) setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search or select country..."
                  className="w-full bg-transparent border-none p-0 text-[11px] font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                />

                <div className="flex items-center gap-0.5 shrink-0">
                  {searchQuery ? (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      className="p-0.5 text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : selectedCountryObj && isEditingSelected ? (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsEditingSelected(false);
                        setIsDropdownOpen(false);
                      }}
                      className="p-0.5 text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
                      title="Cancel edit"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : null}

                  {/* Dropdown Chevron toggle */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsDropdownOpen((prev) => !prev);
                      if (!isDropdownOpen) searchInputRef.current?.focus();
                    }}
                    className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title={isDropdownOpen ? 'Close list' : 'Open country list'}
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#8C6D1F]' : ''}`} />
                  </button>
                </div>
              </div>
            )}

            {/* Floating Scrollable Top 100 World Countries Dropdown Combobox */}
            {isDropdownOpen && (
              <div
                ref={dropdownRef}
                className="absolute top-full right-0 mt-1.5 w-[280px] max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-[9999] animate-in fade-in zoom-in-95 duration-150"
                style={{ zIndex: 9999 }}
              >
                {/* Header Indicator */}
                <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 select-none">
                  <span>Top 100 World Countries</span>
                  <span className="text-[#8C6D1F]">
                    {matchingCountries.length} countries
                  </span>
                </div>

                {/* Smoothly Scrollable Dropdown List with mouse wheel propagation stop */}
                <div 
                  ref={listRef}
                  onWheel={(e) => e.stopPropagation()}
                  className="max-h-60 overflow-y-auto p-1 space-y-0.5 divide-y divide-slate-50 scrollbar-thin scrollbar-thumb-slate-300 overscroll-contain"
                >
                  {/* Top Option: 🌍 All Abroad (NRI) Countries */}
                  {shouldShowAllAbroadOption && (
                    <button
                      type="button"
                      data-index="0"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectAllAbroad();
                      }}
                      onClick={handleSelectAllAbroad}
                      onMouseEnter={() => setHighlightIndex(0)}
                      className={`w-full px-2 py-1.5 rounded-lg text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        highlightIndex === 0
                          ? 'bg-amber-100/80 text-[#8C6D1F]'
                          : selectedCountry === 'Working Abroad (NRI)'
                          ? 'bg-[#0B192C] text-[#DFB76C]'
                          : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base leading-none shrink-0">🌍</span>
                        <span className="truncate">All Abroad (NRI) Countries</span>
                      </div>
                      {selectedCountry === 'Working Abroad (NRI)' && (
                        <Check className="w-3.5 h-3.5 text-[#DFB76C] shrink-0 ml-1.5" />
                      )}
                    </button>
                  )}

                  {/* List of 100 Countries (Top NRI Destinations First) */}
                  {matchingCountries.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No country found matching "{searchQuery}"
                    </div>
                  ) : (
                    matchingCountries.map((c, idx) => {
                      const navIndex = shouldShowAllAbroadOption ? idx + 1 : idx;
                      const isHighlighted = highlightIndex === navIndex;
                      const isSelected = selectedCountry === c.name;

                      return (
                        <button
                          key={c.code + '-' + c.name}
                          type="button"
                          data-index={navIndex}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleCountrySelect(c);
                          }}
                          onClick={() => handleCountrySelect(c)}
                          onMouseEnter={() => setHighlightIndex(navIndex)}
                          className={`w-full px-2 py-1.5 rounded-lg text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[#0B192C] text-[#DFB76C] font-bold shadow-2xs'
                              : isHighlighted
                              ? 'bg-amber-50 text-[#8C6D1F]'
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base leading-none shrink-0">{c.flag}</span>
                            <span className="truncate">{c.name}</span>
                            {c.popular && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                                NRI Top
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
        )}
      </div>
    </div>
  );
}
