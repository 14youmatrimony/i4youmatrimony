import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Sparkles, 
  LogOut, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft,
  Edit3, 
  CheckCircle2, 
  FileCheck2, 
  Lock, 
  Eye, 
  EyeOff,
  Check, 
  AlertCircle,
  Phone,
  Camera,
  Upload,
  Plus,
  Trash2,
  Star,
  X,
  HeartHandshake,
  Users,
  Bell,
  Crown,
  CreditCard,
  FileText,
  Tag,
  Palette,
  Scale
} from 'lucide-react';
import TermsAndConditionsModal from '../common/TermsAndConditionsModal';
import LoginScreen from '../LoginScreen';
import RegistrationWizard, { SAMPLE_SINGLE_PHOTOS, SAMPLE_FAMILY_PHOTOS } from '../RegistrationWizard';
import MobileVerificationScreen from '../MobileVerificationScreen';
import AadhaarVerificationScreen from '../AadhaarVerificationScreen';
import MobilePhotoManagerSheet from './MobilePhotoManagerSheet';
import EditProfileModal from '../EditProfileModal';
import { updateLiveUserProfile } from '../../services/api';
import { usePhotoPrivacy } from '../../context/PhotoPrivacyContext';
import { useTheme } from '../../context/ThemeContext';
import { isKundaliApplicableReligion } from '../../data/religionData';

