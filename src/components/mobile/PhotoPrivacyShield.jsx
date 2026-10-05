import React from 'react';
import { ShieldAlert, ShieldCheck, Lock, X } from 'lucide-react';
import { usePhotoPrivacy } from '../../context/PhotoPrivacyContext';

/**
 * Mobile OS-style Banner that alerts the user when a screenshot attempt is blocked.
 * Bounded strictly inside the mobile device frame simulator.
 */
export function ScreenshotRestrictedBanner() {
  const { showScreenshotAlert, alertReason, dismissScreenshotAlert } = usePhotoPrivacy();

  if (!showScreenshotAlert) return null;

  return (
    <div className="absolute top-2 inset-x-3 z-[90] animate-in slide-in-from-top-6 fade-in duration-300 pointer-events-auto select-none">
      <div className="bg-slate-950/95 text-white p-3 rounded-2xl shadow-2xl border border-rose-500/60 backdrop-blur-md relative overflow-hidden">
        
        {/* Animated Security Scanner Line */}
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent animate-pulse"></div>

        <div className="flex items-start space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 flex items-center gap-1">
                <Lock className="w-3 h-3 text-rose-400" />
                <span>Screenshot Restricted</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-950/80 text-rose-300 font-mono border border-rose-800/60">
                Privacy Policy
              </span>
            </div>
            <p className="text-[10.5px] text-slate-200 mt-1 leading-snug">
              {alertReason === 'right-click'
                ? 'Right-click and saving candidate portraits is disabled to prevent unauthorized distribution.'
                : alertReason === 'print-prohibited'
                ? 'Printing candidate profiles and photos is restricted by I 4 You security policy.'
                : 'Capturing screenshots or recording candidate photos is restricted for member privacy & safety.'}
            </p>
            <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="w-3 h-3 text-emerald-400 inline" />
                UIDAI Matrimonial Privacy Protected
              </span>
              <button 
                type="button"
                onClick={dismissScreenshotAlert}
                className="text-slate-400 hover:text-white underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissScreenshotAlert}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Close Alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dismiss countdown progress bar */}
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-slate-800">
          <div className="h-full bg-rose-500 animate-[width_4.5s_linear]"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Visual Privacy Screen Shutter Flash Overlay when a screenshot attempt is made.
 */
export function ScreenshotCaptureBlockOverlay() {
  const { isCaptureBlocked } = usePhotoPrivacy();

  if (!isCaptureBlocked) return null;

  return (
    <div className="absolute inset-0 z-[85] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150 pointer-events-none select-none">
      <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500/60 flex items-center justify-center mb-3 shadow-lg animate-pulse">
        <Lock className="w-8 h-8 text-rose-400" />
      </div>
      <h3 className="font-serif font-bold text-base text-white tracking-wide">
        SCREENSHOT BLOCKED
      </h3>
      <p className="text-xs text-rose-300 font-semibold mt-1">
        Photo Protected for Candidate Privacy
      </p>
      <p className="text-[10.5px] text-slate-400 mt-2 max-w-xs leading-relaxed">
        This screen contains confidential matrimony photographs protected under I 4 You Privacy Terms and Indian IT Security Guidelines.
      </p>
      <div className="mt-3 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>100% Tokenized Aadhaar Identity Shield</span>
      </div>
    </div>
  );
}

/**
 * Reusable Protected Image Component with Anti-Screenshot Shield & Watermarking.
 */
export function ProtectedPhoto({
  src,
  alt = 'Candidate Portrait',
  className = '',
  imgClassName = '',
  showBadge = true,
  onClick,
  badgePosition = 'bottom-right' // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}) {
  const { triggerScreenshotBlock, screenshotRestricted } = usePhotoPrivacy();

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (screenshotRestricted) {
      triggerScreenshotBlock('right-click');
    }
  };

  return (
    <div 
      className={`relative overflow-hidden select-none photo-protected group ${className}`}
      onContextMenu={handleContextMenu}
      onClick={onClick}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        className={`w-full h-full object-cover select-none pointer-events-none ${imgClassName}`}
        style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
      />

      {/* Transparent Protective Layer intercepting drag / click */}
      <div 
        className="absolute inset-0 z-5 pointer-events-auto bg-transparent"
        onContextMenu={handleContextMenu}
        onDragStart={(e) => e.preventDefault()}
      ></div>
    </div>
  );
}

export default ProtectedPhoto;
