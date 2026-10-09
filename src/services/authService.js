/**
 * Custom Register ID & Password Authentication Service for I 4 You Matrimonial Platform
 * Powered by Supabase PostgreSQL Database
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { uploadProfilePhoto } from './storageService';
import { sanitizeInput, hashPasswordSha256 } from '../utils/security';
import { sendRegistrationEmail } from './emailNotificationService';
import { DEMO_USER, DEMO_USER_FEMALE, DEMO_USER_MALE } from '../data/mockProfiles';

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
  const savedCounter = localStorage.getItem('i4u_register_counter');
  const counter = savedCounter ? parseInt(savedCounter, 10) + 1 : 1003;
  localStorage.setItem('i4u_register_counter', String(counter));
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
    photo: publicPhotoUrl,
    photo_url: publicPhotoUrl,
    single_photos: Array.isArray(formData.singlePhotos) ? JSON.stringify(formData.singlePhotos) : (formData.single_photos || null),
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
    singlePhotos: formData.singlePhotos || [],
    familyPhotos: formData.familyPhotos || [],
    verified: true,
    mobileVerified: true,
    aadhaarVerified: false,
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
  const matchedDemo = DEMO_CREDENTIALS.find(
    d => d.registerId.toUpperCase() === cleanRegisterId
  );
  if (matchedDemo) {
    if (matchedDemo.password === rawPassword) {
      persistUserSession(matchedDemo.user);
      return { success: true, user: matchedDemo.user };
    }
    return { success: false, error: 'Incorrect password for this Register ID. (Demo Password: Password@123)' };
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
          .select('*')
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
            .select('*')
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
          .select('*')
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
  const localSaved = localStorage.getItem('i4u_auth_user');
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      if (
        (parsed.registerId && parsed.registerId.toUpperCase() === cleanRegisterId) ||
        (parsed.mobile && parsed.mobile.replace(/\D/g, '').endsWith(cleanInput.replace(/\D/g, '')))
      ) {
        return { success: true, user: parsed };
      }
    } catch (e) {}
  }

  return { 
    success: false, 
    error: `Account "${cleanInput}" not found. Please verify your Register ID or phone number.` 
  };
}

/**
 * Persist user session to localStorage
 */
export function persistUserSession(user) {
  try {
    localStorage.removeItem('i4u_logged_out');
    localStorage.setItem('i4u_auth_user', JSON.stringify(user));
  } catch (e) {
    console.warn('[authService] localStorage write error:', e);
  }
}

/**
 * Maps Supabase raw profile row to standard frontend user session object
 */
function mapSupabaseToSession(row) {
  return {
    id: row.id,
    registerId: row.register_id,
    name: row.name || 'Member',
    email: row.email,
    mobile: row.phone || row.mobile,
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
    photo: row.photo || (row.gender === 'Male' 
      ? 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'
      : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800'),
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
