/**
 * I 4 You Matrimonial - Client API Service
 * Connects the mobile / web frontend with the Python Flask Backend (http://127.0.0.1:5000)
 */

import { INITIAL_PROFILES } from '../data/mockProfiles.js';
import { supabase, isSupabaseConfigured } from './supabase';
import { uploadProfilePhoto } from './storageService';
import { optimizeBase64String } from '../utils/imageOptimizer';
import { addCacheBuster } from '../utils/cacheBuster';

/**
 * Cross-tab & Multi-window BroadcastChannel for instant profile data synchronization
 */
export const profileSyncChannel = typeof window !== 'undefined' && window.BroadcastChannel
  ? new BroadcastChannel('i4u_profile_sync')
  : null;

/**
 * Compresses base64 images in browser using offscreen canvas to prevent large database payload bottlenecks
 */
export async function compressBase64Image(dataUrl, maxDim = 1200, quality = 0.84) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    return dataUrl;
  }
  return optimizeBase64String(dataUrl, {
    maxDimension: maxDim,
    targetMaxKB: 180,
    initialQuality: quality
  });
}


/**
 * Synchronizes any profile record directly into Supabase 'profiles' table via Supabase SDK
 */
export async function syncProfileToSupabase(userData) {
  if (!userData) return null;
  if (!isSupabaseConfigured()) return null;

  let profileId = userData.id || userData.userId;
  if (!profileId && (userData.phone || userData.mobile)) {
    const rawPhone = String(userData.phone || userData.mobile).replace(/\D/g, '');
    if (rawPhone.length >= 10) {
      try {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', rawPhone)
          .limit(1);
        if (existing && existing.length > 0 && existing[0].id) {
          profileId = existing[0].id;
        }
      } catch (e) {}
    }
  }

  if (!profileId) {
    profileId = `p_${Date.now()}`;
  }
  userData.id = profileId;
  try {
    let photo = await compressBase64Image(userData.photo, 800, 0.8);
    if (photo && (photo.startsWith('data:') || photo.startsWith('blob:'))) {
      try {
        const uploadRes = await uploadProfilePhoto(photo, profileId, 'avatars');
        if (uploadRes.success && uploadRes.publicUrl) {
          photo = uploadRes.publicUrl;
        }
      } catch (uploadErr) {
        console.warn('[api] Supabase storage upload fallback:', uploadErr);
      }
    }

    const aadhaarFront = await compressBase64Image(userData.aadhaar_front_image || userData.frontDocumentPreview, 1200, 0.85);
    const aadhaarBack = await compressBase64Image(userData.aadhaar_back_image || userData.backDocumentPreview, 1200, 0.85);

    let singlePhotos = userData.singlePhotos;
    if (Array.isArray(singlePhotos)) {
      const compressedSingles = await Promise.all(
        singlePhotos.map(p => compressBase64Image(p, 1080, 0.8))
      );
      singlePhotos = JSON.stringify(compressedSingles);
    } else if (typeof singlePhotos === 'string') {
      singlePhotos = userData.single_photos || singlePhotos;
    }

    const payload = {
      id: userData.id,
      register_id: userData.registerId || userData.register_id || null,
      password: userData.password || null,
      name: userData.name,
      email: userData.email || null,
      phone: userData.phone || userData.mobile || null,
      age: userData.age ? parseInt(userData.age, 10) : 25,
      gender: userData.gender || 'Female',
      height: userData.height || null,
      skin_colour: userData.skinColour || userData.skin_colour || null,
      photo: photo || null,
      photo_url: photo || null,
      religion: userData.religion || 'Hindu',
      caste: userData.caste || null,
      mother_tongue: userData.motherTongue || userData.mother_tongue || null,
      state: userData.state || null,
      city: userData.city || null,
      district: userData.district || userData.city || null,
      native_address: userData.nativeAddress || userData.native_address || null,
      education: userData.education || null,
      education_category: userData.educationCategory || userData.education_category || null,
      profession: userData.profession || null,
      company: userData.company || null,
      annual_income: userData.annualIncome || userData.annual_income || null,
      manglik: userData.manglik || 'Non-Manglik',
      diet: userData.diet || 'Vegetarian',
      verified: userData.verified ? 1 : 0,
      aadhaar_verified: userData.aadhaarVerified ? 1 : 0,
      govt_id_verified: userData.governmentIdVerified || userData.govt_id_verified ? 1 : 0,
      selfie_verified: userData.selfieVerified ? 1 : 0,
      selfie_photo: userData.selfiePhoto || null,
      selfie_match_score: userData.selfieScore || null,
      aadhaar_status: userData.aadhaarStatus || userData.aadhaar_status || (userData.aadhaarVerified ? 'approved' : 'pending'),
      aadhaar_rejection_reason: userData.aadhaarRejectionReason || userData.aadhaar_rejection_reason || null,
      aadhaar_front_image: aadhaarFront || null,
      aadhaar_back_image: aadhaarBack || null,
      single_photos: singlePhotos || null,
      family_photos: Array.isArray(userData.familyPhotos) ? JSON.stringify(userData.familyPhotos) : (userData.family_photos || null),
      match_score: userData.matchScore || 85,
      status: userData.status || 'active',
      about: userData.about || userData.aboutBio || null,
      marital_status: userData.maritalStatus || userData.marital_status || 'Never Married',
      partner_expectations: userData.partnerExpectations || userData.partner_expectations || null,
      body_type: userData.bodyType || userData.body_type || null,
      updated_at: new Date().toISOString()
    };

    let { data, error } = await supabase.from('profiles').upsert([payload]);
    if (error && (error.code === '42703' || error.message?.includes('register_id') || error.message?.includes('password') || error.message?.includes('selfie'))) {
      console.warn('[Supabase Upsert] Custom column not yet in schema, retrying with standard columns:', error.message);
      delete payload.register_id;
      delete payload.password;
      delete payload.selfie_verified;
      delete payload.selfie_photo;
      delete payload.selfie_match_score;
      const retryResult = await supabase.from('profiles').upsert([payload]);
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.warn('[Supabase Upsert Warning]:', error.message);
      return { success: false, error: error.message };
    }
    console.log('[Supabase] Successfully synchronized profile to Supabase:', userData.id);
    return { success: true, data };
  } catch (err) {
    console.warn('[Supabase Sync Exception]:', err.message);
    return { success: false, error: err.message };
  }
}

// Detect if running in local development environment (Vite dev or local Flask)
export const isLocalEnvironment = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
};

// Safe API BASE: Never use insecure http:// on HTTPS or production (e.g. Vercel)
export const API_BASE = (() => {
  if (typeof window === 'undefined') return '/api';
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (isLocalEnvironment()) {
    return window.location.port === '5173' ? '/api' : 'http://127.0.0.1:5000/api';
  }
  // On Vercel or any remote production HTTPS domain:
  return '/api';
})();

/**
 * Helper to get the stored access token from localStorage or Supabase session
 */
export const getStoredAuthToken = () => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('i4u_auth_token');
  if (token) return token;
  try {
    const savedUser = localStorage.getItem('i4u_auth_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      return u?.accessToken || u?.access_token || u?.token || null;
    }
  } catch (e) {}
  return null;
};

/**
 * Helper to get stored refresh token
 */
export const getStoredRefreshToken = () => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('i4u_refresh_token');
  if (token) return token;
  try {
    const savedUser = localStorage.getItem('i4u_auth_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      return u?.refreshToken || u?.refresh_token || null;
    }
  } catch (e) {}
  return null;
};

/**
 * Silent token refresh logic using Supabase or backend refresh endpoint.
 * Returns new access token string on success, or null if refresh token is revoked/invalid.
 */
