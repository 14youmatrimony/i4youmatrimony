import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Check, Globe, ChevronDown } from 'lucide-react';
import { 
  WORLD_COUNTRIES, 
  POPULAR_NRI_COUNTRIES, 
  findCountryByName, 
  searchWorldCountries 
} from '../../data/worldCountries';

/**
 * WorldCountrySearchSelect
 * Universal searchable country selector with all ~195 world countries and flags.
 * Used in Profile Edit (Current Country Abroad & Partner Preferences) and Registration.
 */
export default function WorldCountrySearchSelect({
  label,
  value,
  onChange,
  placeholder = '🔍 Search any country...',
  excludeIndia = false,
  allowAny = false,
  required = false,
  className = '',
  buttonClassName = '',
  error = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownCoords, setDropdownCoords] = useState(null);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Identify current selected country object
  const selectedCountryObj = useMemo(() => {
    if (!value || value === 'Any' || value === 'All' || value === 'Abroad / Any NRI' || value === 'India') {
      return null;
    }
    return findCountryByName(value);
  }, [value]);

  // Display label for button / input
  const displayLabel = useMemo(() => {
    if (!value) return '';
    if (value === 'Any') return '🌎 Any Country';
    if (value === 'India') return '🇮🇳 India';
    if (value === 'Abroad / Any NRI' || value === 'Abroad (NRI)') return '✈️ Abroad / Any NRI';
    if (selectedCountryObj) {
      return `${selectedCountryObj.flag} ${selectedCountryObj.name}`;
    }
    return value;
  }, [value, selectedCountryObj]);

  // Filtered country list
  const filteredCountries = useMemo(() => {
    return searchWorldCountries(searchQuery, { excludeIndia });
  }, [searchQuery, excludeIndia]);

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
        const showAbove = spaceBelow < 200 && rect.top > spaceBelow;

        setDropdownCoords({
          top: showAbove ? undefined : rect.bottom + 4,
          bottom: showAbove ? window.innerHeight - rect.top + 4 : undefined,
          left,
          width: Math.max(rect.width, 280),
          maxHeight: Math.min(280, showAbove ? rect.top - 24 : spaceBelow)
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
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
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
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-[#8C6D1F]' : ''}`} />
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-rose-500 mt-1 font-medium">{error}</p>
      )}

      {/* Floating Dropdown List */}
      {isOpen && dropdownCoords && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownCoords.top,
            bottom: dropdownCoords.bottom,
            left: dropdownCoords.left,
            width: dropdownCoords.width,
            maxHeight: dropdownCoords.maxHeight || 280,
            zIndex: 9999
          }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Top Search Filter inside Dropdown (for quick typing on mobile) */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type to filter 195+ countries..."
              className="w-full bg-transparent border-none text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Special Quick Options (if allowAny is enabled) */}
          {allowAny && !searchQuery && (
            <div className="p-1.5 border-b border-slate-100 bg-amber-50/40 space-y-0.5">
              {[
                { id: 'Any', label: '🌎 Any Country (Open to all locations)' },
                { id: 'India', label: '🇮🇳 India Only' },
                { id: 'Abroad / Any NRI', label: '✈️ Abroad / Any NRI Country' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    value === opt.id 
                      ? 'bg-[#0B192C] text-[#DFB76C]' 
                      : 'hover:bg-amber-100/60 text-slate-800'
                  }`}
                >
                  <span>{opt.label}</span>
                  {value === opt.id && <Check className="w-3.5 h-3.5 text-[#DFB76C]" />}
                </button>
              ))}
            </div>
          )}

          {/* Country Items Scroll Container */}
          <div className="overflow-y-auto p-1.5 space-y-0.5 max-h-56 divide-y divide-slate-50">
            {filteredCountries.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No matching country found for "{searchQuery}"
              </div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = value === c.name || value === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelect(c.name)}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
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
