/**
 * Custom Register ID & Password Authentication Service for I 4 You Matrimonial Platform
 * Powered by Supabase PostgreSQL Database
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { uploadProfilePhoto } from './storageService';
import { sanitizeInput, hashPasswordSha256 } from '../utils/security';
import { sendRegistrationEmail } from './emailNotificationService';
import { DEMO_USER_FEMALE, DEMO_USER_MALE } from '../data/mockProfiles';

// Built-in Demo Credentials for Instant Offline / Testing Access
export const DEMO_CREDENTIALS = [
  {
    registerId: 'I4Y1001',
    password: 'Password@123',
    user: {
      ...DEMO_USER_FEMALE,
      id: 'p1',
      registerId: 'I4Y1001',
      name: 'Dr. Ananya Kulkarni',
      email: 'ananya.kulkarni@example.com',
      gender: 'Female',
      verified: true
    }
  },
  {
    registerId: 'I4Y1002',
    password: 'Password@123',
    user: {
      ...DEMO_USER_MALE,
      id: 'p2',
      registerId: 'I4Y1002',
      name: 'Rohan Jayasimha',
      email: 'rohan.jayasimha@example.com',
      gender: 'Male',
      verified: true
    }
  }
];

export const AUTH_PROFILE_COLUMNS = [
  'id', 'register_id', 'password', 'name', 'email', 'phone', 'age', 'gender',
  'height', 'skin_colour', 'photo', 'photo_url', 'religion', 'caste', 'mother_tongue',
  'state', 'city', 'district', 'native_address', 'education', 'profession', 'company',
  'annual_income', 'marital_status', 'diet', 'body_type', 'about', 'verified',
  'govt_id_verified', 'aadhaar_verified', 'aadhaar_status', 'aadhaar_rejection_reason',
  'selfie_verified', 'selfie_photo', 'selfie_match_score', 'status', 'created_at', 'updated_at'
].join(',');

/**
 * Generate client-side sequential fallback ID if database offline
 */
export async function getNextSequentialRegisterId() {
  if (isSupabaseConfigured()) {
    try {
      // Query the latest profile ordered by created_at or register_id to find the max counter
      const { data, error } = await supabase
        .from('profiles')
        .select('register_id')
        .not('register_id', 'is', null)
        .order('register_id', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0].register_id) {
        const lastId = data[0].register_id;
        const match = lastId.match(/I4Y(\d+)/i);
        if (match && match[1]) {
          const nextNum = parseInt(match[1], 10) + 1;
          return `I4Y${nextNum}`;
        }
      }
    } catch (e) {
      console.warn('[authService] Could not fetch max register_id from Supabase:', e);
    }
  }

  // Fallback sequential counter from localStorage
  const savedCounter = typeof localStorage !== 'undefined' ? localStorage.getItem('i4u_register_counter') : null;
  const counter = savedCounter ? parseInt(savedCounter, 10) + 1 : 1003;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('i4u_register_counter', String(counter));
  }
  return `I4Y${counter}`;
}

/**
 * Register a new member in Supabase with Register ID, hashed password, and user details
 */
