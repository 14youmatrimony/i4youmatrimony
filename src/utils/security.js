/**
 * Enterprise Frontend Security Utilities for I 4 You Matrimonial Platform
 * Provides:
 * 1. Client-Side Input Sanitization (XSS & Script Injection Neutralization)
 * 2. SQL Injection String Sanitization & Safe Search Processing
 * 3. Strict Password Complexity Verification & Web Crypto Hashing
 * 4. Indian Mobile Number & Email Verification
 */

// Regex patterns
const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const DANGEROUS_SQL_PATTERNS = /(--|;|\/\*|\*\/|\b(UNION(\s+ALL)?|SELECT|DROP|ALTER|DELETE|UPDATE|INSERT|EXEC)\b|'\s*OR\s*'?1'?='?1)/gi;
const DANGEROUS_TAGS_REGEX = /<\s*(script|iframe|object|embed|applet|svg|link|meta|style|base|form)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi;
const SELF_CLOSING_DANGEROUS_TAGS = /<\s*(script|iframe|object|embed|applet|svg|link|meta|style|base|img)[^>]*>/gi;
const EVENT_HANDLER_REGEX = /on[a-z]+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi;
const JAVASCRIPT_URI_REGEX = /javascript\s*:\s*/gi;
const HTML_TAG_REGEX = /<[^>]+>/g;

/**
 * Sanitizes plain text input:
 * - Strips NULL bytes and ASCII control characters (preserving safe whitespace)
 * - Removes script, iframe, and active HTML content
 * - Neutralizes inline event handlers (onerror=, onload=, etc.)
 * - Neutralizes javascript: pseudo-protocol
 * - Strips or safely encodes residual tags
 */
export function sanitizeInput(input, options = {}) {
  if (input === null || input === undefined) return '';
  let str = String(input);

  const {
    allowMultiline = false,
    maxLength = 500,
    stripHtml = true
  } = options;

  // 1. Remove NULL bytes and control characters
  str = str.replace(/\0/g, '');
  if (!allowMultiline) {
    str = str.replace(/[\r\n\t]/g, ' ');
  }
  // Strip non-printable ASCII (0-8, 11-12, 14-31, 127)
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 2. Remove dangerous active tags
  str = str.replace(DANGEROUS_TAGS_REGEX, '');
  str = str.replace(SELF_CLOSING_DANGEROUS_TAGS, '');

  // 3. Remove inline event handlers
  str = str.replace(EVENT_HANDLER_REGEX, '');

  // 4. Remove javascript: pseudo-protocol
  str = str.replace(JAVASCRIPT_URI_REGEX, '');

  // 5. Strip all remaining HTML tags if stripHtml is true
  if (stripHtml) {
    str = str.replace(HTML_TAG_REGEX, '');
  }

  // 6. Trim leading/trailing whitespace
  str = str.trim();

  // 7. Enforce maximum length
  if (maxLength && str.length > maxLength) {
    str = str.slice(0, maxLength);
  }

  return str;
}

/**
 * Sanitizes an email address:
 * - Trims and lowercases
 * - Rejects consecutive dots and invalid formats
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const clean = email.trim().toLowerCase().replace(/\0/g, '');

  if (clean.includes('..') || clean.startsWith('.') || clean.endsWith('.')) {
    return '';
  }

  if (!EMAIL_REGEX.test(clean)) {
    return '';
  }

  return clean;
}

/**
 * Sanitizes and normalizes an Indian 10-digit mobile number:
 * - Extracts digits
 * - Strips leading 0 or +91 country code
 * - Validates starting digit 6-9
 */
export function sanitizePhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10 || !INDIAN_MOBILE_REGEX.test(digits)) {
    return '';
  }

  return digits;
}

/**
 * Sanitizes search queries against SQL injection and script injection:
 * Strips dangerous SQL keywords, comment characters, and HTML tags.
 */
