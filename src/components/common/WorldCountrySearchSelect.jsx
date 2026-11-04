import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Check, Globe, ChevronDown } from 'lucide-react';
import { 
  TOP_100_WORLD_COUNTRIES,
  findCountryByName, 
  searchWorldCountries 
} from '../../data/worldCountries.js';

/**
 * WorldCountrySearchSelect
 * 
 * Searchable & Scrollable Top 100 World Countries Dropdown Combobox.
 * Prioritizes Top NRI destinations first, then major global hubs.
 * Supports:
 * - Clean placeholder "Search or select country..."
 * - Instant typing filter + mouse & keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * - "🌍 All Abroad (NRI) Countries" top quick reset option
 * - Smoothly scrollable with max-h-60 overflow-y-auto
 * - Fixed floating coordinates to prevent modal overflow-hidden clipping
 */
export default function WorldCountrySearchSelect({
  label,
  value,
  onChange,
  placeholder = 'Search or select country...',
  excludeIndia = false,
  allowAny = false,
  required = false,
  className = '',
  buttonClassName = '',
  error = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownCoords, setDropdownCoords] = useState(null);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);

  // Identify current selected country object
  const selectedCountryObj = useMemo(() => {
    if (!value || value === 'Any' || value === 'All' || value === 'Abroad / Any NRI' || value === 'India' || value === 'Working Abroad (NRI)') {
      return null;
    }
    return findCountryByName(value);
  }, [value]);

  // Display label for button / input
  const displayLabel = useMemo(() => {
    if (!value) return '';
    if (value === 'Any') return '🌎 Any Country';
    if (value === 'India') return '🇮🇳 India';
    if (value === 'Abroad / Any NRI' || value === 'Abroad (NRI)' || value === 'Working Abroad (NRI)') return '🌍 All Abroad (NRI) Countries';
    if (selectedCountryObj) {
      return `${selectedCountryObj.flag} ${selectedCountryObj.name}`;
    }
    return value;
  }, [value, selectedCountryObj]);

  // Filtered country list (Top 100 countries)
  const filteredCountries = useMemo(() => {
    return searchWorldCountries(searchQuery, { excludeIndia });
  }, [searchQuery, excludeIndia]);

  // Top quick options
  const showTopAbroadOption = allowAny || excludeIndia;
  const shouldShowTopOption = showTopAbroadOption && (!searchQuery || 
    'all abroad nri countries'.includes(searchQuery.toLowerCase()) || 
    'abroad'.includes(searchQuery.toLowerCase()) || 
    'nri'.includes(searchQuery.toLowerCase()));

  const totalNavItems = (shouldShowTopOption ? 1 : 0) + filteredCountries.length;

  // Reset highlight index when query or open state changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [searchQuery, isOpen]);

  // Calculate dropdown positioning using fixed coordinates so it never gets clipped
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const popoverWidth = Math.min(rect.width, Math.min(340, window.innerWidth - 24));
        let left = rect.left;
        if (left + popoverWidth > window.innerWidth - 12) {
          left = window.innerWidth - popoverWidth - 12;
        }
        if (left < 12) left = 12;

        const spaceBelow = window.innerHeight - rect.bottom - 12;
        const showAbove = spaceBelow < 220 && rect.top > spaceBelow;

        setDropdownCoords({
          top: showAbove ? undefined : rect.bottom + 4,
          bottom: showAbove ? window.innerHeight - rect.top + 4 : undefined,
          left,
          width: Math.max(rect.width, 280),
          maxHeight: Math.min(260, showAbove ? rect.top - 24 : spaceBelow)
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
  }, [isOpen]);

  // Scroll highlighted item into view during keyboard navigation
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${highlightIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex, isOpen]);

  // Outside click listener
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Keyboard navigation handler
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
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
      if (shouldShowTopOption && highlightIndex === 0) {
        handleSelect(allowAny ? 'Any' : 'Working Abroad (NRI)');
      } else {
        const countryIndex = shouldShowTopOption ? highlightIndex - 1 : highlightIndex;
        if (filteredCountries[countryIndex]) {
          handleSelect(filteredCountries[countryIndex].name);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleSelect = (countryName) => {
    if (onChange) {
      onChange(countryName);
    }
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) {
      onChange(allowAny ? 'Any' : '');
    }
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-[#8C6D1F]" />
            <span>{label}</span>
            {required && <span className="text-rose-500">*</span>}
          </span>
          {selectedCountryObj && (
            <span className="text-[10px] font-bold text-[#8C6D1F] bg-amber-50 px-2 py-0.2 rounded-full border border-amber-200">
              {selectedCountryObj.code}
            </span>
          )}
        </label>
      )}

      {/* Main Trigger / Display Input */}
      <div 
        onClick={() => {
          setIsOpen((prev) => !prev);
          setTimeout(() => inputRef.current?.focus(), 60);
        }}
        className={`w-full min-h-[38px] px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 bg-white ${
          isOpen 
            ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/20 shadow-xs' 
            : error 
            ? 'border-rose-400 bg-rose-50/20' 
            : 'border-slate-300 hover:border-slate-400'
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={displayLabel || placeholder}
              className="w-full bg-transparent border-none p-0 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={`text-xs truncate font-bold ${displayLabel ? 'text-slate-800' : 'text-slate-400'}`}>
              {displayLabel || placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {displayLabel && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Clear country"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#8C6D1F]' : ''}`} />
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-rose-500 mt-1 font-medium">{error}</p>
      )}

      {/* Floating Scrollable Top 100 World Countries Dropdown */}
      {isOpen && dropdownCoords && (
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
          className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Quick Header */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 select-none">
            <span>Top 100 World Countries</span>
            <span className="text-[#8C6D1F]">
              {filteredCountries.length} countries
            </span>
          </div>

          {/* Smoothly Scrollable Country List */}
          <div 
            ref={listRef}
            className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-slate-50 scrollbar-thin scrollbar-thumb-slate-300"
          >
            {/* Top Option: 🌍 All Abroad (NRI) Countries */}
            {shouldShowTopOption && (
              <button
                type="button"
                data-index="0"
                onClick={() => handleSelect(allowAny ? 'Any' : 'Working Abroad (NRI)')}
                onMouseEnter={() => setHighlightIndex(0)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  highlightIndex === 0
                    ? 'bg-amber-100/80 text-[#8C6D1F]'
                    : value === 'Any' || value === 'Working Abroad (NRI)'
                    ? 'bg-[#0B192C] text-[#DFB76C]'
                    : 'hover:bg-slate-100 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base leading-none shrink-0">🌍</span>
                  <span className="truncate">
                    {allowAny ? 'All Abroad (NRI) / Any Country' : 'All Abroad (NRI) Countries'}
                  </span>
                </div>
                {(value === 'Any' || value === 'Working Abroad (NRI)') && (
                  <Check className="w-3.5 h-3.5 text-[#DFB76C] shrink-0 ml-2" />
                )}
              </button>
            )}

            {/* List of Countries */}
            {filteredCountries.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No matching country found for "{searchQuery}"
              </div>
            ) : (
              filteredCountries.map((c, idx) => {
                const navIndex = shouldShowTopOption ? idx + 1 : idx;
                const isHighlighted = highlightIndex === navIndex;
                const isSelected = value === c.name || value === c.code;

                return (
                  <button
                    key={c.code + '-' + c.name}
                    type="button"
                    data-index={navIndex}
                    onClick={() => handleSelect(c.name)}
                    onMouseEnter={() => setHighlightIndex(navIndex)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
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
                      <Check className="w-3.5 h-3.5 text-[#DFB76C] shrink-0 ml-2" />
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