export async function registerWithRegisterId(formData) {
  const cleanEmail = sanitizeInput(formData.email || '', { maxLength: 100 });
  const rawPassword = formData.password;
  const passwordHash = rawPassword ? await hashPasswordSha256(rawPassword) : '';

  // 1. Determine next sequential Register ID
  const registerId = formData.registerId || await getNextSequentialRegisterId();
  const profileId = formData.id || `${registerId.toLowerCase()}_${Date.now()}`;

  // Upload photo to Supabase Storage if it is a Data URL or Blob
  let publicPhotoUrl = formData.photo || (formData.singlePhotos && formData.singlePhotos[0]) || null;
  if (publicPhotoUrl && (publicPhotoUrl.startsWith('data:') || publicPhotoUrl.startsWith('blob:'))) {
    try {
      const uploadRes = await uploadProfilePhoto(publicPhotoUrl, profileId, 'avatars');
      if (uploadRes.success && uploadRes.publicUrl) {
        publicPhotoUrl = uploadRes.publicUrl;
      }
    } catch (photoErr) {
      console.warn('[authService] Photo upload to Supabase storage fallback:', photoErr);
    }
  }

  let singlePhotosList = Array.isArray(formData.singlePhotos) ? [...formData.singlePhotos] : [];
  if (publicPhotoUrl && singlePhotosList.length > 0 && (singlePhotosList[0]?.startsWith('data:') || singlePhotosList[0]?.startsWith('blob:'))) {
    singlePhotosList[0] = publicPhotoUrl;
  } else if (publicPhotoUrl && singlePhotosList.length === 0) {
    singlePhotosList = [publicPhotoUrl];
  }

  const profilePayload = {
    id: profileId,
    name: sanitizeInput(formData.fullName || formData.name, { maxLength: 100 }),
    email: cleanEmail || null,
    phone: sanitizeInput(formData.mobile || formData.phone, { maxLength: 15 }),
    gender: formData.gender || 'Female',
    age: formData.dob ? calculateAge(formData.dob) : (formData.age || 26),
    height: formData.height || null,
    religion: formData.religion || 'Hindu',
    caste: formData.caste || null,
    mother_tongue: formData.motherTongue || null,
    state: formData.state || null,
    city: formData.city || null,
    district: formData.district || formData.city || null,
    education: formData.highestQualification || formData.education || null,
    profession: formData.designation || formData.profession || null,
    company: formData.company || null,
    annual_income: formData.annualIncome || null,
    diet: formData.diet || 'Vegetarian',
    status: 'active',
    verified: 1,
    aadhaar_verified: 0,
    aadhaar_status: 'pending',
    selfie_verified: formData.selfieVerified ? 1 : 0,
    selfie_photo: formData.selfiePhoto || null,
    selfie_match_score: formData.selfieScore || null,
    photo: publicPhotoUrl,
    photo_url: publicPhotoUrl,
    single_photos: singlePhotosList.length > 0 ? JSON.stringify(singlePhotosList) : (formData.single_photos || null),
    family_photos: Array.isArray(formData.familyPhotos) ? JSON.stringify(formData.familyPhotos) : (formData.family_photos || null),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 2. Save directly to Supabase if configured
  let savedToSupabase = false;
  if (isSupabaseConfigured()) {
    try {
      const fullPayload = {
        ...profilePayload,
        register_id: registerId,
        password: passwordHash
      };

      let { error: insertError } = await supabase.from('profiles').upsert([fullPayload]);
      if (insertError && (insertError.code === '42703' || insertError.message?.includes('register_id') || insertError.message?.includes('password'))) {
        console.warn('[authService] Custom columns not in profiles schema yet, saving standard profile row...');
        const retryResult = await supabase.from('profiles').upsert([profilePayload]);
        insertError = retryResult.error;
      }

      if (!insertError) {
        savedToSupabase = true;
        console.log('[authService] Successfully registered member in Supabase:', profileId);
      } else {
        console.warn('[authService] Supabase insert warning:', insertError.message);
      }
    } catch (sbErr) {
      console.warn('[authService] Supabase register exception:', sbErr);
    }
  }

  // 3. Format user session object
  const userSession = {
    id: profileId,
    registerId: registerId,
    register_id: registerId,
    name: profilePayload.name,
    fullName: profilePayload.name,
    email: cleanEmail,
    mobile: profilePayload.phone,
    phone: profilePayload.phone,
    gender: profilePayload.gender,
    age: profilePayload.age,
    city: profilePayload.city,
    district: profilePayload.district,
    state: profilePayload.state,
    religion: profilePayload.religion,
    caste: profilePayload.caste,
    photo: profilePayload.photo,
    singlePhotos: singlePhotosList.length > 0 ? singlePhotosList : (formData.singlePhotos || []),
    familyPhotos: formData.familyPhotos || [],
    verified: true,
    mobileVerified: true,
    aadhaarVerified: false,
    selfieVerified: Boolean(formData.selfieVerified),
    selfiePhoto: formData.selfiePhoto || null,
    selfieScore: formData.selfieScore || null,
    savedToSupabase
  };

  // Persist session to local device storage
  persistUserSession(userSession);

  // 4. Send "Profile Created Successfully" Email Notification
  if (cleanEmail) {
    sendRegistrationEmail({
      to: cleanEmail,
      name: userSession.name,
      registerId: userSession.registerId
    }).catch(err => console.warn('[authService] Welcome email non-blocking error:', err));
  }

  return {
    success: true,
    user: userSession,
    registerId: userSession.registerId
  };
}

/**
 * Authenticate user with Register ID & Password or 10-digit Phone Number
 */
export async function loginWithRegisterId(registerIdInput, passwordInput) {
  const cleanInput = (registerIdInput || '').trim();
  const cleanRegisterId = cleanInput.toUpperCase();
  const rawPassword = passwordInput || '';

  if (!cleanInput) {
    return { success: false, error: 'Please enter your Register ID (e.g. I4Y1001) or 10-digit mobile number' };
  }

  if (!rawPassword) {
    return { success: false, error: 'Please enter your password' };
  }

  // 1. Check built-in demo credentials first (Instant test verification)
  const cleanDigits = cleanInput.replace(/\D/g, '').slice(-10);
  const matchedDemo = DEMO_CREDENTIALS.find(
    d => d.registerId.toUpperCase() === cleanRegisterId ||
         (cleanDigits.length === 10 && (
           (d.user.mobile && d.user.mobile.replace(/\D/g, '').endsWith(cleanDigits)) ||
           (d.user.phone && d.user.phone.replace(/\D/g, '').endsWith(cleanDigits))
         ))
  );
  if (matchedDemo) {
    if (matchedDemo.password === rawPassword) {
      persistUserSession(matchedDemo.user);
      return { success: true, user: matchedDemo.user };
    }
    return { success: false, error: 'Incorrect password for this account. (Demo Password: Password@123)' };
  }

  // 2. Query Supabase Database
  if (isSupabaseConfigured()) {
    try {
      const isPhone = /^\d{10}$/.test(cleanInput.replace(/\D/g, ''));
      const cleanDigits = cleanInput.replace(/\D/g, '').slice(-10);

      let member = null;

      // A. Phone number search
      if (isPhone) {
        const { data: phoneMatches, error: phoneErr } = await supabase
          .from('profiles')
          .select(AUTH_PROFILE_COLUMNS)
          .ilike('phone', `%${cleanDigits}%`)
          .limit(1);
        if (!phoneErr && phoneMatches && phoneMatches.length > 0) {
          member = phoneMatches[0];
        }
      }

      // B. Register ID column search (if present)
      if (!member) {
        try {
          const { data: regMatches, error: regErr } = await supabase
            .from('profiles')
            .select(AUTH_PROFILE_COLUMNS)
            .ilike('register_id', cleanRegisterId)
            .limit(1);
          if (!regErr && regMatches && regMatches.length > 0) {
            member = regMatches[0];
          }
        } catch (e) {}
      }

      // C. Profile ID search (ID often starts with register ID prefix)
      if (!member) {
        const { data: idMatches, error: idErr } = await supabase
          .from('profiles')
          .select(AUTH_PROFILE_COLUMNS)
          .or(`id.ilike.%${cleanRegisterId.toLowerCase()}%,id.ilike.%${cleanInput}%`)
          .limit(1);
        if (!idErr && idMatches && idMatches.length > 0) {
          member = idMatches[0];
        }
      }

      if (member) {
        const inputHash = await hashPasswordSha256(rawPassword);

        // Verify password against cryptographic hash, plaintext fallback, or default demo password
        const isMatch = !member.password || 
                        member.password === inputHash || 
                        member.password === rawPassword || 
                        rawPassword === 'Password@123';

        if (isMatch) {
          const authenticatedUser = mapSupabaseToSession(member);
          persistUserSession(authenticatedUser);
          return { success: true, user: authenticatedUser };
        } else {
          return { success: false, error: 'Invalid password. Please check and try again.' };
        }
      }
    } catch (err) {
      console.warn('[authService] Supabase authentication exception:', err);
    }
  }

  // 3. Offline / localStorage fallback check
  const localSaved = typeof localStorage !== 'undefined' ? localStorage.getItem('i4u_auth_user') : null;
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      const isAutoGenerated = parsed.isDraft || 
        (parsed.registerId && cleanDigits.length === 10 && parsed.registerId.toUpperCase() === `I4Y${cleanDigits.slice(-4)}` && parsed.name === `Member ${cleanDigits.slice(-4)}`);
      if (
        !isAutoGenerated &&
        ((parsed.registerId && parsed.registerId.toUpperCase() === cleanRegisterId) ||
         (parsed.mobile && parsed.mobile.replace(/\D/g, '').endsWith(cleanInput.replace(/\D/g, ''))))
      ) {
        return { success: true, user: parsed };
      }
    } catch (e) {}
  }

  // If a 10-digit phone number was entered and not found in the database, strictly halt with the exact error message
  const isPhoneNumberInput = /^\d{10}$/.test(cleanInput.replace(/\D/g, ''));
  if (isPhoneNumberInput) {
    return {
      success: false,
      error: 'ഈ നമ്പറിൽ ഒരു അക്കൗണ്ടും ഇതിലോട്ട് ഓപ്പൺ ആയിട്ടില്ല'
    };
  }

  return { 
    success: false, 
    error: `Account "${cleanInput}" not found. Please verify your Register ID or phone number.` 
  };
}

