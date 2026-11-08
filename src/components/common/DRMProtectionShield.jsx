import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Lock, ShieldAlert, X } from 'lucide-react';
import { 
  clearClipboard, 
  isScreenshotKeyCombination, 
  initNativeDrmProtection 
} from '../../utils/drmProtection';

/**
 * DRMProtectionShield
 * 
 * Global Digital Rights Management wrapper that protects member photos and identity:
 * 1. Instant 100% solid black blackout curtain on app switcher, window blur, control center pull-down, or snipping tool.
 * 2. Intercepts and blocks screenshot shortcuts (PrintScreen, Meta+Shift+S/3/4, Ctrl+Shift+S, Ctrl+P, Ctrl+S).
 * 3. Sanitizes clipboard upon any capture attempt.
 * 4. Displays prominent warning toast: "🔒 Screenshots and screen capture are disabled for member privacy."
 * 5. Suppresses right-click context menu and drag on all image/profile elements.
 */
export default function DRMProtectionShield({ children }) {
  const [isBlackout, setIsBlackout] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('🔒 Screenshots and screen capture are disabled for member privacy.');

  const toastTimerRef = useRef(null);
  const flashTimerRef = useRef(null);

  // Trigger capture block action (flash blackout, clear clipboard, show toast, vibrate)
  const triggerCaptureBlock = useCallback((customMessage) => {
    // 1. Clear clipboard immediately
    clearClipboard();

    // 2. Mobile haptic feedback if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {
        // Safe ignore
      }
    }

    // 3. Flash black curtain
    setIsFlashActive(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => {
      setIsFlashActive(false);
    }, 2000);

    // 4. Show security warning toast
    setToastMessage(customMessage || '🔒 Screenshots and screen capture are disabled for member privacy.');
    setShowToast(true);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 4000);
  }, []);

  useEffect(() => {
    // Initialize native mobile DRM flags (Capacitor PrivacyScreen, Android FLAG_SECURE)
    initNativeDrmProtection();

    // 1. App Switcher / Window Blur / Visibility Change Handlers
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlackout(true);
      } else {
        // Only unblackout if the document currently has window focus
        if (typeof document.hasFocus === 'function') {
          if (document.hasFocus()) {
            setIsBlackout(false);
          }
        } else {
          setIsBlackout(false);
        }
      }
    };

    const handleWindowBlur = () => {
      // Blur fires on mobile when pulling down control center, notification shade, or opening recent apps
      // Blur fires on desktop when Snipping Tool (Win+Shift+S) steals window focus
      setIsBlackout(true);
    };

    const handleWindowFocus = () => {
      setIsBlackout(false);
    };

    const handlePageHide = () => {
      setIsBlackout(true);
    };

    const handlePageShow = () => {
      setIsBlackout(false);
    };

    // User interaction immediately restores view if document is active and visible
    const handleUserInteraction = () => {
      if (!document.hidden) {
        setIsBlackout(false);
      }
    };

    // 2. Keyboard Screenshot Interception (Capture Phase)
    const handleKeyDown = (e) => {
      if (isScreenshotKeyCombination(e)) {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {
          // ignore
        }
        triggerCaptureBlock('🔒 Screenshots and screen capture are disabled for member privacy.');
      }
    };

    const handleKeyUp = (e) => {
      const key = (e.key || '').toLowerCase();
      const code = e.code || '';
      const keyCode = e.keyCode || e.which;

      if (key === 'printscreen' || code === 'PrintScreen' || keyCode === 44) {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {
          // ignore
        }
        triggerCaptureBlock('🔒 Screenshots and screen capture are disabled for member privacy.');
      }
    };

    // 3. Global Context Menu Interception on Images and Media
    const handleContextMenu = (e) => {
      const target = e.target;
      if (
        target &&
        (target.tagName === 'IMG' ||
          target.tagName === 'VIDEO' ||
          target.tagName === 'CANVAS' ||
          target.closest?.('img, .photo-protected, .profile-card, [data-drm-protected]'))
      ) {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {
          // ignore
        }
        clearClipboard();
        triggerCaptureBlock('🔒 Screenshots and screen capture are disabled for member privacy.');
        return false;
      }
    };

    // 4. Global Drag Start Interception on Images and Media
    const handleDragStart = (e) => {
      const target = e.target;
      if (
        target &&
        (target.tagName === 'IMG' ||
          target.tagName === 'VIDEO' ||
          target.closest?.('img, .photo-protected, .profile-card, [data-drm-protected]'))
      ) {
        try {
          e.preventDefault();
          e.stopPropagation();
        } catch {
          // ignore
        }
        return false;
      }
    };

    // Attach all listeners in capture phase for maximum priority
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    window.addEventListener('pointerdown', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });
    window.addEventListener('mousedown', handleUserInteraction, { passive: true });

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('dragstart', handleDragStart, true);

    // Listen to Capacitor App state if available
    let capacitorListener = null;
    if (window.Capacitor?.Plugins?.App?.addListener) {
      try {
        capacitorListener = window.Capacitor.Plugins.App.addListener('appStateChange', (state) => {
          if (!state?.isActive) {
            setIsBlackout(true);
          } else {
            setIsBlackout(false);
          }
        });
      } catch {
        // ignore
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);

      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('mousedown', handleUserInteraction);

      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('dragstart', handleDragStart, true);

      if (capacitorListener?.remove) {
        try {
          capacitorListener.remove();
        } catch {
          // ignore
        }
      }

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [triggerCaptureBlock]);

  const isCovered = isBlackout || isFlashActive;

  return (
    <>
      {/* Wrapped Application Tree */}
      {children}

      {/* 100% Solid Black Curtain on App Switcher, Window Blur, Snipping Tool, or Screenshot Attempt */}
      {isCovered && (
        <div 
          className="fixed inset-0 bg-black z-[99999] flex flex-col items-center justify-center p-6 text-center select-none pointer-events-auto transition-opacity duration-150"
          style={{ backgroundColor: '#000000' }}
          aria-hidden="true"
        >
          <div className="flex flex-col items-center justify-center text-white space-y-3 opacity-90 animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-2xl">
              <Lock className="w-7 h-7 text-amber-400" />
            </div>
            <h4 className="text-base font-serif font-bold text-white tracking-wide">
              I 4 YOU SECURITY SHIELD
            </h4>
            <p className="text-xs text-rose-300 font-semibold">
              Confidential Member Photos & Profile Protected
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
              Screenshots, recordings, and background previews are disabled for member privacy.
            </p>
          </div>
        </div>
      )}

      {/* Prominent High-Z-Index Security Warning Toast */}
      {showToast && (
        <div 
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[100000] max-w-md w-[92%] sm:w-auto px-4 py-3 rounded-2xl bg-slate-950/95 border border-rose-500/60 text-white shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
          role="alert"
        >
          <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xs font-semibold text-rose-200 flex-1 leading-snug">
            {toastMessage}
          </p>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0 cursor-pointer transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
