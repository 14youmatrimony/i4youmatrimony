/**
 * I 4 You Matrimonial - Client API Service
 * Connects the mobile / web frontend with the Python Flask Backend (http://127.0.0.1:5000)
 */

import { INITIAL_PROFILES } from '../data/mockProfiles';
import { getAppMode } from '../config/appConfig';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Compresses base64 images in browser using offscreen canvas to prevent large database payload bottlenecks
 */
export async function compressBase64Image(dataUrl, maxDim = 1080, quality = 0.82) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    return dataUrl;
  }
  if (dataUrl.length < 180000) {
    return dataUrl; // Already small (< 150KB)
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return dataUrl;
  }
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch (e) {
      resolve(dataUrl);
    }
  });
}

/**
 * Synchronizes any profile record directly into Supabase 'profiles' table via Supabase SDK
 */
export async function syncProfileToSupabase(userData) {
  if (!userData) return null;
  const profileId = userData.id || userData.userId || `p_${Date.now()}`;
  userData.id = profileId;
  if (!isSupabaseConfigured()) return null;
  try {
    const photo = await compressBase64Image(userData.photo, 800, 0.8);
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
      aadhaar_status: userData.aadhaarStatus || userData.aadhaar_status || (userData.aadhaarVerified ? 'approved' : 'pending'),
      aadhaar_rejection_reason: userData.aadhaarRejectionReason || userData.aadhaar_rejection_reason || null,
      aadhaar_front_image: aadhaarFront || null,
      aadhaar_back_image: aadhaarBack || null,
      single_photos: singlePhotos || null,
      family_photos: Array.isArray(userData.familyPhotos) ? JSON.stringify(userData.familyPhotos) : (userData.family_photos || null),
      match_score: userData.matchScore || 85,
      status: userData.status || 'active',
      updated_at: new Date().toISOString()
    };

    let { data, error } = await supabase.from('profiles').upsert([payload]);
    if (error && (error.code === '42703' || error.message?.includes('register_id') || error.message?.includes('password'))) {
      console.warn('[Supabase Upsert] Custom column not yet in schema, retrying with standard columns:', error.message);
      delete payload.register_id;
      delete payload.password;
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

// Automatically detect host: during Vite dev, relative '/api' is proxied; on mobile/Capacitor, connects to localhost:5000
const API_BASE = window.location.origin.includes('5173') 
  ? '/api' 
  : (window.location.origin.includes('5000') ? '/api' : 'http://127.0.0.1:5000/api');

/**
 * Maps Supabase raw database row into candidate profile structure expected by UI
 */
export function mapSupabaseRowToProfile(r) {
  if (!r) return null;

  let singlePhotos = [];
  try {
    if (r.single_photos) {
      singlePhotos = typeof r.single_photos === 'string' ? JSON.parse(r.single_photos) : r.single_photos;
    }
  } catch (e) {
    singlePhotos = [r.photo].filter(Boolean);
  }
  if (!singlePhotos || singlePhotos.length === 0) {
    singlePhotos = [r.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'];
  }

  let familyPhotos = [];
  try {
    if (r.family_photos) {
      familyPhotos = typeof r.family_photos === 'string' ? JSON.parse(r.family_photos) : r.family_photos;
    }
  } catch (e) {
    familyPhotos = ['https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800'];
  }
  if (!familyPhotos || familyPhotos.length === 0) {
    familyPhotos = ['https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800'];
  }

  const isSentBack = r.aadhaar_status === 'sent_back';
  const isApproved = r.aadhaar_status === 'approved' || (Boolean(r.aadhaar_verified) && !isSentBack);

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
    photo: r.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
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
    aadhaar_back_image: r.aadhaar_back_image || null
  };
}

/**
 * Fetch all active profiles from Supabase first, with fallback to Flask backend & mock data
 */
export async function fetchLiveProfiles() {
  // 1. Direct Supabase query (Port 443 HTTPS - Works universally without backend)
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(mapSupabaseRowToProfile);
      }
    } catch (sbErr) {
      console.warn('[Supabase Profiles Fetch Fallback]:', sbErr.message);
    }
  }

  // 2. Fallback to Python backend
  try {
    const res = await fetch(`${API_BASE}/public/profiles`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.profiles) && data.profiles.length > 0) {
      return data.profiles.map(p => ({
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
    }
    return getAppMode() ? [] : INITIAL_PROFILES;
  } catch (err) {
    console.warn('[API] Could not connect to backend, fallback:', err.message);
    return getAppMode() ? [] : INITIAL_PROFILES;
  }
}

/**
 * Fetch promotional coupons and offers from the Python database
 */
export async function fetchLiveOffers() {
  try {
    const res = await fetch(`${API_BASE}/public/offers?t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.offers)) {
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
  try {
    const res = await fetch(`${API_BASE}/public/plans?t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.plans)) {
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
  const profileId = userData.id || userData.userId || `p_${Date.now()}`;
  userData.id = profileId;
  if (!userData.name && userData.fullName) {
    userData.name = userData.fullName;
  }
  if (!userData.phone && userData.mobile) {
    userData.phone = userData.mobile;
  }
  if (!userData.mobile && userData.phone) {
    userData.mobile = userData.phone;
  }

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
  try {
    const res = await fetch(`${API_BASE}/public/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[API] Payment ledger sync error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Delete personal account with user-specified reason & feedback
 */
export async function deletePersonalAccount({ userId, reason, feedback, email, phone, userName }) {
  // 1. Direct Supabase update
  if (isSupabaseConfigured() && userId) {
    try {
      await supabase.from('profiles').update({
        status: 'deleted',
        deletion_reason: reason || feedback || 'User deleted account',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', userId);
    } catch (sbErr) {
      console.warn('[Supabase deletePersonalAccount Warning]:', sbErr.message);
    }
  }

  // 2. Notify Flask API
  try {
    const res = await fetch(`${API_BASE}/public/account/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, reason, feedback, email, phone, userName })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[API] Account deletion sync error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Verify candidate Aadhaar with UIDAI authentication and synchronize with Supabase & backend
 */
export async function verifyLiveAadhaar(aadhaarData) {
  // 1. Direct Supabase sync
  if (isSupabaseConfigured() && aadhaarData?.id) {
    try {
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
      await supabase.from('profiles').update(payload).eq('id', aadhaarData.id);
    } catch (sbErr) {
      console.warn('[Supabase Aadhaar Sync Warning]:', sbErr.message);
    }
  }

  // 2. Notify Flask API
  try {
    const res = await fetch(`${API_BASE}/public/verify-aadhaar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aadhaarData)
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[API] Aadhaar verification backend sync offline:', err.message);
    return { success: true, offline: true, ...aadhaarData };
  }
}

/**
 * Update candidate profile photos directly in Supabase and backend
 */
export async function updateLivePhotos(photoData) {
  const profileId = photoData.id || photoData.userId;
  // 1. Direct Supabase sync
  if (isSupabaseConfigured() && profileId) {
    try {
      const photo = await compressBase64Image(photoData.photo, 800, 0.8);
      let singlePhotos = photoData.singlePhotos;
      if (Array.isArray(singlePhotos)) {
        const compressed = await Promise.all(singlePhotos.map(p => compressBase64Image(p, 1080, 0.8)));
        singlePhotos = JSON.stringify(compressed);
      }
      const payload = {
        updated_at: new Date().toISOString()
      };
      if (photo) payload.photo = photo;
      if (singlePhotos) payload.single_photos = singlePhotos;
      if (photoData.familyPhotos) {
        payload.family_photos = Array.isArray(photoData.familyPhotos) ? JSON.stringify(photoData.familyPhotos) : photoData.familyPhotos;
      }
      await supabase.from('profiles').update(payload).eq('id', profileId);
    } catch (sbErr) {
      console.warn('[Supabase Photo Sync Warning]:', sbErr.message);
    }
  }

  // 2. Notify Flask API
  try {
    const res = await fetch(`${API_BASE}/public/update-photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photoData)
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[API] Photo update backend sync offline:', err.message);
    return { success: true, offline: true, ...photoData };
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        return mapSupabaseRowToProfile(data);
      }
    } catch (sbErr) {
      console.warn('[Supabase fetchLiveUserProfile Warning]:', sbErr.message);
    }
  }

  // 2. Try Flask API
  try {
    const res = await fetch(`${API_BASE}/public/profile/${userId}?_t=${Date.now()}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.profile) {
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
  const res = await fetch(`${API_BASE}/payment/cashfree/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to initialize Cashfree checkout');
  }
  return data;
}

/**
 * Verifies Cashfree payment order status from backend
 */
export async function verifyCashfreeOrder(orderId) {
  const res = await fetch(`${API_BASE}/payment/cashfree/verify-order/${orderId}?_t=${Date.now()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to verify Cashfree payment');
  }
  return data;
}

/**
 * Creates a shareable Cashfree payment link
 */
export async function createCashfreeLink(linkData) {
  const res = await fetch(`${API_BASE}/payment/cashfree/create-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(linkData)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to generate payment link');
  }
  return data;
}

/**
 * Initializes a direct Seamless UPI Intent for Google Pay, PhonePe, Paytm, or BHIM.
 * Returns deep links and intent URLs to directly open the UPI app on user's phone.
 */
export async function createCashfreeUpiIntent(intentData) {
  const res = await fetch(`${API_BASE}/payment/cashfree/upi-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(intentData)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to initialize UPI intent');
  }
  return data;
}

/**
 * Simulates entering UPI PIN for direct testing
 */
export async function simulateUpiPinSuccess(simData) {
  const res = await fetch(`${API_BASE}/payment/cashfree/simulate-upi-success`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(simData)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to process UPI authorization');
  }
  return data;
}

/**
 * Checks Cashfree payment link status from backend
 */
export async function verifyCashfreeLink(linkId) {
  const res = await fetch(`${API_BASE}/payment/cashfree/verify-link/${linkId}?_t=${Date.now()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to verify payment link');
  }
  return data;
}