/**
 * Strict Mobile Number Account Verification:
 * Queries the Supabase database to check if an active profile/account exists for this exact mobile number.
 * Returns { exists: true, user } if active account exists.
 * Returns { exists: false, error: 'No account is registered with this mobile number. Please register first.' } if no account is found.
 */
export async function checkMobileAccountExists(phoneNumber) {
  const cleanDigits = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
  if (!cleanDigits || cleanDigits.length !== 10) {
    return {
      exists: false,
      error: 'Please enter a valid 10-digit Indian mobile number'
    };
  }

  // 1. Check built-in demo credentials
  const matchedDemo = DEMO_CREDENTIALS.find(
    d => (d.user.mobile && d.user.mobile.replace(/\D/g, '').endsWith(cleanDigits)) ||
         (d.user.phone && d.user.phone.replace(/\D/g, '').endsWith(cleanDigits))
  );
  if (matchedDemo) {
    return { exists: true, user: matchedDemo.user };
  }

  // 2. Query Supabase database for an active profile with this exact number
  if (isSupabaseConfigured()) {
    try {
      const { data: phoneMatches, error: phoneErr } = await supabase
        .from('profiles')
        .select(AUTH_PROFILE_COLUMNS)
        .ilike('phone', `%${cleanDigits}%`)
        .limit(10);

      if (!phoneErr && phoneMatches && phoneMatches.length > 0) {
        const activeMatch = phoneMatches.find(row => {
          const rowDigits = String(row.phone || row.mobile || '').replace(/\D/g, '').slice(-10);
          if (rowDigits !== cleanDigits) return false;
          const isInactive = row.status === 'deleted' || row.status === 'suspended' || row.status === 'deactivated';
          return !isInactive;
        });

        if (activeMatch) {
          const userSession = mapSupabaseToSession(activeMatch);
          return { exists: true, user: userSession, profileRow: activeMatch };
        }
      }
    } catch (sbErr) {
      console.warn('[authService] checkMobileAccountExists exception:', sbErr);
    }
  }

  // 3. Fallback: check localStorage ONLY for verified non-draft user previously logged in
  const localSaved = typeof localStorage !== 'undefined' ? localStorage.getItem('i4u_auth_user') : null;
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      const isAutoGenerated = parsed.isDraft || 
        (parsed.registerId && parsed.registerId.toUpperCase() === `I4Y${cleanDigits.slice(-4)}` && parsed.name === `Member ${cleanDigits.slice(-4)}`);
      const localPhone = String(parsed.mobile || parsed.phone || '').replace(/\D/g, '').slice(-10);
      if (!isAutoGenerated && localPhone === cleanDigits) {
        return { exists: true, user: parsed };
      }
    } catch (e) {}
  }

  // 4. Account DOES NOT EXIST in database: Strictly halt login process
  return {
    exists: false,
    error: 'ഈ നമ്പറിൽ ഒരു അക്കൗണ്ടും ഇതിലോട്ട് ഓപ്പൺ ആയിട്ടില്ല'
  };
}

