import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Users, 
  X, 
  Plus, 
  Upload, 
  Star, 
  ShieldCheck, 
  HeartHandshake,
  Lock,
  Eye,
  EyeOff,
  Globe,
  Check,
  Key,
  Shield,
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { SAMPLE_SINGLE_PHOTOS, SAMPLE_FAMILY_PHOTOS } from '../RegistrationWizard';
import { usePhotoPrivacy } from '../../context/PhotoPrivacyContext';
import { optimizeImageFile } from '../../utils/imageOptimizer';

export default function MobilePhotoManagerSheet({
  isOpen,
  onClose,
  initialTab = 'single',
  currentUser,
  onUpdatePhotos
}) {
  const { screenshotRestricted, setScreenshotRestricted } = usePhotoPrivacy();
  const [activeTab, setActiveTab] = useState(initialTab); // 'single' | 'family' | 'privacy'

  // Photo Privacy Controls State
  const [hidePhotos, setHidePhotos] = useState(currentUser?.hidePhotos ?? false);
  const [photoVisibility, setPhotoVisibility] = useState(currentUser?.photoVisibility || 'all'); // 'all' | 'accepted' | 'request' | 'hidden'
  const [blurPhotosForUnconnected, setBlurPhotosForUnconnected] = useState(currentUser?.blurPhotosForUnconnected ?? false);

  // Local synchronized state for immediate and reactive UI updates
  const [singlePhotos, setSinglePhotos] = useState(() => {
    return currentUser?.singlePhotos?.length
      ? currentUser.singlePhotos
      : [currentUser?.photo || SAMPLE_SINGLE_PHOTOS[0].url];
  });

  const [familyPhotos, setFamilyPhotos] = useState(() => {
    return currentUser?.familyPhotos?.length
      ? currentUser.familyPhotos
      : [SAMPLE_FAMILY_PHOTOS[0].url, SAMPLE_FAMILY_PHOTOS[1].url];
  });

  const [uploadingSingle, setUploadingSingle] = useState(false);
  const [uploadingFamily, setUploadingFamily] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Sync state whenever sheet opens or currentUser updates
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      setHidePhotos(currentUser?.hidePhotos ?? false);
      setPhotoVisibility(currentUser?.photoVisibility || 'all');
      setBlurPhotosForUnconnected(currentUser?.blurPhotosForUnconnected ?? false);
      if (currentUser?.singlePhotos?.length) {
        setSinglePhotos(currentUser.singlePhotos);
      } else if (currentUser?.photo) {
        setSinglePhotos([currentUser.photo]);
      }
      if (currentUser?.familyPhotos?.length) {
        setFamilyPhotos(currentUser.familyPhotos);
      }
    }
  }, [isOpen, initialTab, currentUser]);

  if (!isOpen) return null;



  const handleUpdate = (newSingle, newFamily, extraPrivacy = {}) => {
    const nextSingle = newSingle || singlePhotos;
    const nextFamily = newFamily || familyPhotos;
    const primary = nextSingle[0] || currentUser?.photo;

    setSinglePhotos(nextSingle);
    setFamilyPhotos(nextFamily);

    onUpdatePhotos?.({
      singlePhotos: nextSingle,
      familyPhotos: nextFamily,
      photo: primary,
      hidePhotos: extraPrivacy.hidePhotos !== undefined ? extraPrivacy.hidePhotos : hidePhotos,
      photoVisibility: extraPrivacy.photoVisibility !== undefined ? extraPrivacy.photoVisibility : photoVisibility,
      blurPhotosForUnconnected: extraPrivacy.blurPhotosForUnconnected !== undefined ? extraPrivacy.blurPhotosForUnconnected : blurPhotosForUnconnected
    });
  };

  // Single Photos (Max 5) Handlers
  const handleAddSinglePhoto = (url, customMsg = null) => {
    if (singlePhotos.length >= 5) {
      alert("Maximum 5 single photos allowed.");
      return;
    }
    // Filter out stock Unsplash images when user uploads an authentic photo
    const realPhotos = singlePhotos.filter(p => !p.includes('unsplash.com'));
    // Place newly uploaded photo at index 0 so it becomes primary profile photo immediately
    const updated = [url, ...realPhotos].slice(0, 5);
    handleUpdate(updated, familyPhotos);
    showFeedback(customMsg || "Photo uploaded! Set as Slot #1 (Main Profile Photo) ⭐");
  };

  const handleRemoveSinglePhoto = (idx) => {
    if (singlePhotos.length <= 1) {
      alert("At least 1 single profile photo is required.");
      return;
    }
    const updated = singlePhotos.filter((_, i) => i !== idx);
    handleUpdate(updated, familyPhotos);
    showFeedback("Photo removed");
  };

  const handleSetMainPhoto = (idx) => {
    if (idx === 0) return;
    const chosen = singlePhotos[idx];
    const rest = singlePhotos.filter((_, i) => i !== idx);
    const updated = [chosen, ...rest];
    handleUpdate(updated, familyPhotos);
    showFeedback("Main Profile Photo updated! ⭐ Slot #1 is active.");
  };

  const handleSingleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (singlePhotos.length >= 5) {
      alert("Maximum 5 single photos allowed.");
      return;
    }
    setUploadingSingle(true);
    try {
      const result = await optimizeImageFile(file, {
        maxDimension: 1200,
        targetMaxKB: 180,
        initialQuality: 0.85
      });
      if (result?.dataUrl) {
        const feedbackMsg = result.originalSizeKB > 250
          ? `HD Photo optimized (${result.originalFormatted} ➔ ${result.compressedFormatted}) ⭐ Slot #1 Active`
          : `Photo uploaded! Set as Slot #1 (Main Profile Photo) ⭐`;
        handleAddSinglePhoto(result.dataUrl, feedbackMsg);
      }
    } catch (err) {
      console.error("Photo upload error:", err);
    } finally {
      setUploadingSingle(false);
      e.target.value = '';
    }
  };

  // Family Photos (Max 2) Handlers
  const handleAddFamilyPhoto = (url, customMsg = null) => {
    if (familyPhotos.length >= 2) {
      alert("Maximum 2 family photos allowed.");
      return;
    }
    const updated = [...familyPhotos, url].slice(0, 2);
    handleUpdate(singlePhotos, updated);
    showFeedback(customMsg || "Family photo added to album! 👨‍👩‍👧");
  };

  const handleRemoveFamilyPhoto = (idx) => {
    const updated = familyPhotos.filter((_, i) => i !== idx);
    handleUpdate(singlePhotos, updated);
    showFeedback("Family photo removed");
  };

  const handleFamilyFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (familyPhotos.length >= 2) {
      alert("Maximum 2 family photos allowed.");
      return;
    }
    setUploadingFamily(true);
    try {
      const result = await optimizeImageFile(file, {
        maxDimension: 1200,
        targetMaxKB: 180,
        initialQuality: 0.85
      });
      if (result?.dataUrl) {
        const feedbackMsg = result.originalSizeKB > 250
          ? `Family photo optimized (${result.originalFormatted} ➔ ${result.compressedFormatted}) 👨‍👩‍👧`
          : `Family photo added to album! 👨‍👩‍👧`;
        handleAddFamilyPhoto(result.dataUrl, feedbackMsg);
      }
    } catch (err) {
      console.error("Family photo upload error:", err);
    } finally {
      setUploadingFamily(false);
      e.target.value = '';
    }
  };

  // Privacy Handlers
  const handleToggleHidePhotos = (val) => {
    setHidePhotos(val);
    const newVisibility = val ? 'hidden' : 'all';
    setPhotoVisibility(newVisibility);
    handleUpdate(singlePhotos, familyPhotos, { hidePhotos: val, photoVisibility: newVisibility });
  };

  const handleSelectVisibility = (val) => {
    setPhotoVisibility(val);
    const isHidden = val === 'hidden';
    setHidePhotos(isHidden);
    handleUpdate(singlePhotos, familyPhotos, { photoVisibility: val, hidePhotos: isHidden });
  };

  const handleToggleBlur = (val) => {
    setBlurPhotosForUnconnected(val);
    handleUpdate(singlePhotos, familyPhotos, { blurPhotosForUnconnected: val });
  };

  const visibilityOptions = [
    {
      id: 'all',
      title: 'All Registered Members',
      badge: 'Recommended',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: Globe,
      desc: 'Visible to all verified matrimonial profiles across search & feed. Generates 5x more match responses.'
    },
    {
      id: 'accepted',
      title: 'Connected & Accepted Matches Only',
      badge: 'High Privacy',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: HeartHandshake,
      desc: 'Only members whose interest you accepted (or who accepted yours) see full photos. Others see a frosted preview.'
    },
    {
      id: 'request',
      title: 'Only on My Request Approval',
      badge: 'Approval Needed',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: Key,
      desc: 'Members must send a formal "Photo Request". Photos unlock only after you personally approve their request.'
    },
    {
      id: 'hidden',
      title: 'Strictly Hidden to Everyone',
      badge: 'Completely Private',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: EyeOff,
      desc: 'All photos are completely hidden from search, feed, and profiles. Displays a private member silhouette avatar.'
    }
  ];

  return (
    <div 
      className="absolute inset-0 z-50 flex flex-col bg-slate-50 animate-in fade-in duration-200 overflow-hidden"
    >
      {/* 1. Top Header with Title and Close Button */}
      <div className="px-4 py-3 bg-[#0B192C] text-white flex items-center justify-between border-b border-slate-800 shrink-0 z-20">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#DFB76C]">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#DFB76C] leading-tight">Photo & Album Manager</h3>
            <p className="text-[10px] text-slate-400">Manage profile portraits & family pictures</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Feedback Banner */}
      {feedbackMsg && (
        <div className="bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold text-center flex items-center justify-center gap-1.5 shadow-md animate-in slide-in-from-top duration-200 shrink-0 z-20">
          <Check className="w-3.5 h-3.5" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 2. Segmented 3-Tab Switcher */}
      <div className="px-3 pt-2 pb-1.5 bg-[#07111F] border-b border-slate-800 grid grid-cols-3 gap-1.5 shrink-0 z-10">
        <button
          type="button"
          onClick={() => setActiveTab('single')}
          className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
            activeTab === 'single'
              ? 'bg-[#D4AF37] text-[#0B192C] shadow-sm font-extrabold'
              : 'bg-white/10 text-slate-300 hover:bg-white/15'
          }`}
        >
          <Camera className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Single ({singlePhotos.length}/5)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('family')}
          className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
            activeTab === 'family'
              ? 'bg-[#D4AF37] text-[#0B192C] shadow-sm font-extrabold'
              : 'bg-white/10 text-slate-300 hover:bg-white/15'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Family ({familyPhotos.length}/2)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('privacy')}
          className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer relative ${
            activeTab === 'privacy'
              ? 'bg-[#D4AF37] text-[#0B192C] shadow-sm font-extrabold'
              : 'bg-white/10 text-slate-300 hover:bg-white/15'
          }`}
        >
          {hidePhotos ? (
            <EyeOff className="w-3.5 h-3.5 text-rose-300 shrink-0" />
          ) : (
            <Lock className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="truncate">Privacy & Hide</span>
          {hidePhotos && (
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-1.5 ring-2 ring-[#07111F]"></span>
          )}
        </button>
      </div>

      {/* 3. Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">


        {/* TAB 1: SINGLE PHOTOS (MAX 5) */}
        {activeTab === 'single' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#8C6D1F]" /> Candidate Portraits
                </h4>
                <p className="text-[10.5px] text-slate-500">
                  Slot #1 is your primary display photo shown across search & match feed.
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                singlePhotos.length === 5
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {singlePhotos.length} / 5 Max
              </span>
            </div>

            {/* 3-Column Mobile Thumbnail Grid */}
            <div className="grid grid-cols-3 gap-2">
              {singlePhotos.map((url, idx) => (
                <div 
                  key={idx} 
                  className="relative rounded-2xl overflow-hidden aspect-square border-2 border-[#D4AF37]/50 bg-slate-900 shadow-sm flex flex-col justify-between"
                >
                  <img src={url} alt={`Single ${idx + 1}`} className="w-full h-full object-cover" />
                  
                  {/* Badge */}
                  <div className="absolute top-1.5 left-1.5 z-10">
                    {idx === 0 ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-[#0B192C]/90 text-[#DFB76C] text-[8.5px] font-extrabold flex items-center gap-0.5 shadow-xs border border-[#DFB76C]/40">
                        <Star className="w-2.5 h-2.5 fill-[#DFB76C]" /> Main
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[8px] font-bold">
                        #{idx + 1}
                      </span>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveSinglePhoto(idx)}
                    className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] transition-colors cursor-pointer shadow-xs"
                    title="Remove Photo"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* Make Main button */}
                  {idx > 0 && (
                    <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/85 to-transparent z-10">
                      <button
                        type="button"
                        onClick={() => handleSetMainPhoto(idx)}
                        className="w-full py-0.5 rounded-lg text-[8px] font-bold bg-[#DFB76C] hover:bg-[#c99f52] text-[#0B192C] transition-colors cursor-pointer shadow-xs"
                      >
                        Make Main
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Empty Upload Slot */}
              {singlePhotos.length < 5 && (
                <label className="rounded-2xl border-2 border-dashed border-[#D4AF37]/60 hover:border-[#D4AF37] bg-amber-50/40 hover:bg-amber-50/80 aspect-square flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-all shadow-2xs">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleSingleFileUpload} 
                    disabled={uploadingSingle}
                  />
                  {uploadingSingle ? (
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#8C6D1F] mb-1" />
                      <span className="text-[9px] font-bold text-slate-700">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 text-[#8C6D1F] flex items-center justify-center mb-1">
                        <Plus className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-800 leading-tight">
                        + Add Photo
                      </span>
                      <span className="text-[8px] text-slate-500 mt-0.5">
                        Upload from device
                      </span>
                    </>
                  )}
                </label>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: FAMILY PHOTOS (MAX 2) */}
        {activeTab === 'family' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#1E3A8A]" /> Family Album
                </h4>
                <p className="text-[10.5px] text-slate-500">
                  Photos with parents, siblings, or auspicious family functions (Max 2).
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                familyPhotos.length === 2
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {familyPhotos.length} / 2 Max
              </span>
            </div>

            {/* High-Trust Benefit Note */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex items-start space-x-2.5 shadow-2xs">
              <HeartHandshake className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-950 leading-snug font-medium">
                <strong>High Matrimonial Trust:</strong> Profiles with verified family photos receive <strong>3x more interest acceptances</strong> from prospective families.
              </p>
            </div>

            {/* 2-Column Symmetrical Slots */}
            <div className="grid grid-cols-2 gap-2.5">
              {[0, 1].map((slotIdx) => {
                const url = familyPhotos[slotIdx];
                const slotTitle = slotIdx === 0 
                  ? 'Family Photo 1 (Parents / Portrait)' 
                  : 'Family Photo 2 (Family Gathering / Occasion)';

                if (url) {
                  return (
                    <div 
                      key={slotIdx}
                      className="relative rounded-2xl overflow-hidden aspect-[4/3] border-2 border-blue-400/50 bg-slate-900 shadow-sm flex flex-col justify-between"
                    >
                      <img src={url} alt={slotTitle} className="w-full h-full object-cover" />
                      <div className="absolute top-1.5 left-1.5 z-10">
                        <span className="px-1.5 py-0.5 rounded-md bg-[#0B192C]/90 text-white text-[8px] font-bold">
                          Family #{slotIdx + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFamilyPhoto(slotIdx)}
                        className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] transition-colors cursor-pointer shadow-xs"
                        title="Remove Photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/85 to-transparent z-10">
                        <span className="text-[9px] font-medium text-slate-100 block truncate text-center">
                          {slotIdx === 0 ? 'Parents / Portrait' : 'Family Gathering'}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <label 
                    key={slotIdx}
                    className="rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60 aspect-[4/3] flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-all shadow-2xs"
                  >
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFamilyFileUpload} 
                      disabled={uploadingFamily}
                    />
                    {uploadingFamily ? (
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-1" />
                        <span className="text-[9px] font-bold text-slate-700">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-1">
                          <Upload className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-800 leading-tight">
                          + Add Family #{slotIdx + 1}
                        </span>
                        <span className="text-[8px] text-slate-500 mt-0.5">
                          {slotIdx === 0 ? 'Parents / Portrait' : 'Gathering / Function'}
                        </span>
                      </>
                    )}
                  </label>
                );
              })}
            </div>

          </div>
        )}

        {/* TAB 3: PRIVACY & VISIBILITY CONTROLS */}
        {activeTab === 'privacy' && (
          <div className="space-y-3.5 animate-in fade-in">
            
            {/* 1. MASTER PHOTO HIDE TOGGLE CARD */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <EyeOff className="w-4 h-4 text-rose-600" />
                    <h3 className="font-bold text-xs text-slate-900">
                      Hide All My Photos
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Instantly hide all single portraits and family pictures from other members on Search, Feed, and Profile views.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input 
                    type="checkbox" 
                    checked={hidePhotos}
                    onChange={(e) => handleToggleHidePhotos(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              {hidePhotos ? (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong>Photos Hidden:</strong> Your pictures are currently hidden from other members. Other users will see a confidential silhouette avatar instead.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong>Photos Active:</strong> Photos are visible according to your rule selected below.
                  </p>
                </div>
              )}
            </div>

            {/* 2. WHO CAN SEE MY PHOTOS OPTIONS */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#8C6D1F]" /> Who Can See My Photos
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Choose who has permission to view your full photographs
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {visibilityOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = photoVisibility === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectVisibility(opt.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 ${
                        isSelected
                          ? 'border-[#D4AF37] bg-amber-50/60 ring-2 ring-[#D4AF37]/30 shadow-xs'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected 
                          ? 'bg-[#0B192C] text-[#DFB76C]' 
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className={`font-bold text-xs ${isSelected ? 'text-slate-950' : 'text-slate-800'}`}>
                            {opt.title}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold border ${opt.badgeColor}`}>
                            {opt.badge}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-600 mt-1 leading-snug">
                          {opt.desc}
                        </p>
                      </div>

                      <div className="shrink-0 mt-1">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected 
                            ? 'border-[#D4AF37] bg-[#D4AF37]' 
                            : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-[#0B192C] stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. ADDITIONAL PRIVACY CONTROLS */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Photo Display & Protection
              </h4>

              <div className="divide-y divide-slate-100 text-xs">
                {/* Blur Preview Toggle */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="pr-2">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#8C6D1F]" />
                      <span>Blur Photos for Unconnected Members</span>
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Shows a frosted artistic blur until you mutually connect or approve
                    </span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={blurPhotosForUnconnected}
                    onChange={(e) => handleToggleBlur(e.target.checked)}
                    className="rounded accent-[#8C6D1F] cursor-pointer w-4 h-4 shrink-0"
                  />
                </div>

                {/* Anti-Screenshot Protection Toggle */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="pr-2">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-rose-500" />
                      <span>Screenshot & Photo Theft Shield</span>
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Blocks PrintScreen, snipping tools, and image saving on devices
                    </span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={screenshotRestricted}
                    onChange={(e) => setScreenshotRestricted(e.target.checked)}
                    className="rounded accent-emerald-600 cursor-pointer w-4 h-4 shrink-0"
                  />
                </div>
              </div>
            </div>

            {/* 4. UIDAI SAFETY NOTICE */}
            <div className="p-3 bg-slate-100/80 rounded-2xl border border-slate-200 flex items-start space-x-2.5 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[10.5px] leading-relaxed">
                <strong>Matrimonial Security Guarantee:</strong> All photos are encrypted and served with strict SSL protection. Your pictures will never be shared with third parties or indexed by search engines.
              </p>
            </div>

          </div>
        )}

      </div>

      {/* 4. Docked Sticky Bottom Action Dock */}
      <footer className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-lg z-30">
        <div className="flex items-center space-x-1.5 min-w-0">
          {hidePhotos ? (
            <span className="text-[10.5px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs truncate">
              <EyeOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="truncate">Photos Hidden</span>
            </span>
          ) : (
            <span className="text-[10.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs truncate">
              <Eye className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">
                {photoVisibility === 'accepted' 
                  ? 'Accepted Only' 
                  : photoVisibility === 'request' 
                  ? 'On Request' 
                  : 'Visible: All'}
              </span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            handleUpdate(singlePhotos, familyPhotos);
            onClose();
          }}
          className="px-6 py-2 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] hover:from-[#dfb76c] hover:to-[#b89228] active:scale-95 transition-all shadow-md shadow-[#D4AF37]/25 flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Check className="w-4 h-4 text-[#0B192C] stroke-[2.5]" />
          <span>Done & Save</span>
        </button>
      </footer>

    </div>
  );
}