export default function MobileAccountScreen({
  currentUser,
  onUpdateLocation,
  onUpdatePhotos,
  onLoginSuccess,
  onRegistrationComplete,
  onOpenLogin,
  onOpenRegister,
  onOpenVerification,
  onOpenAadhaarVerification,
  onOpenPhotoManager,
  onNavigateToInterests,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  interestCount,
  shortlistCount,
  onOpenOffers,
  offers = [],
  onViewInvoice,
  onDeleteAccount,
  onOpenThemeSettings,
  isProduction = false,
  onToggleProductionMode,
  onLogout
}) {
  const { themeMode, accent, bottomBarStyle } = useTheme();
  const [subView, setSubView] = useState('profile'); // 'profile' | 'edit_reg' | 'switch_login' | 'verify_mobile' | 'verify_aadhaar' | 'privacy_settings' | 'invoices'
  const [pendingVerificationData, setPendingVerificationData] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const hasPaidPlan = Boolean(currentUser?.membership && currentUser?.membership !== 'free');

  // Dynamic active offer from Python Admin Database
  const activeOffer = useMemo(() => {
    return (offers || []).find(o => o.is_active === 1 || o.is_active === true || o.is_active === '1') || null;
  }, [offers]);

  // Personal Account Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Found life partner on I 4 You');
  const [deleteFeedback, setDeleteFeedback] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Kundali & Horoscope Matching Settings Modal State
  const [showKundaliSettingsModal, setShowKundaliSettingsModal] = useState(false);
  const [kundaliGunasPref, setKundaliGunasPref] = useState(currentUser?.kundaliGunasPref || '28');
  const [kundaliManglikPref, setKundaliManglikPref] = useState(currentUser?.kundaliManglikPref || 'doesnt_matter');
  const [kundaliSavedToast, setKundaliSavedToast] = useState(false);
  const [isSavingKundali, setIsSavingKundali] = useState(false);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Photo Privacy Context State
  const { 
    screenshotRestricted, 
    setScreenshotRestricted, 
    watermarkEnabled, 
    setWatermarkEnabled,
    triggerScreenshotBlock
  } = usePhotoPrivacy();

  // Privacy toggles state
  const [hideContactFromUnverified, setHideContactFromUnverified] = useState(
    currentUser?.requireAadhaarToViewContact ?? true
  );
  const [showAadhaarBadge, setShowAadhaarBadge] = useState(true);

  // Photo Manager Sheet State
  const [isPhotoManagerOpen, setIsPhotoManagerOpen] = useState(false);
  const [photoManagerTab, setPhotoManagerTab] = useState('single'); // 'single' | 'family'

  const currentSinglePhotos = currentUser?.singlePhotos?.length
    ? currentUser.singlePhotos
    : [currentUser?.photo || SAMPLE_SINGLE_PHOTOS[0].url];

  const currentFamilyPhotos = currentUser?.familyPhotos?.length
    ? currentUser.familyPhotos
    : [SAMPLE_FAMILY_PHOTOS[0].url, SAMPLE_FAMILY_PHOTOS[1].url];

  const applyPhotoUpdate = (updatedSingle, updatedFamily, extraPrivacy = {}) => {
    let nextSingle = currentSinglePhotos;
    let nextFamily = currentFamilyPhotos;
    let privacyData = {};

    if (updatedSingle && typeof updatedSingle === 'object' && !Array.isArray(updatedSingle)) {
      nextSingle = updatedSingle.singlePhotos || currentSinglePhotos;
      nextFamily = updatedSingle.familyPhotos || currentFamilyPhotos;
      privacyData = {
        photo: updatedSingle.photo || nextSingle[0],
        hidePhotos: updatedSingle.hidePhotos,
        photoVisibility: updatedSingle.photoVisibility,
        blurPhotosForUnconnected: updatedSingle.blurPhotosForUnconnected
      };
    } else {
      nextSingle = updatedSingle || currentSinglePhotos;
      nextFamily = updatedFamily || currentFamilyPhotos;
      privacyData = {
        photo: nextSingle[0] || currentUser?.photo,
        ...extraPrivacy
      };
    }

    const payload = {
      singlePhotos: nextSingle,
      familyPhotos: nextFamily,
      ...privacyData
    };

    if (onUpdatePhotos) {
      onUpdatePhotos(payload);
    } else if (onRegistrationComplete) {
      onRegistrationComplete({
        ...currentUser,
        ...payload
      });
    }
  };

  const handleAddSinglePhoto = (url) => {
    if (currentSinglePhotos.length >= 5) {
      alert("Maximum 5 single photos allowed.");
      return;
    }
    applyPhotoUpdate([...currentSinglePhotos, url], currentFamilyPhotos);
  };

  const handleRemoveSinglePhoto = (idx) => {
    if (currentSinglePhotos.length <= 1) {
      alert("At least 1 single profile photo is required.");
      return;
    }
    const next = currentSinglePhotos.filter((_, i) => i !== idx);
    applyPhotoUpdate(next, currentFamilyPhotos);
  };

  const handleSetMainSinglePhoto = (idx) => {
    if (idx === 0) return;
    const selected = currentSinglePhotos[idx];
    const remaining = currentSinglePhotos.filter((_, i) => i !== idx);
    applyPhotoUpdate([selected, ...remaining], currentFamilyPhotos);
  };

  const handleSingleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (currentSinglePhotos.length >= 5) {
      alert("Maximum 5 single photos allowed.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        handleAddSinglePhoto(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddFamilyPhoto = (url) => {
    if (currentFamilyPhotos.length >= 2) {
      alert("Maximum 2 family photos allowed.");
      return;
    }
    applyPhotoUpdate(currentSinglePhotos, [...currentFamilyPhotos, url]);
  };

  const handleRemoveFamilyPhoto = (idx) => {
    const next = currentFamilyPhotos.filter((_, i) => i !== idx);
    applyPhotoUpdate(currentSinglePhotos, next);
  };

  const handleFamilyFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (currentFamilyPhotos.length >= 2) {
      alert("Maximum 2 family photos allowed.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        handleAddFamilyPhoto(event.target.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };


  if (subView === 'edit_reg') {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <RegistrationWizard 
          initialData={currentUser}
          onBack={() => setSubView('profile')}
          onProceedToVerification={(data) => {
            setPendingVerificationData(data);
            setSubView('verify_aadhaar');
          }}
          onRegistrationComplete={(data) => {
            onRegistrationComplete?.(data);
            setSubView('profile');
          }}
          onNavigateToLogin={() => setSubView('switch_login')}
          setCurrentScreen={() => setSubView('profile')}
        />
      </div>
    );
  }

  if (subView === 'switch_login') {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <LoginScreen 
          onBack={() => setSubView('profile')}
          onLoginSuccess={(data) => {
            onLoginSuccess?.(data);
            setSubView('profile');
          }}
          onNavigateToRegister={() => setSubView('edit_reg')}
          setCurrentScreen={() => setSubView('profile')}
        />
      </div>
    );
  }

  if (subView === 'verify_mobile') {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <MobileVerificationScreen 
          registrationData={pendingVerificationData || currentUser}
          onBackToRegistration={() => setSubView('edit_reg')}
          onProceedToAadhaar={(data) => {
            setPendingVerificationData(data);
            setSubView('verify_aadhaar');
          }}
          onCancel={() => setSubView('profile')}
          onVerificationSuccess={(data) => {
            onRegistrationComplete?.(data);
            setSubView('profile');
          }}
        />
      </div>
    );
  }

  if (subView === 'verify_aadhaar') {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <AadhaarVerificationScreen 
          registrationData={pendingVerificationData || currentUser}
          onBack={() => setSubView('profile')}
          onCancel={() => setSubView('profile')}
          onVerificationSuccess={(data) => {
            onRegistrationComplete?.(data);
            setSubView('profile');
          }}
        />
      </div>
    );
  }

  // Privacy & Security Settings Subview
  if (subView === 'privacy_settings') {
    return (
      <div className="flex-1 flex flex-col h-full w-full bg-slate-50 relative overflow-hidden">
        <header className="bg-[#0B192C] text-white px-3.5 py-3 flex items-center justify-between border-b border-[#D4AF37]/30 shadow-md shrink-0">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSubView('profile')}
              className="p-1.5 -ml-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-[#DFB76C]" />
            </button>
            <div>
              <h2 className="font-serif font-bold text-sm text-white">Privacy & Security Settings</h2>
              <p className="text-[10px] text-slate-300">UIDAI & Contact Protection Controls</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12">
          {/* Main Gating Toggle Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-xs text-slate-900">
                    Aadhaar Verification Gate for Contacts
                  </h3>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Hide your contact number, WhatsApp number, and native residence address from members unless they have authenticated their own Aadhaar with UIDAI.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input 
                  type="checkbox" 
                  checked={hideContactFromUnverified}
                  onChange={(e) => setHideContactFromUnverified(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block">Protection Status:</span>
              <p>
                {hideContactFromUnverified 
                  ? '🔒 Enabled: Unverified members see "+91 98XXX XXXXX" and must verify Aadhaar before viewing your contact details.'
                  : '⚠️ Open: Any registered member can see your direct contact details.'}
              </p>
            </div>
          </div>

          {/* Badge & Photo Settings Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Profile Display Preferences
            </h4>

            <div className="divide-y divide-slate-100 text-xs">
              {/* Photo Screenshot Restriction Toggle */}
              <div className="py-2.5 flex items-center justify-between">
                <div className="pr-2">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-500" />
                    <span>Restrict Photo Screenshots</span>
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Blocks members from taking screenshots, saving, or recording your single & family photos
                  </span>
                </div>
                <input 
                  type="checkbox" 
                  checked={screenshotRestricted}
                  onChange={(e) => setScreenshotRestricted(e.target.checked)}
                  className="rounded accent-emerald-600 cursor-pointer w-4 h-4 shrink-0"
                />
              </div>

              {/* Aadhaar Badge Toggle */}
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Show Aadhaar Verified Badge</span>
                  <span className="text-[10px] text-slate-500">Displays official green checkmark on your card</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={showAadhaarBadge}
                  onChange={(e) => setShowAadhaarBadge(e.target.checked)}
                  className="rounded accent-emerald-600 cursor-pointer w-4 h-4 shrink-0"
                />
              </div>
            </div>
          </div>

          {/* Photo Privacy & Anti-Harassment Guarantee Card */}
          <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-sm space-y-2.5 text-left">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-900">
              <Lock className="w-4 h-4 text-rose-500" />
              <span>360° Photo Privacy & Anti-Harassment Shield</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 text-[10.5px] text-slate-700 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-rose-900">
                Your portraits and family pictures are protected with active matrimonial privacy barriers:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[10px]">
                <li><strong>Anti-Screenshot Sensor:</strong> Intercepts PrintScreen, snipping tools, and mobile screen captures.</li>
                <li><strong>Clean Display:</strong> Crisp, watermark-free viewing for verified members without obstructing candidate portraits.</li>
                <li><strong>Right-Click & Long-Press Lock:</strong> Prevents saving images to phone camera roll or computer files.</li>
                <li><strong>Verified Access Only:</strong> Only Aadhaar-verified members can view verified contact details.</li>
              </ul>
            </div>
          </div>

          {/* Statutory UIDAI Matrimonial Privacy Notice */}
          <div className="bg-white rounded-2xl p-4 border border-emerald-200/90 shadow-sm space-y-3 text-left">
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>UIDAI & Data Safety Compliance Notice</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-2 leading-relaxed">
              <p>
                In strict adherence to Section 4(3) of the Aadhaar Act, 2016 and IT Security regulations:
              </p>
              <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
                <li>
                  <strong className="text-slate-800">Tokenized Verification:</strong> I 4 You uses encrypted UIDAI OTP authentication. We do not store your full 12-digit Aadhaar number in any plain text database.
                </li>
                <li>
                  <strong className="text-slate-800">No Biometric Storage:</strong> We never capture or retain biometric fingerprints or iris data.
                </li>
                <li>
                  <strong className="text-slate-800">Masked Display:</strong> Only the last 4 digits (e.g. <span className="font-mono font-bold">XXXX XXXX 5928</span>) are saved as an authentication audit trail.
                </li>
                <li>
                  <strong className="text-slate-800">Zero Commercial Sharing:</strong> Your Aadhaar metadata is strictly prohibited from being leased, rented, or distributed to advertising third parties.
                </li>
              </ul>
            </div>
          </div>

          <button
            type="button"
            disabled={isSavingPrivacy}
            onClick={async () => {
              setIsSavingPrivacy(true);
              const userId = currentUser?.id || currentUser?.registerId || localStorage.getItem('i4u_current_user_id');
              try {
                if (userId) {
                  await updateLiveUserProfile(userId, {
                    requireAadhaarToViewContact: hideContactFromUnverified,
                    screenshotRestricted,
                    showAadhaarBadge
                  });
                }
              } catch (e) {
                console.warn('[Privacy] Update warning:', e);
              } finally {
                setIsSavingPrivacy(false);
                setSubView('profile');
              }
            }}
            className="w-full py-2.5 rounded-xl bg-[#0B192C] text-[#DFB76C] text-xs font-bold shadow-md hover:bg-[#152E52] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSavingPrivacy ? 'Saving to Supabase...' : 'Save & Return to Account'}
          </button>
        </div>
      </div>
    );
  }

  // Payment History & Invoices Subview
  if (subView === 'invoices') {
    return (
      <div className="flex-1 flex flex-col h-full w-full bg-slate-50 relative overflow-hidden">
        <header className="bg-[#0B192C] text-white px-3.5 py-3 flex items-center justify-between border-b border-[#D4AF37]/30 shadow-md shrink-0">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSubView('profile')}
              className="p-1.5 -ml-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-[#DFB76C]" />
            </button>
            <div>
              <h2 className="font-serif font-bold text-sm text-white">Payment Receipts & Invoices</h2>
              <p className="text-[10px] text-slate-300">GST Tax Invoices & Order History</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 pb-12">
          {(!currentUser?.paymentHistory || currentUser.paymentHistory.length === 0) ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#8C6D1F] flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">No Payments Made Yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Upgrade your membership to unlock contact details, horoscopes, and get official GST tax invoices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubView('profile');
                  onOpenOffers?.();
                }}
                className="px-4 py-2 rounded-xl bg-[#0B192C] text-[#DFB76C] font-bold text-xs shadow-md hover:bg-slate-800 cursor-pointer"
              >
                {activeOffer ? `View Plans (Flat ${activeOffer.discount_percent}% OFF)` : 'View Membership Plans'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Past Orders & Invoices:</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {currentUser.paymentHistory.length} Verified Receipt{currentUser.paymentHistory.length > 1 ? 's' : ''}
                </span>
              </div>

              {currentUser.paymentHistory.map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-base">💎</span>
                        <h4 className="font-bold text-slate-900 text-sm">{item.planName || 'Membership Plan'}</h4>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {item.invoiceNumber || 'INV-2026-8812'} • {item.date}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-serif font-black text-sm text-[#0B192C]">
                        ₹ {(item.totalAmount || 2499).toLocaleString('en-IN')}
                      </span>
                      <span className="block text-[9px] font-bold text-emerald-700">PAID</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      Mode: <strong className="text-slate-700">{item.paymentMethod || 'UPI Payment'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => onViewInvoice && onViewInvoice(item)}
                      className="px-3 py-1 rounded-xl bg-amber-50 text-[#8C6D1F] border border-amber-200 hover:bg-amber-100 font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Tax Invoice</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      
      {/* Profile Card */}
      {!currentUser ? (
        <div className="bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#1E3A8A] rounded-2xl p-5 text-white shadow-md border border-[#D4AF37]/40 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/10 border border-[#D4AF37]/50 text-[#DFB76C] mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-white">Guest Matrimonial Account</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
              Login or register a free profile to connect with matches, unlock verified contacts & view horoscopes.
            </p>
          </div>
          <div className="flex gap-2 pt-1 justify-center">
            <button
              type="button"
              onClick={() => {
                if (onOpenLogin) onOpenLogin();
                else setSubView('switch_login');
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-[#D4AF37]/60 text-white font-bold text-xs cursor-pointer active:scale-95 transition-all shadow-xs"
            >
              Member Login
            </button>
            <button
              type="button"
              onClick={() => {
                if (onOpenRegister) onOpenRegister();
                else setSubView('edit_reg');
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-bold text-xs shadow-md cursor-pointer hover:opacity-95 active:scale-95 transition-all"
            >
              Register Free
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#1E3A8A] rounded-2xl p-4 text-white shadow-md relative overflow-hidden border border-[#D4AF37]/30">
        <div className="flex items-center space-x-3.5">
          <div 
            onClick={() => {
              if (onOpenPhotoManager) {
                onOpenPhotoManager('single');
              } else {
                setPhotoManagerTab('single');
                setIsPhotoManagerOpen(true);
              }
            }}
            className="relative cursor-pointer group shrink-0"
            title="Click to manage profile photos"
          >
            <img 
              src={currentUser?.photo || (currentUser?.gender === 'Male' ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300" : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300")} 
              alt={currentUser?.name || "Profile"}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              onContextMenu={(e) => {
                e.preventDefault();
                if (screenshotRestricted) triggerScreenshotBlock('right-click');
              }}
              className={`w-16 h-16 rounded-full object-cover ring-2 ${currentUser?.aadhaarVerified ? 'ring-emerald-400' : 'ring-[#DFB76C]'} group-hover:opacity-90 transition-opacity select-none`} 
            />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-5 h-5 text-[#DFB76C]" />
            </div>
            {currentUser?.aadhaarVerified ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 absolute -bottom-1 -right-1 bg-[#0B192C] rounded-full stroke-[2.5]" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-amber-400 absolute -bottom-1 -right-1 bg-[#0B192C] rounded-full" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <h3 className="font-serif font-bold text-lg text-white truncate">
                {(!currentUser?.name || currentUser.name === 'Verified Member') ? 'Priya Sharma' : currentUser.name}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (onOpenPhotoManager) {
                    onOpenPhotoManager('single');
                  } else {
                    setPhotoManagerTab('single');
                    setIsPhotoManagerOpen(true);
                  }
                }}
                className="px-2 py-1 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-amber-200 border border-amber-300/40 font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                title="Click to manage Single Photos"
              >
                <Camera className="w-3 h-3 text-[#DFB76C]" />
                <span>{currentSinglePhotos.length}/5 Single</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenPhotoManager) {
                    onOpenPhotoManager('family');
                  } else {
                    setPhotoManagerTab('family');
                    setIsPhotoManagerOpen(true);
                  }
                }}
                className="px-2 py-1 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-blue-200 border border-blue-300/40 font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                title="Click to manage Family Photos"
              >
                <Users className="w-3 h-3 text-blue-300" />
                <span>{currentFamilyPhotos.length}/2 Family</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenPhotoManager) {
                    onOpenPhotoManager('privacy');
                  } else {
                    setPhotoManagerTab('privacy');
                    setIsPhotoManagerOpen(true);
                  }
                }}
                className={`px-2 py-1 rounded-xl active:scale-95 border font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs ${
                  currentUser?.hidePhotos
                    ? 'bg-rose-500/30 text-rose-200 border-rose-400/50 hover:bg-rose-500/40'
                    : 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40 hover:bg-emerald-500/35'
                }`}
                title="Click to configure Photo Privacy & Visibility"
              >
                {currentUser?.hidePhotos ? (
                  <>
                    <EyeOff className="w-3 h-3 text-rose-300" />
                    <span>Hidden</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 text-emerald-300" />
                    <span>
                      {currentUser?.photoVisibility === 'accepted' 
                        ? 'Accepted Only' 
                        : currentUser?.photoVisibility === 'request' 
                        ? 'On Request' 
                        : 'Visible: All'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-3 gap-2 text-center">
          <button
            type="button"
            onClick={() => onNavigateToInterests?.('sent')}
            className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-xl p-2 cursor-pointer border border-white/5 hover:border-[#DFB76C]/40 text-center flex flex-col items-center justify-center group shadow-xs"
            title="View Sent Interests"
          >
            <span className="text-base font-bold text-[#DFB76C] group-hover:scale-105 transition-transform">{interestCount}</span>
            <p className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Interests Sent</p>
          </button>
          
          <button
            type="button"
            onClick={() => onNavigateToInterests?.('shortlist')}
            className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-xl p-2 cursor-pointer border border-white/5 hover:border-[#DFB76C]/40 text-center flex flex-col items-center justify-center group shadow-xs"
            title="View Shortlisted Profiles"
          >
            <span className="text-base font-bold text-[#DFB76C] group-hover:scale-105 transition-transform">{shortlistCount}</span>
            <p className="text-[10px] text-slate-300 group-hover:text-white transition-colors">Shortlisted</p>
          </button>
          
          {(() => {
              const isApproved = Boolean(
                currentUser?.aadhaarVerified || 
                currentUser?.aadhaar_verified === 1 || 
                currentUser?.aadhaar_verified === true || 
                currentUser?.aadhaar_status === 'approved' || 
                currentUser?.aadhaarStatus === 'approved'
              );
              const isSentBack = !isApproved && Boolean(
                currentUser?.aadhaar_status === 'sent_back' || 
                currentUser?.aadhaarStatus === 'sent_back' || 
                currentUser?.aadhaarRejectionReason || 
                currentUser?.aadhaar_rejection_reason
              );

              // When verified or guest, do NOT show any verification badge saying "Aadhaar Verified".
              // Show standard profile metrics (Profile Views) instead and keep verification completely hidden!
              if (isApproved || !currentUser || currentUser.isGuest) {
                return (
                  <div className="bg-white/10 rounded-xl p-2 text-center flex flex-col items-center justify-center border border-white/5 shadow-xs">
                    <span className="text-base font-bold text-[#DFB76C]">
                      {currentUser?.profileViews || currentUser?.viewsCount || 28}
                    </span>
                    <p className="text-[10px] text-slate-300">Profile Views</p>
                  </div>
                );
              }

              return (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAadhaarVerification) {
                      onOpenAadhaarVerification();
                    } else {
                      setSubView('verify_aadhaar');
                    }
                  }}
                  className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-xl p-2 cursor-pointer border border-white/5 hover:border-amber-400/40 text-center flex flex-col items-center justify-center group shadow-xs"
                  title={isSentBack ? 'Photo Sent Back' : 'Verify Aadhaar'}
                >
                  <span className={`text-base font-bold group-hover:scale-105 transition-transform ${isSentBack ? 'text-rose-400' : 'text-amber-400'}`}>
                    {isSentBack ? 'Re-upload' : (currentUser?.aadhaar_front_image || currentUser?.aadhaar_status === 'pending' ? 'Pending' : 'Required')}
                  </span>
                  <p className="text-[10px] text-slate-300 group-hover:text-white transition-colors">
                    {isSentBack ? 'Photo Sent Back' : (currentUser?.aadhaar_front_image || currentUser?.aadhaar_status === 'pending' ? 'Review Pending' : 'Verify Aadhaar')}
                  </p>
                </button>
              );
            })()}
        </div>
      </div>
      )}

      {/* ── Prominent Membership & Plan Card ── */}
      <div className="bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#0B192C] rounded-2xl p-4 text-white border-2 border-[#D4AF37]/50 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#DFB76C] text-[#0B192C] flex items-center justify-center font-bold shadow-xs shrink-0">
              <Crown className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-serif font-extrabold text-sm text-white truncate">
                  {currentUser?.membershipPlan || (currentUser?.membership === 'vip' ? 'Platinum Royal Member' : currentUser?.membership === 'diamond' ? 'Diamond VIP Member' : currentUser?.membership === 'gold' ? 'Gold Match Member' : 'Free Basic Member')}
                </span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full shrink-0 ${currentUser?.membership && currentUser.membership !== 'free' ? 'bg-emerald-600 text-white' : 'bg-[#D4AF37] text-[#0B192C]'}`}>
                  {currentUser?.membership && currentUser.membership !== 'free' ? 'ACTIVE' : 'FREE'}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 truncate">
                Contact Unlocks: <strong className="text-[#DFB76C]">
                  {hasPaidPlan 
                    ? (currentUser?.contactCredits === 999 ? 'Unlimited' : `${currentUser?.contactCredits ?? 0} Remaining`)
                    : '0 (Subscription Required)'
                  }
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenOffers}
            className="ml-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] text-[11px] font-extrabold hover:opacity-95 shadow-md flex items-center space-x-1 cursor-pointer transition-transform active:scale-95 shrink-0"
          >
            <span>{currentUser?.membership && currentUser.membership !== 'free' ? 'Renew / Boost' : 'Upgrade Plan'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-300">
          {hasPaidPlan ? (
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[10px] text-emerald-300 font-semibold">Active Plan • Valid till {currentUser?.planExpiry || '2027'}</span>
            </span>
          ) : activeOffer ? (
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#DFB76C] shrink-0" />
              <span className="text-[10px] text-amber-200">{activeOffer.title || 'Special Offer'} ({activeOffer.discount_percent}% OFF)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#DFB76C] shrink-0" />
              <span className="text-[10px] text-slate-300">Upgrade to Connect Directly</span>
            </span>
          )}
          {currentUser?.paymentHistory?.length > 0 && (
            <button
              type="button"
              onClick={() => setSubView('invoices')}
              className="text-[#DFB76C] font-semibold text-[10px] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>{currentUser.paymentHistory.length} Invoices</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Aadhaar Verification Banner: Sent Back Alert vs Standard Pending vs Approved (Auto-hidden) */}
      {(() => {
        const isUserLoggedIn = Boolean(
          currentUser && 
          (currentUser.id || currentUser.mobile || currentUser.phone || currentUser.email) && 
          !currentUser.isGuest &&
          currentUser.isLoggedIn !== false
        );

        const isApproved = Boolean(
          currentUser?.aadhaarVerified || 
          currentUser?.aadhaar_verified === 1 || 
          currentUser?.aadhaar_verified === true || 
          currentUser?.aadhaar_status === 'approved' || 
          currentUser?.aadhaarStatus === 'approved'
        );

        // When not logged in, or already approved, AUTOMATICALLY HIDE completely!
        if (!isUserLoggedIn || isApproved) {
          return null;
        }

        const isSentBack = Boolean(
          currentUser?.aadhaar_status === 'sent_back' || 
          currentUser?.aadhaarStatus === 'sent_back' || 
          currentUser?.aadhaarRejectionReason || 
          currentUser?.aadhaar_rejection_reason
        );

        if (isSentBack) {
          return (
            <div className="bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 border-2 border-rose-400 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-rose-950">
                      Aadhaar Card Sent Back for Re-upload
                    </h4>
                    <p className="text-[10px] text-rose-800 font-semibold">
                      Please upload a clearer photo to complete verification
                    </p>
                  </div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-extrabold bg-rose-200 text-rose-900 border border-rose-300 shrink-0 uppercase tracking-wide">
                  Re-upload Required
                </span>
              </div>

              <div className="bg-white/95 p-3 rounded-xl border border-rose-200 text-[11px] text-slate-800 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-rose-900 font-bold text-[10px] uppercase tracking-wider">
                  <FileCheck2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Admin Feedback:</span>
                </div>
                <p className="font-bold text-rose-950 italic text-xs pl-5 leading-relaxed">
                  "{currentUser?.aadhaarRejectionReason || currentUser?.aadhaar_rejection_reason || 'Photo is blurry or unclear. Please capture and upload a sharper, clear photo.'}"
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onOpenAadhaarVerification) {
                    onOpenAadhaarVerification();
                  } else {
                    setSubView('verify_aadhaar');
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-95 cursor-pointer shadow-md active:scale-98 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Re-upload Clear Aadhaar Card Photo</span>
              </button>
            </div>
          );
        }

        // If not sent back and not approved: Document Under Review (Pending) or Verify Now
        return (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-3.5 shadow-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-start space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs text-amber-950">
                    {currentUser?.aadhaar_front_image ? 'Aadhaar Document Under Review' : 'Aadhaar Verification Pending'}
                  </h4>
                  {currentUser?.aadhaar_front_image && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-200 text-amber-900 border border-amber-300">
                      Pending
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-amber-800 leading-snug">
                  {currentUser?.aadhaar_front_image 
                    ? 'Your uploaded card is awaiting admin approval. Green badge will activate once approved.'
                    : 'Upload your Aadhaar card or complete OTP verification to earn the green checkmark badge & unlock contacts.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onOpenAadhaarVerification) {
                  onOpenAadhaarVerification();
                } else {
                  setSubView('verify_aadhaar');
                }
              }}
              className="ml-2 px-3 py-1.5 rounded-xl bg-[#0B192C] text-[#DFB76C] text-[11px] font-bold shrink-0 hover:bg-[#152E52] cursor-pointer shadow-xs"
            >
              {currentUser?.aadhaar_front_image ? 'View Status' : 'Verify Now'}
            </button>
          </div>
        );
      })()}


      {/* Account Navigation Options */}
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm text-xs font-semibold text-slate-700">
        
        {/* Matrimony Membership Plans & Festive Offers */}
        <div 
          onClick={onOpenOffers}
          className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              hasPaidPlan ? 'bg-emerald-100 text-emerald-800' : 'bg-gradient-to-tr from-[#D4AF37] to-[#DFB76C] text-[#0B192C]'
            }`}>
              <Crown className="w-4 h-4 fill-current" />
            </div>
            <div>
              <span className="font-bold text-slate-900">
                {hasPaidPlan ? 'My Membership Plan & Upgrades' : (activeOffer ? 'Membership Plans & Special Offers' : 'Membership Plans & Upgrades')}
              </span>
              <p className="text-[10px] font-normal text-slate-400">
                {hasPaidPlan 
                  ? `${currentUser?.membershipPlan || 'Premium Member'} • ${currentUser?.contactCredits === 999 ? 'Unlimited' : (currentUser?.contactCredits ?? 0)} contact credits remaining`
                  : "Unlock verified phone numbers, parents' contacts & direct chat"
                }
              </p>
            </div>
          </div>
          {hasPaidPlan ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              ACTIVE
            </span>
          ) : activeOffer ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 border border-rose-200">
              {activeOffer.discount_percent}% OFF
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
              PLANS
            </span>
          )}
        </div>

        {/* Theme & Appearance Settings */}
        <div 
          onClick={onOpenThemeSettings}
          className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer group"
        >
          <div className="flex items-center space-x-3">
            <div 
              className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs transition-transform group-hover:scale-105"
              style={{ backgroundColor: accent?.primary || '#D4AF37' }}
            >
              <Palette className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-900">Theme & Appearance Settings</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 text-amber-800">
                  NEW 🎨
                </span>
              </div>
              <p className="text-[10px] font-normal text-slate-400">
                {accent?.name || 'Royal Gold'} • {themeMode === 'dark' ? 'Dark' : themeMode === 'light' ? 'Light' : 'Auto'} • {bottomBarStyle === 'transparent' ? 'Transparent Bar' : bottomBarStyle}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>


        {/* User-Specific Account Management (Only for Authenticated Users) */}
        {currentUser && (
          <>
            {/* Payment History & GST Invoices */}
            <div 
              onClick={() => setSubView('invoices')}
              className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-[#1E3A8A] flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold">Payment History & Tax Invoices</span>
                  <p className="text-[10px] font-normal text-slate-400">
                    {currentUser?.paymentHistory?.length || 0} Orders • Download official GST receipts
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            {/* Notifications & Activity Center */}
            {onOpenNotifications && (
              <div 
                onClick={onOpenNotifications}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-xl bg-[#DFB76C]/20 text-[#8C6D1F] flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 fill-[#DFB76C]" />
                  </div>
                  <div>
                    <span className="font-bold">Notifications & Alerts</span>
                    <p className="text-[10px] font-normal text-slate-400">
                      Interests, Shortlists, Profile Visitors, Contact Views & Messages
                    </p>
                  </div>
                </div>
                {unreadNotificationsCount > 0 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    {unreadNotificationsCount} New
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            )}

            {/* Aadhaar UIDAI Verification Status Item: Only shown when logged in and UNVERIFIED. Automatically completely hidden if already verified or guest. */}
            {(() => {
              const isUserLoggedIn = Boolean(
                currentUser && 
                (currentUser.id || currentUser.mobile || currentUser.phone || currentUser.email) && 
                !currentUser.isGuest &&
                currentUser.isLoggedIn !== false
              );

              const isApproved = Boolean(
                currentUser?.aadhaarVerified || 
                currentUser?.aadhaar_verified === 1 || 
                currentUser?.aadhaar_verified === true || 
                currentUser?.aadhaar_status === 'approved' || 
                currentUser?.aadhaarStatus === 'approved'
              );

              // If already approved, or not logged in: keep completely hidden. Do NOT show another verification saying "Verified"!
              if (isApproved || !isUserLoggedIn) {
                return null;
              }

              const isSentBack = Boolean(
                currentUser?.aadhaar_status === 'sent_back' || 
                currentUser?.aadhaarStatus === 'sent_back' || 
                currentUser?.aadhaarRejectionReason || 
                currentUser?.aadhaar_rejection_reason
              );

              return (
                <div 
                  onClick={() => {
                    if (onOpenAadhaarVerification) {
                      onOpenAadhaarVerification();
                    } else {
                      setSubView('verify_aadhaar');
                    }
                  }}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <FileCheck2 className={`w-4 h-4 ${isSentBack ? 'text-rose-600' : 'text-amber-600'}`} />
                    <div>
                      <span className="font-bold">Aadhaar UIDAI Verification</span>
                      <p className="text-[10px] font-normal text-slate-400">
                        {isSentBack
                          ? `⚠️ Sent Back: ${currentUser?.aadhaarRejectionReason || currentUser?.aadhaar_rejection_reason || 'Photo is unclear'}`
                          : (currentUser?.aadhaar_front_image || currentUser?.aadhaar_status === 'pending')
                          ? '⏳ Document submitted • Awaiting admin verification'
                          : 'Mandatory verification to unlock contacts and green badge'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    isSentBack
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {isSentBack ? 'Re-upload UID' : (currentUser?.aadhaar_front_image || currentUser?.aadhaar_status === 'pending') ? 'Pending' : 'Verify UID'}
                  </span>
                </div>
              );
            })()}

            {/* Privacy & Contact Security Settings */}
            <div 
              onClick={() => setSubView('privacy_settings')}
              className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <Lock className="w-4 h-4 text-[#8C6D1F]" />
                <div>
                  <span>Privacy & Contact Security Settings</span>
                  <p className="text-[10px] font-normal text-slate-400">
                    Hide contacts from unverified members & UIDAI notice
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>


            {/* Dedicated Manage Photos Option */}
            <div 
              onClick={() => {
                if (onOpenPhotoManager) {
                  onOpenPhotoManager('single');
                } else {
                  setPhotoManagerTab('single');
                  setIsPhotoManagerOpen(true);
                }
              }}
              className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <Camera className="w-4 h-4 text-[#8C6D1F]" />
                <div>
                  <span className="font-bold">Manage Profile & Family Photos</span>
                  <p className="text-[10px] font-normal text-slate-400">
                    Single ({currentSinglePhotos.length}/5) • Family ({currentFamilyPhotos.length}/2) • {currentUser?.hidePhotos ? '🚫 Photos Hidden' : currentUser?.photoVisibility === 'accepted' ? '🔒 Accepted Only' : currentUser?.photoVisibility === 'request' ? '🔒 On Request' : '👁️ Public to All'}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                currentUser?.hidePhotos 
                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                  : 'bg-amber-50 text-[#8C6D1F] border-amber-200'
              }`}>
                {currentUser?.hidePhotos ? 'Hidden' : 'Manage'}
              </span>
            </div>

            {/* Edit Registration Option */}
            <div 
              onClick={() => {
                setShowEditModal(true);
              }}
              className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <Edit3 className="w-4 h-4 text-[#8C6D1F]" />
                <div>
                  <span>Edit Matrimony Profile & Preferences</span>
                  <p className="text-[10px] font-normal text-slate-400">
                    Update personal, horoscope, astro, career & photos
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            {/* Kundali & Horoscope Matching Settings - Visible ONLY for Hinduism, Jainism, Buddhism */}
            {isKundaliApplicableReligion(currentUser?.religion) && (
              <div 
                onClick={() => setShowKundaliSettingsModal(true)}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-4 h-4 text-[#DFB76C]" />
                  <span>Kundali & Horoscope Matching Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            )}
          </>
        )}

        {/* Helpline */}
        <a 
          href="tel:8968926566"
          className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-inherit no-underline"
        >
          <div className="flex items-center space-x-3">
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span>Pan-India Helpline (8968926566)</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </a>

        {/* Terms & Conditions & Legal Policies */}
        <div 
          onClick={() => setShowTermsModal(true)}
          className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <Scale className="w-4 h-4 text-[#8C6D1F]" />
            <div>
              <span>Terms & Conditions & Legal Policies</span>
              <p className="text-[10px] font-normal text-slate-400">
                IT Act 2000, DPDP Act, UIDAI & Anti-Dowry Rules
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Logout */}
        {currentUser && (
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                localStorage.removeItem('i4u_auth_user');
                localStorage.setItem('i4u_logged_out', 'true');
                localStorage.removeItem('i4u_aadhaar_verified');
              } catch (err) {}
              if (onLogout) {
                onLogout();
              } else if (onOpenLogin) {
                onOpenLogin();
              } else {
                setSubView('switch_login');
              }
            }}
            className="w-full p-3.5 flex items-center justify-between hover:bg-rose-50/70 active:bg-rose-100 cursor-pointer text-slate-700 hover:text-rose-700 transition-colors text-left"
          >
            <div className="flex items-center space-x-3">
              <LogOut className="w-4 h-4 text-slate-500" />
              <span className="font-semibold">Log Out of Profile</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        )}

        {/* Delete Personal Account */}
        {currentUser && (
          <div 
            onClick={() => setShowDeleteModal(true)}
            className="p-3.5 flex items-center justify-between hover:bg-rose-50/80 cursor-pointer text-rose-600 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-rose-600">Delete Personal Account</span>
                <p className="text-[10px] font-normal text-rose-400">
                  Permanently remove profile & mention reason
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-300" />
          </div>
        )}

      </div>

      {/* ========================================================
          DELETE PERSONAL ACCOUNT MODAL & REASON SPECIFICATION
          ======================================================== */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0B192C] text-white rounded-3xl border border-rose-500/40 p-4 shadow-2xl flex flex-col max-h-[86vh] overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Delete Personal Account</h3>
                  <p className="text-[10px] text-rose-300">Permanently deactivate your profile</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => !isDeleting && setShowDeleteModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto min-h-0 py-2.5 space-y-2.5 dark-scrollbar pr-0.5">
              
              {/* Warning Message */}
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-[10.5px] leading-tight">
                  <span className="font-bold text-rose-300 block">Are you sure you want to proceed?</span>
                  <p className="text-slate-300 text-[10px]">
                    Your profile, photos, shortlist history, and match connections will be permanently deactivated.
                  </p>
                </div>
              </div>

              {/* Predefined Reasons Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                  Select Primary Reason:
                </label>
                
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 dark-scrollbar">
                  {[
                    { title: 'Found life partner on I 4 You', desc: 'Matched and finalized wedding via I 4 You 💕' },
                    { title: 'Found match from other sources', desc: 'Alliance fixed through family or other channels 💍' },
                    { title: 'Taking a temporary break', desc: 'Pausing matrimony search for some time ⏳' },
                    { title: 'Privacy or security concerns', desc: 'Wish to hide photos & details from public view 🔒' },
                    { title: 'Not satisfied with recommendations', desc: 'Looking for different partner preferences 🔍' },
                    { title: 'Other personal reason', desc: 'Specific personal or family circumstances ✍️' }
                  ].map((item, idx) => {
                    const isSelected = deleteReason === item.title;
                    return (
                      <div 
                        key={idx}
                        onClick={() => setDeleteReason(item.title)}
                        className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                          isSelected 
                            ? 'bg-rose-500/20 border-rose-500 text-white font-semibold' 
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="text-[11.5px] font-medium leading-tight truncate">{item.title}</div>
                          {isSelected && (
                            <div className="text-[9.5px] text-rose-300 leading-tight">{item.desc}</div>
                          )}
                        </div>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-rose-400 bg-rose-500 text-white' : 'border-slate-600'
                        }`}>
                          {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dedicated Column / Textarea for Mentioning Reason & Feedback */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 block">
                  Mention specific feedback / details:
                </label>
                <textarea 
                  rows={2}
                  value={deleteFeedback}
                  onChange={(e) => setDeleteFeedback(e.target.value)}
                  placeholder="Please describe your reason or share feedback with us (Optional)..."
                  className="w-full bg-[#070F1E] border border-slate-700 focus:border-rose-500 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors resize-none"
                />
              </div>

            </div>

            {/* Sticky Action Buttons */}
            <div className="pt-2.5 border-t border-white/10 flex items-center space-x-2 shrink-0">
              <button 
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                Keep Account
              </button>

              <button 
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!deleteReason) {
                    alert('Please select a reason.');
                    return;
                  }
                  setIsDeleting(true);
                  if (onDeleteAccount) {
                    await onDeleteAccount({
                      reason: deleteReason,
                      feedback: deleteFeedback
                    });
                  }
                  setIsDeleting(false);
                  setShowDeleteModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white text-xs font-bold shadow-lg shadow-rose-900/40 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Kundali & Horoscope Matching Settings Modal */}
      {showKundaliSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-[#0B192C] text-white w-full max-w-sm rounded-3xl border border-[#D4AF37]/40 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200 p-4">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#DFB76C] text-[#0B192C] flex items-center justify-center font-bold shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Kundali & Horoscope Matching</h3>
                  <p className="text-[10px] text-[#DFB76C]">Vedic Ashtakoot Milan & 36 Gunas</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowKundaliSettingsModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 dark-scrollbar">
              
              {/* Active Status Badge */}
              <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-[#D4AF37]/40 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-white">Ashtakoot Milan Active</p>
                    <p className="text-[10px] text-[#DFB76C]">Calculates compatibility based on 36 Gunas</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37] text-[#0B192C]">
                  {currentUser?.religion || 'Hindu'}
                </span>
              </div>

              {/* Astro Profile Snapshot */}
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Your Registered Horoscope
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-[9.5px] text-slate-400 block">Rashi</span>
                    <span className="font-bold text-white text-[11px] truncate block mt-0.5">
                      {currentUser?.astronomy?.rashi || currentUser?.rashi || 'Mesh'}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-[9.5px] text-slate-400 block">Nakshatra</span>
                    <span className="font-bold text-white text-[11px] truncate block mt-0.5">
                      {currentUser?.astronomy?.nakshatra || currentUser?.nakshatra || 'Ashwini'}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-[9.5px] text-slate-400 block">Manglik</span>
                    <span className="font-bold text-white text-[11px] truncate block mt-0.5">
                      {currentUser?.manglik || 'Non-Manglik'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Preference 1: Minimum Gunas Requirement */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                  Minimum Gunas Matching Requirement:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: '18', label: '18+ Gunas (Average)' },
                    { id: '24', label: '24+ Gunas (Good)' },
                    { id: '28', label: '28+ Gunas (High Match)' },
                    { id: '32', label: '32+ Gunas (Auspicious)' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setKundaliGunasPref(item.id)}
                      className={`p-2 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                        kundaliGunasPref === item.id
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#DFB76C]'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px]">{item.label}</span>
                        {kundaliGunasPref === item.id && <Check className="w-3 h-3 text-[#DFB76C]" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preference 2: Manglik Compatibility Preference */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                  Manglik Matching Preference:
                </label>
                <div className="space-y-1">
                  {[
                    { id: 'doesnt_matter', label: "Doesn't Matter / Open to All" },
                    { id: 'non_manglik', label: 'Non-Manglik Candidates Only' },
                    { id: 'manglik', label: 'Manglik Candidates Only' },
                    { id: 'anshik', label: 'Anshik / Partial Manglik Accepted' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setKundaliManglikPref(item.id)}
                      className={`w-full p-2 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        kundaliManglikPref === item.id
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#DFB76C]'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-[11px]">{item.label}</span>
                      {kundaliManglikPref === item.id && <Check className="w-3 h-3 text-[#DFB76C]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Success Feedback */}
              {kundaliSavedToast && (
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Kundali & Horoscope matching settings updated!</span>
                </div>
              )}

            </div>

            {/* Footer Action Buttons */}
            <div className="pt-3 border-t border-white/10 flex items-center space-x-2 shrink-0">
              <button 
                type="button"
                onClick={() => setShowKundaliSettingsModal(false)}
                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
              <button 
                type="button"
                disabled={isSavingKundali}
                onClick={async () => {
                  setIsSavingKundali(true);
                  const userId = currentUser?.id || currentUser?.registerId || localStorage.getItem('i4u_current_user_id');
                  try {
                    if (userId) {
                      await updateLiveUserProfile(userId, {
                        kundaliGunasPref,
                        kundaliManglikPref,
                        manglik: kundaliManglikPref === 'manglik' ? 'Manglik' : 'Non-Manglik'
                      });
                    }
                    setKundaliSavedToast(true);
                    setTimeout(() => {
                      setKundaliSavedToast(false);
                      setShowKundaliSettingsModal(false);
                    }, 1200);
                  } catch (e) {
                    console.warn('[Kundali] Save error:', e);
                  } finally {
                    setIsSavingKundali(false);
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingKundali ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Trust Guarantee Note */}
      <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 text-center space-y-0.5">
        <span className="font-bold flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>I 4 You Matrimony UIDAI Trust Guarantee</span>
        </span>
        <p className="text-slate-600 text-[10px]">
          100% Aadhaar authenticated brides and grooms across 750+ Indian districts.
        </p>
      </div>

      {/* Photo Management Modal Bottom Sheet (Confined to mobile device frame) */}
      {!onOpenPhotoManager && (
        <MobilePhotoManagerSheet 
          isOpen={isPhotoManagerOpen}
          onClose={() => setIsPhotoManagerOpen(false)}
          initialTab={photoManagerTab}
          currentUser={currentUser}
          onUpdatePhotos={applyPhotoUpdate}
        />
      )}

      {/* Interactive Terms & Conditions Modal */}
      <TermsAndConditionsModal 
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Edit Profile Modal (Supabase Direct Persistence) */}
      {showEditModal && (
        <EditProfileModal
          isOpen={showEditModal}
          currentUser={currentUser}
          onClose={() => setShowEditModal(false)}
          onProfileUpdated={(updated) => {
            onRegistrationComplete?.(updated);
          }}
        />
      )}

    </div>
  );
}