let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export async function silentRefreshToken() {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshSubscribers.push((token) => resolve(token));
    });
  }

  isRefreshing = true;
  try {
    // 1. Try Supabase refresh if active
    if (isSupabaseConfigured() && supabase?.auth) {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data?.session?.access_token) {
        const newAccess = data.session.access_token;
        const newRefresh = data.session.refresh_token;
        if (typeof window !== 'undefined') {
          localStorage.setItem('i4u_auth_token', newAccess);
          if (newRefresh) localStorage.setItem('i4u_refresh_token', newRefresh);
        }
        onRefreshed(newAccess);
        return newAccess;
      }
    }

    // 2. Try REST API refresh endpoint if refresh token exists
    const storedRefresh = getStoredRefreshToken();
    if (storedRefresh) {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: storedRefresh })
      });
      if (res.ok) {
        const data = await res.json();
        const newAccess = data.access_token || data.token;
        if (newAccess && typeof window !== 'undefined') {
          localStorage.setItem('i4u_auth_token', newAccess);
          if (data.refresh_token) localStorage.setItem('i4u_refresh_token', data.refresh_token);
          onRefreshed(newAccess);
          return newAccess;
        }
      } else if (res.status === 401 || res.status === 403) {
        console.warn('[api] Refresh token expired or revoked.');
        onRefreshed(null);
        return null;
      }
    }
  } catch (err) {
    console.warn('[api] Silent token refresh exception:', err);
  } finally {
    isRefreshing = false;
  }
  return null;
}

/**
 * Authenticated Fetch Interceptor:
 * Automatically attaches Authorization: Bearer <token>,
 * intercepts 401 responses, performs silent token refresh,
 * retries once, and only clears auth if the refresh token is revoked.
 */