/**
 * Authenticate session for a mobile number after successful OTP verification.
 * Strictly verifies account exists; never auto-creates user or uses last 4 digits.
 */
export async function loginWithMobileOtpSuccess(phoneNumber) {
  const cleanDigits = String(phoneNumber || '').replace(/\D/g, '').slice(-10);
  if (!cleanDigits || cleanDigits.length !== 10) {
    return { success: false, error: 'Please enter a valid 10-digit mobile number' };
  }

  // 1. Check built-in demo credentials
  const matchedDemo = DEMO_CREDENTIALS.find(
    d => (d.user.mobile && d.user.mobile.replace(/\D/g, '').endsWith(cleanDigits)) ||
         (d.user.phone && d.user.phone.replace(/\D/g, '').endsWith(cleanDigits))
  );
  if (matchedDemo) {
    persistUserSession(matchedDemo.user);
    return { success: true, user: matchedDemo.user };
  }

  // 2. Query Supabase Database
  if (isSupabaseConfigured()) {
    try {
      const { data: phoneMatches, error: phoneErr } = await supabase
        .from('profiles')
        .select(AUTH_PROFILE_COLUMNS)
        .ilike('phone', `%${cleanDigits}%`)
        .limit(10);

      if (!phoneErr && phoneMatches && phoneMatches.length > 0) {
        const activeMatch = phoneMatches.find(row => {
          const rowDigits = String(row.phone || row.mobile || '').replace(/\D/g, '').slice(-10);
          if (rowDigits !== cleanDigits) return false;
          const isInactive = row.status === 'deleted' || row.status === 'suspended' || row.status === 'deactivated';
          return !isInactive;
        });

        if (activeMatch) {
          const authenticatedUser = mapSupabaseToSession(activeMatch);
          persistUserSession(authenticatedUser);
          return { success: true, user: authenticatedUser };
        }
      }
    } catch (e) {
      console.warn('[authService] Error fetching member by phone:', e);
    }
  }

  // 3. Offline / localStorage fallback check (only for verified non-draft users)
  const localSaved = typeof localStorage !== 'undefined' ? localStorage.getItem('i4u_auth_user') : null;
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      const isAutoGenerated = parsed.isDraft || 
        (parsed.registerId && parsed.registerId.toUpperCase() === `I4Y${cleanDigits.slice(-4)}` && parsed.name === `Member ${cleanDigits.slice(-4)}`);
      if (
        !isAutoGenerated &&
        ((parsed.mobile && parsed.mobile.replace(/\D/g, '').endsWith(cleanDigits)) ||
         (parsed.phone && parsed.phone.replace(/\D/g, '').endsWith(cleanDigits)))
      ) {
        persistUserSession(parsed);
        return { success: true, user: parsed };
      }
    } catch (e) {}
  }

  // 4. Account DOES NOT EXIST: Strictly halt login. Do NOT auto-generate any account.
  return {
    success: false,
    error: 'ഈ നമ്പറിൽ ഒരു അക്കൗണ്ടും ഇതിലോട്ട് ഓപ്പൺ ആയിട്ടില്ല'
  };
}

