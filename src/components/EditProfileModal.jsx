import React, { useState, useEffect } from 'react';
import { 
  X, Check, AlertCircle, Loader2, Save, User, 
  MapPin, Briefcase, Sparkles, Lock, Globe, Plane, HeartHandshake 
} from 'lucide-react';
import { fetchLiveUserProfile, updateLiveUserProfile } from '../services/api';
import { RESIDENCY_STATUS_OPTIONS } from '../data/locationData';
import { ALL_INDIA_RELIGIONS, RELIGION_COMMUNITIES } from '../data/religionData';
import { INDIAN_STATES_AND_UTS, getServiceDistrictsForState } from '../services/vendorService';
import WorldCountrySearchSelect from './common/WorldCountrySearchSelect';
import MultiCountrySelect from './common/MultiCountrySelect';

const HEIGHT_CM_OPTIONS = Array.from({ length: 71 }, (_, i) => `${140 + i} cm`);
const WEIGHT_KG_OPTIONS = Array.from({ length: 116 }, (_, i) => `${35 + i} kg`);
const BODY_TYPE_OPTIONS = ['Slim', 'Athletic / Fit', 'Average', 'Heavy'];
const COMPLEXION_OPTIONS = ['Very Fair', 'Fair', 'Wheatish', 'Wheatish Brown', 'Dark'];

