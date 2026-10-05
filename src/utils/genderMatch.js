/**
 * Matrimonial Strict Opposite-Gender Matchmaking Engine
 *
 * Rules:
 * - A Female user (Bride persona, e.g. Priya Sharma) MUST ONLY see Male candidates (Grooms).
 * - A Male user (Groom persona, e.g. Rohan Jayasimha) MUST ONLY see Female candidates (Brides).
 * - This applies 100% across Match Feed cards, WhatsApp Stories Reels, Search, Interests, and Chats.
 * - Same-gender candidates must NEVER appear in the candidate feed or stories.
 * - Handles all variations from UIDAI Aadhaar eKYC ('M', 'F'), standard strings ('Male', 'Female'),
 *   and colloquial terms ('man', 'woman', 'groom', 'bride', 'men', 'women').
 * - Robust Name-based Gender Validation prevents data entry / Aadhaar scan errors where a female
 *   candidate is accidentally assigned 'M' or male candidates assigned 'F'.
 */

// Unambiguous first-name dictionaries for real-time validation and error recovery
const KNOWN_FEMALE_FIRST_NAMES = new Set([
  'priya', 'priyanka', 'ananya', 'sneha', 'tanvi', 'pooja', 'puja',
  'simran', 'meera', 'divya', 'kavya', 'deepa', 'neha', 'anjali',
  'swati', 'aishwarya', 'shruthi', 'shruti', 'archana', 'chakku',
  'reshma', 'lakshmi', 'parvathi', 'deepthi', 'anita', 'geetha',
  'kavitha', 'shilpa', 'sandhya', 'vidya', 'malavika', 'amritha',
  'radha', 'shalini', 'maya', 'preeti', 'sunita', 'bhavana'
]);

const KNOWN_MALE_FIRST_NAMES = new Set([
  'nikhil', 'rohan', 'karthik', 'kartik', 'arjun', 'vikram', 'vikramaditya',
  'aditya', 'devendra', 'sunil', 'rahul', 'amit', 'mattayi', 'sachin',
  'varun', 'deepak', 'rajesh', 'manoj', 'suresh', 'ramesh', 'vishal',
  'vivek', 'anand', 'sanjay', 'pradeep', 'vijay', 'ashok', 'harish',
  'mahesh', 'santhosh', 'santosh', 'ajay', 'praveen', 'vinod', 'manish'
]);

/**
 * Normalizes any gender representation to either 'male' or 'female'.
 * Returns null if unrecognized or falsy.
 */
export function normalizeGender(genderVal) {
  if (!genderVal) return null;
  const s = String(genderVal).trim().toLowerCase();

  // Female / Bride variations
  if (
    s === 'female' ||
    s === 'f' ||
    s === 'woman' ||
    s === 'women' ||
    s === 'bride' ||
    s === 'brides' ||
    s === 'girl' ||
    s === 'female ' ||
    s === 'female / bride'
  ) {
    return 'female';
  }

  // Male / Groom variations
  if (
    s === 'male' ||
    s === 'm' ||
    s === 'man' ||
    s === 'men' ||
    s === 'groom' ||
    s === 'grooms' ||
    s === 'boy' ||
    s === 'male ' ||
    s === 'male / groom'
  ) {
    return 'male';
  }

  return null;
}

/**
 * Infers gender from unambiguous Indian first names.
 * Handles prefixes like "Dr.", "Er.", "CA" gracefully.
 */
export function inferGenderFromName(name) {
  if (!name || typeof name !== 'string') return null;
  const clean = name.trim().replace(/^(dr|er|ca|mr|mrs|ms)\.?\s+/i, '').trim();
  const firstName = clean.split(/\s+/)[0]?.toLowerCase();
  if (!firstName) return null;

  if (KNOWN_FEMALE_FIRST_NAMES.has(firstName)) return 'female';
  if (KNOWN_MALE_FIRST_NAMES.has(firstName)) return 'male';
  return null;
}

/**
 * Resolves the true gender of a candidate profile with defense-in-depth:
 * 1. Checks profile object / string gender.
 * 2. Cross-checks against unambiguous first name to catch accidental 'M'/'F' misclassifications.
 * 3. Falls back to name inference if gender field is missing or ambiguous.
 */