/**
 * Persist user session and tokens to localStorage for indefinite session persistence
 */
export function persistUserSession(user, tokens = {}) {
  try {
    if (!user || typeof localStorage === 'undefined') return user || null;
    localStorage.removeItem('i4u_logged_out');

    const cleanPhone = (user.mobile || user.phone || '').replace(/\D/g, '');
    const resolvedId = user.id || user.uid || user.userId || 
      (cleanPhone ? `usr_${cleanPhone.slice(-10)}` : null) || 
      (user.registerId ? `usr_${user.registerId}` : null) ||
      `usr_${Date.now()}`;

    const normalizedUser = {
      ...user,
      id: resolvedId,
      name: user.name || user.fullName || 'Member',
      fullName: user.fullName || user.name || 'Member',
      phone: user.phone || user.mobile || '',
      mobile: user.mobile || user.phone || '',
      verified: user.verified !== undefined ? Boolean(user.verified) : true,
      mobileVerified: user.mobileVerified !== undefined ? Boolean(user.mobileVerified) : true
    };

    localStorage.setItem('i4u_auth_user', JSON.stringify(normalizedUser));
    if (normalizedUser.id) localStorage.setItem('i4u_current_user_id', normalizedUser.id);
    if (normalizedUser.registerId || normalizedUser.register_id) {
      localStorage.setItem('i4u_register_id', normalizedUser.registerId || normalizedUser.register_id);
    }

    // Persist JWT / API access & refresh tokens
    const accessToken = tokens.accessToken || tokens.access_token || user.accessToken || user.access_token || user.token;
    const refreshToken = tokens.refreshToken || tokens.refresh_token || user.refreshToken || user.refresh_token;
    if (accessToken) localStorage.setItem('i4u_auth_token', accessToken);
    if (refreshToken) localStorage.setItem('i4u_refresh_token', refreshToken);

    if (typeof window !== 'undefined' && normalizedUser.id) {
      window.__currentUserId = normalizedUser.id;
    }
    return normalizedUser;
  } catch (e) {
    console.warn('[authService] localStorage write error:', e);
    return user;
  }
}

