import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Check, ChevronDown, Plus } from 'lucide-react';

/**
 * SearchableSelect Component
 * Compact popup modal (not full screen) with top search bar,
 * attractive decreased size item rows, and quick selection.
 */
export default function SearchableSelect({
  label,
  title,
  placeholder = 'Select an option',
  displayLabel,
  searchPlaceholder,
  value,
  onChange,
  options = [],
  disabled = false,
  className = '',
  buttonClassName = '',
  icon: Icon,
  required = false,
  error = null,
  badge = null,
  allowCustom = false,
  customActionText = 'Add',
  onAddCustom = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Normalize options into { label, value, subLabel }
  const normalizedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    return options.map((opt) => {
      if (opt === null || opt === undefined) return { label: '', value: '' };
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { label: String(opt), value: String(opt) };
      }
      return {
        label: opt.label || opt.name || opt.state || String(opt.value ?? ''),
        value: opt.value !== undefined ? String(opt.value) : (opt.name || opt.state || opt.label || ''),
        subLabel: opt.subLabel || opt.region || opt.category || null
      };
    });
  }, [options]);

  // Find currently selected option object
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null) return null;
    const strVal = String(value);
    if (strVal === '') {
      return normalizedOptions.find((o) => o.value === '') || null;
    }
    const found = normalizedOptions.find((o) => o.value === strVal || o.label === strVal);
    if (found) return found;
    if (allowCustom && strVal.trim()) {
      return { label: strVal, value: strVal };
    }
    return null;
  }, [normalizedOptions, value, allowCustom]);

  // Filtered options based on search input
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return normalizedOptions;

    const directMatches = normalizedOptions.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchValue = opt.value.toLowerCase().includes(q);
      const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(q) : false;
      return matchLabel || matchValue || matchSub;
    });

    if (directMatches.length > 0) return directMatches;

    // Smart fallback for numbers (e.g. typing "172" or "164" or "131" in height)
    const numQ = parseInt(q, 10);
    if (!isNaN(numQ) && numQ >= 120 && numQ <= 220) {
      return normalizedOptions.filter((opt) => {
        const m = opt.label.match(/(\d+)\s*cm/i);
        if (m) {
          const optCm = parseInt(m[1], 10);
          return Math.abs(optCm - numQ) <= 2;
        }
        return false;
      });
    }

    return [];
  }, [normalizedOptions, searchQuery]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => {
        document.body.style.overflow = '';
        clearTimeout(timer);
      };
    } else {
      document.body.style.overflow = '';
      setSearchQuery('');
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (val) => {
    if (typeof onChange === 'function') {
      onChange(val);
    }
    setIsOpen(false);
  };

  const displayTitle = title || label || 'Select Option';
  const displaySearchPlaceholder = searchPlaceholder || `Search ${displayTitle.replace(/[*:]/g, '').trim()}...`;

  return (
    <div className={`relative ${className}`}>
      {/* Optional Label */}
      {label && (
        <label className="flex items-center justify-between font-semibold text-slate-700 mb-1 text-xs">
          <span className="flex items-center gap-1 truncate">
            {Icon && <Icon className="w-3.5 h-3.5 text-[#8C6D1F] shrink-0" />}
            <span>{label}</span>
          </span>
          {badge && (
            <span className="text-[10px] font-bold text-[#8C6D1F] bg-amber-50 px-2 py-0.2 rounded-full border border-amber-200 shrink-0">
              {badge}
            </span>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(true)}
        className={`w-full min-h-[40px] px-3 py-2 rounded-xl border text-xs font-medium text-left flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : error
            ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-200'
            : selectedOption
            ? 'border-slate-300 bg-slate-50 text-slate-900 hover:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]'
            : 'border-slate-300 bg-slate-50 text-slate-400 hover:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]'
        } ${buttonClassName}`}
      >
        <span className="truncate flex-1">
          {displayLabel !== undefined 
            ? displayLabel 
            : (selectedOption ? selectedOption.label : placeholder)}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {error && (
        <p className="text-[10px] text-rose-500 mt-0.5 font-medium">{error}</p>
      )}

      {/* Compact 50% Width Popup Modal (As Requested: All list size widths 50% kurakkam) */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className={`${allowCustom ? 'w-[75%] min-w-[240px] max-w-[290px]' : 'w-[52%] min-w-[200px] max-w-[240px]'} bg-white rounded-2xl shadow-2xl flex flex-col max-h-[65vh] overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Title and Close Button */}
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="font-serif font-bold text-slate-900 text-xs flex items-center gap-1 truncate min-w-0 pr-1.5">
                {Icon && <Icon className="w-3.5 h-3.5 text-[#DFB76C] shrink-0" />}
                <span className="truncate">{displayTitle}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Top Search Bar */}
            <div className="p-2 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={displaySearchPlaceholder}
                  className="w-full pl-6 pr-5 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-medium focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] focus:outline-none shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Option List - Decreased size, Attractive, Single-column */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
              
              {/* Custom Add Option Button when allowCustom is true and user typed something not matching */}
              {allowCustom && searchQuery.trim() && !normalizedOptions.some(opt => 
                opt.label.toLowerCase() === searchQuery.trim().toLowerCase() || 
                opt.value.toLowerCase() === searchQuery.trim().toLowerCase()
              ) && (
                <button
                  type="button"
                  onClick={() => {
                    const customVal = searchQuery.trim();
                    if (typeof onAddCustom === 'function') {
                      onAddCustom(customVal);
                    }
                    handleSelect(customVal);
                  }}
                  className="w-full px-2 py-1.5 mb-1.5 rounded-lg text-left flex items-center justify-between gap-1.5 bg-gradient-to-r from-amber-50 to-amber-100/90 hover:from-amber-100 hover:to-amber-200/90 text-[#8C6D1F] border border-amber-300 font-bold transition-all cursor-pointer shadow-2xs group shrink-0"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-4 h-4 rounded-full bg-[#DFB76C] text-[#0B192C] flex items-center justify-center shrink-0">
                      <Plus className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span className="text-[11px] truncate">
                      {customActionText} <span className="font-extrabold text-[#0B192C]">"{searchQuery.trim()}"</span>
                    </span>
                  </div>
                  <span className="text-[8px] uppercase tracking-wider bg-white/90 px-1 py-0.5 rounded border border-amber-300/60 shrink-0 font-extrabold text-[#8C6D1F]">
                    + Add
                  </span>
                </button>
              )}

              {filteredOptions.length === 0 ? (
                allowCustom && searchQuery.trim() ? (
                  <div className="py-4 px-2 text-center text-xs">
                    <div className="w-7 h-7 rounded-full bg-amber-50 text-[#8C6D1F] border border-amber-200 flex items-center justify-center mx-auto mb-1.5">
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <p className="font-bold text-slate-800 text-[11px] mb-0.5">
                      "{searchQuery.trim()}" not in list
                    </p>
                    <p className="text-[9px] text-slate-400 mb-2">
                      Click below to add it directly.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const customVal = searchQuery.trim();
                        if (typeof onAddCustom === 'function') {
                          onAddCustom(customVal);
                        }
                        handleSelect(customVal);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-extrabold text-[10px] shadow-2xs hover:shadow transition-all inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      <span>Add "{searchQuery.trim()}"</span>
                    </button>
                  </div>
                ) : (
                  <div className="py-6 px-2 text-center text-xs text-slate-500">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-1.5">
                      <Search className="w-3 h-3" />
                    </div>
                    <p className="font-semibold text-[11px] text-slate-700">No match</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Try another keyword.
                    </p>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="mt-2 px-2 py-0.5 rounded bg-amber-50 text-[#8C6D1F] border border-amber-200 text-[10px] font-semibold cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selectedOption && selectedOption.value === opt.value;
                  return (
                    <button
                      key={opt.value + opt.label}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full min-h-[28px] px-2 py-1 rounded-lg text-left flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/90 text-[#8C6D1F] border border-amber-300 font-bold shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-100/70 border border-transparent font-medium active:bg-slate-200/60'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] block truncate leading-tight">
                          {opt.label}
                        </span>
                        {opt.subLabel && (
                          <span className="text-[9px] text-slate-400 block truncate">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-3.5 h-3.5 rounded-full bg-[#DFB76C] text-[#0B192C] flex items-center justify-center shrink-0">
                          <Check className="w-2 h-2 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Sticky Bottom Actions */}
            <div className="px-2.5 py-1.5 bg-white border-t border-slate-100 flex items-center justify-end shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-[10px] font-semibold hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