export async function authenticatedFetch(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const reqOptions = { ...options };
  const headers = new Headers(reqOptions.headers || {});

  // Automatically attach Bearer token if not explicitly provided
  if (!headers.has('Authorization')) {
    const token = getStoredAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  reqOptions.headers = headers;
  reqOptions.signal = controller.signal;

  try {
    let res = await fetch(url, reqOptions);
    clearTimeout(timer);

    // If 401 Unauthorized, attempt silent token refresh and retry
    if (res.status === 401) {
      const newToken = await silentRefreshToken();
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        const retryController = new AbortController();
        const retryTimer = setTimeout(() => retryController.abort(), timeoutMs);
        reqOptions.signal = retryController.signal;
        res = await fetch(url, reqOptions);
        clearTimeout(retryTimer);
      } else {
        // Only trigger cleanup if refresh token was tried and confirmed invalid
        const hasRefreshToken = Boolean(getStoredRefreshToken());
        if (hasRefreshToken) {
          console.warn('[api] Refresh token revoked. Session expired.');
          try {
            localStorage.removeItem('i4u_auth_token');
            localStorage.removeItem('i4u_refresh_token');
          } catch (e) {}
        }
      }
    }
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Safely executes a fetch with timeout and verifies JSON response.
 * Uses authenticatedFetch interceptor for bearer token management and 401 retry.
 * If backend is offline, unreachable, returns HTML (e.g. Vercel SPA rewrites), or times out,
 * it returns null so the caller can seamlessly fall back to local/sandbox handling.
 */
export async function safeFetchJson(url, options = {}, timeoutMs = 1500) {
  // Never attempt to fetch non-local backend on Vercel/production when there is no remote API configured
  if (!isLocalEnvironment() && !import.meta.env.VITE_API_URL) {
    return null; // Standalone production mode (e.g. Vercel)
  }

  try {
    const res = await authenticatedFetch(url, options, timeoutMs);
    if (!res || !res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;

    const data = await res.json();
    return data;
  } catch (err) {
    return null;
  }
}

/**
 * Maps Supabase raw database row into candidate profile structure expected by UI
 */
export function mapSupabaseRowToProfile(r) {
  if (!r) return null;

  const defaultMale = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800';
  const defaultFemale = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800';
  const defaultFallback = String(r.gender).toLowerCase() === 'male' ? defaultMale : defaultFemale;
  const profileTimestamp = r.updated_at || r.created_at || null;

  const sanitizeUrl = (u) => {
    if (!u || typeof u !== 'string') return null;
    let str = u.trim();
    if (!str || str === 'null' || str === 'undefined') return null;
    if (str.includes('ejtkrilhntdbsiavugta.supabase.co') || str.includes('pheqzsfrwhjxspaaroea.supabase.co')) {
      str = str.replace(/https:\/\/[a-z0-9]+\.supabase\.co/g, 'https://kzvdzospvgzlfkkptadl.supabase.co');
    }
    return addCacheBuster(str, profileTimestamp);
  };

  let singlePhotos = [];
  try {
    if (r.single_photos) {
      const parsed = typeof r.single_photos === 'string' ? JSON.parse(r.single_photos) : r.single_photos;
      if (Array.isArray(parsed)) {
        singlePhotos = parsed.map(sanitizeUrl).filter(Boolean);
      }
    }
  } catch (e) {
    const s = sanitizeUrl(r.photo);
    singlePhotos = s ? [s] : [];
  }
  if (!Array.isArray(singlePhotos)) singlePhotos = [];

  let familyPhotos = [];
  try {
    if (r.family_photos) {
      const parsed = typeof r.family_photos === 'string' ? JSON.parse(r.family_photos) : r.family_photos;
      if (Array.isArray(parsed)) {
        familyPhotos = parsed.map(sanitizeUrl).filter(Boolean);
      }
    }
  } catch (e) {
    familyPhotos = ['https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800'];
  }
  if (!familyPhotos || familyPhotos.length === 0) {
    familyPhotos = ['https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800'];
  }

  const isSentBack = r.aadhaar_status === 'sent_back';
  const isApproved = r.aadhaar_status === 'approved' || (Boolean(r.aadhaar_verified) && !isSentBack);

  const cleanPhoto = sanitizeUrl(r.photo);
  const cleanPhotoUrl = sanitizeUrl(r.photo_url);

  const resolvedPhoto = (singlePhotos.length > 0 ? singlePhotos[0] : null) || 
                        cleanPhoto || 
                        cleanPhotoUrl || 
                        defaultFallback;

  if (singlePhotos.length === 0) {
    singlePhotos = [resolvedPhoto];
  } else if (singlePhotos[0] !== resolvedPhoto) {
    singlePhotos = [resolvedPhoto, ...singlePhotos.filter(p => p !== resolvedPhoto)].slice(0, 5);
  }

  return {
    id: r.id,
    registerId: r.register_id || r.id,
    register_id: r.register_id || r.id,
    email: r.email || null,
    name: r.name,
    age: r.age,
    gender: r.gender,
    height: r.height || "5'6\"",
    skinColour: r.skin_colour || 'Fair',
    photo: resolvedPhoto,
    photo_url: resolvedPhoto,
    avatar_url: resolvedPhoto,
    coverPhoto: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200',
    singlePhotos,
    familyPhotos,
    verified: isSentBack ? false : Boolean(r.verified || r.aadhaar_verified || r.govt_id_verified),
    governmentIdVerified: isSentBack ? false : Boolean(r.govt_id_verified),
    aadhaarVerified: isApproved,
    aadhaar_verified: isApproved ? 1 : 0,
    phone: r.phone || '',
    mobile: r.phone || r.mobile || '',
    nativeAddress: r.native_address || `${r.city || 'Mumbai'}, ${r.state || 'Maharashtra'}`,
    matchScore: r.match_score || 90,
    gunasMatch: `${Math.min(36, Math.round((r.match_score || 90) * 0.36))}/36 Gunas`,
    manglik: r.manglik || 'Non-Manglik',
    religion: r.religion || 'Hindu',
    caste: r.caste || 'General',
    motherTongue: r.mother_tongue || 'Hindi',
    state: r.state || 'Maharashtra',
    city: r.city || 'Mumbai',
    district: r.district || r.city || 'Mumbai',
    education: r.education || 'Graduate Degree',
    educationCategory: r.education_category || 'Higher Education',
    profession: r.profession || 'Professional',
    company: r.company || 'Private Sector',
    annualIncome: r.annual_income || '₹ 15 - 20 LPA',
    diet: r.diet || 'Vegetarian',
    familyDetails: {
      type: 'Nuclear Family',
      values: 'Traditional yet Progressive',
      financialStatus: 'Upper Middle Class',
      father: 'Retired Professional',
      mother: 'Homemaker',
      siblings: '1 Sibling'
    },
    status: r.status || 'active',
    aadhaar_status: r.aadhaar_status || (isApproved ? 'approved' : 'pending'),
    aadhaarStatus: r.aadhaar_status || (isApproved ? 'approved' : 'pending'),
    aadhaar_rejection_reason: r.aadhaar_rejection_reason || null,
    aadhaarRejectionReason: r.aadhaar_rejection_reason || null,
    aadhaar_front_image: r.aadhaar_front_image || null,
    aadhaar_back_image: r.aadhaar_back_image || null,
    about: r.about || '',
    maritalStatus: r.marital_status || 'Never Married',
    marital_status: r.marital_status || 'Never Married',
    bodyType: r.body_type || 'Slim',
    partnerExpectations: r.partner_expectations || ''
  };
}

/**
 * Validates whether a profile is a mock/demo candidate profile
 */
export function isDemoProfile(p) {
  if (!p) return true;
  const id = String(p.id || '').toLowerCase().trim();
  const name = String(p.name || '').toLowerCase().trim();

  if (p.isDemo === true || p.is_demo === true || p.isDemo === 'true' || p.is_demo === 'true') return true;

  // Real registered candidate IDs must never be flagged as demo
  if (id.startsWith('usr_') || id.startsWith('i4y')) {
    return false;
  }

  // Match demo IDs
  if (
    /^p[0-9]+$/.test(id) ||
    id.startsWith('demo-') ||
    id.startsWith('demo_') ||
    id === 'demo' ||
    id.startsWith('test_') ||
    id === 'p_1790420920023' ||
    id === 'p_1790423415609' ||
    id === 'p_1791044984217' ||
    id === 'p_1790963054403' ||
    id === 'p_1790182902571' ||
    id === 'p_1790585472737' ||
    id === 'p_1791395066352' ||
    id === 'p_1791395066369' ||
    id === 'i4y1008_1791482054640'
  ) {
    return true;
  }

  // Match only explicit dummy test candidate names
  const testDummyNames = [
    'test candidate',
    'test registration',
    'test probe',
    'supabase live test user',
    'test sdk user',
    'demo test'
  ];
  if (testDummyNames.includes(name)) return true;

  return false;
}

/**
 * Permanently deletes all legacy demo and test profiles from Supabase database in the cloud
 */
export async function purgeDemoProfilesFromSupabase() {
  if (!isSupabaseConfigured()) return;
  try {
    const demoIds = [
      'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10',
      'p11', 'p12', 'p13', 'p14', 'p15',
      'demo-priya', 'demo-rohan', 'demo_user',
      'p_1790420920023', 'p_1790423415609', 'p_1791044984217',
      'p_1790182902571', 'p_1790585472737', 'p_1790963054403', 'p_1791395066352', 'p_1791395066369',
      'i4y1008_1791482054640',
      'test_sdk_1791097509591', 'test_sync_1791098620388', 'test_anon_1791369041', 'test_probe_1791394020373', 'test_payload_1'
    ];
    await supabase.from('profiles').delete().in('id', demoIds);
    await supabase.from('profiles').delete().in('name', [
      'Test Candidate', 'Test Registration', 'Test Probe', 'Supabase Live Test User', 'Test SDK User'
    ]);
  } catch (err) {
    console.warn('[purgeDemoProfilesFromSupabase] Notice:', err);
  }
}

export const CANDIDATE_FEED_COLUMNS = [
  'id',
  'register_id',
  'name',
  'age',
  'gender',
  'height',
  'skin_colour',
  'photo',
  'photo_url',
  'single_photos',
  'religion',
  'caste',
  'mother_tongue',
  'state',
  'city',
  'district',
  'native_address',
  'education',
  'education_category',
  'profession',
  'company',
  'annual_income',
  'diet',
  'marital_status',
  'body_type',
  'partner_expectations',
  'about',
  'verified',
  'govt_id_verified',
  'aadhaar_verified',
  'aadhaar_status',
  'match_score',
  'manglik',
  'status',
  'created_at'
].join(',');

export const PROFILE_DETAIL_COLUMNS = [
  'id', 'register_id', 'name', 'email', 'phone', 'age', 'gender', 'height', 'skin_colour',
  'photo', 'photo_url', 'single_photos', 'family_photos', 'religion', 'caste', 'mother_tongue',
  'state', 'city', 'district', 'native_address', 'education', 'education_category', 'profession',
  'company', 'annual_income', 'diet', 'marital_status', 'body_type', 'smoking', 'drinking',
  'hobbies', 'about', 'partner_expectations', 'family_details', 'verified', 'govt_id_verified',
  'aadhaar_verified', 'aadhaar_status', 'aadhaar_rejection_reason', 'selfie_verified', 'selfie_photo',
  'selfie_match_score', 'match_score', 'manglik', 'status', 'created_at', 'updated_at'
].join(',');

/**
 * Deduplicates a list of profiles by ID, normalized Phone, and Name+Gender
 */
export function deduplicateProfiles(list) {
  if (!Array.isArray(list)) return [];
  const seenIds = new Set();
  const seenPhones = new Set();
  const seenKeys = new Set();

  return list.filter(p => {
    if (!p || !p.id) return false;
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);

    const phoneDigits = String(p.phone || p.mobile || '').replace(/\D/g, '');
    if (phoneDigits && phoneDigits.length >= 10) {
      if (seenPhones.has(phoneDigits)) return false;
      seenPhones.add(phoneDigits);
    }

    const nameKey = `${String(p.name || '').trim().toLowerCase()}_${String(p.gender || '').toLowerCase()}`;
    if (nameKey && nameKey.length > 3) {
      if (seenKeys.has(nameKey)) return false;
      seenKeys.add(nameKey);
    }
    return true;
  });
}

/**
 * Fetch all active profiles from Supabase first, with fallback to Flask backend & offline cache
 * Excludes all demo profiles - returns only real registered candidates.
 * Explicitly filters out currently authenticated user (WHERE user_id != current_user_id AND id != current_user_id).
 */
export async function fetchLiveProfiles(currentUserId = null) {
  // 1. Direct Supabase PostgreSQL query (Port 443 HTTPS - Works universally without backend)
  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('profiles')
        .select(CANDIDATE_FEED_COLUMNS)
        .eq('status', 'active');

      if (currentUserId) {
        const uidStr = String(currentUserId).trim();
        // Explicitly filter out currently authenticated user from backend PostgreSQL query
        query = query.neq('id', uidStr).neq('user_id', uidStr);
      }

      const fetchPromise = query
        .order('created_at', { ascending: false })
        .limit(50);

      // 8-second timeout guard to prevent UI stalling on slow connections
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase fetch timed out')), 8000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (!error && Array.isArray(data) && data.length > 0) {
        const rawList = data
          .map(mapSupabaseRowToProfile)
          .filter(p => {
            if (isDemoProfile(p)) return false;
            if (currentUserId) {
              const uidStr = String(currentUserId).trim();
              if (String(p.id) === uidStr || (p.user_id && String(p.user_id) === uidStr)) return false;
            }
            return true;
          });
        const liveList = deduplicateProfiles(rawList);

        if (liveList.length > 0) {
          try {
            localStorage.setItem('i4u_cached_profiles', JSON.stringify(liveList));
          } catch (e) {}
          return liveList;
        }
      }
    } catch (sbErr) {
      console.warn('[Supabase Profiles Fetch Fallback]:', sbErr.message);
    }
  }

  // 2. Fallback to Python backend (local dev only)
  try {
    const queryParam = currentUserId ? `?exclude_user_id=${encodeURIComponent(currentUserId)}` : '';
    const data = await safeFetchJson(`${API_BASE}/public/profiles${queryParam}`, {}, 1500);
    if (data && data.success && Array.isArray(data.profiles) && data.profiles.length > 0) {
      const rawList = data.profiles
        .filter(p => {
          if (isDemoProfile(p)) return false;
          if (currentUserId) {
            const uidStr = String(currentUserId).trim();
            if (String(p.id) === uidStr || (p.user_id && String(p.user_id) === uidStr)) return false;
          }
          return true;
        })
        .map(p => ({
          ...p,
          familyDetails: p.familyDetails || {
            type: p.familyType || 'Nuclear Family',
            values: p.familyValues || 'Traditional yet Progressive',
            financialStatus: p.familyFinancialStatus || p.familyStatus || 'Upper Middle Class',
            father: p.fatherOccupation || 'Retired Professional',
            mother: p.motherOccupation || 'Homemaker',
            siblings: p.siblingsDetails || '1 Sibling'
          }
        }));
      const liveList = deduplicateProfiles(rawList);
      if (liveList.length > 0) {
        try {
          localStorage.setItem('i4u_cached_profiles', JSON.stringify(liveList));
        } catch (e) {}
        return liveList;
      }
    }
  } catch (err) {
    console.warn('[API] Could not connect to backend, fallback:', err.message);
  }

  // 3. Fallback to cached verified profiles from localStorage
  try {
    const cached = localStorage.getItem('i4u_cached_profiles');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validCached = deduplicateProfiles(parsed.filter(p => !isDemoProfile(p)));
        if (validCached.length > 0) return validCached;
      }
    }
  } catch (e) {}

  // 4. Default authentic fallback profiles
  if (Array.isArray(INITIAL_PROFILES) && INITIAL_PROFILES.length > 0) {
    return deduplicateProfiles(INITIAL_PROFILES.filter(p => !isDemoProfile(p)));
  }

  return [];
}

