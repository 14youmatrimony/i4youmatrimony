/**
 * Computes a dynamic compatibility match score (65-99%) strictly for logged-in users
 * based on partner preferences (age range, location, education, community/religion/profession).
 * Returns null in Guest mode (!currentUser || currentUser.isGuest).
 */
export function computeDynamicMatchScore(currentUser, candidate) {
  if (!currentUser || currentUser.isGuest || !currentUser.id || !candidate) {
    return null;
  }

  let score = 58; // Base compatibility floor

  // 1. Age Range Compatibility (up to +14)
  const candAge = Number(candidate.age);
  const myAge = Number(currentUser.age);
  const prefMinAge = Number(currentUser.partnerMinAge || currentUser.partner_min_age || currentUser.prefMinAge) || (myAge ? Math.max(18, myAge - 6) : 21);
  const prefMaxAge = Number(currentUser.partnerMaxAge || currentUser.partner_max_age || currentUser.prefMaxAge) || (myAge ? Math.min(60, myAge + 6) : 38);
  if (!isNaN(candAge) && candAge > 0) {
    if (candAge >= prefMinAge && candAge <= prefMaxAge) {
      score += 14;
    } else if (candAge >= prefMinAge - 3 && candAge <= prefMaxAge + 3) {
      score += 7;
    }
  }

  // 2. Location / City / District / State Compatibility (up to +12)
  const norm = (v) => String(v || '').trim().toLowerCase();
  const prefLoc = norm(currentUser.partnerLocation || currentUser.partner_location || currentUser.prefLocation);
  const myCity = norm(currentUser.city);
  const myDistrict = norm(currentUser.district);
  const myState = norm(currentUser.state);
  const candCity = norm(candidate.city);
  const candDistrict = norm(candidate.district);
  const candState = norm(candidate.state);

  if (prefLoc && (candCity.includes(prefLoc) || candDistrict.includes(prefLoc) || candState.includes(prefLoc))) {
    score += 12;
  } else if ((myCity && candCity && myCity === candCity) || (myDistrict && candDistrict && myDistrict === candDistrict)) {
    score += 12;
  } else if (myState && candState && myState === candState) {
    score += 8;
  }

  // 3. Education Compatibility (up to +7)
  const prefEdu = norm(currentUser.partnerEducation || currentUser.partner_education || currentUser.prefEducation);
  const myEduCat = norm(currentUser.educationCategory || currentUser.education_category || currentUser.education);
  const candEdu = norm(candidate.educationCategory || candidate.education_category || candidate.education);
  if (prefEdu && candEdu && (candEdu.includes(prefEdu) || prefEdu.includes(candEdu))) {
    score += 7;
  } else if (myEduCat && candEdu && (candEdu.includes(myEduCat) || myEduCat.includes(candEdu))) {
    score += 5;
  }

  // 4. Community / Religion & Profession Compatibility (up to +8)
  const prefRel = norm(currentUser.partnerReligion || currentUser.partner_religion || currentUser.prefReligion || currentUser.religion);
  const candRel = norm(candidate.religion);
  if (prefRel && candRel && (prefRel === 'all' || prefRel === candRel)) {
    score += 5;
  }
  const prefProf = norm(currentUser.partnerProfession || currentUser.partner_profession || currentUser.prefProfession);
  const candProf = norm(candidate.profession);
  if (prefProf && candProf && candProf.includes(prefProf)) {
    score += 3;
  } else if (candProf) {
    score += 1;
  }

  return Math.max(65, Math.min(99, Math.round(score)));
}