export function sanitizeSearchTerm(query) {
  if (!query || typeof query !== 'string') return '';
  let clean = query.trim();

  // Strip dangerous SQL patterns
  clean = clean.replace(DANGEROUS_SQL_PATTERNS, ' ');

  // Strip HTML and script tags
  clean = sanitizeInput(clean, { maxLength: 100, stripHtml: true });

  // Collapse multiple spaces
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

/**
 * Sanitizes chat messages to prevent XSS while preserving emojis and punctuation.
 */
export function sanitizeChatMessage(message) {
  if (!message || typeof message !== 'string') return '';
  return sanitizeInput(message, {
    allowMultiline: true,
    maxLength: 1000,
    stripHtml: true
  });
}

/**
 * Evaluates password strength and returns criteria breakdown and score (0-4):
 * Criteria:
 * - Minimum 8 characters
 * - Uppercase letter (A-Z)
 * - Lowercase letter (a-z)
 * - Numeric digit (0-9)
 * - Special character (!@#$%^&*...)
 */
export function validatePasswordStrength(password) {
  const pwd = String(password || '');

  const criteria = {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /\d/.test(pwd),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd)
  };

  let score = 0;
  if (criteria.length) score++;
  if (criteria.upper && criteria.lower) score++;
  if (criteria.number) score++;
  if (criteria.special) score++;

  const commonWeak = [
    'password', 'password123', 'admin123', 'admin@123', 'welcome123',
    'qwerty123', '12345678', '123456789', 'matrimony123'
  ];

  const isCommon = commonWeak.includes(pwd.toLowerCase());
  if (isCommon) {
    score = Math.min(score, 1);
  }

  let feedback = 'Weak password';
  let color = 'text-rose-500';
  let barColor = 'bg-rose-500';

  if (score >= 4 && !isCommon) {
    feedback = 'Strong password';
    color = 'text-emerald-500';
    barColor = 'bg-emerald-500';
  } else if (score === 3 && !isCommon) {
    feedback = 'Moderate password';
    color = 'text-amber-500';
    barColor = 'bg-amber-500';
  } else if (score === 2) {
    feedback = 'Fair password';
    color = 'text-amber-600';
    barColor = 'bg-amber-600';
  }

  const isValid = criteria.length && criteria.lower && criteria.number && !isCommon;

  return {
    isValid,
    score,
    feedback,
    color,
    barColor,
    criteria,
    isCommon
  };
}

/**
 * Computes a SHA-256 hash using the browser's native Web Crypto API.
 * Never stores or transmits plaintext passwords if client-side hashing is required.
 */
export async function hashPasswordSha256(password) {
  if (!password) return '';
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // Fallback if Web Crypto is unavailable (e.g. non-browser environment)
    return '';
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Masks a phone number for user privacy (e.g. '+91 98*** ***90').
 */
export function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  const pure10 = (digits.startsWith('91') && digits.length === 12) ? digits.slice(2) : digits;
  if (pure10.length === 10) {
    return `+91 ${pure10.slice(0, 2)}*** ***${pure10.slice(-2)}`;
  }
  return String(phone).slice(0, 3) + '****' + String(phone).slice(-2);
}

/**
 * Masks an email address for user privacy (e.g. 'd***@example.com').
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  if (!email.includes('@')) return email.slice(0, 2) + '***';
  const [user, domain] = email.split('@');
  const maskedUser = user.length > 1 ? user[0] + '***' : '***';
  return `${maskedUser}@${domain}`;
}

/**
 * Web Crypto API AES-GCM 256-bit client-side encryption.
 * Encrypts sensitive customer data before local storage or transmission.
 */
export async function encryptClientData(plaintext, keyPhrase = 'I4You-Client-Vault-2026') {
  if (!plaintext) return '';
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) return plaintext;

  try {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(keyPhrase.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      keyMaterial,
      enc.encode(plaintext)
    );

    const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuffer), iv.length);

    let binary = '';
    for (let i = 0; i < combined.byteLength; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return 'enc:web:v1:' + window.btoa(binary);
  } catch (err) {
    console.error('Client encryption error:', err);
    return plaintext;
  }
}

/**
 * Web Crypto API AES-GCM 256-bit client-side decryption.
 */
export async function decryptClientData(ciphertext, keyPhrase = 'I4You-Client-Vault-2026') {
  if (!ciphertext || typeof ciphertext !== 'string' || !ciphertext.startsWith('enc:web:v1:')) {
    return ciphertext || '';
  }
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) return ciphertext;

  try {
    const rawB64 = ciphertext.slice('enc:web:v1:'.length);
    const binary = window.atob(rawB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);

    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(keyPhrase.padEnd(32, '0').slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      keyMaterial,
      data
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.error('Client decryption error:', err);
    return ciphertext;
  }
}