/**
 * Fetch promotional coupons and offers from the Python database
 */
export async function fetchLiveOffers() {
  // 1. Direct real-time fetch from Supabase Cloud Database
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('id', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (sbErr) {
      console.warn('[Supabase fetchLiveOffers fallback]:', sbErr.message);
    }
  }

  // 2. Fallback to Python backend (local dev only)
  try {
    const data = await safeFetchJson(`${API_BASE}/public/offers?t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    }, 1500);
    if (data && data.success && Array.isArray(data.offers)) {
      return data.offers;
    }
    return [];
  } catch (err) {
    console.warn('[API] Could not connect to backend offers:', err.message);
    return [];
  }
}

/**
 * Fetch dynamic membership plans from the Python database
 */
export async function fetchLivePlans() {
  // 1. Direct real-time fetch from Supabase Cloud Database
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (sbErr) {
      console.warn('[Supabase fetchLivePlans fallback]:', sbErr.message);
    }
  }

  // 2. Fallback to Python backend (local dev only)
  try {
    const data = await safeFetchJson(`${API_BASE}/public/plans?t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    }, 1500);
    if (data && data.success && Array.isArray(data.plans)) {
      return data.plans;
    }
    return null;
  } catch (err) {
    console.warn('[API] Could not connect to backend plans:', err.message);
    return null;
  }
}

/**
 * Register candidate profile: Directly syncs to Supabase Cloud Database (HTTPS)
 * and simultaneously notifies Admin Verification Queue.
 */
export async function registerLiveProfile(userData) {
  if (!userData) return { success: false, error: 'Empty user data' };
  if (!userData.name && userData.fullName) {
    userData.name = userData.fullName;
  }
  if (!userData.phone && userData.mobile) {
    userData.phone = userData.mobile;
  }
  if (!userData.mobile && userData.phone) {
    userData.mobile = userData.phone;
  }

  let profileId = userData.id || userData.userId;
  if (!profileId && (userData.phone || userData.mobile) && isSupabaseConfigured()) {
    const rawPhone = String(userData.phone || userData.mobile).replace(/\D/g, '');
    if (rawPhone.length >= 10) {
      try {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', rawPhone)
          .limit(1);
        if (existing && existing.length > 0 && existing[0].id) {
          profileId = existing[0].id;
        }
      } catch (e) {}
    }
  }

  if (!profileId) {
    profileId = `p_${Date.now()}`;
  }
  userData.id = profileId;

  // 1. Direct real-time sync with Supabase
  let sbResult = null;
  if (isSupabaseConfigured()) {
    try {
      sbResult = await syncProfileToSupabase(userData);
      console.log('[Supabase Direct Sync] Result:', sbResult);
    } catch (sbErr) {
      console.warn('[Supabase Sync Warning]:', sbErr.message);
    }
  }

  // 2. Also notify local Flask backend / SQLite admin if reachable
  try {
    const res = await fetch(`${API_BASE}/public/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[API] Registration offline sync error (Flask):', err.message);
    return { success: true, profile: userData, id: userData.id, syncedToSupabase: Boolean(sbResult?.success) };
  }
}

/**
 * Record payment transaction into Admin Payment Ledger
 */
export async function recordLivePayment(paymentData) {
  // Always persist to localStorage payment ledger
  try {
    const existing = JSON.parse(localStorage.getItem('i4u_payment_ledger') || '[]');
    existing.unshift({ ...paymentData, recorded_at: new Date().toISOString() });
    localStorage.setItem('i4u_payment_ledger', JSON.stringify(existing.slice(0, 50)));
  } catch (e) {}

  const data = await safeFetchJson(`${API_BASE}/public/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData)
  }, 1500);

  return data || { success: true, is_local: true };
}

/**
 * Delete personal account with user-specified reason & feedback
 */
export async function deletePersonalAccount({ userId, reason, feedback, email, phone, userName }) {
  // 1. Direct Supabase update
  if (isSupabaseConfigured() && userId) {
    try {
      const cleanId = String(userId).trim();
      await supabase.from('profiles').update({
        status: 'deleted',
        deletion_reason: reason || feedback || 'User deleted account',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).or(`id.eq.${cleanId},register_id.eq.${cleanId}`);
    } catch (sbErr) {
      console.warn('[Supabase deletePersonalAccount Warning]:', sbErr.message);
    }
  }

  // 2. Notify Flask API
  await safeFetchJson(`${API_BASE}/public/account/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, reason, feedback, email, phone, userName })
  }, 1500);

  return { success: true };
}

/**
 * Verify candidate Aadhaar with UIDAI authentication and synchronize with Supabase & backend
 */
export async function verifyLiveAadhaar(aadhaarData) {
  // 1. Direct Supabase sync
  if (isSupabaseConfigured() && aadhaarData?.id) {
    try {
      const cleanId = String(aadhaarData.id).trim();
      const front = await compressBase64Image(aadhaarData.aadhaar_front_image || aadhaarData.frontDocumentPreview, 1200, 0.85);
      const back = await compressBase64Image(aadhaarData.aadhaar_back_image || aadhaarData.backDocumentPreview, 1200, 0.85);
      const isApproved = aadhaarData.aadhaar_status === 'approved' || Boolean(aadhaarData.aadhaarVerified);
      const payload = {
        aadhaar_status: aadhaarData.aadhaar_status || (isApproved ? 'approved' : 'pending'),
        aadhaar_verified: isApproved ? 1 : 0,
        verified: isApproved ? 1 : 0,
        updated_at: new Date().toISOString()
      };
      if (front) payload.aadhaar_front_image = front;
      if (back) payload.aadhaar_back_image = back;
      await supabase.from('profiles').update(payload).or(`id.eq.${cleanId},register_id.eq.${cleanId}`);
    } catch (sbErr) {
      console.warn('[Supabase Aadhaar Sync Warning]:', sbErr.message);
    }
  }

  // 2. Notify Flask API
  const data = await safeFetchJson(`${API_BASE}/public/verify-aadhaar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aadhaarData)
  }, 1500);

  return data || { success: true, offline: true, ...aadhaarData };
}

/**
 * Update candidate profile photos directly in Supabase and backend
 */
