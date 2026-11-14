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

/**
 * Formats a message timestamp into strict 12-hour format with AM/PM (e.g., "10:30 AM", "2:15 PM").
 * Guarantees uniform 12-hour display for both sender and receiver across all operating systems.
 */
export function formatChatTime12Hour(timestampOrDate, fallbackTime = null) {
  if (!timestampOrDate && !fallbackTime) {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  // Handle strings that may already be formatted
  if (typeof timestampOrDate === 'string') {
    const trimmed = timestampOrDate.trim();
    // 12-hour string (e.g., "10:30 AM", "02:15 pm")
    const match12 = trimmed.match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/i);
    if (match12) {
      const h = parseInt(match12[1], 10);
      const m = match12[2];
      const ampm = match12[3].toUpperCase();
      return `${h}:${m} ${ampm}`;
    }
    // 24-hour string (e.g., "14:30", "09:05", "14:30:00")
    const match24 = trimmed.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/);
    if (match24) {
      let h = parseInt(match24[1], 10);
      const m = match24[2];
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${m} ${ampm}`;
    }
  }

  let d = safeParseDate(timestampOrDate);
  if (!d && fallbackTime) {
    return formatChatTime12Hour(fallbackTime, null);
  }
  if (!d) {
    d = new Date();
  }

  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * Returns center-aligned date divider label for chat view in English (e.g., "25 November 2026").
 */
export function formatChatDateDivider(timestampOrDate) {
  const d = safeParseDate(timestampOrDate) || new Date();
  const day = d.getDate();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Returns a standardized date grouping key (YYYY-MM-DD) for grouping chat messages by day.
 */
export function getMessageDateKey(timestampOrDate) {
  const d = safeParseDate(timestampOrDate) || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
