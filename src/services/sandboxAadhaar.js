/**
 * Sandbox.co.in Aadhaar OKYC (Offline e-KYC) Authentication Service
 * Connects to Government of India (UIDAI) via Sandbox.co.in API
 * Complete eKYC: Send Real Aadhaar OTP, Verify OTP, Extract Name, Gender, DOB, Address & Masked Aadhaar
 * Official Docs: https://developer.sandbox.co.in/api-reference/kyc/aadhaar
 */

// In development, uses Vite proxy '/sandbox-api' to bypass browser CORS; otherwise direct URL
const isDev = typeof window !== 'undefined' && window.location.origin.includes('5173');
const SANDBOX_BASE_URL = isDev ? '/sandbox-api' : 'https://api.sandbox.co.in';

export const getSandboxApiKey = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('i4u_sandbox_api_key');
    if (saved && saved.trim()) return saved.trim();
  }
  return (import.meta.env.VITE_SANDBOX_API_KEY || '').trim();
};

export const getSandboxApiSecret = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('i4u_sandbox_api_secret');
    if (saved && saved.trim()) return saved.trim();
  }
  return (import.meta.env.VITE_SANDBOX_API_SECRET || '').trim();
};

export const saveSandboxCredentials = (key, secret) => {
  if (typeof window !== 'undefined') {
    if (key) localStorage.setItem('i4u_sandbox_api_key', key.trim());
    else localStorage.removeItem('i4u_sandbox_api_key');
    if (secret) localStorage.setItem('i4u_sandbox_api_secret', secret.trim());
    else localStorage.removeItem('i4u_sandbox_api_secret');
    sessionStorage.removeItem('i4u_sandbox_token');
    sessionStorage.removeItem('i4u_sandbox_token_expiry');
  }
};

export const isSandboxConfigured = () => {
  const key = getSandboxApiKey();
  const secret = getSandboxApiSecret();
  return Boolean(
    key && 
    secret && 
    key !== 'your_sandbox_api_key_here' && 
    secret !== 'your_sandbox_api_secret_here' &&
    key !== ''
  );
};

/**
 * Format Indian Aadhaar number to standard 12-digit string
 */
export const sanitizeAadhaar = (val) => {
  return String(val || '').replace(/\D/g, '').slice(0, 12);
};

/**
 * Format Aadhaar for UI display: "XXXX XXXX XXXX"
 */
export const formatAadhaarDisplay = (val) => {
  const raw = sanitizeAadhaar(val);
  const parts = [];
  for (let i = 0; i < raw.length; i += 4) {
    parts.push(raw.slice(i, i + 4));
  }
  return parts.join(' ');
};

/**
 * Translate Sandbox.co.in / UIDAI error messages to user-friendly Malayalam & English
 */
export const getFriendlySandboxError = (err) => {
  const msg = err?.message || String(err || '');
  const lower = msg.toLowerCase();

  if (lower.includes('invalid aadhaar') || lower.includes('invalid_aadhaar') || lower.includes('invalid id') || lower.includes('12-digit')) {
    return 'അസാധുവായ ആധാർ നമ്പർ. ദയവായി 12 അക്ക നമ്പർ ശരിയായി നൽകുക. (Invalid 12-digit Aadhaar number)';
  }
  if (lower.includes('otp expired') || lower.includes('expired_otp') || lower.includes('time out')) {
    return 'UIDAI OTP കാലാവധി കഴിഞ്ഞു. പുതിയ OTP ലഭിക്കാൻ Resend അമർത്തുക. (UIDAI OTP expired. Please resend.)';
  }
  if (lower.includes('invalid otp') || lower.includes('incorrect_otp') || lower.includes('wrong otp')) {
    return 'നൽകിയ ആധാർ OTP തെറ്റാണ്. ദയവായി പരിശോധിച്ചു വീണ്ടും നൽകുക. (Incorrect Aadhaar OTP entered.)';
  }
  if (lower.includes('too many attempts') || lower.includes('limit exceeded') || lower.includes('rate limit')) {
    return 'നിരവധി തവണ OTP തെറ്റായി നൽകി. അല്പം കഴിഞ്ഞ് ശ്രമിക്കുക. (Too many attempts. Please try later.)';
  }
  if (lower.includes('uidai') || lower.includes('service unavailable') || lower.includes('server busy')) {
    return 'UIDAI സെർവർ തിരക്കിലാണ്. ദയവായി അല്പം കഴിഞ്ഞ് ശ്രമിക്കുക. (UIDAI server busy. Please retry shortly.)';
  }
  if (lower.includes('insufficient privilege') || lower.includes('unauthorized') || lower.includes('403') || lower.includes('401')) {
    return 'Sandbox.co.in API Key അല്ലെങ്കിൽ Secret തെറ്റാണ്. .env പരിശോധിക്കുക. (Sandbox.co.in credentials unauthorized)';
  }

  return msg || 'ആധാർ വെരിഫിക്കേഷനിൽ ഒരു തടസ്സമുണ്ടായി. വീണ്ടും ശ്രമിക്കുക. (Aadhaar verification failed. Please retry.)';
};

/**
 * Step 0: Authenticate with Sandbox.co.in to get a 24-hour Access Token
 */