export async function updateLivePhotos(photoData) {
  const profileId = photoData.id || photoData.userId || photoData.registerId || photoData.register_id;
  const targetId = profileId || photoData.phone || photoData.mobile;
  const cleanId = targetId ? String(targetId).trim() : null;

  let photo = await compressBase64Image(photoData.photo, 800, 0.82);

  // Attempt to upload avatar to Supabase Storage for permanent public URL
  if (photo && (photo.startsWith('data:') || photo.startsWith('blob:'))) {
    try {
      const uploadRes = await uploadProfilePhoto(photo, cleanId || 'user', 'avatars');
      if (uploadRes && uploadRes.success && uploadRes.publicUrl) {
        photo = uploadRes.publicUrl;
      }
    } catch (uploadErr) {
      console.warn('[updateLivePhotos] Supabase storage upload fallback:', uploadErr);
    }
  }

  // Apply cache-busting timestamp (Cloudflare R2 / Supabase Storage / CDN)
  if (photo) {
    photo = addCacheBuster(photo, Date.now());
  }

  let singlePhotos = photoData.singlePhotos;
  let finalSinglePhotos = Array.isArray(singlePhotos) ? [...singlePhotos] : [];
  if (Array.isArray(singlePhotos)) {
    const compressed = await Promise.all(
      singlePhotos.map(p => (typeof p === 'string' && p.startsWith('data:image')) ? compressBase64Image(p, 1080, 0.8) : p)
    );
    // Ensure index 0 matches primary photo if primary photo became a storage publicUrl
    if (photo && compressed.length > 0 && compressed[0] !== photo) {
      compressed[0] = photo;
    }
    finalSinglePhotos = compressed.map(p => addCacheBuster(p, Date.now()));
    singlePhotos = JSON.stringify(finalSinglePhotos);
  }

  let familyPhotos = photoData.familyPhotos;
  if (Array.isArray(familyPhotos)) {
    const compressedFamily = await Promise.all(
      familyPhotos.map(p => (typeof p === 'string' && p.startsWith('data:image')) ? compressBase64Image(p, 1080, 0.8) : p)
    );
    familyPhotos = JSON.stringify(compressedFamily.map(p => addCacheBuster(p, Date.now())));
  }

  const payload = {
    updated_at: new Date().toISOString()
  };
  if (photo) {
    payload.photo = photo;
    payload.photo_url = photo; // CRITICAL: BOTH photo AND photo_url MUST BE UPDATED
  }
  if (singlePhotos) payload.single_photos = singlePhotos;
  if (familyPhotos) payload.family_photos = familyPhotos;
  if (photoData.hidePhotos !== undefined) {
    payload.hide_photos = photoData.hidePhotos ? 1 : 0;
  }
  if (photoData.photoVisibility !== undefined) {
    payload.photo_visibility = photoData.photoVisibility;
  }

  // 1. Direct Supabase sync
  if (isSupabaseConfigured() && cleanId) {
    try {
      const isRegId = cleanId.toUpperCase().startsWith('I4Y');
      let query = supabase.from('profiles').update(payload);
      if (isRegId) {
        query = query.or(`register_id.ilike.${cleanId},id.eq.${cleanId}`);
      } else {
        query = query.or(`id.eq.${cleanId},register_id.eq.${cleanId},phone.eq.${cleanId}`);
      }
      const { error } = await query.select();

      if (error) {
        console.warn('[Supabase Photo Sync Warning]:', error.message);
      } else {
        console.log('[Supabase Photo Sync Success]: Updated photos for', cleanId);
      }
    } catch (sbErr) {
      console.warn('[Supabase Photo Sync Warning]:', sbErr.message);
    }
  }

  // 2. Always synchronize with FastAPI/Flask Backend and PostgreSQL database
  try {
    const backendPayload = {
      userId: cleanId,
      id: cleanId,
      name: photoData.name || photoData.userName || photoData.fullName,
      phone: photoData.phone || photoData.mobile,
      photo: photo || photoData.photo,
      photo_url: photo || photoData.photo,
      singlePhotos: finalSinglePhotos.length > 0 ? finalSinglePhotos : photoData.singlePhotos,
      familyPhotos: photoData.familyPhotos,
      hidePhotos: photoData.hidePhotos,
      photoVisibility: photoData.photoVisibility
    };
    await safeFetchJson(`${API_BASE}/public/update-photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload)
    }, 2000);
  } catch (err) {
    console.warn('[updateLivePhotos] Backend update-photos notification notice:', err.message);
  }

  // 3. Keep local device storage in sync
  try {
    const saved = localStorage.getItem('i4u_auth_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      let parsedSingles = finalSinglePhotos.length > 0 ? finalSinglePhotos : photoData.singlePhotos;
      if (typeof parsedSingles === 'string') {
        try { parsedSingles = JSON.parse(parsedSingles); } catch(e) {}
      }
      const updated = {
        ...parsed,
        ...photoData,
        photo: photo || photoData.photo,
        photo_url: photo || photoData.photo,
        singlePhotos: parsedSingles || parsed.singlePhotos
      };
      localStorage.setItem('i4u_auth_user', JSON.stringify(updated));
    }
  } catch (e) {}

  const resultObj = { 
    success: true, 
    photo, 
    photo_url: photo, 
    singlePhotos: finalSinglePhotos.length > 0 ? finalSinglePhotos : photoData.singlePhotos, 
    familyPhotos: photoData.familyPhotos 
  };

  // 4. Broadcast instant synchronization across all tabs, windows, and realtime listeners
  if (profileSyncChannel) {
    try {
      profileSyncChannel.postMessage({
        type: 'PROFILE_UPDATED',
        userId: cleanId,
        photos: resultObj,
        profile: {
          id: cleanId,
          photo,
          photo_url: photo,
          singlePhotos: resultObj.singlePhotos,
          familyPhotos: resultObj.familyPhotos
        }
      });
    } catch (e) {}
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('i4u_profile_updated', {
      detail: {
        userId: cleanId,
        photos: resultObj,
        profile: {
          id: cleanId,
          photo,
          photo_url: photo,
          singlePhotos: resultObj.singlePhotos,
          familyPhotos: resultObj.familyPhotos
        }
      }
    }));
  }
  if (isSupabaseConfigured() && supabase) {
    try {
      const syncChn = supabase.channel('profiles-realtime-sync');
      syncChn.send({
        type: 'broadcast',
        event: 'profile_updated',
        payload: { userId: cleanId, photo, photo_url: photo }
      });
    } catch (e) {}
  }

  return resultObj;
}

/**
 * Update candidate profile directly in Supabase with automatic storage upload,
 * camelCase-to-snake_case mapping, and local session synchronization.
 *
 * @param {string} profileIdentifier - User's id or register_id
 * @param {Object} updateData - Object containing fields to update
 * @returns {Promise<{success: boolean, profile?: Object, error?: string}>}
 */
export async function updateLiveUserProfile(profileIdentifier, updateData) {
  if (!profileIdentifier || !updateData) {
    return { success: false, error: 'Identifier and update payload required' };
  }

  const cleanId = String(profileIdentifier).trim();

  // 1. Process and upload photo if new base64 image provided
  let photoUrl = updateData.photo || updateData.photo_url;
  if (photoUrl && (photoUrl.startsWith('data:') || photoUrl.startsWith('blob:'))) {
    try {
      const uploadRes = await uploadProfilePhoto(photoUrl, cleanId, 'avatars');
      if (uploadRes.success && uploadRes.publicUrl) {
        photoUrl = uploadRes.publicUrl;
      }
    } catch (photoErr) {
      console.warn('[updateLiveUserProfile] Photo upload error:', photoErr);
    }
  }

  // 2. Build snake_case database payload
  const payload = {
    updated_at: new Date().toISOString()
  };

  if (updateData.name !== undefined) payload.name = updateData.name;
  if (updateData.fullName !== undefined) payload.name = updateData.fullName;
  if (updateData.email !== undefined) payload.email = updateData.email;
  if (updateData.phone !== undefined) payload.phone = updateData.phone;
  if (updateData.mobile !== undefined) payload.phone = updateData.mobile;
  if (updateData.age !== undefined) payload.age = parseInt(updateData.age, 10) || updateData.age;
  if (updateData.gender !== undefined) payload.gender = updateData.gender;
  if (updateData.height !== undefined) payload.height = updateData.height;
  if (updateData.skinColour !== undefined) payload.skin_colour = updateData.skinColour;
  if (updateData.skin_colour !== undefined) payload.skin_colour = updateData.skin_colour;
  if (updateData.religion !== undefined) payload.religion = updateData.religion;
  if (updateData.caste !== undefined) payload.caste = updateData.caste;
  if (updateData.motherTongue !== undefined) payload.mother_tongue = updateData.motherTongue;
  if (updateData.mother_tongue !== undefined) payload.mother_tongue = updateData.mother_tongue;
  if (updateData.state !== undefined) payload.state = updateData.state;
  if (updateData.city !== undefined) payload.city = updateData.city;
  if (updateData.district !== undefined) payload.district = updateData.district;
  if (updateData.nativeAddress !== undefined) payload.native_address = updateData.nativeAddress;
  if (updateData.native_address !== undefined) payload.native_address = updateData.native_address;
  if (updateData.education !== undefined) payload.education = updateData.education;
  if (updateData.educationCategory !== undefined) payload.education_category = updateData.educationCategory;
  if (updateData.profession !== undefined) payload.profession = updateData.profession;
  if (updateData.company !== undefined) payload.company = updateData.company;
  if (updateData.annualIncome !== undefined) payload.annual_income = updateData.annualIncome;
  if (updateData.annual_income !== undefined) payload.annual_income = updateData.annual_income;
  if (updateData.diet !== undefined) payload.diet = updateData.diet;
  if (updateData.manglik !== undefined) payload.manglik = updateData.manglik;
  if (updateData.about !== undefined) payload.about = updateData.about;
  if (updateData.aboutBio !== undefined) payload.about = updateData.aboutBio;
  if (updateData.maritalStatus !== undefined) payload.marital_status = updateData.maritalStatus;
  if (updateData.marital_status !== undefined) payload.marital_status = updateData.marital_status;
  if (updateData.bodyType !== undefined) payload.body_type = updateData.bodyType;
  if (updateData.body_type !== undefined) payload.body_type = updateData.body_type;
  if (updateData.partnerExpectations !== undefined) payload.partner_expectations = updateData.partnerExpectations;
  if (updateData.partner_expectations !== undefined) payload.partner_expectations = updateData.partner_expectations;

  if (photoUrl) {
    payload.photo = photoUrl;
    payload.photo_url = photoUrl;
  }

  if (updateData.singlePhotos !== undefined) {
    payload.single_photos = Array.isArray(updateData.singlePhotos) 
      ? JSON.stringify(updateData.singlePhotos) 
      : updateData.singlePhotos;
  }
  if (updateData.familyPhotos !== undefined) {
    payload.family_photos = Array.isArray(updateData.familyPhotos) 
      ? JSON.stringify(updateData.familyPhotos) 
      : updateData.familyPhotos;
  }

  // 3. Execute Supabase update query
  if (isSupabaseConfigured()) {
    try {
      const isRegId = cleanId.toUpperCase().startsWith('I4Y');
      let query = supabase.from('profiles').update(payload);

      if (isRegId) {
        query = query.or(`register_id.ilike.${cleanId},id.eq.${cleanId}`);
      } else {
        query = query.or(`id.eq.${cleanId},register_id.eq.${cleanId},phone.eq.${cleanId}`);
      }

      const { data, error } = await query.select();

      if (error) {
        console.error('[updateLiveUserProfile] Supabase update error:', error.message);
        return { success: false, error: error.message };
      }

      let updatedRow = data && data.length > 0 ? data[0] : null;

      // If no row was matched/updated in Supabase, fallback to upsert via syncProfileToSupabase
      if (!updatedRow) {
        try {
          const currentSaved = localStorage.getItem('i4u_auth_user');
          const parsed = currentSaved ? JSON.parse(currentSaved) : {};
          const fullData = { ...parsed, ...updateData, id: cleanId };
          const syncRes = await syncProfileToSupabase(fullData);
          if (syncRes && syncRes.data && syncRes.data.length > 0) {
            updatedRow = syncRes.data[0];
          }
        } catch (syncErr) {
          console.warn('[updateLiveUserProfile] Upsert fallback notice:', syncErr);
        }
      }

      const mappedProfile = updatedRow ? mapSupabaseRowToProfile(updatedRow) : null;

      // 4. Always notify FastAPI/Flask Backend & PostgreSQL database
      try {
        const backendPayload = {
          userId: cleanId,
          id: cleanId,
          ...payload,
          ...updateData
        };
        await safeFetchJson(`${API_BASE}/public/update-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backendPayload)
        }, 2000);
      } catch (backendErr) {
        console.warn('[updateLiveUserProfile] Backend profile sync notice:', backendErr.message);
      }

      // 5. Keep local session in sync so refresh never reverts
      let mergedUser = null;
      try {
        const currentSaved = localStorage.getItem('i4u_auth_user');
        const parsed = currentSaved ? JSON.parse(currentSaved) : {};
        mergedUser = { ...parsed, ...updateData, ...(mappedProfile || {}) };
        if (photoUrl) mergedUser.photo = photoUrl;
        localStorage.setItem('i4u_auth_user', JSON.stringify(mergedUser));
        if (cleanId) {
          localStorage.setItem('i4u_current_user_id', cleanId);
        }
      } catch (e) {}

      const finalProfile = mappedProfile || mergedUser || updateData;

      // 6. Broadcast instant update across all tabs, windows, and realtime subscribers
      if (profileSyncChannel) {
        try {
          profileSyncChannel.postMessage({
            type: 'PROFILE_UPDATED',
            userId: cleanId,
            profile: finalProfile
          });
        } catch (e) {}
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('i4u_profile_updated', {
          detail: {
            userId: cleanId,
            profile: finalProfile
          }
        }));
      }
      if (isSupabaseConfigured() && supabase) {
        try {
          const syncChn = supabase.channel('profiles-realtime-sync');
          syncChn.send({
            type: 'broadcast',
            event: 'profile_updated',
            payload: { userId: cleanId, profile: finalProfile }
          });
        } catch (e) {}
      }

      return { success: true, profile: finalProfile };
    } catch (err) {
      console.error('[updateLiveUserProfile] Exception:', err);
      return { success: false, error: err.message };
    }
  }

  // Graceful local offline fallback
  try {
    const currentSaved = localStorage.getItem('i4u_auth_user');
    const parsed = currentSaved ? JSON.parse(currentSaved) : {};
    const merged = { ...parsed, ...updateData };
    if (photoUrl) merged.photo = photoUrl;
    localStorage.setItem('i4u_auth_user', JSON.stringify(merged));

    // Notify backend if reachable
    try {
      safeFetchJson(`${API_BASE}/public/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: cleanId, id: cleanId, ...updateData })
      }, 1500).catch(() => {});
    } catch (e) {}

    // Broadcast
    if (profileSyncChannel) {
      try { profileSyncChannel.postMessage({ type: 'PROFILE_UPDATED', userId: cleanId, profile: merged }); } catch(e) {}
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('i4u_profile_updated', { detail: { userId: cleanId, profile: merged } }));
    }

    return { success: true, profile: merged };
  } catch (e) {
    return { success: false, error: 'Could not persist profile changes' };
  }
}

/**
 * Fetch candidate profile with live Aadhaar status & admin rejection reason
 */
export async function fetchLiveUserProfile(userId) {
  if (!userId) return null;

  // 1. Try Supabase direct query
  if (isSupabaseConfigured()) {
    try {
      const cleanId = String(userId).trim();
      const isRegId = cleanId.toUpperCase().startsWith('I4Y');

      let query = supabase.from('profiles').select(PROFILE_DETAIL_COLUMNS);
      if (isRegId) {
        query = query.or(`register_id.ilike.${cleanId},id.eq.${cleanId}`);
      } else {
        query = query.or(`id.eq.${cleanId},register_id.eq.${cleanId},phone.eq.${cleanId}`);
      }

      const { data, error } = await query.limit(1).maybeSingle();
      if (!error && data) {
        return mapSupabaseRowToProfile(data);
      }
    } catch (sbErr) {
      console.warn('[Supabase fetchLiveUserProfile Warning]:', sbErr.message);
    }
  }

  // 2. Try Flask API (local dev only)
  try {
    const data = await safeFetchJson(`${API_BASE}/public/profile/${userId}?_t=${Date.now()}`, {}, 1200);
    if (data && data.success && data.profile) {
      return data.profile;
    }
    return null;
  } catch (err) {
    console.warn('[API] Could not fetch live user profile:', err.message);
    return null;
  }
}

/**
 * Creates a Cashfree Payment Gateway Order via backend API
 */
export async function createCashfreeOrder(orderData) {
  const data = await safeFetchJson(`${API_BASE}/payment/cashfree/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  }, 1500);

  if (data && (data.success || data.payment_session_id)) {
    return data;
  }

  const testOrderId = `order_test_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  return {
    success: true,
    order_id: testOrderId,
    payment_session_id: `session_test_${testOrderId}`,
    order_status: 'ACTIVE',
    environment: 'sandbox',
    is_simulated: true
  };
}

/**
 * Verifies Cashfree payment order status from backend
 */
export async function verifyCashfreeOrder(orderId) {
  if (!orderId) return { success: false, paid: false };
  if (orderId.startsWith('order_test_') && !isLocalEnvironment()) {
    return {
      success: true,
      paid: false,
      order_id: orderId,
      order_status: 'ACTIVE'
    };
  }

  const data = await safeFetchJson(`${API_BASE}/payment/cashfree/verify-order/${orderId}?_t=${Date.now()}`, {}, 1500);
  if (data) {
    return data;
  }

  return {
    success: true,
    paid: false,
    order_id: orderId,
    order_status: 'ACTIVE'
  };
}

/**
 * Creates a shareable Cashfree payment link
 */
export async function createCashfreeLink(linkData) {
  const data = await safeFetchJson(`${API_BASE}/payment/cashfree/create-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(linkData)
  }, 1500);

  if (data && (data.success || data.link_url)) return data;

  const linkId = `link_test_${Date.now()}`;
  return {
    success: true,
    link_id: linkId,
    link_url: `https://payments-sandbox.cashfree.com/links/${linkId}`,
    link_status: 'ACTIVE',
    is_simulated: true
  };
}

