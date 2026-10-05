/**
 * Surepass Aadhaar V2 Authentication Service
 * Connects to Government of India (UIDAI) via Surepass.io
 * Full eKYC verification: Aadhaar OTP, Name, Gender, DOB, Masked Aadhaar & Photo
 */

import { 
  isSandboxConfigured, 
  generateSandboxOtp, 
  verifySandboxOtp 
} from './sandboxAadhaar';

const SUREPASS_API_BASE = 'https://kyc-api.surepass.io/api/v1';

export const getSurepassToken = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('i4u_surepass_token');
    if (saved && saved.trim()) return saved.trim();
  }
  return (import.meta.env.VITE_SUREPASS_API_TOKEN || '').trim();
};

export const saveSurepassToken = (token) => {
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('i4u_surepass_token', token.trim());
    else localStorage.removeItem('i4u_surepass_token');
  }
};

export const isSurepassConfigured = () => {
  const token = getSurepassToken();
  return Boolean(token && token !== 'your_surepass_token_here' && token !== '');
};

export const isLiveAadhaarConfigured = () => {
  return isSandboxConfigured() || isSurepassConfigured();
};

export const getActiveAadhaarProvider = () => {
  if (isSandboxConfigured()) {
    return { name: 'Sandbox.co.in', isLive: true };
  }
  if (isSurepassConfigured()) {
    return { name: 'Surepass.io', isLive: true };
  }
  return { name: 'Demo Sandbox (Simulated)', isLive: false };
};

/**
 * Format Indian Aadhaar number to standard 12-digit string
 */
export const sanitizeAadhaar = (val) => {
  return String(val || '').replace(/\D/g, '').slice(0, 12);
};

/**
 * Auto-format 12-digit Aadhaar into "XXXX XXXX XXXX" display format
 */
export const formatAadhaarDisplay = (val) => {
  const raw = sanitizeAadhaar(val);
  const parts = [];
  for (let i = 0; i < raw.length; i += 4) {
    parts.push(raw.slice(i, i + 4));
  }
  return parts.join(' ');
};

export const formatAadhaar = formatAadhaarDisplay;

/**
 * Translates Surepass / UIDAI error codes to user-friendly Malayalam & English
 */
export const getFriendlyAadhaarError = (err) => {
  const msg = err?.message || String(err || '');
  const lower = msg.toLowerCase();

  if (lower.includes('invalid aadhaar') || lower.includes('invalid_aadhaar') || lower.includes('invalid_id_number')) {
    return 'അസാധുവായ ആധാർ നമ്പർ. ദയവായി 12 അക്ക നമ്പർ ശരിയായി നൽകുക. (Invalid 12-digit Aadhaar number)';
  }
  if (lower.includes('otp expired') || lower.includes('expired_otp')) {
    return 'UIDAI OTP കാലാവധി കഴിഞ്ഞു. പുതിയ OTP ലഭിക്കാൻ Resend അമർത്തുക. (UIDAI OTP expired. Please resend.)';
  }
  if (lower.includes('invalid otp') || lower.includes('incorrect_otp') || lower.includes('wrong_otp')) {
    return 'നൽകിയ ആധാർ OTP തെറ്റാണ്. ദയവായി പരിശോധിച്ചു വീണ്ടും നൽകുക. (Incorrect Aadhaar OTP entered.)';
  }
  if (lower.includes('too many attempts') || lower.includes('limit exceeded')) {
    return 'നിരവധി തവണ OTP തെറ്റായി നൽകി. അല്പം കഴിഞ്ഞ് ശ്രമിക്കുക. (Too many attempts. Please try later.)';
  }
  if (lower.includes('uidai server') || lower.includes('service unavailable')) {
    return 'UIDAI സെർവർ തിരക്കിലാണ്. ദയവായി അല്പം കഴിഞ്ഞ് ശ്രമിക്കുക. (UIDAI server busy. Please retry shortly.)';
  }
  if (lower.includes('token is missing') || lower.includes('unauthorized') || lower.includes('missing_token')) {
    return 'Surepass API Token നൽകിയിട്ടില്ല. .env ഫയലിൽ VITE_SUREPASS_API_TOKEN ചേർക്കുക. (Surepass API Token is missing in .env)';
  }

  return msg || 'ആധാർ വെരിഫിക്കേഷനിൽ ഒരു തടസ്സമുണ്ടായി. വീണ്ടും ശ്രമിക്കുക. (Aadhaar verification failed. Please retry.)';
};

/**
 * Step 1: Send real Aadhaar OTP to UIDAI-registered mobile number
 */
