import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Globe, Search, X, Check, ChevronDown } from 'lucide-react';
import { TOP_100_WORLD_COUNTRIES } from '../../data/worldCountries';

const COUNTRY_LIST = [
  'India',
  ...TOP_100_WORLD_COUNTRIES.map(c => c.name).filter(n => n !== 'India')
];

export function parsePreferredCountries(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map(v => String(v || '').trim()).filter(v => v && v !== 'Any');
  }
  const str = String(val).trim();
  if (!str || str === 'Any') return [];
  if (str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.map(v => String(v || '').trim()).filter(v => v && v !== 'Any');
      }
    } catch (e) {}
  }
  return str
    .split(',')
    .map(s => s.trim())
    .filter(s => s && s !== 'Any');
}

export default function MultiCountrySelect({
  label = 'Preferred Countries (Select up to 10)',
  value = 'Any',
  onChange,
  maxSelections = 10
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const selectedList = useMemo(() => parsePreferredCountries(value), [value]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRY_LIST;
    return COUNTRY_LIST.filter(c => c.toLowerCase().includes(q));
  }, [search]);

  const emitList = (nextList) => {
    if (!nextList.length) {
      onChange?.('Any');
    } else {
      onChange?.(nextList.join(', '));
    }
  };

  const toggleCountry = (countryName) => {
    if (selectedList.includes(countryName)) {
      emitList(selectedList.filter(c => c !== countryName));
    } else {
      if (selectedList.length >= maxSelections) return;
      emitList([...selectedList, countryName]);
    }
  };

  const removeCountry = (countryName) => {
    emitList(selectedList.filter(c => c !== countryName));
  };

  return (
    <div ref={containerRef} className="relative space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-[#4E0C22]" />
          <span>{label}</span>
        </label>
        <span className="text-[10px] font-semibold text-[#4E0C22]">
          {selectedList.length === 0 ? 'Any Country' : `${selectedList.length} / ${maxSelections} selected`}
        </span>
      </div>

      {/* Selected Pills Box */}
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className="min-h-[42px] w-full px-3 py-2 rounded-xl bg-white border border-[#E7CCD3] hover:border-[#8E5766] flex flex-wrap items-center justify-between gap-2 cursor-pointer transition-colors"
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          {selectedList.length === 0 ? (
            <span className="text-xs text-slate-500">Any Country (click to select 5+ countries)</span>
          ) : (
            selectedList.map((country) => (
              <span
                key={country}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F7E2E7] border border-[#E4C1CA] text-[#4E0C22] text-[11px] font-semibold"
              >
                <span>{country}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCountry(country);
                  }}
                  className="p-0.5 rounded-full hover:bg-[#4E0C22]/15 text-[#4E0C22] cursor-pointer"
                  aria-label={`Remove ${country}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-2xl bg-white border border-[#E7CCD3] shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-[#F5E1E6]">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country (e.g. India, UAE, UK, USA, Canada)..."
              className="w-full text-xs bg-transparent focus:outline-none text-slate-800"
            />
            {selectedList.length > 0 && (
              <button
                type="button"
                onClick={() => emitList([])}
                className="text-[10px] font-bold text-[#4E0C22] hover:underline shrink-0 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
            {filteredCountries.map((country) => {
              const isSelected = selectedList.includes(country);
              const disabled = !isSelected && selectedList.length >= maxSelections;
              return (
                <button
                  key={country}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleCountry(country)}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#F7E2E7]/60 text-[#4E0C22] font-bold'
                      : disabled
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{country}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#4E0C22]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