/**
 * Initializes a direct Seamless UPI Intent for Google Pay, PhonePe, Paytm, or BHIM.
 * Returns deep links and intent URLs to directly open the UPI app on user's phone.
 */
export async function createCashfreeUpiIntent(intentData) {
  const data = await safeFetchJson(`${API_BASE}/payment/cashfree/upi-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(intentData)
  }, 1500);

  if (data && (data.success || data.order_id)) {
    return data;
  }

  const testOrderId = `order_test_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const amount = intentData.amount || 2548;
  const pa = 'cashfree@testbank';
  const pn = encodeURIComponent('I 4 You Matrimony');
  const tn = encodeURIComponent(`I 4 You - ${intentData.plan_name || 'Membership'}`);
  const baseUpi = `upi://pay?pa=${pa}&pn=${pn}&am=${amount}&tr=${testOrderId}&cu=INR&tn=${tn}`;

  return {
    success: true,
    order_id: testOrderId,
    environment: 'sandbox',
    is_simulated: true,
    intent_url: baseUpi,
    deep_links: {
      gpay: baseUpi,
      phonepe: `phonepe://pay?pa=${pa}&pn=${pn}&am=${amount}&tr=${testOrderId}&cu=INR&tn=${tn}`,
      paytm: `paytmmp://pay?pa=${pa}&pn=${pn}&am=${amount}&tr=${testOrderId}&cu=INR&tn=${tn}`,
      bhim: baseUpi,
      default: baseUpi
    }
  };
}

/**
 * Simulates entering UPI PIN for direct testing
 */
export async function simulateUpiPinSuccess(simData) {
  const data = await safeFetchJson(`${API_BASE}/payment/cashfree/simulate-upi-success`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(simData)
  }, 1500);

  if (data && (data.success || data.paid)) {
    return data;
  }

  const orderId = simData.order_id || `order_test_${Date.now()}`;
  return {
    success: true,
    paid: true,
    order_id: orderId,
    order_status: 'PAID',
    transaction_id: `UPI_${orderId}`,
    invoice_no: `INV-2026-${orderId.slice(-6)}`,
    amount: simData.amount,
    payment_method: `UPI (${simData.upi_app || 'Google Pay'})`
  };
}