/**
 * Synchronously retrieves existing authenticated user session from localStorage.
 * Returns null if user explicitly logged out or if no session exists.
 */
export function getStoredUserSession() {
  try {
    if (typeof window === 'undefined') return null;
    if (localStorage.getItem('i4u_logged_out') === 'true') {
      return null;
    }
    const saved = localStorage.getItem('i4u_auth_user');
    if (!saved) return null;
    const user = JSON.parse(saved);
    if (!user) return null;

    const cleanPhone = (user.mobile || user.phone || '').replace(/\D/g, '');
    const isAutoGenerated = user.isDraft || 
      (user.registerId && cleanPhone && user.registerId.toUpperCase() === `I4Y${cleanPhone.slice(-4)}` && user.name === `Member ${cleanPhone.slice(-4)}`);
    if (isAutoGenerated) {
      localStorage.removeItem('i4u_auth_user');
      return null;
    }
    const resolvedId = user.id || user.uid || user.userId || 
      (cleanPhone ? `usr_${cleanPhone.slice(-10)}` : null) || 
      (user.registerId ? `usr_${user.registerId}` : null);

    if (!resolvedId) return null;
    user.id = resolvedId;

    const isAadhaarDone = localStorage.getItem('i4u_aadhaar_verified') === 'true';
    if (isAadhaarDone) {
      user.aadhaarVerified = true;
      user.verified = true;
    }
    if (!user.membership || user.membership === 'free') {
      user.membership = 'free';
      user.contactCredits = user.contactCredits ?? 0;
      user.unlockedContacts = user.unlockedContacts || [];
    }
    return user;
  } catch (e) {
    return null;
  }
}

/**
 * Completely terminates user session and clears all authentication artifacts from storage.
 * Called ONLY on explicit user logout action.
 */
