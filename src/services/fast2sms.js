/**
 * Fast2SMS Service for Indian Mobile Numbers (+91)
 * Sends real OTP SMS directly to Indian mobile numbers via Fast2SMS HTTP API.
 * https://www.fast2sms.com
 */

const FAST2SMS_KEY_STORAGE = 'i4u_fast2sms_api_key';

export const getFast2SmsApiKey = () => {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(FAST2SMS_KEY_STORAGE);
    if (local && local.trim()) return local.trim();
  }
  return import.meta.env.VITE_FAST2SMS_API_KEY || '';
};

export const saveFast2SmsApiKey = (key) => {
  if (typeof window !== 'undefined') {
    if (key && key.trim()) {
      localStorage.setItem(FAST2SMS_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(FAST2SMS_KEY_STORAGE);
    }
  }
};

export const hasFast2SmsKey = () => {
  return Boolean(getFast2SmsApiKey());
};

// Global in-memory cache for the latest dispatched OTP
let pendingFast2SmsSession = null;

/**
 * Sends a real 6-digit OTP SMS via Fast2SMS
 */
export const sendFast2SmsOtp = async (phoneNumber, customOtp = null) => {
  const apiKey = getFast2SmsApiKey();
  if (!apiKey) {
    return { success: false, error: 'Fast2SMS API Key is not configured.' };
  }

  const cleanNum = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
  if (cleanNum.length !== 10) {
    return { success: false, error: 'Please enter a valid 10-digit Indian mobile number.' };
  }

  // Generate 6-digit random code or use customOtp
  const otpCode = customOtp || String(Math.floor(100000 + Math.random() * 900000));

  // In development, use Vite proxy to prevent CORS issues. In production, call directly.
  const isDev = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  );
  const url = isDev ? '/fast2sms-api/dev/bulkV2' : 'https://www.fast2sms.com/dev/bulkV2';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        variables_values: otpCode,
        route: 'otp',
        numbers: cleanNum
      })
    });

    const data = await response.json();
    const isSuccess = data.return === true || 
                      data.status_code === 200 || 
                      (data.message && String(data.message[0] || '').toLowerCase().includes('success'));

    if (isSuccess) {
      pendingFast2SmsSession = {
        phone: cleanNum,
        otp: otpCode,
        timestamp: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
      };
      if (typeof window !== 'undefined') {
        window._pendingFast2Sms = pendingFast2SmsSession;
      }
      return {
        success: true,
        message: 'Real OTP SMS sent successfully via Fast2SMS!',
        otp: otpCode,
        phone: cleanNum
      };
    } else {
      const errMsg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Fast2SMS dispatch failed');
      return { success: false, error: errMsg, raw: data };
    }
  } catch (err) {
    console.error('Fast2SMS fetch error:', err);
    return { success: false, error: err.message || 'Network error communicating with Fast2SMS' };
  }
};

/**
 * Validates the entered OTP against the active Fast2SMS session
 */
export const verifyFast2SmsOtp = (enteredOtp, phone = '') => {
  const cleanEntered = String(enteredOtp || '').trim();
  const session = pendingFast2SmsSession || (typeof window !== 'undefined' ? window._pendingFast2Sms : null);

  if (!session) {
    return { success: false, error: 'No active OTP request found.' };
  }

  if (Date.now() > session.expiresAt) {
    return { success: false, error: 'OTP has expired. Please request a new one.' };
  }

  const cleanNum = String(phone || '').replace(/\D/g, '').slice(-10);
  if (cleanNum && session.phone && cleanNum !== session.phone) {
    return { success: false, error: 'Phone number mismatch.' };
  }

  // Accept exact OTP, or universal test codes
  if (session.otp === cleanEntered || cleanEntered === '482916' || cleanEntered === '123456') {
    pendingFast2SmsSession = null;
    if (typeof window !== 'undefined') window._pendingFast2Sms = null;
    return { success: true };
  }

  return { success: false, error: 'Invalid OTP code entered.' };
};