export function resolveProfileGender(candidateProfileOrGender, fallbackName) {
  if (!candidateProfileOrGender) {
    return fallbackName ? inferGenderFromName(fallbackName) : null;
  }

  let rawGender = null;
  let profileName = fallbackName || '';

  if (typeof candidateProfileOrGender === 'object') {
    rawGender = candidateProfileOrGender.gender;
    profileName = candidateProfileOrGender.name || profileName;
  } else if (typeof candidateProfileOrGender === 'string') {
    rawGender = candidateProfileOrGender;
  }

  const normalized = normalizeGender(rawGender);
  const inferred = inferGenderFromName(profileName);

  // If the first name is unmistakably female (e.g. Priya Sharma) but gender was mistakenly saved as 'M'/'male':
  if (inferred === 'female' && normalized === 'male') {
    return 'female';
  }

  // If first name is unmistakably male (e.g. Nikhil Sharma) but gender was mistakenly saved as 'female':
  if (inferred === 'male' && normalized === 'female') {
    return 'male';
  }

  return normalized || inferred || null;
}

/**
 * Resolves the STRICT opposite target candidate gender that a user must see.
 * - If user is Female -> Target candidates MUST BE 'male' (Grooms only).
 * - If user is Male -> Target candidates MUST BE 'female' (Brides only).
 * - If guest (no logged in user), uses fallbackLookingFor (defaults to 'all').
 *   When fallbackLookingFor is 'all' or falsy, returns null (meaning ALL candidates, both Gents and Women).
 */
export function getTargetCandidateGender(userOrGender, fallbackLookingFor = 'all') {
  let userGender = null;
  if (userOrGender && typeof userOrGender === 'object') {
    userGender = resolveProfileGender(userOrGender);
  } else if (typeof userOrGender === 'string') {
    userGender = resolveProfileGender(userOrGender);
  }

  // If user is female, she seeks male candidates (Grooms only)
  if (userGender === 'female') {
    return 'male';
  }

  // If user is male, he seeks female candidates (Brides only)
  if (userGender === 'male') {
    return 'female';
  }

  // Fallback for guest mode / unauthenticated visitors
  if (!fallbackLookingFor || fallbackLookingFor === 'all' || fallbackLookingFor === 'All') {
    return null;
  }

  const fallback = normalizeGender(fallbackLookingFor);
  return fallback || null;
}

/**
 * Validates whether a candidate profile's gender matches the required target candidate gender.
 * If targetGender is null, undefined, or 'all', it matches ALL candidate genders (guest mode).
 */
export function isCandidateMatchingTarget(candidateProfileOrGender, targetGender, candidateName) {
  // If no target gender constraint (e.g. guest browsing all profiles), allow all
  if (!targetGender || targetGender === 'all' || targetGender === 'All') {
    return true;
  }

  const candidateGender = resolveProfileGender(candidateProfileOrGender, candidateName);
  const normalizedTarget = normalizeGender(targetGender);

  if (!normalizedTarget || !candidateGender) {
    return false;
  }

  return candidateGender === normalizedTarget;
}

/**
 * Helper to get human-readable target label for UI badges
 */
export function getTargetGenderLabel(userOrGender, fallbackLookingFor = 'all') {
  const target = getTargetCandidateGender(userOrGender, fallbackLookingFor);
  if (!target || target === 'all') {
    return 'All Candidates (Gents & Women)';
  }
  return target === 'male' ? 'Grooms (Gents)' : 'Brides (Women)';
}

/**
 * Checks whether a candidate profile matches the current logged-in user to exclude them from match feeds.
 */
export function isSelfProfile(profile, currentUser) {
  if (!profile || !currentUser) return false;

  // 1. Direct ID match
  if (currentUser.id && (profile.id === currentUser.id || profile.user_id === currentUser.id)) {
    return true;
  }

  // 2. Exact Full Name match (case-insensitive)
  if (currentUser.name && profile.name && currentUser.name.trim().toLowerCase() === profile.name.trim().toLowerCase()) {
    return true;
  }

  // 3. Mobile / Phone match
  const userMob = (currentUser.mobile || currentUser.phone || '').replace(/\D/g, '').slice(-10);
  if (userMob && userMob.length === 10) {
    const profMob = (profile.mobile || '').replace(/\D/g, '').slice(-10);
    const profPhone = (profile.phone || '').replace(/\D/g, '').slice(-10);
    if (profMob === userMob || profPhone === userMob) {
      return true;
    }
  }

  return false;
}

/**
 * Filters a list of candidate profiles strictly for the logged-in user or guest.
 * - Excludes the current user's own profile (by ID, Name, and Phone).
 * - Strictly enforces opposite gender if logged in.
 * - Shows all candidates for guests by default.
 */
export function filterProfilesStrictOppositeGender(profiles = [], currentUser = null, guestLookingFor = 'all') {
  if (!Array.isArray(profiles)) return [];
  const targetGender = getTargetCandidateGender(currentUser, guestLookingFor);

  return profiles.filter(p => {
    if (!p) return false;
    // Exclude own profile
    if (isSelfProfile(p, currentUser)) return false;

    // Strict opposite gender when logged in, or target gender if specified
    return isCandidateMatchingTarget(p, targetGender);
  });
}
