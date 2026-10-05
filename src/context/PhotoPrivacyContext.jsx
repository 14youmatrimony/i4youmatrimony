import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PhotoPrivacyContext = createContext({
  screenshotRestricted: true,
  setScreenshotRestricted: () => {},
  watermarkEnabled: false,
  setWatermarkEnabled: () => {},
  isCaptureBlocked: false,
  showScreenshotAlert: false,
  alertReason: '',
  triggerScreenshotBlock: () => {},
  dismissScreenshotAlert: () => {}
});

export function PhotoPrivacyProvider({ children }) {
  const [screenshotRestricted, setScreenshotRestricted] = useState(true);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [isCaptureBlocked, setIsCaptureBlocked] = useState(false);
  const [showScreenshotAlert, setShowScreenshotAlert] = useState(false);
  const [alertReason, setAlertReason] = useState('');

  const triggerScreenshotBlock = useCallback((reason = 'system') => {
    if (!screenshotRestricted) return;

    // Haptic feedback if supported on mobile devices
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {
        // ignore
      }
    }

    setAlertReason(reason);
    setIsCaptureBlocked(true);
    setShowScreenshotAlert(true);

    // Clear capture block screen after brief flash/shield
    setTimeout(() => {
      setIsCaptureBlocked(false);
    }, 2200);

    // Auto dismiss banner after 4.5 seconds
    setTimeout(() => {
      setShowScreenshotAlert(false);
    }, 4500);
  }, [screenshotRestricted]);

  const dismissScreenshotAlert = useCallback(() => {
    setShowScreenshotAlert(false);
    setIsCaptureBlocked(false);
  }, []);

  useEffect(() => {
    if (!screenshotRestricted) return;

    // Listen for OS & Browser screenshot shortcuts
    const handleKeyDown = (e) => {
      // 1. PrintScreen key (Windows / Linux)
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        triggerScreenshotBlock('printscreen');
        return;
      }

      // 2. Windows Snipping Tool (Win + Shift + S) or Mac (Cmd + Shift + 3/4/5/S)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        const key = e.key?.toLowerCase();
        if (key === 's' || key === '3' || key === '4' || key === '5') {
          triggerScreenshotBlock('snipping-tool');
        }
      }

      // 3. Print dialog (Ctrl + P or Cmd + P)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        triggerScreenshotBlock('print-prohibited');
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        triggerScreenshotBlock('printscreen');
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [screenshotRestricted, triggerScreenshotBlock]);

  return (
    <PhotoPrivacyContext.Provider
      value={{
        screenshotRestricted,
        setScreenshotRestricted,
        watermarkEnabled,
        setWatermarkEnabled,
        isCaptureBlocked,
        showScreenshotAlert,
        alertReason,
        triggerScreenshotBlock,
        dismissScreenshotAlert
      }}
    >
      {children}
    </PhotoPrivacyContext.Provider>
  );
}

export function usePhotoPrivacy() {
  const context = useContext(PhotoPrivacyContext);
  if (!context) {
    throw new Error('usePhotoPrivacy must be used within a PhotoPrivacyProvider');
  }
  return context;
}

export default PhotoPrivacyContext;