export const getSandboxAccessToken = async () => {
  const apiKey = getSandboxApiKey();
  const apiSecret = getSandboxApiSecret();

  if (!apiKey || !apiSecret) {
    throw new Error('Sandbox.co.in API Key or Secret is missing in .env');
  }

  // Check cached token in sessionStorage
  try {
    const cachedToken = sessionStorage.getItem('i4u_sandbox_token');
    const cachedExpiry = sessionStorage.getItem('i4u_sandbox_token_expiry');
    if (cachedToken && cachedExpiry && Date.now() < Number(cachedExpiry)) {
      return cachedToken;
    }
  } catch (e) {}

  // Request new JWT Access Token
  const response = await fetch(`${SANDBOX_BASE_URL}/authenticate`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'x-api-secret': apiSecret,
      'x-api-version': '1.0',
      'Content-Type': 'application/json'
    }
  });

  const result = await response.json();

  if (!response.ok || !result.data?.access_token) {
    const errorDetail = result.message || result.error || `HTTP ${response.status}: Authentication failed`;
    throw new Error(`[Sandbox.co.in] ${errorDetail}`);
  }

  const token = result.data.access_token;
  try {
    // Cache for 23 hours (Sandbox tokens are valid for 24 hours)
    sessionStorage.setItem('i4u_sandbox_token', token);
    sessionStorage.setItem('i4u_sandbox_token_expiry', String(Date.now() + 23 * 60 * 60 * 1000));
  } catch (e) {}

  return token;
};

/**
 * Step 1: Send Real Aadhaar OTP via Sandbox.co.in to UIDAI-linked Mobile Number
 */
export const generateSandboxOtp = async (aadhaarNumber) => {
  const cleanAadhaar = sanitizeAadhaar(aadhaarNumber);

  if (cleanAadhaar.length !== 12) {
    return {
      success: false,
      error: 'ദയവായി 12 അക്ക ആധാർ നമ്പർ നൽകുക. (Please enter a valid 12-digit Aadhaar number)'
    };
  }

  try {
    const token = await getSandboxAccessToken();
    const apiKey = getSandboxApiKey();

    const response = await fetch(`${SANDBOX_BASE_URL}/kyc/aadhaar/okyc/otp`, {
      method: 'POST',
      headers: {
        'authorization': token,
        'x-api-key': apiKey,
        'x-api-version': '1.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.otp.request',
        aadhaar_number: cleanAadhaar
      })
    });

    const result = await response.json();

    if (!response.ok || (result.code && result.code !== 200) || result.status === 'failure') {
      const errMsg = result.message || result.error || 'Failed to dispatch UIDAI Aadhaar OTP';
      throw new Error(errMsg);
    }

    const referenceId = result.data?.reference_id || result.reference_id;

    return {
      success: true,
      isSimulated: false,
      clientId: String(referenceId),
      referenceId: String(referenceId),
      message: result.data?.message || 'OTP sent successfully to registered mobile number',
      cleanAadhaar
    };
  } catch (err) {
    console.error('[Sandbox.co.in Generate OTP Error]:', err);
    return {
      success: false,
      error: getFriendlySandboxError(err),
      rawError: err
    };
  }
};

/**
 * Step 2: Verify Aadhaar OTP & Fetch User's Official UIDAI Demographic Details
 */
export const verifySandboxOtp = async (referenceId, enteredOtp, fallbackAadhaar = '') => {
  const cleanOtp = String(enteredOtp || '').trim();

  if (cleanOtp.length !== 6) {
    return {
      success: false,
      error: 'ദയവായി 6 അക്ക UIDAI OTP കൃത്യമായി നൽകുക. (Please enter 6-digit UIDAI OTP)'
    };
  }

  try {
    const token = await getSandboxAccessToken();
    const apiKey = getSandboxApiKey();

    const response = await fetch(`${SANDBOX_BASE_URL}/kyc/aadhaar/okyc/otp/verify`, {
      method: 'POST',
      headers: {
        'authorization': token,
        'x-api-key': apiKey,
        'x-api-version': '1.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.request',
        reference_id: referenceId,
        otp: cleanOtp
      })
    });

    const result = await response.json();

    if (!response.ok || (result.code && result.code !== 200) || result.status === 'failure') {
      const errMsg = result.message || result.error || 'Failed to verify UIDAI Aadhaar OTP';
      throw new Error(errMsg);
    }

    const data = result.data || {};
    const address = data.address || {};
    const last4 = sanitizeAadhaar(data.aadhaar_number || fallbackAadhaar).slice(-4) || '5928';

    return {
      success: true,
      isSimulated: false,
      data: {
        fullName: data.name || '',
        gender: data.gender || '',
        dob: data.date_of_birth || data.dob || '',
        careOf: data.care_of || '',
        maskedAadhaar: `XXXX XXXX ${last4}`,
        address: [address.house, address.street, address.loc].filter(Boolean).join(', ') || '',
        state: address.state || 'Kerala',
        dist: address.dist || address.district || '',
        pincode: address.pincode || '',
        profileImage: data.photo_link || data.image || null,
        hasImage: Boolean(data.photo_link || data.image),
        aadhaarVerified: true,
        governmentIdVerified: true,
        provider: 'Sandbox.co.in',
        rawUidai: data
      }
    };
  } catch (err) {
    console.error('[Sandbox.co.in Verify OTP Error]:', err);
    return {
      success: false,
      error: getFriendlySandboxError(err),
      rawError: err
    };
  }
};