export const generateAadhaarOtp = async (aadhaarNumber) => {
  const cleanAadhaar = sanitizeAadhaar(aadhaarNumber);

  if (cleanAadhaar.length !== 12) {
    return {
      success: false,
      error: 'ദയവായി 12 അക്ക ആധാർ നമ്പർ നൽകുക. (Please enter a valid 12-digit Aadhaar number)'
    };
  }

  // 1. If Sandbox.co.in is configured in .env, use real Sandbox.co.in OKYC
  if (isSandboxConfigured()) {
    return await generateSandboxOtp(cleanAadhaar);
  }

  // 2. If Surepass token is not configured in .env, use high-fidelity sandbox simulation
  if (!isSurepassConfigured()) {
    console.info('[Aadhaar] No live API keys configured. Using simulated UIDAI Aadhaar OTP.');
    return {
      success: true,
      isSimulated: true,
      clientId: 'demo_aadhaar_' + Date.now(),
      demoOtp: '739201',
      cleanAadhaar
    };
  }

  try {
    const token = getSurepassToken();
    const response = await fetch(`${SUREPASS_API_BASE}/aadhaar-v2/generate-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        id_number: cleanAadhaar
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      const errMsg = result.message || result.error || 'Failed to dispatch UIDAI OTP';
      throw new Error(errMsg);
    }

    return {
      success: true,
      isSimulated: false,
      clientId: result.data?.client_id,
      otpSent: result.data?.otp_sent ?? true,
      validAadhaar: result.data?.valid_aadhaar ?? true,
      cleanAadhaar
    };
  } catch (err) {
    console.error('[Surepass Generate OTP Error]:', err);
    return {
      success: false,
      error: getFriendlyAadhaarError(err),
      rawError: err
    };
  }
};

/**
 * Step 2: Submit OTP to verify and fetch official UIDAI details
 */
export const submitAadhaarOtp = async (clientId, enteredOtp, fallbackAadhaar = '') => {
  const cleanOtp = String(enteredOtp || '').trim();

  if (cleanOtp.length !== 6) {
    return {
      success: false,
      error: 'ദയവായി 6 അക്ക UIDAI OTP കൃത്യമായി നൽകുക. (Please enter 6-digit UIDAI OTP)'
    };
  }

  // 1. If simulated or demo clientId
  if (String(clientId || '').startsWith('demo_')) {
    const last4 = sanitizeAadhaar(fallbackAadhaar).slice(-4) || '5928';
    return {
      success: true,
      isSimulated: true,
      data: {
        fullName: 'Arun Kumar',
        gender: 'M',
        dob: '1995-05-12',
        maskedAadhaar: `XXXX XXXX ${last4}`,
        state: 'Kerala',
        dist: 'Ernakulam',
        pincode: '682001',
        hasImage: false,
        aadhaarVerified: true,
        governmentIdVerified: true
      }
    };
  }

  // 2. If Sandbox.co.in is configured, verify via Sandbox.co.in OKYC
  if (isSandboxConfigured()) {
    return await verifySandboxOtp(clientId, cleanOtp, fallbackAadhaar);
  }

  // 3. If neither provider is configured
  if (!isSurepassConfigured()) {
    const last4 = sanitizeAadhaar(fallbackAadhaar).slice(-4) || '5928';
    return {
      success: true,
      isSimulated: true,
      data: {
        fullName: 'Arun Kumar',
        gender: 'M',
        dob: '1995-05-12',
        maskedAadhaar: `XXXX XXXX ${last4}`,
        state: 'Kerala',
        dist: 'Ernakulam',
        pincode: '682001',
        hasImage: false,
        aadhaarVerified: true,
        governmentIdVerified: true
      }
    };
  }

  // 2. Real Surepass UIDAI Verification
  try {
    const token = getSurepassToken();
    const response = await fetch(`${SUREPASS_API_BASE}/aadhaar-v2/submit-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        client_id: clientId,
        otp: cleanOtp
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      const errMsg = result.message || result.error || 'Failed to verify UIDAI OTP';
      throw new Error(errMsg);
    }

    const uidaiData = result.data || {};
    const cleanLast4 = (uidaiData.aadhaar_number || '').slice(-4) || sanitizeAadhaar(fallbackAadhaar).slice(-4) || '5928';

    return {
      success: true,
      isSimulated: false,
      data: {
        fullName: uidaiData.full_name || '',
        gender: uidaiData.gender || '',
        dob: uidaiData.dob || '',
        maskedAadhaar: `XXXX XXXX ${cleanLast4}`,
        state: uidaiData.address?.state || 'Kerala',
        dist: uidaiData.address?.dist || '',
        pincode: uidaiData.address?.pincode || '',
        profileImage: uidaiData.profile_image || null,
        hasImage: Boolean(uidaiData.has_image),
        aadhaarVerified: true,
        governmentIdVerified: true,
        rawUidai: uidaiData
      }
    };
  } catch (err) {
    console.error('[Surepass Submit OTP Error]:', err);
    return {
      success: false,
      error: getFriendlyAadhaarError(err),
      rawError: err
    };
  }
};
