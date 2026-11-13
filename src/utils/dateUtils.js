/**
 * Cross-Platform Safe Date & Age Utilities for Web, Android & iOS WebKit
 *
 * iOS Safari / WebKit strictly rejects non-ISO date formats like:
 * - "YYYY-MM-DD HH:mm:ss" (space separator between date and time)
 * - "DD-MM-YYYY" or "DD/MM/YYYY"
 * and returns Invalid Date / NaN.
 *
 * These utilities ensure flawless, crash-proof date parsing and age calculations
 * across all browsers, operating systems, and WebView runtimes.
 */

/**
 * Safely parses any date string, timestamp, or Date object into a valid Date.
 * Returns null if the value is invalid or cannot be parsed.
 */
export function safeParseDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    let s = val.trim();
    if (!s || s === 'null' || s === 'undefined') return null;

    // 1. Normalize SQL timestamps with space separators: "2026-10-16 12:00:00" -> "2026-10-16T12:00:00"
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) {
      s = s.replace(/\s+/, 'T');
    }

    // 2. Handle DD-MM-YYYY or DD/MM/YYYY format commonly used in India
    const ddmmyyyy = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    // 3. Handle YYYY-MM-DD format explicitly to avoid UTC timezone offsets
    const yyyymmdd = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      const day = parseInt(yyyymmdd[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    // 4. Standard Date parsing fallback
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * Returns numeric timestamp in milliseconds. Never returns NaN.
 * Safe for use in sorting comparisons: (a, b) => safeGetTime(b.created_at) - safeGetTime(a.created_at)
 */
export function safeGetTime(dateVal, fallback = 0) {
  const d = safeParseDate(dateVal);
  if (!d) return fallback;
  const time = d.getTime();
  return isNaN(time) ? fallback : time;
}

/**
 * Calculates candidate age accurately from Date of Birth.
 * Guaranteed to return a valid positive integer between 18 and 120.
 * Falls back to default age (26) if date cannot be parsed or yields NaN.
 */
export function safeCalculateAge(dobVal, fallback = 26) {
  if (typeof dobVal === 'number' && !isNaN(dobVal) && dobVal >= 18 && dobVal <= 100) {
    return Math.floor(dobVal);
  }
  const d = safeParseDate(dobVal);
  if (!d) return fallback;

  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
    age--;
  }

  if (isNaN(age) || age < 18 || age > 120) {
    return fallback;
  }
  return age;
}