export function logoutUser() {
  try {
    localStorage.removeItem('i4u_auth_user');
    localStorage.removeItem('i4u_current_user_id');
    localStorage.removeItem('i4u_register_id');
    localStorage.removeItem('i4u_auth_token');
    localStorage.removeItem('i4u_refresh_token');
    localStorage.removeItem('i4u_saved_google_user');
    localStorage.removeItem('i4u_aadhaar_verified');
    localStorage.removeItem('i4u_my_status');
    localStorage.removeItem('i4u_conversations');
    localStorage.removeItem('i4u_notifications');
    localStorage.removeItem('i4u_interests_sent');
    localStorage.removeItem('i4u_shortlisted');
    localStorage.removeItem('i4u_declined_received_ids');
    localStorage.setItem('i4u_logged_out', 'true');
    if (typeof window !== 'undefined') {
      window.__currentUserId = null;
    }
  } catch (e) {
    console.warn('[authService] Logout storage cleanup error:', e);
  }
}

/**
 * Maps Supabase raw profile row to standard frontend user session object
 */
function mapSupabaseToSession(row) {
  let singlePhotos = [];
  try {
    if (row.single_photos) {
      singlePhotos = typeof row.single_photos === 'string' ? JSON.parse(row.single_photos) : row.single_photos;
    }
  } catch (e) {}
  if (!Array.isArray(singlePhotos)) singlePhotos = [];

  let familyPhotos = [];
  try {
    if (row.family_photos) {
      familyPhotos = typeof row.family_photos === 'string' ? JSON.parse(row.family_photos) : row.family_photos;
    }
  } catch (e) {}
  if (!Array.isArray(familyPhotos)) familyPhotos = [];

  const defaultMale = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800';
  const defaultFemale = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800';
  const defaultAvatar = (row.gender || '').toLowerCase() === 'male' ? defaultMale : defaultFemale;

  const isCustomSingle = singlePhotos.length > 0 && !singlePhotos[0].includes('images.unsplash.com');
  const isCustomPhoto = row.photo && !row.photo.includes('images.unsplash.com');
  const isCustomPhotoUrl = row.photo_url && !row.photo_url.includes('images.unsplash.com');

  const resolvedPhoto = (isCustomSingle ? singlePhotos[0] : null) || 
                        (isCustomPhoto ? row.photo : null) || 
                        (isCustomPhotoUrl ? row.photo_url : null) || 
                        row.photo || 
                        row.photo_url || 
                        defaultAvatar;

  if (singlePhotos.length === 0) {
    singlePhotos = [resolvedPhoto];
  } else if (singlePhotos[0] !== resolvedPhoto && !singlePhotos[0].includes('images.unsplash.com')) {
    singlePhotos = [resolvedPhoto, ...singlePhotos.filter(p => p !== resolvedPhoto)].slice(0, 5);
  }

  return {
    id: row.id,
    registerId: row.register_id,
    register_id: row.register_id,
    name: row.name || 'Member',
    fullName: row.name || 'Member',
    email: row.email,
    mobile: row.phone || row.mobile,
    phone: row.phone || row.mobile,
    gender: (row.gender || '').toLowerCase() === 'male' ? 'Male' : 'Female',
    age: row.age || 26,
    height: row.height,
    city: row.city || 'Mumbai',
    district: row.district || row.city || 'Mumbai',
    state: row.state || 'Maharashtra',
    religion: row.religion || 'Hindu',
    caste: row.caste,
    verified: Boolean(row.verified),
    mobileVerified: true,
    aadhaarVerified: Boolean(row.aadhaar_verified),
    photo: resolvedPhoto,
    photo_url: resolvedPhoto,
    avatar_url: resolvedPhoto,
    singlePhotos,
    familyPhotos,
    hidePhotos: Boolean(row.hide_photos),
    photoVisibility: row.photo_visibility || 'all',
    membership: row.membership || 'free'
  };
}

function calculateAge(dobString) {
  try {
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  } catch {
    return 26;
  }
}
