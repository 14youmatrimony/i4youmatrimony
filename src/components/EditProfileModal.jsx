import React, { useState, useEffect } from 'react';
import { 
  X, Check, AlertCircle, Loader2, Save, User, 
  MapPin, Briefcase, Sparkles, Lock 
} from 'lucide-react';
import { fetchLiveUserProfile, updateLiveUserProfile } from '../services/api';

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
      height: source?.height || '',
      religion: source?.religion || '',
      caste: source?.caste || '',
      motherTongue: source?.motherTongue || source?.mother_tongue || '',
      maritalStatus: source?.maritalStatus || source?.marital_status || 'Never Married',
      state: source?.state || '',
      city: source?.city || '',
      district: source?.district || source?.city || '',
      education: source?.education || '',
      profession: source?.profession || '',
      company: source?.company || '',
      annualIncome: source?.annualIncome || source?.annual_income || '',
      diet: source?.diet || 'Vegetarian',
      manglik: source?.manglik || 'Non-Manglik',
      about: source?.about || source?.aboutBio || ''
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
  const isHeightLocked = isFieldSaved('height');
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
      (name === 'height' && isHeightLocked) ||
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
    if (isHeightLocked) {
      safePayload.height = savedRecord?.height || currentUser?.height || formData.height;
    }
    if (isReligionLocked) {
      safePayload.religion = savedRecord?.religion || currentUser?.religion || formData.religion;
    }
    if (isMotherTongueLocked) {
      safePayload.motherTongue = savedRecord?.motherTongue || savedRecord?.mother_tongue || currentUser?.motherTongue || currentUser?.mother_tongue || formData.motherTongue;
      safePayload.mother_tongue = safePayload.motherTongue;
    }

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
      setSuccessMsg('Profile updated and saved to Supabase successfully! ✨');
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
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-[#D4AF37]/30 flex flex-col relative animate-in zoom-in-95 duration-200 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="bg-[#0B192C] text-white px-5 py-4 flex items-center justify-between border-b border-[#D4AF37]/30 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center border border-[#D4AF37]/40 text-[#DFB76C]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-white">Edit Matrimony Profile</h2>
              <div className="flex items-center space-x-1.5 text-[11px] text-[#DFB76C]">
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-[#DFB76C]" />
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
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Tab Pills */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-100 border-b border-slate-200 overflow-x-auto shrink-0">
          {[
            { id: 'personal', label: 'Personal & Astro', icon: User },
            { id: 'location', label: 'Location & Contact', icon: MapPin },
            { id: 'career', label: 'Education & Career', icon: Briefcase }
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
                    ? 'bg-[#0B192C] text-[#DFB76C] shadow-sm'
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
              <Loader2 className="w-8 h-8 text-[#8C6D1F] animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Fetching fresh profile from Supabase...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: Personal & Astro */}
              {activeTab === 'personal' && (
                <div className="space-y-3.5">
                  {/* Security Notice on Core Identity Fields */}
                  <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5 shadow-xs">
                    <div className="p-1 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold block text-amber-950">Protected Core Identity Fields</span>
                      <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                        For matrimonial authenticity and member security, your Full Name, Age, Gender, Height, Religion, and Mother Tongue are permanently locked once saved and cannot be edited.
                      </p>
                    </div>
                  </div>

                  {/* 1. Full Name & 2. Age */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span>Full Name *</span>
                          {isNameLocked && <Lock className="w-3 h-3 text-slate-400" aria-label="Permanently locked" />}
                        </label>
                        {isNameLocked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            <Lock className="w-2.5 h-2.5 text-slate-500" />
                            Verified Permanent
                          </span>
                        )}
                      </div>
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
                            ? 'bg-gray-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none opacity-75'
                            : 'bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]'
                        }`}
                        placeholder="Candidate Name"
                      />
                      {isNameLocked && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <span>🔒 Core identity field &bull; Cannot be changed</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span>Age *</span>
                          {isAgeLocked && <Lock className="w-3 h-3 text-slate-400" aria-label="Permanently locked" />}
                        </label>
                        {isAgeLocked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            <Lock className="w-2.5 h-2.5 text-slate-500" />
                            Verified Permanent
                          </span>
                        )}
                      </div>
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
                            ? 'bg-gray-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none opacity-75'
                            : 'bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]'
                        }`}
                        placeholder="e.g. 26"
                      />
                      {isAgeLocked && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <span>🔒 Age is permanent and cannot be modified</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 3. Gender & 4. Height */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span>Gender *</span>
                          {isGenderLocked && <Lock className="w-3 h-3 text-slate-400" aria-label="Permanently locked" />}
                        </label>
                        {isGenderLocked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            <Lock className="w-2.5 h-2.5 text-slate-500" />
                            Verified Permanent
                          </span>
                        )}
                      </div>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        disabled={isGenderLocked}
                        readOnly={isGenderLocked}
                        className={`w-full px-3 py-2 text-xs rounded-xl border transition-colors ${
                          isGenderLocked
                            ? 'bg-gray-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none opacity-75'
                            : 'bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]'
                        }`}
                      >
                        {!formData.gender && <option value="">Select Gender</option>}
                        <option value="Female">Female (Bride)</option>
                        <option value="Male">Male (Groom)</option>
                      </select>
                      {isGenderLocked && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <span>🔒 Profile gender is permanent and cannot be modified</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span>Height</span>
                          {isHeightLocked && <Lock className="w-3 h-3 text-slate-400" aria-label="Permanently locked" />}
                        </label>
                        {isHeightLocked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            <Lock className="w-2.5 h-2.5 text-slate-500" />
                            Verified Permanent
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        name="height"
                        value={formData.height}
                        onChange={handleChange}
                        disabled={isHeightLocked}
                        readOnly={isHeightLocked}
                        className={`w-full px-3 py-2 text-xs rounded-xl border transition-colors ${
                          isHeightLocked
                            ? 'bg-gray-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none opacity-75'
                            : 'bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]'
                        }`}
                        placeholder="e.g. 5'6'' (168 cm)"
                      />
                      {isHeightLocked && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <span>🔒 Height is permanent once saved</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 5. Religion & 6. Mother Tongue */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span>Religion</span>
                          {isReligionLocked && <Lock className="w-3 h-3 text-slate-400" aria-label="Permanently locked" />}
                        </label>
                        {isReligionLocked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            <Lock className="w-2.5 h-2.5 text-slate-500" />
                            Verified Permanent
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        name="religion"
                        value={formData.religion}
                        onChange={handleChange}
                        disabled={isReligionLocked}
                        readOnly={isReligionLocked}
                        className={`w-full px-3 py-2 text-xs rounded-xl border transition-colors ${
                          isReligionLocked
                            ? 'bg-gray-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none opacity-75'
                            : 'bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]'
                        }`}
                        placeholder="Hindu / Christian / Muslim"
                      />
                      {isReligionLocked && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <span>🔒 Religion is permanent once saved</span>
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span>Mother Tongue</span>
                          {isMotherTongueLocked && <Lock className="w-3 h-3 text-slate-400" aria-label="Permanently locked" />}
                        </label>
                        {isMotherTongueLocked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            <Lock className="w-2.5 h-2.5 text-slate-500" />
                            Verified Permanent
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        name="motherTongue"
                        value={formData.motherTongue}
                        onChange={handleChange}
                        disabled={isMotherTongueLocked}
                        readOnly={isMotherTongueLocked}
                        className={`w-full px-3 py-2 text-xs rounded-xl border transition-colors ${
                          isMotherTongueLocked
                            ? 'bg-gray-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none opacity-75'
                            : 'bg-white text-slate-800 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]'
                        }`}
                        placeholder="Malayalam / Marathi / Hindi"
                      />
                      {isMotherTongueLocked && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <span>🔒 Mother tongue is permanent once saved</span>
                        </p>
                      )}
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
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white text-slate-800"
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
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white text-slate-800"
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
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white text-slate-800"
                      placeholder="Brief matrimonial introduction, values, and lifestyle..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Location & Contact */}
              {activeTab === 'location' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone *</label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white text-slate-800"
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
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white text-slate-800"
                        placeholder="candidate@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">State *</label>
                      <input
                        type="text"
                        name="state"
                        required
                        value={formData.state}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white text-slate-800"
                        placeholder="e.g. Kerala / Maharashtra"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
                      <input
                        type="text"
                        name="city"
                        required
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white text-slate-800"
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
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white text-slate-800"
                        placeholder="e.g. Ernakulam / Nashik"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Education & Career */}
              {activeTab === 'career' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Highest Qualification *</label>
                      <input
                        type="text"
                        name="education"
                        required
                        value={formData.education}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white text-slate-800"
                        placeholder="e.g. B.Tech / MBBS / MBA"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Profession / Role *</label>
                      <input
                        type="text"
                        name="profession"
                        required
                        value={formData.profession}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white text-slate-800"
                        placeholder="e.g. Software Engineer / Doctor"
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
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white text-slate-800"
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
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] bg-white text-slate-800"
                        placeholder="e.g. ₹ 15 - 25 LPA"
                      />
                    </div>
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] hover:from-[#dfb76c] hover:to-[#b89228] shadow-md shadow-[#D4AF37]/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0B192C]" />
                  <span>Saving to Supabase...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#0B192C]" />
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