const NRI_CITY_SUGGESTIONS_BY_COUNTRY = {
  'United States': ['New York', 'San Francisco', 'Seattle', 'Austin', 'Dallas', 'Chicago', 'Boston', 'Los Angeles', 'Atlanta', 'New Jersey'],
  'USA': ['New York', 'San Francisco', 'Seattle', 'Austin', 'Dallas', 'Chicago', 'Boston', 'Los Angeles', 'Atlanta', 'New Jersey'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'],
  'UAE': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Leeds', 'Bristol'],
  'UK': ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Leeds', 'Bristol'],
  'Canada': ['Toronto', 'Vancouver', 'Calgary', 'Ottawa', 'Montreal', 'Mississauga'],
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
  'Germany': ['Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Stuttgart'],
  'Singapore': ['Singapore'],
  'Saudi Arabia': ['Riyadh', 'Jeddah', 'Dammam', 'Khobar'],
  'Qatar': ['Doha'],
  'Oman': ['Muscat', 'Salalah'],
  'Kuwait': ['Kuwait City'],
  'Bahrain': ['Manama'],
  'Ireland': ['Dublin', 'Cork'],
  'New Zealand': ['Auckland', 'Wellington']
};

const normalizeHeightCm = (raw) => {
  if (!raw) return '';
  const str = String(raw).trim();
  const cmMatch = str.match(/(\d{3})\s*cm/i) || str.match(/^(\d{3})$/);
  if (cmMatch) {
    const num = parseInt(cmMatch[1], 10);
    if (num >= 140 && num <= 210) return `${num} cm`;
  }
  return str;
};

/**
 * EditProfileModal
 * Production-ready profile editing component with:
 * 1. Supabase direct state hydration on mount (useEffect)
 * 2. Permanent Lock on 6 Core Identity Fields (Full Name, Age, Gender, Height, Religion, Mother Tongue)
 * 3. Proper e.preventDefault() form submission handling
 * 4. Robust async Supabase update execution
 * 5. Loading indicators, error banners, and success toasts
 * 6. Instant session persistence to localStorage
 */
export default function EditProfileModal({ 
  currentUser, 
  isOpen, 
  onClose, 
  onProfileUpdated 
}) {
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Helper to extract cleanly mapped initial form data from props or storage
  const getInitialFormData = (user) => {
    let source = user;
    if (!source) {
      try {
        const saved = localStorage.getItem('i4u_auth_user');
        if (saved) source = JSON.parse(saved);
      } catch (e) {}
    }
    return {
      name: source?.name || source?.fullName || source?.full_name || '',
      phone: source?.phone || source?.mobile || '',
      email: source?.email || '',
      age: source?.age ? String(source.age) : (source?.dob ? String(source.dob) : ''),
      gender: source?.gender || '',
      height: normalizeHeightCm(source?.height),
      weight: source?.weight || '',
      body_type: source?.body_type || source?.bodyType || '',
      complexion: source?.complexion || source?.skin_colour || source?.skinColour || '',
      religion: source?.religion || '',
      caste: source?.caste || '',
      motherTongue: source?.motherTongue || source?.mother_tongue || '',
      state: source?.state || '',
      city: source?.city || '',
      district: source?.district || source?.city || '',
      nri_city: source?.nri_city || source?.work_city || source?.workCity || (source?.city && source?.country && source.country !== 'India' ? source.city : ''),
      native_state: source?.native_state || '',
      native_district: source?.native_district || '',
      native_place: source?.native_place || '',
      education: source?.education || '',
      edu_10th: source?.edu_10th || source?.tenthSchool || '',
      edu_12th: source?.edu_12th || source?.twelfthSchool || '',
      edu_degree: source?.edu_degree || '',
      edu_pg: source?.edu_pg || '',
      edu_doctorate: source?.edu_doctorate || '',
      profession: source?.profession || '',
      company: source?.company || '',
      annualIncome: source?.annualIncome || source?.annual_income || '',
      diet: source?.diet || 'Vegetarian',
      manglik: source?.manglik || 'Non-Manglik',
      about: source?.about || source?.aboutBio || '',
      // NRI / Abroad Working Details
      is_nri: Boolean(
        source?.is_nri || 
        source?.isNri || 
        (source?.country && source.country !== 'India') ||
        (source?.work_country && source.work_country !== 'India') ||
        (source?.workCountry && source.workCountry !== 'India')
      ),
      country: source?.country || source?.work_country || source?.workCountry || 'India',
      work_country: source?.work_country || source?.workCountry || (source?.country && source.country !== 'India' ? source.country : 'USA'),
      work_city: source?.work_city || source?.workCity || (source?.city && source?.country && source.country !== 'India' ? source.city : ''),
      residency_status: source?.residency_status || source?.residencyStatus || 'Work Visa',
      preferred_countries: source?.preferred_countries || source?.preferredCountries || 'Any',
      pref_min_age: source?.pref_min_age ? String(source.pref_min_age) : '21',
      pref_max_age: source?.pref_max_age ? String(source.pref_max_age) : '35',
      pref_min_height: source?.pref_min_height ? String(source.pref_min_height) : '150',
      pref_max_height: source?.pref_max_height ? String(source.pref_max_height) : '185',
      pref_complexion: source?.pref_complexion || 'Any',
      pref_education: source?.pref_education || 'Any',
      pref_occupation: source?.pref_occupation || 'Any',
      pref_income: source?.pref_income || 'Any',
      pref_diet: source?.pref_diet || 'Any',
      pref_religion: source?.pref_religion || 'Any',
      pref_caste: source?.pref_caste || 'Any',
      pref_mother_tongue: source?.pref_mother_tongue || 'Any',
      pref_state: source?.pref_state || 'Any',
      pref_district: source?.pref_district || 'Any',
      pref_physical_status: source?.pref_physical_status || 'Any',
      pref_smoking: source?.pref_smoking || 'Any',
      pref_drinking: source?.pref_drinking || 'Any',
      partner_expectations: source?.partner_expectations || source?.partnerExpectations || ''
    };
  };

  // Form State initialized immediately with whatever current user data exists
  const [formData, setFormData] = useState(() => getInitialFormData(currentUser));

  // Keep a reference to the saved profile state (from props, storage, or fresh Supabase query)
  // to know which core identity fields already have saved values.
  const [savedRecord, setSavedRecord] = useState(() => {
    let source = currentUser;
    if (!source) {
      try {
        const saved = localStorage.getItem('i4u_auth_user');
        if (saved) source = JSON.parse(saved);
      } catch (e) {}
    }
    return source || {};
  });

  // 1. STATE HYDRATION ON MOUNT (useEffect)
  // Hydrates immediately from props/storage, and synchronizes fresh data directly from Supabase
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const initial = getInitialFormData(currentUser);
    setFormData(initial);
    if (currentUser) {
      setSavedRecord(currentUser);
    }

    // If we already have basic details, do not block the UI with full-screen loader
    const hasInitialData = Boolean(initial.name || initial.phone);
    setLoading(!hasInitialData);
    setIsSyncing(true);
    setErrorMsg(null);

    const hydrateProfile = async () => {
      try {
        // Determine identifier: id, registerId, phone, or localStorage fallback
        let identifier = currentUser?.id || currentUser?.registerId || currentUser?.register_id || currentUser?.phone || currentUser?.mobile;
        if (!identifier) {
          try {
            const saved = localStorage.getItem('i4u_auth_user');
            if (saved) {
              const parsed = JSON.parse(saved);
              identifier = parsed?.id || parsed?.registerId || parsed?.register_id || parsed?.phone || parsed?.mobile;
            }
          } catch (e) {}
        }

        if (!identifier) {
          identifier = localStorage.getItem('i4u_current_user_id') || localStorage.getItem('i4u_register_id');
        }

        if (identifier) {
          // Timeout race so fetch never hangs indefinitely
          const fetchPromise = fetchLiveUserProfile(identifier);
          const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
          const freshData = await Promise.race([fetchPromise, timeoutPromise]);

          if (isMounted && freshData) {
            setFormData(prev => ({
              ...prev,
              ...getInitialFormData(freshData)
            }));
            setSavedRecord(freshData);
          }
        }
      } catch (fetchErr) {
        console.warn('[EditProfileModal] Fresh profile fetch warning:', fetchErr);
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsSyncing(false);
        }
      }
    };

    hydrateProfile();

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUser]);

  // Helper to determine if a specific core identity field is permanently locked
  // Once a user has registered and saved these 6 core identity fields, they must be
  // PERMANENTLY LOCKED and CANNOT be edited or changed again.
  const isFieldSaved = (fieldKey) => {
    const checkValue = (val) => {
      if (val === undefined || val === null) return false;
      const str = String(val).trim();
      return str.length > 0;
    };

    if (fieldKey === 'name') {
      return (
        checkValue(savedRecord?.name) ||
        checkValue(savedRecord?.fullName) ||
        checkValue(savedRecord?.full_name) ||
        checkValue(currentUser?.name) ||
        checkValue(currentUser?.fullName) ||
        checkValue(currentUser?.full_name)
      );
    }
    if (fieldKey === 'age') {
      const v = savedRecord?.age ?? currentUser?.age ?? savedRecord?.dob ?? currentUser?.dob;
      if (v === undefined || v === null) return false;
      const str = String(v).trim();
      return str.length > 0 && !isNaN(Number(str)) && Number(str) >= 18;
    }
    if (fieldKey === 'gender') {
      return checkValue(savedRecord?.gender) || checkValue(currentUser?.gender);
    }
    if (fieldKey === 'height') {
      return checkValue(savedRecord?.height) || checkValue(currentUser?.height);
    }
    if (fieldKey === 'religion') {
      return checkValue(savedRecord?.religion) || checkValue(currentUser?.religion);
    }
    if (fieldKey === 'motherTongue' || fieldKey === 'mother_tongue') {
      return (
        checkValue(savedRecord?.motherTongue) ||
        checkValue(savedRecord?.mother_tongue) ||
        checkValue(currentUser?.motherTongue) ||
        checkValue(currentUser?.mother_tongue)
      );
    }
    return false;
  };

  const isNameLocked = isFieldSaved('name');
  const isAgeLocked = isFieldSaved('age');
  const isGenderLocked = isFieldSaved('gender');
  const isReligionLocked = isFieldSaved('religion');
  const isMotherTongueLocked = isFieldSaved('motherTongue');

  // Handle generic input changes, strictly blocking locked fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Strict block if field is permanently locked
    if (
      (name === 'name' && isNameLocked) ||
      (name === 'age' && isAgeLocked) ||
      (name === 'gender' && isGenderLocked) ||
      (name === 'religion' && isReligionLocked) ||
      ((name === 'motherTongue' || name === 'mother_tongue') && isMotherTongueLocked)
    ) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // 2. PROPER FORM SUBMISSION & SUPABASE PERSISTENCE
  const handleSubmit = async (e) => {
    // CRITICAL: Prevent default browser form submission / reload
    e.preventDefault();

    // Client-side validation with automatic tab switching
    if (!formData.name?.trim()) {
      setActiveTab('personal');
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!formData.age || Number(formData.age) < 18) {
      setActiveTab('personal');
      setErrorMsg('Please enter a valid age (minimum 18).');
      return;
    }
    if (!formData.phone?.trim()) {
      setActiveTab('location');
      setErrorMsg('Please provide a valid contact mobile number.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    let identifier = currentUser?.id || currentUser?.registerId || currentUser?.register_id || currentUser?.phone || currentUser?.mobile;
    if (!identifier) {
      try {
        const saved = localStorage.getItem('i4u_auth_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          identifier = parsed?.id || parsed?.registerId || parsed?.register_id || parsed?.phone || parsed?.mobile;
        }
      } catch (e) {}
    }

    if (!identifier) {
      identifier = localStorage.getItem('i4u_current_user_id') || localStorage.getItem('i4u_register_id') || formData.phone;
    }

    if (!identifier) {
      setErrorMsg('User identifier not found. Please log in again.');
      setSaving(false);
      return;
    }

    // Construct safe update payload: locked fields strictly retain original database values
    const safePayload = { ...formData };
    if (isNameLocked) {
      safePayload.name = savedRecord?.name || savedRecord?.full_name || savedRecord?.fullName || currentUser?.name || formData.name;
    }
    if (isAgeLocked) {
      safePayload.age = savedRecord?.age ?? currentUser?.age ?? formData.age;
    }
    if (isGenderLocked) {
      safePayload.gender = savedRecord?.gender || currentUser?.gender || formData.gender;
    }
    if (isReligionLocked) {
      safePayload.religion = savedRecord?.religion || currentUser?.religion || formData.religion;
    }
    if (isMotherTongueLocked) {
      safePayload.motherTongue = savedRecord?.motherTongue || savedRecord?.mother_tongue || currentUser?.motherTongue || currentUser?.mother_tongue || formData.motherTongue;
      safePayload.mother_tongue = safePayload.motherTongue;
    }

    // Physical & Appearance Details (Optional)
    safePayload.height = formData.height || '';
    safePayload.weight = formData.weight || '';
    safePayload.body_type = formData.body_type || '';
    safePayload.bodyType = safePayload.body_type;
    safePayload.complexion = formData.complexion || '';
    safePayload.skin_colour = safePayload.complexion;
    safePayload.skinColour = safePayload.complexion;

    // Working Abroad & Native Place Details
    safePayload.is_nri = Boolean(formData.is_nri);
    safePayload.isNri = Boolean(formData.is_nri);
    safePayload.country = formData.is_nri ? (formData.work_country || 'USA') : 'India';
    safePayload.work_country = formData.is_nri ? (formData.work_country || 'USA') : 'India';
    safePayload.workCountry = safePayload.work_country;
    safePayload.nri_city = formData.is_nri ? (formData.nri_city || formData.work_city || formData.city || '') : '';
    safePayload.work_city = safePayload.nri_city;
    safePayload.workCity = safePayload.nri_city;
    safePayload.native_state = formData.native_state || '';
    safePayload.native_district = formData.native_district || '';
    safePayload.native_place = formData.native_place || '';

    // Optional Detailed Education History
    safePayload.edu_10th = formData.edu_10th || '';
    safePayload.edu_12th = formData.edu_12th || '';
    safePayload.edu_degree = formData.edu_degree || '';
    safePayload.edu_pg = formData.edu_pg || '';
    safePayload.edu_doctorate = formData.edu_doctorate || '';
    safePayload.residency_status = formData.is_nri ? (formData.residency_status || 'Work Visa') : '';
    safePayload.residencyStatus = safePayload.residency_status;
    safePayload.preferred_countries = formData.preferred_countries || 'Any';
    safePayload.preferredCountries = safePayload.preferred_countries;
    safePayload.pref_min_age = formData.pref_min_age ? parseInt(formData.pref_min_age, 10) : null;
    safePayload.pref_max_age = formData.pref_max_age ? parseInt(formData.pref_max_age, 10) : null;
    safePayload.pref_min_height = formData.pref_min_height ? parseInt(formData.pref_min_height, 10) : null;
    safePayload.pref_max_height = formData.pref_max_height ? parseInt(formData.pref_max_height, 10) : null;
    safePayload.pref_complexion = formData.pref_complexion || 'Any';
    safePayload.pref_education = formData.pref_education || 'Any';
    safePayload.pref_occupation = formData.pref_occupation || 'Any';
    safePayload.pref_income = formData.pref_income || 'Any';
    safePayload.pref_diet = formData.pref_diet || 'Any';
    safePayload.pref_religion = formData.pref_religion || 'Any';
    safePayload.pref_caste = formData.pref_caste || 'Any';
    safePayload.pref_mother_tongue = formData.pref_mother_tongue || 'Any';
    safePayload.pref_state = formData.pref_state || 'Any';
    safePayload.pref_district = formData.pref_district || 'Any';
    safePayload.pref_physical_status = formData.pref_physical_status || 'Any';
    safePayload.pref_smoking = formData.pref_smoking || 'Any';
    safePayload.pref_drinking = formData.pref_drinking || 'Any';
    safePayload.partner_expectations = formData.partner_expectations || '';
    safePayload.partnerExpectations = safePayload.partner_expectations;

    try {
      // 1. Call updateLiveUserProfile helper to sync Supabase & update localStorage
      const result = await updateLiveUserProfile(identifier, safePayload);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile in database.');
      }

      // Update local savedRecord so any newly-filled empty field becomes permanently locked immediately
      const updatedProfile = result.profile || safePayload;
      setSavedRecord(updatedProfile);

      // 2. Show success toast and trigger parent callback
      setSuccessMsg('Profile updated and saved to Supabase successfully!');
      if (onProfileUpdated) {
        onProfileUpdated(updatedProfile);
      }

      setTimeout(() => {
        setSuccessMsg(null);
        if (onClose) onClose();
      }, 1200);

    } catch (err) {
      console.error('[EditProfileModal] Submit error:', err);
      setErrorMsg(err.message || 'An error occurred while saving your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-[#E8C6D1] flex flex-col relative animate-in zoom-in-95 duration-200 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="bg-[#FDF2F6] text-[#2E1A36] px-5 py-4 flex items-center justify-between border-b border-[#E8C6D1] shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-[#C76B85]/10 flex items-center justify-center border border-[#8064A2]/40 text-[#C76B85]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-[#2E1A36]">Edit Matrimony Profile</h2>
              <div className="flex items-center space-x-1.5 text-[11px] text-[#C76B85]">
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-[#C76B85]" />
                    <span>Syncing with Supabase...</span>
                  </>
                ) : (
                  <span>Live synchronization with Supabase Database</span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Tab Pills */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-100 border-b border-slate-200 overflow-x-auto shrink-0">
          {[
            { id: 'personal', label: 'Personal & Astro', icon: User },
            { id: 'location', label: 'Location & NRI', icon: MapPin },
            { id: 'career', label: 'Education & Career', icon: Briefcase },
            { id: 'preferences', label: 'Partner Preferences', icon: HeartHandshake }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C76B85] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body with e.preventDefault() on submit */}
        <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Status Feedback Banners */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#C76B85] animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Fetching fresh profile from Supabase...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: Personal & Astro */}
              {activeTab === 'personal' && (
                <div className="space-y-3.5">
                  {/* 1. Full Name & 2. Age */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <span>Full Name *</span>
                        {isNameLocked && <Lock className="w-3 h-3 text-slate-400 shrink-0" aria-label="Permanently locked" />}
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        disabled={isNameLocked}
                        readOnly={isNameLocked}
                        className={`w-full px-3 py-2 text-xs rounded-xl border transition-colors ${
                          isNameLocked
                            ? 'bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none'
                            : 'bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2]'
                        }`}
                        placeholder="Candidate Name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <span>Age *</span>
                        {isAgeLocked && <Lock className="w-3 h-3 text-slate-400 shrink-0" aria-label="Permanently locked" />}
                      </label>
                      <input
                        type="number"
                        name="age"
                        required
                        min="18"
                        max="80"
                        value={formData.age}
                        onChange={handleChange}
                        disabled={isAgeLocked}
                        readOnly={isAgeLocked}
                        className={`w-full px-3 py-2 text-xs rounded-xl border transition-colors ${
                          isAgeLocked
                            ? 'bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none'
                            : 'bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2]'
                        }`}
                        placeholder="e.g. 26"
                      />
                    </div>
                  </div>

                  {/* 3. Gender & 4. Height (cm) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <span>Gender *</span>
                        {isGenderLocked && <Lock className="w-3 h-3 text-slate-400 shrink-0" aria-label="Permanently locked" />}
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        disabled={isGenderLocked}
                        className={`w-full px-3 py-2 text-xs rounded-xl border transition-colors ${
                          isGenderLocked
                            ? 'bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none'
                            : 'bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2]'
                        }`}
                      >
                        {!formData.gender && <option value="">Select Gender</option>}
                        <option value="Female">Female (Bride)</option>
                        <option value="Male">Male (Groom)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Height (cm)
                      </label>
                      <select
                        name="height"
                        value={formData.height}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        <option value="">Select Height (cm)</option>
                        {HEIGHT_CM_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Weight, Body Type & Color / Complexion (Optional) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Weight (kg)</label>
                      <select
                        name="weight"
                        value={formData.weight}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        <option value="">Select Weight (kg)</option>
                        {WEIGHT_KG_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Body Type</label>
                      <select
                        name="body_type"
                        value={formData.body_type}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        <option value="">Select Body Type</option>
                        {BODY_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Color / Complexion</label>
                      <select
                        name="complexion"
                        value={formData.complexion}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        <option value="">Select Complexion</option>
                        {COMPLEXION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 5. Religion & 6. Mother Tongue */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <span>Religion</span>
                        {isReligionLocked && <Lock className="w-3 h-3 text-slate-400 shrink-0" aria-label="Permanently locked" />}
                      </label>
                      <input
                        type="text"
                        name="religion"
                        value={formData.religion}
                        onChange={handleChange}
                        disabled={isReligionLocked}
                        readOnly={isReligionLocked}
                        className={`w-full px-3 py-2 text-xs rounded-xl border transition-colors ${
                          isReligionLocked
                            ? 'bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none'
                            : 'bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2]'
                        }`}
                        placeholder="Hindu / Christian / Muslim"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <span>Mother Tongue</span>
                        {isMotherTongueLocked && <Lock className="w-3 h-3 text-slate-400 shrink-0" aria-label="Permanently locked" />}
                      </label>
                      <input
                        type="text"
                        name="motherTongue"
                        value={formData.motherTongue}
                        onChange={handleChange}
                        disabled={isMotherTongueLocked}
                        readOnly={isMotherTongueLocked}
                        className={`w-full px-3 py-2 text-xs rounded-xl border transition-colors ${
                          isMotherTongueLocked
                            ? 'bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none'
                            : 'bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2]'
                        }`}
                        placeholder="Malayalam / Marathi / Hindi"
                      />
                    </div>
                  </div>

                  {/* Fully Editable Lifestyle Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Diet</label>
                      <select
                        name="diet"
                        value={formData.diet}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        <option value="Vegetarian">Vegetarian</option>
                        <option value="Non-Vegetarian">Non-Vegetarian</option>
                        <option value="Eggetarian">Eggetarian</option>
                        <option value="Jain">Jain</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Manglik Status</label>
                      <select
                        name="manglik"
                        value={formData.manglik}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        <option value="Non-Manglik">Non-Manglik</option>
                        <option value="Manglik">Manglik</option>
                        <option value="Anshik Manglik">Anshik Manglik</option>
                        <option value="Don't Know">Don't Know</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">About Me / Bio</label>
                    <textarea
                      name="about"
                      rows={3}
                      value={formData.about}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      placeholder="Brief matrimonial introduction, values, and lifestyle..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Location & Contact / Working Abroad */}
              {activeTab === 'location' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone *</label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                        placeholder="10-digit Phone Number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                        placeholder="candidate@example.com"
                      />
                    </div>
                  </div>

                  {/* Living / Working In: India vs Abroad (NRI) Toggle */}
                  <div className="p-3.5 rounded-2xl bg-[#FFF7FA] border border-[#E8C6D1] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-[#C76B85]" />
                          <span>Current Working & Living Country</span>
                        </span>
                        <p className="text-[11px] text-slate-600">
                          Are you currently based in India or working abroad as an NRI?
                        </p>
                      </div>

                      {/* Toggle Buttons */}
                      <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            is_nri: false, 
                            isNri: false, 
                            country: 'India', 
                            work_country: 'India' 
                          }))}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            !formData.is_nri 
                              ? 'bg-[#C76B85] text-white shadow-xs' 
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          India
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            is_nri: true, 
                            isNri: true, 
                            work_country: (prev.work_country && prev.work_country !== 'India') ? prev.work_country : 'USA',
                            country: (prev.work_country && prev.work_country !== 'India') ? prev.work_country : 'USA'
                          }))}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                            formData.is_nri 
                              ? 'bg-[#C76B85] text-white shadow-xs font-extrabold' 
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Plane className="w-3.5 h-3.5" />
                          <span>Abroad (NRI)</span>
                        </button>
                      </div>
                    </div>

                    {/* NRI Working Abroad Details */}
                    {formData.is_nri ? (
                      <div className="space-y-3 pt-2.5 border-t border-amber-200/70 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <WorldCountrySearchSelect
                              label="Current Country Abroad"
                              excludeIndia
                              value={formData.work_country || 'United States'}
                              onChange={(val) => {
                                setFormData(prev => ({ ...prev, work_country: val, country: val }));
                              }}
                              placeholder="Search or select country..."
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-800 mb-1">
                              Current City / State Abroad
                            </label>
                            <input
                              type="text"
                              name="nri_city"
                              list="nri-city-suggestions"
                              value={formData.nri_city ?? formData.work_city ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData((prev) => ({
                                  ...prev,
                                  nri_city: val,
                                  work_city: val,
                                  workCity: val
                                }));
                              }}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                              placeholder="Select or type city (e.g. Dubai, London, New York)"
                            />
                            <datalist id="nri-city-suggestions">
                              {(
                                NRI_CITY_SUGGESTIONS_BY_COUNTRY[formData.work_country] ||
                                Object.values(NRI_CITY_SUGGESTIONS_BY_COUNTRY).flat()
                              ).filter((c, i, arr) => arr.indexOf(c) === i).map((cityOpt) => (
                                <option key={cityOpt} value={cityOpt} />
                              ))}
                            </datalist>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-800 mb-1">
                              Visa / Residency Status
                            </label>
                            <select
                              name="residency_status"
                              value={formData.residency_status || 'Work Visa'}
                              onChange={handleChange}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                            >
                              {RESIDENCY_STATUS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-800 mb-1">
                              Current Indian State (If Applicable)
                            </label>
                            <input
                              type="text"
                              name="state"
                              value={formData.state}
                              onChange={handleChange}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                              placeholder="e.g. Kerala / Maharashtra / Punjab"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Domestic India Details */
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2.5 border-t border-amber-200/70">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                          <input
                            type="text"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                            placeholder="e.g. Kerala / Maharashtra"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                            placeholder="e.g. Kochi / Mumbai"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">District</label>
                          <input
                            type="text"
                            name="district"
                            value={formData.district}
                            onChange={handleChange}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                            placeholder="e.g. Ernakulam / Nashik"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Native Place Details (Optional) */}
                  <div className="p-3.5 rounded-2xl bg-[#FFF7FA] border border-[#E8C6D1] space-y-3">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#C76B85]" />
                        <span>Native Place Details (Optional)</span>
                      </span>
                      <p className="text-[11px] text-slate-600">
                        Add your family&apos;s native state, district, and exact town or village.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Native State</label>
                        <select
                          name="native_state"
                          value={formData.native_state || ''}
                          onChange={(e) => {
                            setFormData((prev) => ({
                              ...prev,
                              native_state: e.target.value,
                              native_district: ''
                            }));
                          }}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                        >
                          <option value="">Select Native State</option>
                          {INDIAN_STATES_AND_UTS.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Native District</label>
                        <select
                          name="native_district"
                          value={formData.native_district || ''}
                          onChange={handleChange}
                          disabled={!formData.native_state}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">
                            {formData.native_state ? 'Select Native District' : 'Select State First'}
                          </option>
                          {(formData.native_state ? getServiceDistrictsForState(formData.native_state) : []).map((dist) => (
                            <option key={dist} value={dist}>{dist}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Native Place / Town / Village</label>
                        <input
                          type="text"
                          name="native_place"
                          value={formData.native_place || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                          placeholder="e.g. Alakode, Payyanur"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Education & Career */}
              {activeTab === 'career' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Highest Qualification (Optional)</label>
                      <input
                        type="text"
                        name="education"
                        value={formData.education}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                        placeholder="e.g. B.Tech / MBBS / MBA"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Profession / Role (Optional)</label>
                      <input
                        type="text"
                        name="profession"
                        value={formData.profession}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                        placeholder="e.g. Software Engineer / Doctor"
                      />
                    </div>
                  </div>

                  {/* Detailed Optional Education History */}
                  <div className="p-3.5 rounded-2xl bg-[#FFF7FA] border border-[#E8C6D1] space-y-3">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Education History (All Optional)
                      </span>
                      <p className="text-[11px] text-slate-600">
                        Fill in only the qualifications that apply to you and leave the rest blank.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          10th / SSLC (School &amp; Place studied)
                        </label>
                        <input
                          type="text"
                          name="edu_10th"
                          value={formData.edu_10th || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                          placeholder="e.g. St. Joseph HSS, Kannur"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          12th / Higher Secondary (School / Stream &amp; Place)
                        </label>
                        <input
                          type="text"
                          name="edu_12th"
                          value={formData.edu_12th || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                          placeholder="e.g. Science, Sacred Heart HSS, Kochi"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Degree / Graduation (Course &amp; College / University)
                        </label>
                        <input
                          type="text"
                          name="edu_degree"
                          value={formData.edu_degree || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                          placeholder="e.g. B.Tech CSE, CET Trivandrum"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Post Graduation / PG (Course &amp; College / University)
                        </label>
                        <input
                          type="text"
                          name="edu_pg"
                          value={formData.edu_pg || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                          placeholder="e.g. MBA, IIM Kozhikode"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Doctorate / PhD (Specialization &amp; University, if applicable)
                      </label>
                      <input
                        type="text"
                        name="edu_doctorate"
                        value={formData.edu_doctorate || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                        placeholder="e.g. PhD in Biotechnology, IISc Bengaluru"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Company / Organization</label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                        placeholder="e.g. TCS / Private Hospital"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Annual Income</label>
                      <input
                        type="text"
                        name="annualIncome"
                        value={formData.annualIncome}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                        placeholder="e.g. ₹ 15 - 25 LPA or $140,000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Partner Preferences */}
              {activeTab === 'preferences' && (
                <div className="space-y-4">
                  {/* Multi-Select Preferred Countries (Minimum 5+) */}
                  <div className="p-3.5 rounded-2xl bg-[#FFF7FA] border border-[#E8C6D1] space-y-2">
                    <MultiCountrySelect
                      label="Preferred Countries (Select 5 or more)"
                      value={formData.preferred_countries || 'Any'}
                      maxSelections={10}
                      onChange={(val) => {
                        setFormData(prev => ({
                          ...prev,
                          preferred_countries: val,
                          preferredCountries: val
                        }));
                      }}
                    />
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Select multiple preferred countries (e.g. India, United Arab Emirates (UAE), United Kingdom (UK), United States (USA), Canada).
                    </p>
                  </div>

                  {/* Age Range & Height Range (cm) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Min Age (Yrs)</label>
                      <select
                        name="pref_min_age"
                        value={formData.pref_min_age || '21'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        {Array.from({ length: 43 }, (_, i) => 18 + i).map(age => (
                          <option key={age} value={String(age)}>{age} yrs</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Max Age (Yrs)</label>
                      <select
                        name="pref_max_age"
                        value={formData.pref_max_age || '35'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        {Array.from({ length: 43 }, (_, i) => 18 + i).map(age => (
                          <option key={age} value={String(age)}>{age} yrs</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Min Height (cm)</label>
                      <select
                        name="pref_min_height"
                        value={formData.pref_min_height || '150'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        {Array.from({ length: 71 }, (_, i) => 140 + i).map(cm => (
                          <option key={cm} value={String(cm)}>{cm} cm</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Max Height (cm)</label>
                      <select
                        name="pref_max_height"
                        value={formData.pref_max_height || '185'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        {Array.from({ length: 71 }, (_, i) => 140 + i).map(cm => (
                          <option key={cm} value={String(cm)}>{cm} cm</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Complexion / Skin Tone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Complexion / Skin Tone</label>
                    <select
                      name="pref_complexion"
                      value={formData.pref_complexion || 'Any'}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                    >
                      {['Any', 'Very Fair', 'Fair', 'Wheatish', 'Wheatish Brown', 'Dark'].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Religion, Caste / Community & Mother Tongue */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Religion</label>
                      <select
                        name="pref_religion"
                        value={formData.pref_religion || 'Any'}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            pref_religion: e.target.value,
                            pref_caste: 'Any'
                          }));
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        <option value="Any">Any</option>
                        {ALL_INDIA_RELIGIONS.map(rel => (
                          <option key={rel} value={rel}>{rel}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Community / Caste</label>
                      <select
                        name="pref_caste"
                        value={formData.pref_caste || 'Any'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        <option value="Any">Any</option>
                        {(RELIGION_COMMUNITIES[formData.pref_religion] || []).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mother Tongue</label>
                      <select
                        name="pref_mother_tongue"
                        value={formData.pref_mother_tongue || 'Any'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        {['Any', 'Malayalam', 'Tamil', 'Kannada', 'Telugu', 'Hindi', 'Marathi', 'Gujarati', 'Punjabi', 'Bengali', 'Urdu', 'Konkani', 'Tulu', 'English', 'Other'].map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Education, Occupation, Income & Diet */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Education</label>
                      <select
                        name="pref_education"
                        value={formData.pref_education || 'Any'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        {['Any', 'High School', 'Diploma', "Bachelor's Degree", "Master's Degree", 'Doctorate / PhD', 'Professional Degree'].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Job / Occupation &amp; Sector</label>
                      <select
                        name="pref_occupation"
                        value={formData.pref_occupation || 'Any'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        {['Any', 'Private Sector', 'Government / Defence', 'Business / Self-Employed', 'IT / Software', 'Medical / Healthcare', 'Engineering', 'Teaching / Academic', 'Working Abroad / NRI', 'Not Working'].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Annual Income</label>
                      <select
                        name="pref_income"
                        value={formData.pref_income || 'Any'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        {['Any', '3 Lakhs+', '5 Lakhs+', '8 Lakhs+', '12 Lakhs+', '20 Lakhs+'].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Dietary Preference</label>
                      <select
                        name="pref_diet"
                        value={formData.pref_diet || 'Any'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        {['Any', 'Vegetarian', 'Non-Vegetarian', 'Eggetarian'].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Preferred State & District */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Preferred State</label>
                      <select
                        name="pref_state"
                        value={formData.pref_state || 'Any'}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            pref_state: e.target.value,
                            pref_district: 'Any'
                          }));
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        <option value="Any">Any</option>
                        {INDIAN_STATES_AND_UTS.filter(s => s !== 'All States').map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Preferred District</label>
                      <select
                        name="pref_district"
                        value={formData.pref_district || 'Any'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        <option value="Any">Any</option>
                        {getServiceDistrictsForState(formData.pref_state === 'Any' ? 'All States' : formData.pref_state)
                          .filter(d => d !== 'All Districts')
                          .map(dist => (
                            <option key={dist} value={dist}>{dist}</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Physical Status & Lifestyle Habits */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Physical Status</label>
                      <select
                        name="pref_physical_status"
                        value={formData.pref_physical_status || 'Any'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        {['Any', 'Normal', 'Differently Abled'].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Smoking</label>
                      <select
                        name="pref_smoking"
                        value={formData.pref_smoking || 'Any'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        {['Any', 'No', 'Occasionally'].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Drinking</label>
                      <select
                        name="pref_drinking"
                        value={formData.pref_drinking || 'Any'}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      >
                        {['Any', 'No', 'Occasionally'].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Partner Expectations &amp; Qualities
                    </label>
                    <textarea
                      name="partner_expectations"
                      rows={3}
                      value={formData.partner_expectations || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#8064A2] bg-white text-slate-800"
                      placeholder="Describe what you are looking for in your life partner (values, lifestyle, education, mindset, openness to settle abroad)..."
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Form Actions Footer */}
          <footer className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#C76B85] hover:bg-[#B35872] shadow-md shadow-[#C76B85]/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Saving to Supabase...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-white" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </footer>

        </form>
      </div>
    </div>
  );
}
