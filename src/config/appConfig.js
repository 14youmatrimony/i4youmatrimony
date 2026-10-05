/**
 * I 4 You Matrimonial - Global Application Configuration
 * 
 * ENVIRONMENT MODES:
 * - PRODUCTION MODE (isProduction = true):
 *   1. Play Store & App Store Ready.
 *   2. No fake demo user auto-login (currentUser starts as null unless authenticated).
 *   3. No fabricated chat conversations (Simran Kaur / Dr. Ananya mock chats are hidden).
 *   4. Clean empty states for Messages, Notifications, and Interests.
 *   5. Connects only to real users and real cloud/database APIs.
 * 
 * - DEMO MODE (isProduction = false):
 *   1. For local development, client presentations, and UI design testing.
 *   2. Pre-populates sample candidates, demo messages, and notifications.
 */

const STORAGE_ENV_KEY = 'i4u_app_environment';

/**
 * Returns true if the application is running in Production Launch Mode.
 * Reads user override from localStorage, or defaults to false (Demo Mode for dev).
 */
export function getAppMode() {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(STORAGE_ENV_KEY);
  if (saved === 'production') return true;
  if (saved === 'demo') return false;
  
  // Default to environment variable if configured, else default to false (demo mode during development)
  return import.meta.env.VITE_APP_ENV === 'production';
}

/**
 * Sets the application environment mode ('production' vs 'demo')
 */
export function setAppMode(isProduction) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_ENV_KEY, isProduction ? 'production' : 'demo');
  window.dispatchEvent(new CustomEvent('i4u_mode_change', { detail: { isProduction } }));
}

export const APP_CONFIG = {
  APP_NAME: 'I 4 You Matrimony',
  TAGLINE: 'Trusted Pan-India Vedic Matchmaking',
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api',
  PRODUCTION_API_URL: 'https://api.i4youmatrimony.com/api',
  SUPPORT_PHONE: '+91 89689 26566',
  SUPPORT_EMAIL: 'i4youmatrimony@gmail.com'
};