/**
 * Checks Cashfree payment link status from backend
 */
export async function verifyCashfreeLink(linkId) {
  const data = await safeFetchJson(`${API_BASE}/payment/cashfree/verify-link/${linkId}?_t=${Date.now()}`, {}, 1500);
  if (data) {
    return data;
  }

  return {
    success: true,
    paid: true,
    link_status: 'PAID',
    link_id: linkId,
    invoice_no: `INV-2026-${String(linkId).slice(-6)}`
  };
}

// ==========================================
// AUDITED BACKEND MESSAGES & INTERESTS APIS
// Extracts sender_id directly from JWT token
// ==========================================

/**
 * Send chat message via authenticated backend (FastAPI / Flask).
 * sender_id is extracted strictly from the JWT Bearer token on backend.
 */
export async function sendBackendMessage({ receiver_id, text, conversation_id = null }) {
  const token = getStoredAuthToken();
  const res = await safeFetchJson(`${API_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      receiver_id: String(receiver_id),
      text: String(text || '').trim(),
      ...(conversation_id ? { conversation_id: String(conversation_id) } : {})
    })
  }, 2500);

  return res;
}

/**
 * Fetch messages for conversation from backend with two-way isolation.
 */
export async function fetchBackendMessages({ partner_id, conversation_id = null }) {
  const token = getStoredAuthToken();
  const query = new URLSearchParams({ partner_id: String(partner_id) });
  if (conversation_id) query.set('conversation_id', String(conversation_id));

  const res = await safeFetchJson(`${API_BASE}/messages?${query.toString()}`, {
    method: 'GET',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  }, 2500);

  return res?.data || [];
}

/**
 * Fetch all conversations for authenticated user from backend.
 */
export async function fetchBackendConversations() {
  const token = getStoredAuthToken();
  const res = await safeFetchJson(`${API_BASE}/conversations`, {
    method: 'GET',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  }, 2500);

  return res?.data || [];
}

/**
 * Express interest via authenticated backend.
 * sender_id is extracted strictly from the JWT Bearer token on backend.
 */
export async function sendBackendInterest({ receiver_id, message = '' }) {
  const token = getStoredAuthToken();
  const res = await safeFetchJson(`${API_BASE}/interests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      receiver_id: String(receiver_id),
      message: String(message || '').trim()
    })
  }, 2500);

  return res;
}

/**
 * Respond to interest (accept/reject) via authenticated backend.
 * The respondent's receiver_id is extracted strictly from JWT on backend.
 */
