import React, { useRef, useState } from 'react';

/**
 * DualRangeSlider
 * Dual-thumb range slider for selecting min and max ranges (e.g., age or budget).
 * 
 * @param {number} min - Minimum allowed value (default: 21)
 * @param {number} max - Maximum allowed value (default: 45)
 * @param {number} minVal - Current lower value (e.g., min age)
 * @param {number} maxVal - Current upper value (e.g., max age)
 * @param {function} onChange - Callback returning { min, max }
 * @param {number} step - Step increment (default: 1)
 * @param {number} minGap - Minimum distance between min and max (default: 1)
 */
export default function DualRangeSlider({
  min = 21,
  max = 45,
  minVal = 21,
  maxVal = 35,
  onChange,
  step = 1,
  minGap = 1,
  className = ''
}) {
  const [activeThumb, setActiveThumb] = useState(null);
  const trackRef = useRef(null);

  // Normalize values within bounds
  const clampedMin = Math.max(min, Math.min(minVal, maxVal - minGap));
  const clampedMax = Math.min(max, Math.max(maxVal, clampedMin + minGap));

  const minPercent = Math.min(100, Math.max(0, ((clampedMin - min) / (max - min)) * 100));
  const maxPercent = Math.min(100, Math.max(0, ((clampedMax - min) / (max - min)) * 100));

  const handleMinChange = (e) => {
    const value = Math.min(Number(e.target.value), clampedMax - minGap);
    onChange && onChange({ min: value, max: clampedMax });
  };

  const handleMaxChange = (e) => {
    const value = Math.max(Number(e.target.value), clampedMin + minGap);
    onChange && onChange({ min: clampedMin, max: value });
  };

  const handleTrackPointerDown = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const rawVal = min + percent * (max - min);
    const clickedVal = Math.round(rawVal / step) * step;

    const distToMin = Math.abs(clickedVal - clampedMin);
    const distToMax = Math.abs(clickedVal - clampedMax);

    if (distToMin < distToMax) {
      const newMin = Math.min(clickedVal, clampedMax - minGap);
      setActiveThumb('min');
      onChange && onChange({ min: newMin, max: clampedMax });
    } else {
      const newMax = Math.max(clickedVal, clampedMin + minGap);
      setActiveThumb('max');
      onChange && onChange({ min: clampedMin, max: newMax });
    }
  };

  return (
    <div
      ref={trackRef}
      onPointerDown={handleTrackPointerDown}
      className={`relative flex items-center w-full h-6 select-none cursor-pointer ${className}`}
    >
      {/* Background Track */}
      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-slate-200 rounded-full" />

      {/* Active Highlight Range Bar */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] rounded-full pointer-events-none"
        style={{
          left: `${minPercent}%`,
          width: `${Math.max(0, maxPercent - minPercent)}%`
        }}
      />

      {/* Min Value Input (Left Starting Button) */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clampedMin}
        onPointerDown={(e) => {
          e.stopPropagation();
          setActiveThumb('min');
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          setActiveThumb('min');
        }}
        onFocus={() => setActiveThumb('min')}
        onBlur={() => setActiveThumb(null)}
        onChange={handleMinChange}
        className="dual-range-input"
        style={{
          zIndex: activeThumb === 'min' || clampedMin > max - 5 ? 25 : 15
        }}
        aria-label="Minimum Age"
      />

      {/* Max Value Input (Right Ending Button) */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clampedMax}
        onPointerDown={(e) => {
          e.stopPropagation();
          setActiveThumb('max');
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          setActiveThumb('max');
        }}
        onFocus={() => setActiveThumb('max')}
        onBlur={() => setActiveThumb(null)}
        onChange={handleMaxChange}
        className="dual-range-input"
        style={{
          zIndex: activeThumb === 'max' ? 25 : 15
        }}
        aria-label="Maximum Age"
      />
    </div>
  );
}
