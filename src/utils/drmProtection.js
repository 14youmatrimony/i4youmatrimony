/**
 * Digital Rights Management (DRM) & Anti-Capture Protection Utility
 * 
 * Provides native mobile bridge integration (Capacitor, Cordova, Android WebView FLAG_SECURE, iOS PrivacyScreen),
 * clipboard sanitization, and screenshot detection helpers to protect member photos and identities.
 */

/**
 * Detects whether the current runtime environment is a native mobile app container
 * (Capacitor, Cordova, Android WebView, or iOS WebView).
 */
export const isNativeApp = () => {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Capacitor Native Platform check
    if (window.Capacitor?.isNativePlatform?.() || 
        window.Capacitor?.getPlatform?.() === 'android' || 
        window.Capacitor?.getPlatform?.() === 'ios') {
      return true;
    }

    // 2. Cordova check
    if (window.cordova) {
      return true;
    }

    // 3. Android WebView custom bridges
    if (window.Android || window.AndroidBridge || window.AndroidDrmBridge) {
      return true;
    }

    // 4. iOS WebKit message handlers
    if (window.webkit?.messageHandlers?.privacyScreen) {
      return true;
    }

    // 5. User-Agent heuristic for embedded WebViews
    const ua = navigator?.userAgent || '';
    const isAndroidWebView = /wv|Android.*Version\/[\d.]+.*Chrome\/[\d.]+/i.test(ua);
    const isCapacitorApp = /Capacitor/i.test(ua);

    return isAndroidWebView || isCapacitorApp;
  } catch {
    return false;
  }
};

/**
 * Enables native screenshot and screen-recording blocking at the OS level:
 * - Capacitor PrivacyScreen plugin
 * - Android FLAG_SECURE via native bridge
 * - iOS PrivacyScreen via WebKit message handlers
 */
export const enableNativeFlagSecure = async () => {
  if (typeof window === 'undefined') return { success: false, reason: 'ssr' };

  let enabled = false;

  try {
    // 1. Try Capacitor PrivacyScreen plugin (standard Capacitor community plugin)
    if (window.Capacitor?.Plugins?.PrivacyScreen?.enable) {
      try {
        await window.Capacitor.Plugins.PrivacyScreen.enable();
        enabled = true;
      } catch (err) {
        console.warn('[DRM] Capacitor PrivacyScreen.enable failed:', err);
      }
    }

    // 2. Try window.PrivacyScreen (Cordova / Ionic plugin format)
    if (window.PrivacyScreen?.enable) {
      try {
        window.PrivacyScreen.enable();
        enabled = true;
      } catch (err) {
        console.warn('[DRM] window.PrivacyScreen.enable failed:', err);
      }
    }

    // 3. Try custom Android JavaScriptInterface bridge
    if (window.AndroidBridge?.enableFlagSecure) {
      try {
        window.AndroidBridge.enableFlagSecure();
        enabled = true;
      } catch (err) {
        console.warn('[DRM] AndroidBridge.enableFlagSecure failed:', err);
      }
    } else if (window.Android?.enableFlagSecure) {
      try {
        window.Android.enableFlagSecure();
        enabled = true;
      } catch (err) {
        console.warn('[DRM] Android.enableFlagSecure failed:', err);
      }
    }

    // 4. Try iOS WebKit message handler
    if (window.webkit?.messageHandlers?.privacyScreen?.postMessage) {
      try {
        window.webkit.messageHandlers.privacyScreen.postMessage({ action: 'enable' });
        enabled = true;
      } catch (err) {
        console.warn('[DRM] iOS privacyScreen postMessage failed:', err);
      }
    }

    // 5. Try Capacitor core dynamic call if available on window
    if (!enabled && window.Capacitor?.toNative) {
      try {
        window.Capacitor.toNative('PrivacyScreen', 'enable', {});
        enabled = true;
      } catch {
        // Safe fallback
      }
    }
  } catch (err) {
    console.warn('[DRM] Native DRM activation error:', err);
  }

  return { success: enabled, isNative: isNativeApp() };
};

/**
 * Initializes global native DRM protections.
 * Safe to call multiple times or during app bootstrap.
 */
export const initNativeDrmProtection = () => {
  if (typeof window === 'undefined') return;

  // Immediate attempt
  enableNativeFlagSecure();

  // Retry when native device APIs are fully initialized
  if (window.Capacitor) {
    document.addEventListener('deviceready', enableNativeFlagSecure, { once: true });
  }
};

/**
 * Overwrites the clipboard with blank text to neutralize copied images or snippets.
 */
export const clearClipboard = async () => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText('');
      return true;
    }
  } catch {
    // Clipboard API might be restricted in some iframe or insecure contexts
  }

  // Fallback using temporary off-screen textarea
  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = '';
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  } catch {
    // Suppress
  }

  return false;
};

/**
 * Checks whether a keyboard event matches an OS or browser screenshot shortcut:
 * - PrintScreen key
 * - Win + Shift + S (Windows Snipping Tool)
 * - Cmd + Shift + 3/4/5/S (macOS Screenshot / Recording)
 * - Ctrl + Shift + S (Browser Screenshot tool)
 * - Ctrl + P / Cmd + P (Print / Save as PDF)
 * - Ctrl + S / Cmd + S (Save Page / Save HTML)
 */
export const isScreenshotKeyCombination = (event) => {
  if (!event) return false;

  const key = (event.key || '').toLowerCase();
  const code = event.code || '';
  const keyCode = event.keyCode || event.which;

  // 1. PrintScreen key
  if (key === 'printscreen' || code === 'PrintScreen' || keyCode === 44) {
    return true;
  }

  // 2. Windows Snipping Tool (Win+Shift+S) or macOS capture (Cmd+Shift+3/4/5/S)
  if ((event.metaKey || event.ctrlKey) && event.shiftKey) {
    if (key === 's' || key === '3' || key === '4' || key === '5' ||
        code === 'KeyS' || code === 'Digit3' || code === 'Digit4' || code === 'Digit5') {
      return true;
    }
  }

  // 3. Print Dialog (Ctrl+P or Cmd+P)
  if ((event.ctrlKey || event.metaKey) && (key === 'p' || code === 'KeyP')) {
    return true;
  }

  // 4. Save Page Dialog (Ctrl+S or Cmd+S)
  if ((event.ctrlKey || event.metaKey) && (key === 's' || code === 'KeyS')) {
    return true;
  }

  return false;
};

/**
 * Helper to prevent context menu and propagation.
 */
export const preventContextMenu = (event) => {
  if (event) {
    try {
      event.preventDefault();
      event.stopPropagation();
    } catch {
      // ignore
    }
  }
  return false;
};
