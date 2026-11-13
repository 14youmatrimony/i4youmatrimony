/**
 * Safe LocalStorage & SessionStorage Helpers with iOS Safari Private Mode & Quota Guards
 */

export const safeStorage = {
  getItem(key) {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn(`[safeStorage] Failed to read "${key}" from localStorage:`, e?.message);
      return null;
    }
  },

  setItem(key, value) {
    if (typeof window === 'undefined') return false;
    try {
      // Guard against caching empty arrays for profile cache
      if (key === 'i4u_cached_profiles') {
        if (!value || value === '[]' || value === 'null') {
          return false;
        }
      }
      window.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`[safeStorage] Failed to write "${key}" to localStorage:`, e?.message);
      return false;
    }
  },

  removeItem(key) {
    if (typeof window === 'undefined') return false;
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  },

  getJSON(key, fallback = null) {
    const raw = this.getItem(key);
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  },

  setJSON(key, value) {
    // Never serialize empty array for profile cache
    if (key === 'i4u_cached_profiles') {
      if (!Array.isArray(value) || value.length === 0) {
        return false;
      }
    }
    try {
      return this.setItem(key, JSON.stringify(value));
    } catch (e) {
      return false;
    }
  }
};