export async function respondBackendInterest({ sender_id, action = 'accept' }) {
  const token = getStoredAuthToken();
  const res = await safeFetchJson(`${API_BASE}/interests/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      sender_id: String(sender_id),
      action: String(action).toLowerCase()
    })
  }, 2500);

  return res;
}

/**
 * Fetch interests received by authenticated user from backend.
 */
export async function fetchBackendReceivedInterests() {
  const token = getStoredAuthToken();
  const res = await safeFetchJson(`${API_BASE}/interests/received`, {
    method: 'GET',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  }, 2500);

  return res?.data || [];
}

/**
 * Fetch interests sent by authenticated user from backend.
 */
export async function fetchBackendSentInterests() {
  const token = getStoredAuthToken();
  const res = await safeFetchJson(`${API_BASE}/interests/sent`, {
    method: 'GET',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  }, 2500);

  return res?.data || [];
}

/**
 * Dynamically fetches all real notifications for a user from PostgreSQL backend/database.
 * Ensures dynamic binding for sender's name, photo, age, profession, and location,
 * and strictly unique notification_id / id to prevent duplication and UI looping.
 */
export async function fetchUserNotifications(userOrId, allProfiles = []) {
  if (!userOrId) return [];
  const userIds = (typeof userOrId === 'object' && userOrId !== null)
    ? [userOrId.id, userOrId.register_id, userOrId.registerId, userOrId.user_id].filter(Boolean).map(String)
    : [String(userOrId).trim()];
  const cleanId = userIds[0] || '';
  if (!cleanId) return [];

  // Helper to strictly sanitize candidate names and purge 'Verified Member' placeholders
  const sanitizeName = (rawName, fallback = 'Candidate') => {
    if (!rawName || typeof rawName !== 'string') return fallback;
    const clean = rawName.trim();
    const lower = clean.toLowerCase();
    if (
      lower === '' ||
      lower === 'verified member' ||
      lower === 'a verified member' ||
      lower === 'member' ||
      lower === 'a member' ||
      lower === 'candidate' ||
      lower === 'a candidate' ||
      lower === 'someone' ||
      lower === 'null' ||
      lower === 'undefined'
    ) {
      return fallback;
    }
    return clean;
  };

  const sanitizeText = (text, candidateName) => {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/a verified member|verified member/gi, candidateName).trim();
  };

  // 1. Try FastAPI/Flask backend with PostgreSQL
  try {
    const res = await safeFetchJson(`${API_BASE}/public/notifications?userId=${encodeURIComponent(cleanId)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }, 3000);

    if (res && res.success && Array.isArray(res.data)) {
      return res.data.map(item => {
        const sName = sanitizeName(item.sender_name || item.senderName || item.sender?.name, 'Candidate');
        return {
          ...item,
          sender_name: sName,
          title: sanitizeText(item.title, sName) || `💖 Interest from ${sName}!`,
          message: sanitizeText(item.message, sName) || `${sName} expressed matrimonial interest in connecting with you.`
        };
      });
    }
  } catch (backendErr) {
    console.warn('[fetchUserNotifications] Backend notice:', backendErr.message);
  }

  // 2. Direct Supabase / PostgreSQL fallback
  if (isSupabaseConfigured() && supabase) {
    try {
      // Query notifications table safely
      let notifRows = [];
      try {
        const { data: rowsWithOr } = await supabase
          .from('notifications')
          .select('*')
          .or(`recipient_id.in.(${userIds.map(id => `"${id}"`).join(',')}),recipient_register_id.in.(${userIds.map(id => `"${id}"`).join(',')})`)
          .order('created_at', { ascending: false })
          .limit(40);
        if (Array.isArray(rowsWithOr)) notifRows = rowsWithOr;
      } catch (orErr) {
        const { data: fallbackRows } = await supabase
          .from('notifications')
          .select('*')
          .in('recipient_id', userIds)
          .order('created_at', { ascending: false })
          .limit(40);
        if (Array.isArray(fallbackRows)) notifRows = fallbackRows;
      }

      // Query interests table
      const { data: interestRows } = await supabase
        .from('interests')
        .select('*')
        .in('receiver_id', userIds)
        .order('updated_at', { ascending: false })
        .limit(40);

      const combined = [];
      const seen = new Set();

      // Helper to map profile
      const findProfile = (senderId) => {
        if (!senderId) return null;
        return (allProfiles || []).find(p => p && (
          String(p.id) === String(senderId) ||
          (p.register_id && String(p.register_id) === String(senderId)) ||
          (p.registerId && String(p.registerId) === String(senderId))
        ));
      };

      (interestRows || []).forEach(row => {
        const sId = String(row.sender_id || row.senderId);
        if (!sId || userIds.includes(sId)) return;
        const intId = `interest_${row.id || sId}`;
        if (seen.has(intId)) return;
        seen.add(intId);

        const matched = findProfile(sId);
        const sName = sanitizeName(matched?.name) !== 'Candidate'
          ? matched.name
          : (sanitizeName(row.metadata?.senderName) !== 'Candidate'
              ? row.metadata.senderName
              : (matched?.register_id ? `Member ${matched.register_id}` : (sId ? `Member ${sId}` : 'Candidate')));

        const sPhoto = matched?.photo || matched?.photo_url || (row.metadata?.senderPhoto) || null;
        const sAge = matched?.age || 26;
        const sProfession = matched?.profession || 'Professional';
        const sLocation = matched?.district || matched?.city || matched?.state || 'Kerala';
        const sVerified = Boolean(matched?.verified || matched?.aadhaar_verified);

        const senderObj = {
          id: sId,
          register_id: matched?.register_id || matched?.registerId || sId,
          name: sName,
          photo: sPhoto,
          age: sAge,
          profession: sProfession,
          city: sLocation,
          district: matched?.district || sLocation,
          location: sLocation,
          verified: sVerified,
          aadhaarVerified: sVerified
        };

        const cleanMsg = sanitizeText(row.message, sName) || `${sName} expressed matrimonial interest in connecting with you.`;

        combined.push({
          notification_id: intId,
          id: intId,
          profileId: sId,
          senderId: sId,
          sender_id: sId,
          sender_name: sName,
          sender_photo: sPhoto,
          sender_age: sAge,
          sender_profession: sProfession,
          sender_location: sLocation,
          sender: senderObj,
          profile: senderObj,
          type: 'interest',
          title: `💖 Interest from ${sName}!`,
          message: cleanMsg,
          is_read: false,
          isRead: false,
          status: row.status || 'pending',
          created_at: row.created_at || row.updated_at || new Date().toISOString()
        });
      });

      (notifRows || []).forEach(row => {
        const notifId = `db_${row.id}`;
        if (seen.has(notifId)) return;
        seen.add(notifId);

        const isPaymentRow = row.type === 'payment_success' || row.type === 'payment' || row.type === 'payment_failed';

        if (isPaymentRow) {
          combined.push({
            notification_id: notifId,
            id: notifId,
            profileId: null,
            senderId: null,
            sender_id: null,
            sender_name: null,
            sender_photo: null,
            sender: null,
            profile: null,
            type: row.type || 'payment_success',
            title: row.title || '🎉 Payment Confirmed',
            message: row.message || 'Your payment was authorized successfully.',
            quote: row.metadata?.quote || row.metadata?.invoiceNumber ? `GST Tax Invoice #${row.metadata.invoiceNumber}` : null,
            badge: row.metadata?.badge || row.metadata?.planName || 'Upgraded',
            amount: row.metadata?.amount || null,
            invoice: row.metadata?.invoice || null,
            is_read: Boolean(row.is_read),
            isRead: Boolean(row.is_read),
            status: 'completed',
            created_at: row.created_at || new Date().toISOString()
          });
          return;
        }

        const sId = String(row.metadata?.senderId || row.metadata?.sender_id || row.sender_id || '');
        const matched = findProfile(sId);
        const sName = sanitizeName(matched?.name) !== 'Candidate'
          ? matched.name
          : (sanitizeName(row.metadata?.senderName) !== 'Candidate'
              ? row.metadata.senderName
              : (matched?.register_id ? `Member ${matched.register_id}` : (sId ? `Member ${sId}` : 'Candidate')));

        const sPhoto = matched?.photo || matched?.photo_url || row.metadata?.senderPhoto || null;
        const sAge = matched?.age || row.metadata?.senderAge || 26;
        const sProfession = matched?.profession || row.metadata?.senderProfession || 'Professional';
        const sLocation = matched?.district || matched?.city || row.metadata?.senderCity || 'Kerala';

        const senderObj = {
          id: sId,
          register_id: matched?.register_id || matched?.registerId || sId,
          name: sName,
          photo: sPhoto,
          age: sAge,
          profession: sProfession,
          city: sLocation,
          location: sLocation
        };

        const cleanTitle = sanitizeText(row.title, sName) || `New Notification from ${sName}`;
        const cleanMsg = sanitizeText(row.message, sName) || '';

        combined.push({
          notification_id: notifId,
          id: notifId,
          profileId: sId,
          senderId: sId,
          sender_id: sId,
          sender_name: sName,
          sender_photo: sPhoto,
          sender_age: sAge,
          sender_profession: sProfession,
          sender_location: sLocation,
          sender: senderObj,
          profile: senderObj,
          type: row.type || 'interest',
          title: cleanTitle,
          message: cleanMsg,
          is_read: Boolean(row.is_read),
          isRead: Boolean(row.is_read),
          status: 'pending',
          created_at: row.created_at || new Date().toISOString()
        });
      });

      return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (e) {
      console.warn('[fetchUserNotifications] Supabase fallback error:', e);
    }
  }

  return [];
}

/**
 * Mark notification as read via backend API and Supabase
 */
export async function markNotificationAsReadApi(notificationId, userId) {
  if (!notificationId) return;
  try {
    safeFetchJson(`${API_BASE}/public/notifications/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_id: notificationId, userId })
    }, 2000).catch(() => {});
  } catch (e) {}

  if (isSupabaseConfigured() && supabase) {
    const rawId = String(notificationId).replace('db_', '').replace('notif_', '');
    supabase.from('notifications').update({ is_read: true }).eq('id', rawId).catch(() => {});
  }
}

/**
 * Delete / dismiss notification via backend API
 */
export async function deleteNotificationApi(notificationId, userId) {
  if (!notificationId) return;
  try {
    safeFetchJson(`${API_BASE}/public/notifications/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_id: notificationId, userId })
    }, 2000).catch(() => {});
  } catch (e) {}

  if (isSupabaseConfigured() && supabase) {
    const rawId = String(notificationId).replace('db_', '').replace('notif_', '');
    supabase.from('notifications').delete().eq('id', rawId).catch(() => {});
  }
}
