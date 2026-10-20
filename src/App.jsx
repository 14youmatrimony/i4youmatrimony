import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { fetchLiveProfiles, recordLivePayment, registerLiveProfile, deletePersonalAccount, verifyLiveAadhaar, updateLivePhotos, fetchLivePlans, fetchLiveOffers, fetchLiveUserProfile, updateLiveUserProfile, compressBase64Image, purgeDemoProfilesFromSupabase, isDemoProfile } from './services/api';
import { supabase, isSupabaseConfigured, initSupabaseAuthListener } from './services/supabase';
import { uploadProfilePhoto } from './services/storageService';
import { logoutUser, persistUserSession } from './services/authService';
import { signOutGoogleAuth } from './services/googleAuth';
import DeviceFrameSimulator from './components/mobile/DeviceFrameSimulator';
import MobileAppShell from './components/mobile/MobileAppShell';
import MobileMatchFeed from './components/mobile/MobileMatchFeed';
import MobileSearchScreen from './components/mobile/MobileSearchScreen';
import MobileInterestsScreen from './components/mobile/MobileInterestsScreen';
import MobileChatScreen from './components/mobile/MobileChatScreen';
import MobileAccountScreen from './components/mobile/MobileAccountScreen';
import MobileProfileDetailSheet from './components/mobile/MobileProfileDetailSheet';
import MobileFilterBottomSheet from './components/mobile/MobileFilterBottomSheet';
import MobilePhotoManagerSheet from './components/mobile/MobilePhotoManagerSheet';
import { PhotoPrivacyProvider } from './context/PhotoPrivacyContext';
import { ScreenshotRestrictedBanner, ScreenshotCaptureBlockOverlay } from './components/mobile/PhotoPrivacyShield';
import SplashScreen from './components/common/SplashScreen';
import LoginScreen from './components/LoginScreen';
import RegistrationWizard from './components/RegistrationWizard';
import RegisterPhoneVerification from './components/RegisterPhoneVerification';
import MobileVerificationScreen from './components/MobileVerificationScreen';
import AadhaarVerificationScreen from './components/AadhaarVerificationScreen';
import WhatsAppStatusSystem from './components/mobile/WhatsAppStatusSystem';
import MobileNotificationsSheet from './components/mobile/MobileNotificationsSheet';
import MobileOffersAndPlansSheet from './components/mobile/MobileOffersAndPlansSheet';
import MobilePaymentModal from './components/mobile/MobilePaymentModal';
import PaymentInvoiceModal from './components/mobile/PaymentInvoiceModal';
import MobileThemeSettingsSheet from './components/mobile/MobileThemeSettingsSheet';
import { ThemeProvider } from './context/ThemeContext';
import { MEMBERSHIP_PLANS, formatBackendPlan } from './data/plansData';
import WebsiteView from './components/website/WebsiteView';
import MobileAppModal from './components/mobile/MobileAppModal';
import ProfileModal from './components/ProfileModal';
import EditProfileModal from './components/EditProfileModal';
import SendInterestModal from './components/SendInterestModal';
import AudioCallModal from './components/calling/AudioCallModal';
import VideoCallModal from './components/calling/VideoCallModal';
import IncomingCallModal from './components/calling/IncomingCallModal';
import { webrtcCallService } from './services/webrtcCallService';
import { liveChatService, deduplicateMessageList } from './services/liveChatService';
import { interestService } from './services/interestService';
import { computeUnreadMessagesCount } from './utils/conversationUtils';
import PremiumUpgradePromptModal from './components/calling/PremiumUpgradePromptModal';
import { getAppMode, setAppMode, APP_CONFIG } from './config/appConfig';
import { sendInAppNotificationWithEmail } from './services/emailNotificationService';

import { 
  INITIAL_PROFILES, 
  INITIAL_CONVERSATIONS, 
  DEMO_USER, 
  DEMO_USER_FEMALE, 
  DEMO_USER_MALE, 
  getConversationsForUser,
  CONVERSATIONS_FOR_FEMALE,
  CONVERSATIONS_FOR_MALE 
} from './data/mockProfiles';
import { 
  getTargetCandidateGender, 
  isCandidateMatchingTarget, 
  normalizeGender, 
  isSelfProfile, 
  resolveProfileGender 
} from './utils/genderMatch';
import { Sparkles, Crown, ShieldCheck } from 'lucide-react';

// Live sample notifications: Interest received, Profile shortlisted, Contact viewed, and Chat message (Tailored strictly to opposite gender real candidates)
export const getNotificationsForUser = (user, availableProfiles = []) => {
  if (!user) return [];
  const isMale = (user?.gender || '').toLowerCase() === 'male';
  
  const pool = (Array.isArray(availableProfiles) && availableProfiles.length > 0)
    ? availableProfiles
    : INITIAL_PROFILES;

  const oppositeProfiles = (pool || []).filter(p => {
    if (!p || !p.id) return false;
    if (isSelfProfile(p, user)) return false;
    const g = (p.gender || '').toLowerCase();
    return isMale ? (g === 'female' || g === 'woman') : (g === 'male' || g === 'man');
  });

  if (!oppositeProfiles.length) {
    return [];
  }

  const c1 = oppositeProfiles[0];
  const c2 = oppositeProfiles[1];
  const c3 = oppositeProfiles[2];

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';
  const list = [];

  if (c1) {
    list.push({
      id: 'notif-interest-' + c1.id,
      type: 'interest_received',
      profileId: c1.id,
      senderId: c1.id,
      sender: c1,
      interest_from: c1,
      title: `${c1.name} sent you an Interest! 💖`,
      message: `${c1.name} reviewed your profile and shared family values. Expressed interest in taking things forward.`,
      quote: `“Namaste ${firstName}! I liked your profile and career aspirations. Our family in ${c1.city || 'Kerala'} would love to connect with yours!”`,
      time: '12m ago',
      isRead: false,
      status: 'pending',
      badge: c1.profession || 'Universal Match'
    });
  }

  if (c2 && c2.id !== c1.id) {
    list.push({
      id: 'notif-shortlist-' + c2.id,
      type: 'profile_shortlisted',
      profileId: c2.id,
      senderId: c2.id,
      sender: c2,
      interest_from: c2,
      title: `${c2.name} shortlisted your profile! ⭐`,
      message: `${c2.name} added your profile to private shortlist for family horoscope matching.`,
      quote: '“Profile shortlisted for weekend family discussion & astrology review.”',
      time: '45m ago',
      isRead: false,
      status: 'pending',
      badge: c2.profession || 'Shortlisted'
    });
  }

  if (c3 && c3.id !== c1.id && c3.id !== c2.id) {
    list.push({
      id: 'notif-contact-' + c3.id,
      type: 'contact_viewed',
      profileId: c3.id,
      senderId: c3.id,
      sender: c3,
      interest_from: c3,
      title: 'Contact Details Viewed 👁️',
      message: `${c3.name} & family viewed your verified phone number & astrological horoscope.`,
      quote: 'Verified contact accessed via Aadhaar matrimonial authentication protocol.',
      time: '2h ago',
      isRead: false,
      status: 'pending',
      badge: 'Aadhaar Verified'
    });
  }

  return list;
};

export const INITIAL_NOTIFICATIONS = [];

// Pan-India authentic candidate status stories (Photo, Video max 60s, and Text)
const CANDIDATE_STATUSES = {
  p1: {
    id: 'st-p1',
    type: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
    caption: 'Auspicious family prayer at Trimbakeshwar Shiva temple today 🙏✨',
    timestamp: '15m ago',
    duration: null
  },
  p2: {
    id: 'st-p2',
    type: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4',
    caption: 'Morning hiking trail in Coorg Western Ghats 🌿⛰️',
    timestamp: '45m ago',
    duration: 24
  },
  p3: {
    id: 'st-p3',
    type: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
    caption: 'Annual classical Kathakali recital in Kochi 🌺',
    timestamp: '2h ago',
    duration: null
  },
  p4: {
    id: 'st-p4',
    type: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
    caption: 'Evening serenity at Golden Temple, Amritsar 🪔',
    timestamp: '3h ago',
    duration: null
  },
  p5: {
    id: 'st-p5',
    type: 'text',
    text: '“Marriage is not just joining two souls, but uniting two families with trust, respect, and mutual laughter.”',
    bgGradient: 'from-emerald-900 via-teal-900 to-emerald-950',
    caption: 'Auspicious thoughts on a Sunday morning ✨',
    timestamp: '5h ago',
    duration: null
  },
  p6: {
    id: 'st-p6',
    type: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=800',
    caption: 'National cardiology convention in AIIMS Delhi 🩺',
    timestamp: '6h ago',
    duration: null
  },
  p7: {
    id: 'st-p7',
    type: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&q=80&w=800',
    caption: 'Heritage walk across Rumi Darwaza in Lucknow 🏛️✨',
    timestamp: '7h ago',
    duration: null
  },
  p8: {
    id: 'st-p8',
    type: 'video',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-waves-coming-to-the-beach-5016-large.mp4',
    caption: 'Coastal sunset reflections at Somnath Temple 🙏🌊',
    timestamp: '8h ago',
    duration: 32
  },
  p9: {
    id: 'st-p9',
    type: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800',
    caption: 'Serene morning waves at Fort Kochi beach, Kerala 🌴⛵',
    timestamp: '10h ago',
    duration: null
  },
  p10: {
    id: 'st-p10',
    type: 'text',
    text: '“A joyful marriage begins when we accept each other’s heritage and build a lifetime of shared dreams.”',
    bgGradient: 'from-[#0B192C] via-[#152E52] to-[#1E3A8A]',
    caption: 'Reflections from Kolkata Heritage Walk 📚✨',
    timestamp: '12h ago',
    duration: null
  }
};

/**
 * Synchronously verify whether a valid authenticated user session is stored in localStorage.
 * Checks for explicit logout flag (i4u_logged_out).
 * Normalizes user ID and ensures persistent session integrity across app re-open and reloads.
 */
export const checkStoredUserSession = () => {
  try {
    if (typeof window === 'undefined') return null;
    if (localStorage.getItem('i4u_logged_out') === 'true') {
      return null;
    }
    const saved = localStorage.getItem('i4u_auth_user');
    if (!saved) return null;
    const user = JSON.parse(saved);
    if (!user) return null;

    // Normalize user identifier across all authentication providers (Register ID, Phone, Supabase, Google)
    const cleanPhone = (user.mobile || user.phone || '').replace(/\D/g, '');
    const resolvedId = user.id || user.uid || user.userId || 
      (cleanPhone ? `usr_${cleanPhone.slice(-10)}` : null) || 
      (user.registerId ? `usr_${user.registerId}` : null);

    if (!resolvedId) {
      return null;
    }
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
};

export default function App() {
  // Initialize viewMode from pathname (/app), URL search (?mode=app), hash (#app), or localStorage
  const getInitialViewMode = () => {
    try {
      // Check Capacitor native platform
      if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform && window.Capacitor.isNativePlatform()) {
        return 'app';
      }

      // Clean up any legacy admin routes or redirects
      const path = (window.location.pathname || '').toLowerCase().replace(/^\/+|\/+$/g, '');
      if (['admin', 'super-admin', 'superadmin', 'admin-console', 'admin-portal'].includes(path)) {
        window.location.href = '/super-admin.html';
        return 'website';
      }
      if (path === 'app' || path === 'mobile') {
        return 'app';
      }

      // Check search parameters (?mode=app | ?mode=website)
      const params = new URLSearchParams(window.location.search);
      const modeParam = (params.get('mode') || params.get('view') || '').toLowerCase();
      if (modeParam === 'admin' || params.has('admin')) {
        params.delete('mode');
        params.delete('admin');
        const newSearch = params.toString() ? `?${params.toString()}` : '';
        window.history.replaceState({}, '', `${window.location.pathname}${newSearch}`);
        return 'website';
      }
      if (modeParam === 'app' || params.has('app')) {
        return 'app';
      }
      if (modeParam === 'website') {
        return 'website';
      }

      // Check URL hash (#app | #website)
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash === 'admin') {
        window.history.replaceState({}, '', window.location.pathname);
        return 'website';
      }
      if (hash === 'app') {
        return 'app';
      }
      if (hash === 'website') {
        return 'website';
      }

      // Check localStorage
      const saved = localStorage.getItem('i4u_view_mode');
      if (saved === 'admin') {
        localStorage.removeItem('i4u_view_mode');
        return 'website';
      }
      if (saved === 'app' || saved === 'website') {
        return saved;
      }
    } catch (e) {}
    return 'website';
  };

  const [viewMode, setViewModeState] = useState(getInitialViewMode); // 'website' | 'app'

  const setViewMode = (mode) => {
    const targetMode = mode === 'app' ? 'app' : 'website';
    setViewModeState(targetMode);
    try {
      localStorage.setItem('i4u_view_mode', targetMode);
      const url = new URL(window.location.href);
      if (targetMode === 'app') {
        url.pathname = '/app';
      } else {
        url.pathname = '/';
      }
      url.searchParams.delete('mode');
      url.searchParams.delete('admin');
      window.history.pushState({}, '', url.toString());
    } catch (e) {}
  };

  const [deviceMode, setDeviceMode] = useState('fit'); // 'fit' | 'ios' | 'android' | 'wide'

  // Splash screen state: active on initial load
  const [showSplash, setShowSplash] = useState(true);

  // Initialize currentScreen based on existing user session:
  // If user is already authenticated, start on 'app' to prevent any momentary flicker
  const [currentScreen, setCurrentScreen] = useState(() => {
    const hasSession = Boolean(checkStoredUserSession());
    if (hasSession) return 'app';
    const initialMode = getInitialViewMode();
    return initialMode === 'app' ? 'login' : 'app';
  });

  // Smooth post-splash transition handler:
  // Silently check auth state and route to main dashboard or login accordingly
  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
    const authenticatedUser = checkStoredUserSession();
    if (authenticatedUser) {
      // If ALREADY logged in: Proceed directly to the main Home / Dashboard
      setCurrentUser(prev => prev || authenticatedUser);
      setCurrentScreen('app');
      setActiveTab('feed');
    } else {
      // If NOT logged in: Route to Login if in Mobile App mode; otherwise stay on website view
      const isMobileApp = getInitialViewMode() === 'app';
      if (isMobileApp) {
        setCurrentScreen('login');
      } else {
        setCurrentScreen('app');
      }
    }
  }, []);

  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'search' | 'interests' | 'chat' | 'account'
  const [interestsSegment, setInterestsSegment] = useState('sent'); // 'sent' | 'received' | 'shortlist'
  const [isAppModalOpen, setIsAppModalOpen] = useState(false); // 80% screen mobile app modal over website

  // Listen for browser back/forward or hash changes
  useEffect(() => {
    const handlePopState = () => {
      const mode = getInitialViewMode();
      setViewModeState(mode);
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Production Launch Mode Switch State
  const [isProduction, setIsProduction] = useState(getAppMode());

  // Listen for mode changes
  useEffect(() => {
    const handleModeChange = (e) => {
      const newMode = e.detail?.isProduction ?? getAppMode();
      setIsProduction(newMode);
    };
    window.addEventListener('i4u_mode_change', handleModeChange);
    return () => window.removeEventListener('i4u_mode_change', handleModeChange);
  }, []);

  // Application Data & State (Initialized with cached candidates or authentic INITIAL_PROFILES)
  const [profiles, setProfiles] = useState(() => {
    const sanitizeProfilePhotos = (p) => {
      if (!p) return p;
      const defaultMale = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800';
      const defaultFemale = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800';
      const fallback = String(p.gender).toLowerCase() === 'male' ? defaultMale : defaultFemale;
      const fixUrl = (url) => {
        if (!url || typeof url !== 'string' || !url.trim() || url === 'null') return fallback;
        if (url.includes('ejtkrilhntdbsiavugta.supabase.co') || url.includes('pheqzsfrwhjxspaaroea.supabase.co')) {
          return url.replace(/https:\/\/[a-z0-9]+\.supabase\.co/g, 'https://kzvdzospvgzlfkkptadl.supabase.co');
        }
        return url;
      };
      const fixedPhoto = fixUrl(p.photo || p.photo_url);
      return {
        ...p,
        photo: fixedPhoto,
        photo_url: fixedPhoto,
        singlePhotos: Array.isArray(p.singlePhotos) && p.singlePhotos.length > 0 
          ? p.singlePhotos.map(fixUrl) 
          : [fixedPhoto]
      };
    };

    try {
      const cached = localStorage.getItem('i4u_cached_profiles');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(p => !isDemoProfile(p)).map(sanitizeProfilePhotos);
          if (valid.length > 0) return valid;
        }
      }
    } catch (e) {}
    return Array.isArray(INITIAL_PROFILES) && INITIAL_PROFILES.length > 0 
      ? INITIAL_PROFILES.filter(p => !isDemoProfile(p)).map(sanitizeProfilePhotos) 
      : [];
  });

  // Synchronize candidate profiles from Supabase Cloud & Python Admin Backend
  const lastProfilesSyncRef = useRef(0);
  const syncLiveProfiles = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastProfilesSyncRef.current < 60000) {
      return; // Cooldown: skip redundant fetch within 60 seconds
    }
    lastProfilesSyncRef.current = now;
    try {
      const liveList = await fetchLiveProfiles();
      if (Array.isArray(liveList) && liveList.length > 0) {
        setProfiles(liveList);
        try {
          localStorage.setItem('i4u_cached_profiles', JSON.stringify(liveList));
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[Sync Profiles Error]:', e);
    }
  }, []);

  // Ensure any legacy demo profiles in Supabase are completely purged
  useEffect(() => {
    purgeDemoProfilesFromSupabase().catch(() => {});
  }, []);

  useEffect(() => {
    syncLiveProfiles(true);

    // Auto-refresh when user/admin switches window or tab gains focus (throttled)
    const handleFocus = () => syncLiveProfiles(false);
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (!document.hidden) syncLiveProfiles(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Periodic background sync every 120s to conserve bandwidth and prevent egress spikes
    const interval = setInterval(() => syncLiveProfiles(true), 120000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [syncLiveProfiles, isProduction]);

  // Proactively sync existing logged-in profile to Supabase cloud if needed (without generating duplicate rows)
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem('i4u_auth_user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        const nameLower = String(savedUser?.name || '').toLowerCase().trim();
        if (
          savedUser && 
          savedUser.id &&
          !savedUser.id.startsWith('demo_') &&
          savedUser.name && 
          !isDemoProfile(savedUser) && 
          !savedUser.isDraft &&
          !nameLower.includes('verified member') &&
          !nameLower.includes('verified profile') &&
          (savedUser.mobile || savedUser.phone)
        ) {
          syncProfileToSupabase(savedUser).catch(() => {});
        }
      }
    } catch (e) {}
  }, []);

  // Synchronize dynamic membership plans & promotional offers from Python Admin Database
  const [membershipPlans, setMembershipPlans] = useState(MEMBERSHIP_PLANS);
  const [activeOffers, setActiveOffers] = useState([]);

  const lastPlansSyncRef = useRef(0);
  const syncPlansAndOffers = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastPlansSyncRef.current < 60000) {
      return; // Cooldown: skip redundant fetch within 60 seconds
    }
    lastPlansSyncRef.current = now;
    try {
      const [livePlans, liveOffers] = await Promise.all([
        fetchLivePlans(),
        fetchLiveOffers()
      ]);
      if (Array.isArray(livePlans) && livePlans.length > 0) {
        const formatted = livePlans.map(formatBackendPlan);
        setMembershipPlans(prev => {
          if (JSON.stringify(prev) === JSON.stringify(formatted)) return prev;
          return formatted;
        });
      }
      if (Array.isArray(liveOffers)) {
        const activeOnly = liveOffers.filter(o => o && (o.is_active === 1 || o.is_active === true || o.is_active === '1'));
        setActiveOffers(prev => {
          if (JSON.stringify(prev) === JSON.stringify(activeOnly)) return prev;
          return activeOnly;
        });
      }

      // Synchronize logged-in user profile status & latest profile edits from Supabase
      if (localStorage.getItem('i4u_logged_out') === 'true') {
        return; // User has logged out: strictly do NOT auto-login or synchronize
      }

      let targetUserId = null;
      try {
        const s = localStorage.getItem('i4u_auth_user');
        if (s) {
          const parsed = JSON.parse(s);
          if (
            parsed &&
            parsed.id &&
            parsed.id !== 'demo-priya' &&
            parsed.id !== 'demo-rohan' &&
            parsed.id !== 'demo_user' &&
            !parsed.isDemo
          ) {
            targetUserId = parsed.id || parsed.registerId || parsed.register_id;
          }
        }
      } catch (e) {}

      // ONLY synchronize if user has an active session (never auto-login logged out users)
      if (!targetUserId) {
        return;
      }

      if (targetUserId) {
        const liveUser = await fetchLiveUserProfile(targetUserId);
        if (liveUser) {
          const isSentBack = Boolean(
            liveUser.aadhaar_status === 'sent_back' ||
            liveUser.aadhaarStatus === 'sent_back' ||
            liveUser.aadhaar_rejection_reason ||
            liveUser.aadhaarRejectionReason
          );
          const isAadhaarApproved = !isSentBack && Boolean(
            liveUser.aadhaar_verified === 1 ||
            liveUser.aadhaar_verified === true ||
            liveUser.aadhaarVerified === true ||
            liveUser.aadhaar_status === 'approved' ||
            liveUser.aadhaarStatus === 'approved'
          );

          setCurrentUser(prev => {
            const base = prev || {};
            const updated = {
              ...base,
              ...liveUser,
              membership: base.membership || liveUser.membership || 'free',
              membershipPlan: base.membershipPlan || liveUser.membershipPlan || 'Free Member',
              contactCredits: base.contactCredits !== undefined ? base.contactCredits : (liveUser.contactCredits || 0),
              planExpiry: base.planExpiry || liveUser.planExpiry || null,
              paymentHistory: (base.paymentHistory && base.paymentHistory.length > 0) ? base.paymentHistory : (liveUser.paymentHistory || []),
              // Retain active client preferences and user activity so background sync never wipes interests or shortlists
              interestsSent: (Array.isArray(base.interestsSent) && base.interestsSent.length > 0)
                ? base.interestsSent
                : (Array.isArray(liveUser.interestsSent) && liveUser.interestsSent.length > 0 ? liveUser.interestsSent : (base.interestsSent || [])),
              shortlisted: (Array.isArray(base.shortlisted) && base.shortlisted.length > 0)
                ? base.shortlisted
                : (Array.isArray(liveUser.shortlisted) && liveUser.shortlisted.length > 0 ? liveUser.shortlisted : (base.shortlisted || [])),
              // Retain active client preferences if present
              aadhaar_status: isSentBack ? 'sent_back' : (isAadhaarApproved ? 'approved' : 'pending'),
              aadhaarStatus: isSentBack ? 'sent_back' : (isAadhaarApproved ? 'approved' : 'pending'),
              aadhaar_rejection_reason: isSentBack ? (liveUser.aadhaar_rejection_reason || liveUser.aadhaarRejectionReason) : null,
              aadhaarRejectionReason: isSentBack ? (liveUser.aadhaar_rejection_reason || liveUser.aadhaarRejectionReason) : null,
              aadhaarVerified: isAadhaarApproved,
              aadhaar_verified: isAadhaarApproved ? 1 : 0,
              governmentIdVerified: isAadhaarApproved,
              verified: isAadhaarApproved ? true : (isSentBack ? false : base.verified),
              aadhaar_front_image: liveUser.aadhaar_front_image || base.aadhaar_front_image || null,
              aadhaar_back_image: liveUser.aadhaar_back_image || base.aadhaar_back_image || null
            };
            if (JSON.stringify(base) === JSON.stringify(updated)) return prev;
            try {
              localStorage.setItem('i4u_auth_user', JSON.stringify(updated));
              if (updated.id) localStorage.setItem('i4u_current_user_id', updated.id);
              if (updated.registerId) localStorage.setItem('i4u_register_id', updated.registerId);
              if (updated.aadhaarVerified) {
                localStorage.setItem('i4u_aadhaar_verified', 'true');
              } else {
                localStorage.removeItem('i4u_aadhaar_verified');
              }
            } catch (e) {}

            // Synchronize status image if available from database and user hasn't explicitly deleted status
            if (liveUser.cover_photo && localStorage.getItem('i4u_my_status_deleted') !== 'true') {
              setMyStatus(curr => {
                if (curr?.mediaUrl) return curr;
                const hydrated = {
                  id: 'st-live-' + (liveUser.id || 'my-status'),
                  type: 'photo',
                  mediaUrl: liveUser.cover_photo,
                  caption: liveUser.about || `${liveUser.name || 'Candidate'}'s Status`,
                  timestamp: 'Active',
                  viewsCount: 0,
                  views: []
                };
                try {
                  localStorage.setItem('i4u_my_status', JSON.stringify(hydrated));
                } catch (e) {}
                return hydrated;
              });
            }

            return updated;
          });
        }
      }
    } catch (e) {
      console.warn('[Sync] Failed to fetch live plans or offers:', e);
    }
  }, []);

  useEffect(() => {
    syncPlansAndOffers(true);

    // Auto-refresh when user/admin switches tabs or window gains focus (throttled)
    const handleFocus = () => {
      syncPlansAndOffers(false);
    };
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (!document.hidden) syncPlansAndOffers(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Background sync every 120s to reflect admin updates without network thrashing
    const interval = setInterval(() => syncPlansAndOffers(true), 120000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [syncPlansAndOffers, isProduction]);

  const [interestsSent, setInterestsSent] = useState(() => {
    try {
      const savedUserStr = localStorage.getItem('i4u_auth_user');
      let userId = null;
      let userObj = null;
      if (savedUserStr) {
        userObj = JSON.parse(savedUserStr);
        if (
          userObj?.id === 'demo-priya' || 
          userObj?.id === 'demo-rohan' || 
          userObj?.id === 'demo_user' || 
          userObj?.name === 'Priya Sharma' || 
          userObj?.mobile === '9876543210' || 
          userObj?.isDemo
        ) {
          return [];
        }
        userId = userObj?.id || userObj?.registerId || userObj?.register_id;
      }
      
      // 1. Check user-scoped interests first
      if (userId) {
        const userSpecific = localStorage.getItem(`i4u_interests_sent_${userId}`);
        if (userSpecific) {
          const parsed = JSON.parse(userSpecific);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
      
      // 2. Check general interests sent
      const savedInterests = localStorage.getItem('i4u_interests_sent');
      if (savedInterests) {
        const parsed = JSON.parse(savedInterests);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      
      // 3. Fallback to auth_user object
      if (userObj && Array.isArray(userObj.interestsSent) && userObj.interestsSent.length > 0) {
        return userObj.interestsSent;
      }
    } catch (e) {}
    return [];
  });
  const [shortlisted, setShortlisted] = useState(() => {
    try {
      const savedUserStr = localStorage.getItem('i4u_auth_user');
      let userId = null;
      let userObj = null;
      if (savedUserStr) {
        userObj = JSON.parse(savedUserStr);
        if (
          userObj?.id === 'demo-priya' || 
          userObj?.id === 'demo-rohan' || 
          userObj?.id === 'demo_user' || 
          userObj?.name === 'Priya Sharma' || 
          userObj?.mobile === '9876543210' || 
          userObj?.isDemo
        ) {
          return [];
        }
        userId = userObj?.id || userObj?.registerId || userObj?.register_id;
      }
      
      // 1. Check user-scoped shortlisted first
      if (userId) {
        const userSpecific = localStorage.getItem(`i4u_shortlisted_${userId}`);
        if (userSpecific) {
          const parsed = JSON.parse(userSpecific);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
      
      // 2. Check general shortlisted
      const savedShortlist = localStorage.getItem('i4u_shortlisted');
      if (savedShortlist) {
        const parsed = JSON.parse(savedShortlist);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      
      // 3. Fallback to auth_user object
      if (userObj && Array.isArray(userObj.shortlisted) && userObj.shortlisted.length > 0) {
        return userObj.shortlisted;
      }
    } catch (e) {}
    return [];
  });
  const [declinedReceivedIds, setDeclinedReceivedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('i4u_declined_received_ids');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [conversations, setConversations] = useState(() => {
    try {
      const savedUser = localStorage.getItem('i4u_auth_user');
      if (!savedUser) return [];
      const u = JSON.parse(savedUser);
      if (u.id === 'demo-priya' || u.id === 'demo-rohan' || u.id === 'demo_user' || u.name === 'Priya Sharma' || u.mobile === '9876543210' || u.isDemo) return [];
      
      const userId = u.id || u.registerId || u.register_id;
      if (userId) {
        const userSpecific = localStorage.getItem(`i4u_conversations_${userId}`);
        if (userSpecific) {
          const parsed = JSON.parse(userSpecific);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  });
  const [activeChatProfileId, setActiveChatProfileId] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(checkStoredUserSession);

  // Synchronize conversations state strictly scoped to the active user
  useEffect(() => {
    if (!currentUser?.id) {
      setConversations([]);
      return;
    }
    const uid = currentUser.id;
    try {
      const userSpecific = localStorage.getItem(`i4u_conversations_${uid}`);
      if (userSpecific) {
        const parsed = JSON.parse(userSpecific);
        setConversations(Array.isArray(parsed) ? parsed : []);
      } else {
        setConversations([]);
      }
    } catch (e) {
      setConversations([]);
    }
  }, [currentUser?.id]);

  // Root-level auth state listener: Synchronizes persistent authentication sessions & tokens across browser sessions and tabs
  useEffect(() => {
    const unsubscribe = initSupabaseAuthListener((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (localStorage.getItem('i4u_logged_out') === 'true') {
          setCurrentUser(null);
        }
      } else if (session?.user && !currentUser) {
        const stored = checkStoredUserSession();
        if (stored) {
          setCurrentUser(stored);
        }
      }
    });

    // Cross-tab auto-login and session persistence synchronization
    const handleStorageChange = (e) => {
      if (!e) return;
      if (e.key === 'i4u_auth_user' || e.key === 'i4u_logged_out' || e.key === 'i4u_current_user_id') {
        const stored = checkStoredUserSession();
        if (stored) {
          setCurrentUser(stored);
        } else if (localStorage.getItem('i4u_logged_out') === 'true') {
          setCurrentUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubscribe?.();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.id) {
      window.__currentUserId = currentUser.id;
    } else {
      window.__currentUserId = null;
    }
  }, [currentUser?.id]);

  // Persist interestsSent to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('i4u_interests_sent', JSON.stringify(interestsSent));
      const uid = currentUser?.id || localStorage.getItem('i4u_current_user_id');
      if (uid) {
        localStorage.setItem(`i4u_interests_sent_${uid}`, JSON.stringify(interestsSent));
      }
      const savedUser = localStorage.getItem('i4u_auth_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (JSON.stringify(parsed.interestsSent) !== JSON.stringify(interestsSent)) {
          parsed.interestsSent = interestsSent;
          localStorage.setItem('i4u_auth_user', JSON.stringify(parsed));
        }
      }
    } catch (e) {}
  }, [interestsSent, currentUser?.id]);

  // Persist shortlisted to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('i4u_shortlisted', JSON.stringify(shortlisted));
      const uid = currentUser?.id || localStorage.getItem('i4u_current_user_id');
      if (uid) {
        localStorage.setItem(`i4u_shortlisted_${uid}`, JSON.stringify(shortlisted));
      }
      const savedUser = localStorage.getItem('i4u_auth_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (JSON.stringify(parsed.shortlisted) !== JSON.stringify(shortlisted)) {
          parsed.shortlisted = shortlisted;
          localStorage.setItem('i4u_auth_user', JSON.stringify(parsed));
        }
      }
    } catch (e) {}
  }, [shortlisted, currentUser?.id]);

  // Persist conversations to localStorage strictly scoped to user (never write to shared key)
  useEffect(() => {
    try {
      const uid = currentUser?.id || localStorage.getItem('i4u_current_user_id');
      if (uid && Array.isArray(conversations)) {
        localStorage.setItem(`i4u_conversations_${uid}`, JSON.stringify(conversations));
      }
      // Purge legacy un-scoped key
      localStorage.removeItem('i4u_conversations');
    } catch (e) {}
  }, [conversations, currentUser?.id]);

  // Persist declinedReceivedIds to storage
  useEffect(() => {
    try {
      localStorage.setItem('i4u_declined_received_ids', JSON.stringify(declinedReceivedIds));
    } catch (e) {}
  }, [declinedReceivedIds]);

  // Helper to reliably check if a candidate profile has received user interest
  const isProfileInterested = useCallback((profileOrId) => {
    if (!profileOrId) return false;
    const p = typeof profileOrId === 'object' 
      ? profileOrId 
      : profiles.find(item => item.id === profileOrId || item.registerId === profileOrId || item.register_id === profileOrId);
    const targetId = typeof profileOrId === 'string' ? profileOrId : (p?.id || profileOrId?.id);
    const regId = p?.registerId || p?.register_id || profileOrId?.registerId || profileOrId?.register_id;
    const candidateId = p?.id || profileOrId?.id;
    return Boolean(
      (targetId && interestsSent.includes(targetId)) ||
      (candidateId && interestsSent.includes(candidateId)) ||
      (regId && interestsSent.includes(regId))
    );
  }, [interestsSent, profiles]);

  // Helper to reliably check if a candidate profile has been shortlisted
  const isProfileShortlisted = useCallback((profileOrId) => {
    if (!profileOrId) return false;
    const p = typeof profileOrId === 'object' 
      ? profileOrId 
      : profiles.find(item => item.id === profileOrId || item.registerId === profileOrId || item.register_id === profileOrId);
    const targetId = typeof profileOrId === 'string' ? profileOrId : (p?.id || profileOrId?.id);
    const regId = p?.registerId || p?.register_id || profileOrId?.registerId || profileOrId?.register_id;
    const candidateId = p?.id || profileOrId?.id;
    return Boolean(
      (targetId && shortlisted.includes(targetId)) ||
      (candidateId && shortlisted.includes(candidateId)) ||
      (regId && shortlisted.includes(regId))
    );
  }, [shortlisted, profiles]);
  const [toastMessage, setToastMessage] = useState('');
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [registeredVerifiedPhone, setRegisteredVerifiedPhone] = useState(null);
  const [aadhaarOrigin, setAadhaarOrigin] = useState('app');
  const [isDirectChatOpen, setIsDirectChatOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  // WhatsApp Status Management State (Hydrates from localStorage so user changes persist)
  const [myStatus, setMyStatus] = useState(() => {
    try {
      if (localStorage.getItem('i4u_my_status_deleted') === 'true') {
        return null;
      }
      const saved = localStorage.getItem('i4u_my_status');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}

    // Only show default sample status for fresh visitor if not deleted
    if (getAppMode()) return null;
    return null;
  });
  const [activeStoryViewer, setActiveStoryViewer] = useState(null); // { profile, status, isOwnStatus }
  const [isStatusEditorOpen, setIsStatusEditorOpen] = useState(false);
  const [statusMenuData, setStatusMenuData] = useState(null); // { profile, isOwnStatus, hasStatus }
  const [hiddenStatusIds, setHiddenStatusIds] = useState(new Set());
  const [deletedStatusIds, setDeletedStatusIds] = useState(new Set());

  // Mobile Filter Sheet State
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [selectedReligion, setSelectedReligion] = useState('All Religions');
  const [selectedCaste, setSelectedCaste] = useState('All Castes & Communities');
  const [minAge, setMinAge] = useState(21);
  const [maxAge, setMaxAge] = useState(35);
  const [minHeight, setMinHeight] = useState('Any Height (No Preference)');
  const [selectedMaritalStatus, setSelectedMaritalStatus] = useState('All');
  const [selectedEducation, setSelectedEducation] = useState('All Educations');
  const [selectedProfession, setSelectedProfession] = useState('All Professions');
  const [minIncome, setMinIncome] = useState('All Incomes');
  const [selectedDiet, setSelectedDiet] = useState('All');
  const [selectedManglik, setSelectedManglik] = useState('All');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [photoOnly, setPhotoOnly] = useState(false);
  const [selectedWorkMode, setSelectedWorkMode] = useState('All');
  const [selectedFamilyType, setSelectedFamilyType] = useState('All');
  const [selectedFamilyStatus, setSelectedFamilyStatus] = useState('All');
  const [selectedDrinking, setSelectedDrinking] = useState('All');
  const [selectedSmoking, setSelectedSmoking] = useState('All');
  const [membershipFilter, setMembershipFilter] = useState('All'); // 'All' | 'Paid' | 'Not Paid'
  const [phoneOnly, setPhoneOnly] = useState(false);
  const [mobileSearchNumber, setMobileSearchNumber] = useState('');
  const [guestLookingFor, setGuestLookingFor] = useState('All'); // 'All' | 'Female' | 'Male'
  
  // Mobile Photo Management Sheet State (strictly confined to mobile device frame)
  const [isPhotoManagerOpen, setIsPhotoManagerOpen] = useState(false);
  const [photoManagerTab, setPhotoManagerTab] = useState('single');

  // Mobile Notifications State
  const [notifications, setNotifications] = useState(() => {
    try {
      const savedUser = localStorage.getItem('i4u_auth_user');
      if (!savedUser) return [];
      const u = JSON.parse(savedUser);
      if (u.id === 'demo-priya' || u.id === 'demo-rohan' || u.id === 'demo_user' || u.name === 'Priya Sharma' || u.mobile === '9876543210' || u.isDemo) return [];
      const saved = localStorage.getItem('i4u_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasOldDummy = parsed.some(n => n.profileId === 'p1' || n.profileId === 'p2' || (n.title && (n.title.includes('Ananya') || n.title.includes('Rohan Jayasimha'))));
          if (!hasOldDummy) {
            return parsed.filter(n => n && typeof n === 'object' && n.type);
          }
        }
      }
      return getNotificationsForUser(u, INITIAL_PROFILES);
    } catch (e) {}
    return [];
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Synchronize notifications, received interests, and chat conversations with backend & profiles
  useEffect(() => {
    if (!currentUser) return;
    const userIds = [currentUser.id, currentUser.register_id, currentUser.registerId].filter(Boolean).map(String);
    if (!userIds.length) return;

    let isMounted = true;

    // 1. Fetch conversations from Supabase messages table strictly for current user
    liveChatService.fetchConversationsForUser(currentUser, profiles)
      .then((loadedConvs) => {
        if (isMounted && Array.isArray(loadedConvs)) {
          setConversations(loadedConvs);
        }
      })
      .catch((e) => console.warn('[App] Error loading conversations:', e));

    // 2. Fetch received interests from backend
    interestService.getReceivedInterests(currentUser, profiles)
      .then((records) => {
        if (!isMounted) return;
        if (Array.isArray(records) && records.length > 0) {
          setNotifications((prev) => {
            const list = Array.isArray(prev) ? [...prev] : [];
            records.forEach((rec) => {
              const notifId = `notif_int_${rec.id}`;
              const exists = list.some(
                (n) => n.id === notifId || n.id === rec.id || (n.type === 'interest' && String(n.profileId) === String(rec.senderId))
              );
              if (!exists) {
                list.unshift({
                  id: notifId,
                  profileId: rec.senderId,
                  senderId: rec.senderId,
                  sender: rec.sender || rec.interest_from,
                  interest_from: rec.sender || rec.interest_from,
                  type: 'interest',
                  title: `💖 Interest from ${rec.sender.name}`,
                  message: rec.message || `${rec.sender.name} expressed interest in connecting with you.`,
                  time: new Date(rec.created_at || rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isRead: false,
                  status: rec.status || 'pending',
                  timestamp: new Date(rec.created_at || rec.createdAt).getTime()
                });
              }
            });
            return list;
          });
        }
      })
      .catch((e) => console.warn('[App] Error loading received interests:', e));

    // 3. Fetch notifications from Supabase notifications table
    if (isSupabaseConfigured() && supabase) {
      supabase
        .from('notifications')
        .select('*')
        .or(`recipient_id.in.(${userIds.map((id) => `"${id}"`).join(',')}),recipient_register_id.in.(${userIds.map((id) => `"${id}"`).join(',')})`)
        .order('created_at', { ascending: false })
        .limit(30)
        .then(({ data, error }) => {
          if (!error && Array.isArray(data) && isMounted && data.length > 0) {
            setNotifications((prev) => {
              const list = Array.isArray(prev) ? [...prev] : [];
              data.forEach((row) => {
                const notifId = `db_${row.id}`;
                const exists = list.some((n) => n.id === notifId || n.id === row.id);
                if (!exists) {
                  list.unshift({
                    id: notifId,
                    profileId: (row.metadata?.senderId || row.metadata?.sender_id || row.metadata?.sender?.id || row.metadata?.interest_from?.id || row.sender_id || row.senderId || null),
                    senderId: (row.metadata?.senderId || row.metadata?.sender_id || row.metadata?.sender?.id || row.metadata?.interest_from?.id || row.sender_id || row.senderId || null),
                    sender: row.metadata?.sender || row.metadata?.interest_from || (row.metadata?.senderName ? {
                      id: row.metadata?.senderId || row.metadata?.sender_id || null,
                      name: row.metadata.senderName,
                      photo: row.metadata.senderPhoto || null
                    } : null),
                    interest_from: row.metadata?.sender || row.metadata?.interest_from || (row.metadata?.senderName ? {
                      id: row.metadata?.senderId || row.metadata?.sender_id || null,
                      name: row.metadata.senderName,
                      photo: row.metadata.senderPhoto || null
                    } : null),
                    type: row.type === 'interest_received' ? 'interest' : (row.type === 'chat_message' ? 'message' : 'match'),
                    title: row.title,
                    message: row.message,
                    time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isRead: row.is_read || false,
                    status: 'pending',
                    timestamp: new Date(row.created_at).getTime()
                  });
                }
              });
              return list;
            });
          }
        })
        .catch(() => {});
    }

    // 4. Real-time subscription to incoming interests
    const unsubInterest = interestService.subscribeToInterestInbox(currentUser, (payload) => {
      console.log('[App] Real-time interest incoming in App.jsx:', payload);
      const senderName = payload.senderName || 'A Member';
      showToast(`💖 New Interest from ${senderName}!`);

      setNotifications((prev) => [
        {
          id: `live_int_${Date.now()}`,
          profileId: payload.senderId,
          senderId: payload.senderId,
          sender: {
            id: payload.senderId,
            name: senderName,
            photo: payload.senderPhoto || null,
            message: payload.message || ''
          },
          interest_from: {
            id: payload.senderId,
            name: senderName,
            photo: payload.senderPhoto || null,
            message: payload.message || ''
          },
          type: 'interest',
          title: `💖 Interest from ${senderName}`,
          message: payload.message || `${senderName} expressed interest in connecting with you.`,
          time: 'Just now',
          isRead: false,
          status: 'pending',
          timestamp: Date.now()
        },
        ...(Array.isArray(prev) ? prev : [])
      ]);
    });

    return () => {
      isMounted = false;
      unsubInterest();
    };
  }, [profiles, currentUser]);

  // Persist notifications to localStorage
  useEffect(() => {
    if (currentUser && Array.isArray(notifications)) {
      try {
        localStorage.setItem('i4u_notifications', JSON.stringify(notifications));
      } catch (e) {}
    }
  }, [notifications, currentUser]);

  // Membership Plans, Offers & Payment Gateway State
  const [isOffersSheetOpen, setIsOffersSheetOpen] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [paymentDuration, setPaymentDuration] = useState(6);
  const [paymentCoupon, setPaymentCoupon] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);

  // Matrimonial Interest Composer & Calling State (WebRTC P2P + Supabase Realtime)
  const [interestModalCandidate, setInterestModalCandidate] = useState(null);
  const [activeAudioCallCandidate, setActiveAudioCallCandidate] = useState(null);
  const [activeVideoCallCandidate, setActiveVideoCallCandidate] = useState(null);
  const [incomingCallSession, setIncomingCallSession] = useState(null);
  const [activeCallSession, setActiveCallSession] = useState(null);
  const [isCallCaller, setIsCallCaller] = useState(true);
  const [premiumPromptFeature, setPremiumPromptFeature] = useState(null); // 'chat' | 'call' | 'video'

  // Subscribe to real-time WebRTC incoming calls via Supabase Realtime Broadcast & Cross-tab sync
  useEffect(() => {
    if (!currentUser) return;
    webrtcCallService.subscribeToUserInbox(currentUser, (callData) => {
      console.log('[App] Realtime incoming call received:', callData);
      setIncomingCallSession(callData);
    });
    return () => {
      webrtcCallService.unsubscribeUserInbox();
    };
  }, [currentUser?.id, currentUser?.register_id, currentUser?.registerId]);

  // Maintain latest refs for tab and chat selection so realtime subscription does not churn
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const activeChatProfileIdRef = useRef(activeChatProfileId);
  activeChatProfileIdRef.current = activeChatProfileId;

  // Subscribe to real-time Live Chat messages via Supabase Realtime Broadcast + Cross-tab sync
  useEffect(() => {
    if (!currentUser) return;
    const myIds = [currentUser.id, currentUser.register_id, currentUser.registerId].filter(Boolean).map(String);
    if (!myIds.length) return;

    liveChatService.subscribeToUserInbox(currentUser);

    const unsubscribe = liveChatService.onMessage((incoming) => {
      if (!incoming) return;
      const senderId = String(incoming.sender_id || incoming.senderId || '');
      const receiverId = String(incoming.receiver_id || incoming.recipientId || '');
      const convId = incoming.conversation_id || incoming.conversationId || '';
      const text = incoming.text;
      const senderName = incoming.senderName || 'Member';

      if (!senderId || !text) return;

      // Do not process messages sent by ourselves or not intended for us
      if (myIds.includes(senderId)) return;
      if (receiverId && !myIds.includes(receiverId)) return;

      const incomingMsg = {
        id: incoming.id || incoming.tempId || ('m-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)),
        tempId: incoming.tempId || incoming.id,
        conversation_id: convId,
        sender_id: senderId,
        receiver_id: receiverId,
        sender: 'them',
        text,
        time: incoming.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
        timestamp: incoming.timestamp || new Date().toISOString(),
        created_at: new Date(incoming.timestamp || incoming.created_at || Date.now()).toISOString()
      };

      setConversations(prev => {
        const senderIdStr = senderId;
        const exists = prev.find(c => String(c.profileId) === senderIdStr);
        const isCurrentlyInThisChat = activeTabRef.current === 'chat' && String(activeChatProfileIdRef.current) === senderIdStr;

        if (exists) {
          return prev.map(c => {
            if (String(c.profileId) === senderIdStr) {
              const currentMsgs = c.messages || [];
              const alreadyExists = currentMsgs.some(m =>
                (incomingMsg.id && (m.id === incomingMsg.id || m.tempId === incomingMsg.id)) ||
                (incomingMsg.tempId && (m.tempId === incomingMsg.tempId || m.id === incomingMsg.tempId)) ||
                (m.text === text && String(m.sender_id) === senderId && Math.abs(new Date(m.created_at || m.time || 0).getTime() - new Date(incomingMsg.created_at).getTime()) < 3000)
              );
              if (alreadyExists) {
                return isCurrentlyInThisChat && c.unreadCount > 0
                  ? { ...c, unreadCount: 0 }
                  : c;
              }

              return {
                ...c,
                unreadCount: isCurrentlyInThisChat ? 0 : (c.unreadCount || 0) + 1,
                messages: deduplicateMessageList([...currentMsgs, incomingMsg])
              };
            }
            return c;
          });
        } else {
          return [
            ...prev,
            {
              profileId: senderIdStr,
              unreadCount: isCurrentlyInThisChat ? 0 : 1,
              messages: [incomingMsg],
              autoReplies: []
            }
          ];
        }
      });

      // Show toast notification if not currently in this chat
      const isCurrentlyInThisChat = activeTabRef.current === 'chat' && String(activeChatProfileIdRef.current) === senderId;
      if (!isCurrentlyInThisChat) {
        showToast(`💬 ${senderName}: ${text.length > 40 ? text.slice(0, 40) + '...' : text}`);
      }
    });

    return () => {
      unsubscribe();
      liveChatService.unsubscribeUserInbox();
    };
  }, [currentUser?.id, currentUser?.register_id, currentUser?.registerId]);

  const unreadNotificationsCount = currentUser ? (notifications || []).filter(n => n && !n.isRead).length : 0;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // Toggle between Production Mode (Store Ready) and Demo Mode (Test Data)
  const handleToggleProductionMode = () => {
    const nextMode = !isProduction;
    setAppMode(nextMode);
    setIsProduction(nextMode);
    if (nextMode) {
      // Switched TO Production Mode
      try {
        const saved = localStorage.getItem('i4u_auth_user');
        setCurrentUser(saved ? JSON.parse(saved) : null);
      } catch (e) {
        setCurrentUser(null);
      }
      setConversations([]);
      setNotifications([]);
      setInterestsSent([]);
      setShortlisted([]);
      setMyStatus(null);
      showToast('🚀 Switched to Live Production Mode');
    } else {
      // Switched TO Demo Mode
      const isAadhaarDone = localStorage.getItem('i4u_aadhaar_verified') === 'true';
      setCurrentUser(isAadhaarDone ? { ...DEMO_USER, aadhaarVerified: true, verified: true } : DEMO_USER);
      setConversations(INITIAL_CONVERSATIONS);
      setNotifications(INITIAL_NOTIFICATIONS);
      setInterestsSent(DEMO_USER.interestsSent || []);
      setProfiles([]);
      setMyStatus({
        id: 'my-status-init',
        type: 'photo',
        mediaUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
        caption: 'Traditional family celebration at ancestral home in Pune 🏛️✨',
        timestamp: 'Just now',
        duration: null,
        viewsCount: 18,
        isHidden: false
      });
      showToast('🧪 Switched to Demo Mode (Simulated Data & Matches)');
    }
  };

  // Explicit Logout Handler
  const handleLogout = () => {
    const uid = currentUser?.id || localStorage.getItem('i4u_current_user_id');
    logoutUser();
    signOutGoogleAuth().catch(() => {});
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    try {
      localStorage.removeItem('i4u_auth_token');
      localStorage.removeItem('i4u_refresh_token');
      localStorage.removeItem('i4u_interests_sent');
      localStorage.removeItem('i4u_shortlisted');
      localStorage.removeItem('i4u_declined_received_ids');
      if (uid) {
        localStorage.removeItem(`i4u_interests_sent_${uid}`);
        localStorage.removeItem(`i4u_shortlisted_${uid}`);
        localStorage.removeItem(`i4u_conversations_${uid}`);
      }
    } catch (e) {}
    setCurrentUser(null);
    setSelectedProfile(null);
    setConversations([]);
    setNotifications([]);
    setInterestsSent([]);
    setShortlisted([]);
    setDeclinedReceivedIds([]);
    setActiveTab('feed');
    setCurrentScreen('login');
    showToast('Logged out successfully');
  };

  const handleOpenOffers = () => {
    setIsOffersSheetOpen(true);
  };

  // Theme & Appearance Settings Modal State
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false);

  const handleOpenThemeSettings = () => {
    setIsThemeSettingsOpen(true);
  };

  const handleSelectPlanForPayment = (plan, durationMonths = 6, coupon = '') => {
    if (!currentUser) {
      setIsOffersSheetOpen(false);
      setIsPaymentModalOpen(false);
      setCurrentScreen('login');
      return;
    }
    setSelectedPlanForPayment(plan);
    setPaymentDuration(durationMonths);
    setPaymentCoupon(coupon);
    setIsOffersSheetOpen(false);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (plan, invoice) => {
    // Synchronize payment with Python Admin Ledger (admin.db)
    recordLivePayment({
      user_id: currentUser?.id || 'demo_user',
      user_name: currentUser?.name || 'Candidate',
      plan_name: plan.name,
      amount: invoice.totalAmount,
      payment_method: invoice.paymentMethod || 'UPI',
      transaction_id: invoice.transactionId,
      invoice_no: invoice.invoiceNumber,
      notes: `Mobile App upgrade: ${plan.name} (${paymentDuration || 6} Months)`
    });

    const addCredits = plan.contactCredits !== undefined ? plan.contactCredits : 30;
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + (paymentDuration || 6));
    const formattedExpiry = expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    setCurrentUser(prev => {
      const prevActiveCredits = (prev?.membership && prev?.membership !== 'free') ? (prev.contactCredits || 0) : 0;
      const updated = {
        ...prev,
        membership: plan.id,
        membershipPlan: `${plan.name} Member`,
        contactCredits: plan.id === 'vip' ? 999 : (prevActiveCredits + addCredits),
        planExpiry: formattedExpiry,
        paymentHistory: [invoice, ...(prev?.paymentHistory || [])]
      };
      try {
        localStorage.setItem('i4u_auth_user', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    const notifId = 'notif-pay-' + Date.now();
    setNotifications(prev => [
      {
        id: notifId,
        type: 'payment_success',
        profileId: null,
        title: `🎉 Payment Confirmed! ${plan.name} Active`,
        message: `Your payment of ₹${invoice.totalAmount} was authorized successfully. ${plan.contactCredits === 999 ? 'Unlimited' : plan.contactCredits} contact unlocks credited!`,
        quote: `GST Tax Invoice #${invoice.invoiceNumber} generated. Full invoice available in Profile.`,
        time: 'Just now',
        isRead: false,
        status: 'completed',
        badge: plan.name
      },
      ...prev
    ]);

    showToast(`🎉 Payment Confirmed! Upgraded to ${plan.name}`);
  };

  const handleViewInvoice = (inv) => {
    setActiveInvoice(inv);
  };

  const handleUnlockContact = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!currentUser) {
      showToast('🔒 Please sign in first to unlock contacts');
      setCurrentScreen('login');
      return;
    }

    if (!currentUser.aadhaarVerified) {
      showToast('🛡️ Please complete Aadhaar verification first to unlock contacts');
      setAadhaarOrigin('app');
      setCurrentScreen('verify-aadhaar');
      return;
    }

    const hasPaidPlan = Boolean(currentUser.membership && currentUser.membership !== 'free');
    if (!hasPaidPlan) {
      showToast('👑 Active subscription required to view contact details. Upgrade now (50% OFF)!');
      handleOpenOffers();
      return;
    }

    if (currentUser.unlockedContacts?.includes(profileId)) {
      showToast(`Contact already unlocked for ${profile?.name || 'candidate'} ✓`);
      return;
    }

    const currentCredits = currentUser.contactCredits ?? 0;
    if (currentCredits <= 0 && currentUser.membership !== 'vip') {
      showToast(`⚠️ You have used all contact view credits on your ${currentUser.membershipPlan || 'subscription'}! Upgrade for more contacts.`);
      handleOpenOffers();
      return;
    }

    const remainingCredits = currentUser.membership === 'vip' ? 999 : Math.max(0, currentCredits - 1);

    setCurrentUser(prev => {
      const updated = {
        ...prev,
        contactCredits: remainingCredits,
        unlockedContacts: [...(prev?.unlockedContacts || []), profileId]
      };
      try {
        localStorage.setItem('i4u_auth_user', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    showToast(`📞 Unlocked contact for ${profile?.name || 'candidate'}! (${remainingCredits === 999 ? 'Unlimited' : remainingCredits} contacts remaining)`);
  };

  const handleMarkNotificationAsRead = (notifId) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    showToast('All notifications marked as read ✓');
  };

  const handleDeleteNotification = (notifId) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    showToast('Notification dismissed');
  };

  const handleAcceptInterestNotification = (notifId, profileId) => {
    const profile = profiles.find(p => p.id === profileId || p.registerId === profileId || p.register_id === profileId);
    const targetId = profile?.id || profileId;
    const targetRegId = profile?.registerId || profile?.register_id;
    setDeclinedReceivedIds(prev => prev.filter(id => id !== targetId && id !== targetRegId));
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true, status: 'accepted' } : n));
    setInterestsSent(prev => {
      if (prev.includes(targetId) || (targetRegId && prev.includes(targetRegId))) {
        return prev;
      }
      return [...prev, targetId];
    });

    // Record acceptance in interestService for real-time WebRTC unlock
    if (currentUser && profile) {
      interestService.acceptInterest(currentUser, profile).catch(err => console.warn('[App] acceptInterest error:', err));
    }

    setConversations(prev => {
      if (!prev.find(c => c.profileId === targetId || (targetRegId && c.profileId === targetRegId))) {
        return [...prev, {
          profileId: targetId,
          unreadCount: 0,
          messages: []
        }];
      }
      return prev;
    });
    showToast(`Accepted interest from ${profile?.name || 'candidate'}! Calling & Chat unlocked ✨`);
  };

  const handleDeclineInterestNotification = (notifId) => {
    const notif = notifications.find(n => n.id === notifId);
    const targetSenderId = notif?.senderId || notif?.profileId;
    if (targetSenderId) {
      setDeclinedReceivedIds(prev => (prev.includes(targetSenderId) ? prev : [...prev, targetSenderId]));
      if (currentUser) {
        interestService.rejectInterest(currentUser, targetSenderId).catch(err => console.warn('[App] rejectInterest error:', err));
      }
    }
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true, status: 'declined' } : n));
    showToast('Interest politely declined');
  };

  const handleDeclineReceivedInterest = (profileId) => {
    const profile = profiles.find(p => p.id === profileId || p.registerId === profileId || p.register_id === profileId);
    const targetId = profile?.id || profileId;
    setDeclinedReceivedIds(prev => (prev.includes(targetId) ? prev : [...prev, targetId]));
    setNotifications(prev => prev.map(n => (n.profileId === targetId || n.profileId === profileId) ? { ...n, isRead: true, status: 'declined' } : n));
    if (currentUser && (profile || targetId)) {
      interestService.rejectInterest(currentUser, profile || targetId).catch(err => console.warn('[App] rejectInterest error:', err));
    }
    showToast(`Politely declined interest from ${profile?.name || 'candidate'}`);
  };

  const handleUndoDeclineReceivedInterest = (profileId) => {
    const profile = profiles.find(p => p.id === profileId || p.registerId === profileId || p.register_id === profileId);
    const targetId = profile?.id || profileId;
    setDeclinedReceivedIds(prev => prev.filter(id => id !== targetId && id !== profileId));
    setNotifications(prev => prev.map(n => (n.profileId === targetId || n.profileId === profileId) ? { ...n, status: 'pending' } : n));
    showToast(`Reconsidered interest from ${profile?.name || 'candidate'} ✨`);
  };

  const handleAcceptReceivedInterest = (profileId) => {
    const profile = profiles.find(p => p.id === profileId || p.registerId === profileId || p.register_id === profileId);
    const targetId = profile?.id || profileId;
    const targetRegId = profile?.registerId || profile?.register_id;
    setDeclinedReceivedIds(prev => prev.filter(id => id !== targetId && id !== targetRegId));
    setInterestsSent(prev => {
      if (prev.includes(targetId) || (targetRegId && prev.includes(targetRegId))) {
        return prev;
      }
      return [...prev, targetId];
    });
    setNotifications(prev => prev.map(n => (n.profileId === targetId || n.profileId === profileId) ? { ...n, isRead: true, status: 'accepted' } : n));
    
    // Record acceptance in interestService for real-time WebRTC unlock
    if (currentUser && profile) {
      interestService.acceptInterest(currentUser, profile).catch(err => console.warn('[App] acceptInterest error:', err));
    }

    // Ensure chat conversation thread exists
    setConversations(prev => {
      if (!prev.find(c => c.profileId === targetId || (targetRegId && c.profileId === targetRegId))) {
        return [...prev, {
          profileId: targetId,
          unreadCount: 0,
          messages: []
        }];
      }
      return prev;
    });

    showToast(`Accepted interest from ${profile?.name || 'candidate'}! ✨ Calling & Chat unlocked.`);
    handleStartChat(targetId);
  };

  const handleSimulateNotification = (type) => {
    const id = 'sim-' + Date.now();
    let newNotif;
    if (type === 'interest') {
      newNotif = {
        id,
        type: 'interest_received',
        profileId: 'p5',
        title: 'New Interest Received! 💖',
        message: 'Priyanka Rathore (28, Sikar) sent you an Interest.',
        quote: '“Namaste Arun! Really liked your family profile and interests.”',
        time: 'Just now',
        isRead: false,
        status: 'pending',
        badge: 'New Match'
      };
      showToast('🔔 New Interest received from Priyanka Rathore!');
    } else if (type === 'shortlist') {
      newNotif = {
        id,
        type: 'profile_shortlisted',
        profileId: 'p1',
        title: 'Profile Shortlisted ⭐',
        message: 'Dr. Ananya Kulkarni shortlisted your profile for parent review.',
        quote: '“Shortlisted for Sunday horoscope & compatibility discussion.”',
        time: 'Just now',
        isRead: false,
        status: 'pending',
        badge: 'Top Match'
      };
      showToast('⭐ Dr. Ananya shortlisted your profile!');
    } else if (type === 'visitor') {
      newNotif = {
        id,
        type: 'profile_visitor',
        profileId: 'p7',
        title: 'Profile Visitor 👁️',
        message: 'Dr. Zoya Farooqui viewed your matrimonial profile.',
        quote: '“Visited your profile and explored family & career background.”',
        time: 'Just now',
        isRead: false,
        status: 'pending',
        badge: 'New Visitor'
      };
      showToast('👁️ Dr. Zoya Farooqui visited your profile!');
    } else if (type === 'contact_view') {
      newNotif = {
        id,
        type: 'contact_viewed',
        profileId: 'p3',
        title: 'Contact Viewed 👁️',
        message: 'Meera Venkatraman & family viewed your contact phone number.',
        quote: 'Phone number verified via UIDAI matrimonial authentication.',
        time: 'Just now',
        isRead: false,
        status: 'pending',
        badge: 'Verified Contact'
      };
      showToast('👁️ Meera Venkatraman viewed your contact details!');
    } else {
      newNotif = {
        id,
        type: 'message_received',
        profileId: 'p2',
        title: 'New Chat Message 💬',
        message: 'Rohan Jayasimha sent you a message: "Are you free to speak?"',
        quote: '“Namaste Arun! Would you be free for a brief call with my sister and parents?”',
        time: 'Just now',
        isRead: false,
        status: 'pending',
        badge: 'New Message'
      };
      showToast('💬 New message received from Rohan!');
    }
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Open Registration flow starting with Mobile Number Verification
  const handleOpenRegister = () => {
    setRegisteredVerifiedPhone(null);
    setCurrentScreen('register');
  };

  // Handle profile selection: Protected - only logged in members can open profiles
  const handleSelectProfile = (profile) => {
    if (!profile) return;
    if (!currentUser) {
      showToast('🔒 Please register free to view complete profile & horoscope details');
      handleOpenRegister();
      return;
    }
    const resolved = typeof profile === 'string'
      ? profiles.find(p => p.id === profile || p.register_id === profile || p.registerId === profile)
      : profile;
    setSelectedProfile(resolved || profile);
  };

  // Toggle Interest (Connect)
  const handleToggleInterest = (profileId) => {
    if (!currentUser) {
      showToast('🔒 Please register free to express interest in matches');
      handleOpenRegister();
      return;
    }
    const profile = profiles.find(p => p.id === profileId || p.registerId === profileId || p.register_id === profileId);
    const targetId = profile?.id || profileId;
    const targetRegId = profile?.registerId || profile?.register_id;

    const isAlready = Boolean(
      interestsSent.includes(targetId) ||
      (targetRegId && interestsSent.includes(targetRegId))
    );

    if (isAlready) {
      setInterestsSent(prev => prev.filter(id => id !== targetId && id !== targetRegId));
      showToast(`Interest withdrawn`);
    } else {
      setInterestsSent(prev => {
        const cleaned = prev.filter(id => id !== targetId && id !== targetRegId);
        return [...cleaned, targetId];
      });
      showToast(`Interest sent to ${profile?.name || 'profile'}! ✨`);

      // Record interest in interestService for relationship status tracking
      if (currentUser && profile) {
        interestService.sendInterest(currentUser, profile).catch(err => console.warn('[App] sendInterest error:', err));
      }

      // Dispatch automated email alert to candidate's registered email
      if (profile?.email) {
        sendInAppNotificationWithEmail({
          recipientId: targetId,
          recipientEmail: profile.email,
          type: 'interest_received',
          title: `💖 New Matrimonial Interest from ${currentUser?.name || 'A Verified Member'}!`,
          message: `${currentUser?.name || 'A Verified Member'} reviewed your profile on I 4 You and expressed interest in connecting with you.`,
          senderName: currentUser?.name,
          senderPhoto: currentUser?.photo,
          profileLink: 'https://i4youmatrimony.com/app'
        }).catch(err => console.warn('[App] Interest email notification notice:', err));
      }

      // Ensure a conversation thread exists
      setConversations(prev => {
        if (!prev.find(c => c.profileId === targetId || (targetRegId && c.profileId === targetRegId))) {
          return [...prev, {
            profileId: targetId,
            unreadCount: 0,
            messages: []
          }];
        }
        return prev;
      });
    }
  };

  // Toggle Shortlist
  const handleToggleShortlist = (profileId) => {
    if (!currentUser) {
      showToast('🔒 Please register free to shortlist matches');
      handleOpenRegister();
      return;
    }
    const profile = profiles.find(p => p.id === profileId || p.registerId === profileId || p.register_id === profileId);
    const targetId = profile?.id || profileId;
    const targetRegId = profile?.registerId || profile?.register_id;

    const isAlready = Boolean(
      shortlisted.includes(targetId) ||
      (targetRegId && shortlisted.includes(targetRegId))
    );

    if (isAlready) {
      setShortlisted(prev => prev.filter(id => id !== targetId && id !== targetRegId));
      showToast(`Removed from shortlist`);
    } else {
      setShortlisted(prev => {
        const cleaned = prev.filter(id => id !== targetId && id !== targetRegId);
        return [...cleaned, targetId];
      });
      showToast(`Added ${profile?.name?.split(' ')[0] || 'profile'} to shortlist ❤️`);
    }
  };

  // Start chat directly with candidate
  const handleStartChat = (profileId, initialMessage = null) => {
    if (!currentUser) {
      showToast('🔒 Please sign in first to chat with members');
      setCurrentScreen('login');
      return;
    }

    const profile = profiles.find(p => p.id === profileId || p.register_id === profileId || p.registerId === profileId);
    setActiveChatProfileId(profileId);
    setIsDirectChatOpen(true);
    setSelectedProfile(null);
    setCurrentScreen('app');
    setActiveTab('chat');

    // Ensure a conversation thread exists for this profile
    setConversations(prev => {
      const existing = prev.find(c => c.profileId === profileId);
      if (!existing) {
        return [...prev, {
          profileId,
          unreadCount: 0,
          messages: [],
          autoReplies: []
        }];
      } else {
        return prev.map(c => c.profileId === profileId ? { ...c, unreadCount: 0 } : c);
      }
    });
  };

  // Open Authentic Matrimonial Interest Message Composer Modal
  const handleOpenSendInterest = (profileOrId) => {
    if (!currentUser) {
      showToast('🔒 Please register free to express interest in matches');
      handleOpenRegister();
      return;
    }
    const candidate = typeof profileOrId === 'object' 
      ? profileOrId 
      : profiles.find(p => p.id === profileOrId || p.registerId === profileOrId || p.register_id === profileOrId);
    if (!candidate) return;
    setInterestModalCandidate(candidate);
  };

  // Handle accepting an incoming interest from candidate
  const handleAcceptIncomingInterest = (profileId, replyMessage) => {
    const profile = profiles.find(p => p.id === profileId || p.registerId === profileId || p.register_id === profileId) || interestModalCandidate;
    const targetId = profile?.id || profileId;
    const targetRegId = profile?.registerId || profile?.register_id;

    setDeclinedReceivedIds(prev => prev.filter(id => id !== targetId && id !== targetRegId));
    setNotifications(prev => prev.map(n => 
      (n.profileId === targetId || (targetRegId && n.profileId === targetRegId)) 
        ? { ...n, isRead: true, status: 'accepted' } 
        : n
    ));
    setInterestsSent(prev => {
      if (prev.includes(targetId) || (targetRegId && prev.includes(targetRegId))) {
        return prev;
      }
      return [...prev, targetId];
    });

    if (currentUser && profile) {
      interestService.acceptInterest(currentUser, profile).catch(err => console.warn('[App] acceptInterest error:', err));
    }

    if (replyMessage && replyMessage.trim()) {
      const cleanMsg = replyMessage.trim();
      setConversations(prev => {
        const existing = prev.find(c => c.profileId === targetId || (targetRegId && c.profileId === targetRegId));
        const newMsg = {
          id: 'msg_' + Date.now(),
          sender: 'me',
          text: cleanMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        if (existing) {
          return prev.map(c => (c.profileId === targetId || (targetRegId && c.profileId === targetRegId))
            ? { ...c, messages: [...(c.messages || []), newMsg] }
            : c
          );
        }
        return [...prev, {
          profileId: targetId,
          unreadCount: 0,
          messages: [newMsg]
        }];
      });
    }

    setInterestModalCandidate(null);
    showToast('Accepted interest from ' + (profile?.name || 'candidate') + '! Calling & Chat unlocked ✨');
  };

  // Confirm sending interest with chosen/customized message
  const handleConfirmSendInterest = (profileId, customMessage) => {
    const profile = profiles.find(p => p.id === profileId || p.registerId === profileId || p.register_id === profileId) || interestModalCandidate;
    const targetId = profile?.id || profileId;
    const targetRegId = profile?.registerId || profile?.register_id;

    setInterestsSent(prev => {
      const cleaned = prev.filter(id => id !== targetId && id !== targetRegId);
      return [...cleaned, targetId];
    });
    setInterestModalCandidate(null);
    showToast(`💖 Interest & message sent to ${profile?.name || 'candidate'}! ✨`);

    // Record interest in interestService for relationship status tracking
    if (currentUser && profile) {
      interestService.sendInterest(currentUser, profile, customMessage).catch(err => console.warn('[App] sendInterest error:', err));
    }

    // Dispatch automated email alert to candidate's registered email
    if (profile?.email) {
      sendInAppNotificationWithEmail({
        recipientId: targetId,
        recipientEmail: profile.email,
        type: 'interest_received',
        title: `💖 Matrimonial Interest from ${currentUser?.name || 'A Verified Member'}!`,
        message: customMessage || `${currentUser?.name || 'A Verified Member'} reviewed your profile on I 4 You and expressed interest in connecting with you.`,
        senderName: currentUser?.name,
        senderPhoto: currentUser?.photo,
        profileLink: 'https://i4youmatrimony.com/app'
      }).catch(err => console.warn('[App] Interest email notification notice:', err));
    }

    // Ensure conversation thread exists with this custom message
    setConversations(prev => {
      const existingIndex = prev.findIndex(c => c.profileId === profileId);
      const userMsg = {
        id: 'interest-' + Date.now(),
        sender: 'me',
        text: customMessage || `Namaste! I reviewed your profile and would love to connect.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered'
      };

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          messages: [...(updated[existingIndex].messages || []), userMsg]
        };
        return updated;
      } else {
        return [...prev, {
          profileId,
          unreadCount: 0,
          messages: [userMsg],
          autoReplies: [
            `Namaste! Thank you for connecting. Our family in ${profile?.city || 'India'} is happy to take this forward.`,
            `Glad to connect with you. Would love to schedule a friendly voice or video call this weekend.`
          ]
        }];
      }
    });
  };

  // Start direct Audio Call with candidate (Authorized ONLY if Interest is Accepted)
  const handleStartAudioCall = async (candidateOrId) => {
    if (!currentUser) {
      showToast('🔒 Please register free to make voice calls');
      handleOpenRegister();
      return;
    }
    const candidate = typeof candidateOrId === 'object' ? candidateOrId : profiles.find(p => p.id === candidateOrId);
    if (!candidate) return;

    // Security Gate: Check mutual matrimonial interest status
    const authCheck = await interestService.verifyCallAuthorization(currentUser, candidate);
    if (!authCheck.authorized) {
      if (authCheck.status === 'none') {
        showToast('Send an Interest first. Calling is unlocked once accepted.');
        handleOpenSendInterest(candidate);
      } else if (authCheck.status === 'pending') {
        showToast('Interest is pending acceptance. You can call once they accept your interest.');
      } else if (authCheck.status === 'rejected') {
        showToast('Calling is unavailable as the interest was not accepted.');
      } else {
        showToast(authCheck.reason);
      }
      return;
    }

    setIsCallCaller(true);
    setActiveCallSession(null);
    setActiveAudioCallCandidate(candidate);
    showToast(`📞 Live Call: Initiating encrypted audio line with ${candidate.name}...`);
  };

  // Start live Video Call with candidate (Authorized ONLY if Interest is Accepted)
  const handleStartVideoCall = async (candidateOrId) => {
    if (!currentUser) {
      showToast('🔒 Please register free to make video calls');
      handleOpenRegister();
      return;
    }
    const candidate = typeof candidateOrId === 'object' ? candidateOrId : profiles.find(p => p.id === candidateOrId);
    if (!candidate) return;

    // Security Gate: Check mutual matrimonial interest status
    const authCheck = await interestService.verifyCallAuthorization(currentUser, candidate);
    if (!authCheck.authorized) {
      if (authCheck.status === 'none') {
        showToast('Send an Interest first. Calling is unlocked once accepted.');
        handleOpenSendInterest(candidate);
      } else if (authCheck.status === 'pending') {
        showToast('Interest is pending acceptance. You can call once they accept your interest.');
      } else if (authCheck.status === 'rejected') {
        showToast('Calling is unavailable as the interest was not accepted.');
      } else {
        showToast(authCheck.reason);
      }
      return;
    }

    setIsCallCaller(true);
    setActiveCallSession(null);
    setActiveVideoCallCandidate(candidate);
    showToast(`🎥 Live Video Call: Initiating HD video meeting with ${candidate.name}...`);
  };

  // Incoming Call Handlers (WebRTC P2P via Supabase Realtime)
  const handleAcceptIncomingCall = (callData) => {
    setIsCallCaller(false);
    setActiveCallSession(callData);
    setIncomingCallSession(null);
    if (callData.callType === 'video') {
      setActiveAudioCallCandidate(null);
      setActiveVideoCallCandidate(callData.caller);
    } else {
      setActiveVideoCallCandidate(null);
      setActiveAudioCallCandidate(callData.caller);
    }
  };

  const handleDeclineIncomingCall = (callData, reason) => {
    webrtcCallService.declineCall({ callData, reason });
    setIncomingCallSession(null);
    showToast('Call declined');
  };

  // WhatsApp Status Management Handlers
  const handleOpenStatusViewer = (profileOrData, status, isOwnStatus) => {
    // 1. If status is explicitly passed as second argument
    if (status !== undefined) {
      setActiveStoryViewer({ 
        profile: profileOrData, 
        status, 
        isOwnStatus: Boolean(isOwnStatus) 
      });
      return;
    }
    // 2. If called with a story wrapper object ({ profile, status, isOwnStatus })
    if (profileOrData && typeof profileOrData === 'object' && 'profile' in profileOrData) {
      setActiveStoryViewer(profileOrData);
      return;
    }
    // 3. If called with just a profile object, look up candidate story
    const resolvedStatus = CANDIDATE_STATUSES[profileOrData?.id] || null;
    setActiveStoryViewer({ 
      profile: profileOrData, 
      status: resolvedStatus, 
      isOwnStatus: Boolean(isOwnStatus) 
    });
  };

  const handleOpenStatusEditor = () => {
    setIsStatusEditorOpen(true);
  };

  const handleOpenStatusMenu = (profile, isOwnStatus, hasStatus) => {
    setStatusMenuData({ profile, isOwnStatus, hasStatus });
  };

  const handleSaveMyStatus = async (newStatus) => {
    let statusToSave = { ...newStatus };

    // If mediaUrl is a base64 Data URL, compress and upload to Supabase Storage
    if (statusToSave.mediaUrl && statusToSave.mediaUrl.startsWith('data:')) {
      try {
        statusToSave.mediaUrl = await compressBase64Image(statusToSave.mediaUrl, 900, 0.78);
      } catch (cErr) {}

      try {
        const uploadRes = await uploadProfilePhoto(statusToSave.mediaUrl, currentUser?.id || 'my_status', 'avatars');
        if (uploadRes.success && uploadRes.publicUrl) {
          statusToSave.mediaUrl = uploadRes.publicUrl;
        }
      } catch (photoErr) {
        console.warn('[handleSaveMyStatus] Storage upload fallback:', photoErr);
      }
    }

    setMyStatus(statusToSave);
    try {
      localStorage.removeItem('i4u_my_status_deleted');
      localStorage.setItem('i4u_my_status', JSON.stringify(statusToSave));
    } catch (e) {
      console.warn('[handleSaveMyStatus] LocalStorage save warning:', e);
    }

    // Keep currentUser cover_photo in sync across sessions
    if (currentUser) {
      setCurrentUser(prev => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          coverPhoto: statusToSave.mediaUrl || prev.coverPhoto,
          cover_photo: statusToSave.mediaUrl || prev.cover_photo
        };
        try {
          localStorage.setItem('i4u_auth_user', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }

    // Persist status update to Supabase database if logged in
    if (currentUser?.id && isSupabaseConfigured()) {
      try {
        await supabase.from('profiles').update({
          cover_photo: statusToSave.mediaUrl || null,
          updated_at: new Date().toISOString()
        }).eq('id', currentUser.id);
      } catch (sbErr) {
        console.warn('[handleSaveMyStatus] Supabase sync warning:', sbErr);
      }
    }

    showToast('Status shared & saved successfully! ✨');
  };

  const handleDeleteMyStatus = () => {
    setMyStatus(null);
    try {
      localStorage.removeItem('i4u_my_status');
      localStorage.setItem('i4u_my_status_deleted', 'true');
    } catch (e) {}
    if (currentUser) {
      setCurrentUser(prev => {
        if (!prev) return prev;
        const updated = { ...prev, coverPhoto: null, cover_photo: null };
        try {
          localStorage.setItem('i4u_auth_user', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }
    if (currentUser?.id && isSupabaseConfigured()) {
      supabase.from('profiles').update({ cover_photo: null }).eq('id', currentUser.id).catch(() => {});
    }
    showToast('Status deleted');
  };

  const handleToggleHideMyStatus = () => {
    setMyStatus(prev => {
      if (!prev) return prev;
      const nextHidden = !prev.isHidden;
      const updated = { ...prev, isHidden: nextHidden };
      try {
        localStorage.setItem('i4u_my_status', JSON.stringify(updated));
      } catch (e) {}
      showToast(nextHidden ? 'Status hidden from candidate feeds 🔒' : 'Status made visible to matches ✨');
      return updated;
    });
  };

  const handleHideOtherStatus = (profileId) => {
    setHiddenStatusIds(prev => new Set([...prev, profileId]));
    showToast('Status muted');
  };

  const handleRemoveOtherStatus = (profileId) => {
    setDeletedStatusIds(prev => new Set([...prev, profileId]));
    showToast('Removed from status updates');
  };

  // Centralized robust profile photo updater (syncs state, localStorage, match profiles, Supabase & Storage)
  const handlePhotoUpdateAction = useCallback(async (photosData) => {
    if (!photosData) return;
    const primaryPhoto = photosData.photo || photosData.singlePhotos?.[0] || currentUser?.photo;

    // 1. Immediately update reactive state for currentUser
    let updatedUser;
    setCurrentUser(prev => {
      updatedUser = {
        ...prev,
        ...photosData,
        photo: primaryPhoto,
        photo_url: primaryPhoto
      };

      try {
        localStorage.setItem('i4u_auth_user', JSON.stringify(updatedUser));
      } catch (e) {
        console.warn('LocalStorage quota warning in handlePhotoUpdateAction, saving minimal session:', e);
        try {
          const minimal = { ...updatedUser };
          if (Array.isArray(minimal.singlePhotos) && minimal.singlePhotos[0]?.length > 200000) {
            minimal.singlePhotos = [minimal.singlePhotos[0]];
          }
          localStorage.setItem('i4u_auth_user', JSON.stringify(minimal));
        } catch (e2) {}
      }

      return updatedUser;
    });

    // 2. Immediately reflect in candidate match feed list so user's own card has the new photo
    setProfiles(prevProfiles => {
      if (!Array.isArray(prevProfiles)) return prevProfiles;
      const uid = currentUser?.id;
      const regId = currentUser?.registerId || currentUser?.register_id;
      return prevProfiles.map(p => {
        if ((uid && p.id === uid) || (regId && (p.registerId === regId || p.register_id === regId))) {
          return {
            ...p,
            photo: primaryPhoto,
            photo_url: primaryPhoto,
            singlePhotos: photosData.singlePhotos || p.singlePhotos,
            familyPhotos: photosData.familyPhotos || p.familyPhotos,
            hidePhotos: photosData.hidePhotos !== undefined ? photosData.hidePhotos : p.hidePhotos,
            photoVisibility: photosData.photoVisibility || p.photoVisibility,
            blurPhotosForUnconnected: photosData.blurPhotosForUnconnected !== undefined ? photosData.blurPhotosForUnconnected : p.blurPhotosForUnconnected
          };
        }
        return p;
      });
    });

    if (photosData.hidePhotos) {
      showToast('Photos hidden from public search 🔒');
    } else if (photosData.photoVisibility === 'accepted') {
      showToast('Photos set to Accepted Matches only 🔒');
    } else if (photosData.photoVisibility === 'request') {
      showToast('Photos set to Request Approval only 🔑');
    } else {
      showToast('Profile & Family Photos updated! ⭐');
    }

    // 3. Persist to Supabase and upload image to Supabase Storage bucket
    try {
      const syncResult = await updateLivePhotos({
        id: currentUser?.id,
        registerId: currentUser?.registerId || currentUser?.register_id,
        phone: currentUser?.mobile || currentUser?.phone,
        name: currentUser?.name || currentUser?.fullName,
        photo: primaryPhoto,
        singlePhotos: photosData.singlePhotos,
        familyPhotos: photosData.familyPhotos,
        hidePhotos: photosData.hidePhotos,
        photoVisibility: photosData.photoVisibility,
        blurPhotosForUnconnected: photosData.blurPhotosForUnconnected
      });

      // If Supabase Storage returned a permanent URL (https://...), update currentUser state seamlessly
      if (syncResult && syncResult.photo && syncResult.photo.startsWith('http')) {
        setCurrentUser(prev => {
          if (!prev) return prev;
          const refined = {
            ...prev,
            photo: syncResult.photo,
            photo_url: syncResult.photo,
            singlePhotos: Array.isArray(prev.singlePhotos) && prev.singlePhotos.length > 0
              ? [syncResult.photo, ...prev.singlePhotos.slice(1)]
              : [syncResult.photo]
          };
          try {
            localStorage.setItem('i4u_auth_user', JSON.stringify(refined));
          } catch (e) {}
          return refined;
        });
      }
    } catch (err) {
      console.warn('[handlePhotoUpdateAction] updateLivePhotos error:', err);
    }
  }, [currentUser, showToast]);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedState('All States');
    setSelectedDistrict('All Districts');
    setSelectedReligion('All Religions');
    setSelectedCaste('All Castes & Communities');
    setMinAge(21);
    setMaxAge(35);
    setMinHeight('Any Height (No Preference)');
    setSelectedMaritalStatus('All');
    setSelectedEducation('All Educations');
    setSelectedProfession('All Professions');
    setMinIncome('All Incomes');
    setSelectedDiet('All');
    setSelectedManglik('All');
    setVerifiedOnly(false);
    setPhotoOnly(false);
    setSelectedWorkMode('All');
    setSelectedFamilyType('All');
    setSelectedFamilyStatus('All');
    setSelectedDrinking('All');
    setSelectedSmoking('All');
    setMembershipFilter('All');
    setPhoneOnly(false);
    setMobileSearchNumber('');
    setGuestLookingFor('Female');
  };

  // Handler when Registration completes and moves directly to Mandatory Aadhaar Verification
  const handleProceedToVerification = (regData) => {
    setPendingRegistration(regData);
    setAadhaarOrigin('register');
    setCurrentScreen('verify-aadhaar');
  };

  // Handler when Mobile Verification succeeds
  const handleVerificationSuccess = (verifiedData) => {
    setCurrentUser(prev => {
      const generatedId = verifiedData?.id || (prev?.id && !prev.id.startsWith('demo_') && prev.id !== 'p1' && prev.id !== 'p2' ? prev.id : `p_${Date.now()}`);
      const resolvedName = verifiedData?.fullName || verifiedData?.name || prev?.name || 'New Member';
      const resolvedPhone = verifiedData?.mobile || verifiedData?.phone || prev?.mobile || prev?.phone || '';

      const updated = {
        ...(prev || {}),
        id: generatedId,
        registerId: verifiedData?.registerId || verifiedData?.register_id || prev?.registerId || ('I4Y' + (Math.floor(Math.random() * 900) + 1003)),
        name: resolvedName,
        fullName: resolvedName,
        mobile: resolvedPhone,
        phone: resolvedPhone,
        city: verifiedData.city || prev?.city,
        district: verifiedData.district || verifiedData.city || prev?.district,
        state: verifiedData.state || prev?.state,
        address: verifiedData.address || prev?.address,
        pincode: verifiedData.pincode || prev?.pincode,
        cityTier: verifiedData.cityTier || prev?.cityTier,
        profession: verifiedData.designation || prev?.profession,
        education: verifiedData.highestQualification || prev?.education,
        educationCategory: verifiedData.educationCategory || prev?.educationCategory,
        institute: verifiedData.institute || prev?.institute,
        twelfthSchool: verifiedData.twelfthSchool || prev?.twelfthSchool,
        twelfthBoard: verifiedData.twelfthBoard || prev?.twelfthBoard,
        twelfthStream: verifiedData.twelfthStream || prev?.twelfthStream,
        twelfthYear: verifiedData.twelfthYear || prev?.twelfthYear,
        twelfthPercentage: verifiedData.twelfthPercentage || prev?.twelfthPercentage,
        tenthSchool: verifiedData.tenthSchool || prev?.tenthSchool,
        tenthBoard: verifiedData.tenthBoard || prev?.tenthBoard,
        tenthYear: verifiedData.tenthYear || prev?.tenthYear,
        tenthPercentage: verifiedData.tenthPercentage || prev?.tenthPercentage,
        height: verifiedData.height || prev?.height,
        skinColour: verifiedData.skinColour || prev?.skinColour,
        bodyType: verifiedData.bodyType || prev?.bodyType,
        prefSkinTone: verifiedData.prefSkinTone || prev?.prefSkinTone,
        prefBodyType: verifiedData.prefBodyType || prev?.prefBodyType,
        religion: verifiedData.religion || prev?.religion,
        caste: verifiedData.caste || prev?.caste,
        diet: verifiedData.diet || prev?.diet,
        smoking: verifiedData.smoking || prev?.smoking,
        drinking: verifiedData.drinking || prev?.drinking,
        hobbies: verifiedData.hobbies || prev?.hobbies,
        interests: verifiedData.interests || prev?.interests,
        sportsFitness: verifiedData.sportsFitness || prev?.sportsFitness,
        photo: verifiedData.photo || prev?.photo,
        singlePhotos: verifiedData.singlePhotos || prev?.singlePhotos,
        familyPhotos: verifiedData.familyPhotos || prev?.familyPhotos,
        mobileVerified: true,
        governmentIdVerified: true,
        verified: true,
        gender: normalizeGender(verifiedData?.gender || prev?.gender) === 'male' ? 'Male' : 'Female',
        aadhaarVerified: verifiedData.aadhaarVerified !== undefined ? verifiedData.aadhaarVerified : prev?.aadhaarVerified,
        maskedAadhaar: verifiedData.maskedAadhaar || prev?.maskedAadhaar,
        aadhaarNumber: verifiedData.aadhaarNumber || prev?.aadhaarNumber,
        about: verifiedData.aboutBio || prev?.about
      };
      try {
        localStorage.removeItem('i4u_logged_out');
        localStorage.setItem('i4u_auth_user', JSON.stringify(updated));
      } catch (e) {}

      const isMale = (updated.gender || '').toLowerCase() === 'male';
      setInterestsSent([]);
      setShortlisted([]);
      setConversations([]);
      setNotifications(getNotificationsForUser(updated, profiles));
      setActiveChatProfileId(null);

      // Immediately display profile in matches feed
      setProfiles(prevProfiles => [updated, ...prevProfiles.filter(p => p.id !== updated.id)]);

      // Synchronize candidate profile registration with Supabase Cloud & Python Admin
      registerLiveProfile(updated);

      return updated;
    });
    setPendingRegistration(null);
    setCurrentScreen('app');
    setActiveTab('feed');
    showToast(`Mobile verified & profile activated! ✨ Welcome to I 4 You.`);
  };

  // Handler when Aadhaar Verification succeeds
  const handleAadhaarVerificationSuccess = (verifiedData) => {
    const isManualOrPending = verifiedData?.verificationType === 'manual_card_upload' || !verifiedData?.aadhaarVerified;
    const resolvedAadhaarVerified = isManualOrPending ? false : Boolean(verifiedData?.aadhaarVerified);
    const resolvedAadhaarStatus = isManualOrPending ? 'pending' : (verifiedData?.aadhaar_status || 'approved');

    setCurrentUser(prev => {
      const generatedId = prev?.id && !prev.id.startsWith('demo_') && prev.id !== 'p1' && prev.id !== 'p2'
        ? prev.id 
        : (verifiedData?.id || `p_${Date.now()}`);

      // Ensure candidate's personal profile photo is NEVER replaced by their Aadhaar card scan
      const resolvedPhoto = (verifiedData?.photo && verifiedData.photo !== verifiedData?.aadhaar_front_image && verifiedData.photo !== verifiedData?.aadhaar_back_image)
        ? verifiedData.photo
        : (prev?.photo || verifiedData?.photo);

      const resolvedSinglePhotos = (verifiedData?.singlePhotos && verifiedData.singlePhotos.length > 0)
        ? verifiedData.singlePhotos
        : (prev?.singlePhotos || []);

      const resolvedFamilyPhotos = (verifiedData?.familyPhotos && verifiedData.familyPhotos.length > 0)
        ? verifiedData.familyPhotos
        : (prev?.familyPhotos || []);

      const updated = {
        ...(prev || {}),
        ...(verifiedData || {}),
        id: generatedId,
        photo: resolvedPhoto,
        singlePhotos: resolvedSinglePhotos,
        familyPhotos: resolvedFamilyPhotos,
        gender: normalizeGender(verifiedData?.gender || prev?.gender) === 'male' ? 'Male' : 'Female',
        familyDetails: prev?.familyDetails || verifiedData?.familyDetails || {
          type: 'Nuclear Family',
          values: 'Traditional yet Progressive',
          financialStatus: 'Upper Middle Class',
          father: 'Retired Professional',
          mother: 'Homemaker',
          siblings: '1 Sibling'
        },
        aadhaarVerified: resolvedAadhaarVerified,
        aadhaar_status: resolvedAadhaarStatus,
        aadhaarStatus: resolvedAadhaarStatus,
        aadhaar_rejection_reason: null,
        aadhaarRejectionReason: null,
        governmentIdVerified: resolvedAadhaarVerified,
        verified: resolvedAadhaarVerified ? true : false,
        maskedAadhaar: verifiedData?.maskedAadhaar || prev?.maskedAadhaar || 'XXXX XXXX 5928',
        aadhaarNumber: verifiedData?.aadhaarNumber || prev?.aadhaarNumber || '4920 8173 5928',
        aadhaar_front_image: verifiedData?.aadhaar_front_image || verifiedData?.frontDocumentPreview || prev?.aadhaar_front_image || null,
        aadhaar_back_image: verifiedData?.aadhaar_back_image || verifiedData?.backDocumentPreview || prev?.aadhaar_back_image || null
      };
      try {
        localStorage.removeItem('i4u_logged_out');
        localStorage.setItem('i4u_auth_user', JSON.stringify(updated));
        if (updated.aadhaarVerified) {
          localStorage.setItem('i4u_aadhaar_verified', 'true');
        } else {
          localStorage.removeItem('i4u_aadhaar_verified');
        }
      } catch (e) {}

      const isMale = (updated.gender || '').toLowerCase() === 'male';
      setInterestsSent([]);
      setShortlisted([]);
      setConversations([]);
      setNotifications(getNotificationsForUser(updated, profiles));
      setActiveChatProfileId(null);

      // Immediately display profile in matches feed
      setProfiles(prevProfiles => [updated, ...prevProfiles.filter(p => p.id !== updated.id)]);

      // Synchronize candidate registration and live verification with Supabase Cloud & Python Admin
      registerLiveProfile(updated);
      verifyLiveAadhaar(updated);

      return updated;
    });
    setPendingRegistration(null);
    setCurrentScreen('app');
    setActiveTab('account');
    if (isManualOrPending) {
      showToast('Aadhaar submitted! Status: Pending Admin Verification ⏳');
    } else {
      showToast('Aadhaar verified successfully! 🛡️ Green badge & contacts unlocked');
    }
  };

  // Handler when Login succeeds
  const handleLoginSuccess = (userData) => {
    const finalName = (!userData?.name || userData.name === 'Verified Member')
      ? (currentUser?.name && currentUser.name !== 'Verified Member' ? currentUser.name : 'Verified Member')
      : userData.name;
    const resolvedGender = normalizeGender(userData?.gender || currentUser?.gender) === 'male' ? 'Male' : 'Female';
    const updatedUser = {
      ...(currentUser || {}),
      ...userData,
      name: finalName,
      gender: resolvedGender,
      mobileVerified: true,
      verified: true
    };
    persistUserSession(updatedUser);
    setCurrentUser(updatedUser);
    setInterestsSent(updatedUser.interestsSent || []);
    setShortlisted(updatedUser.shortlisted || []);
    setConversations(getConversationsForUser(updatedUser));
    setNotifications(getNotificationsForUser(updatedUser, profiles));
    setActiveChatProfileId(null);
    setCurrentScreen('app');
    setActiveTab('feed');
  };

  // 1-Click Demo Persona Switcher (Bride Priya vs Groom Rohan)
  const handleSwitchDemoGender = (targetGender) => {
    const isMale = (targetGender || '').toLowerCase() === 'male';
    const persona = isMale ? DEMO_USER_MALE : DEMO_USER_FEMALE;
    setCurrentUser(persona);
    setInterestsSent(persona.interestsSent || []);
    setShortlisted(persona.shortlisted || []);
    setConversations(getConversationsForUser(persona));
    setNotifications(getNotificationsForUser(persona, profiles));
    setActiveChatProfileId(null);
    try {
      localStorage.removeItem('i4u_logged_out');
      localStorage.setItem('i4u_auth_user', JSON.stringify(persona));
    } catch (e) {}
    showToast(`Switched to ${persona.name} (${persona.gender} - viewing ${isMale ? 'Women' : 'Gents'} only) ✨`);
  };

  // Handler when user deletes their personal account
  const handleDeleteAccount = async ({ reason, feedback }) => {
    try {
      await deletePersonalAccount({
        userId: currentUser?.id,
        reason,
        feedback,
        email: currentUser?.email,
        phone: currentUser?.phone || currentUser?.mobile,
        userName: currentUser?.name
      });
      logoutUser();
      signOutGoogleAuth().catch(() => {});
      if (isSupabaseConfigured() && supabase) {
        supabase.auth.signOut().catch(() => {});
      }
      setCurrentUser(null);
      if (isProduction) {
        setConversations([]);
        setNotifications([]);
        setInterestsSent([]);
        setShortlisted([]);
        setMyStatus(null);
      }
      showToast('Personal account deleted. We will miss you! 👋');
      // Reset current user state and redirect to login screen
      setTimeout(() => {
        setCurrentScreen('login');
        setActiveTab('feed');
      }, 1000);
    } catch (err) {
      console.error('Account deletion error:', err);
      logoutUser();
      signOutGoogleAuth().catch(() => {});
      if (isSupabaseConfigured() && supabase) {
        supabase.auth.signOut().catch(() => {});
      }
      setCurrentUser(null);
      showToast('Account deleted locally.');
      setCurrentScreen('login');
    }
  };

  const parseHeightInches = (hStr) => {
    if (!hStr) return 0;
    const match = hStr.match(/(\d+)'(\d+)/);
    if (match) {
      return parseInt(match[1], 10) * 12 + parseInt(match[2], 10);
    }
    return 0;
  };

  const parseIncomeNum = (str) => {
    if (!str) return 0;
    if (str.includes('Cr')) return 100;
    const matches = str.match(/(\d+)/g);
    if (!matches) return 0;
    return Math.max(...matches.map(Number));
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedState !== 'All States') count++;
    if (selectedDistrict !== 'All Districts') count++;
    if (selectedReligion !== 'All Religions') count++;
    if (selectedCaste && selectedCaste !== 'All Castes & Communities') count++;
    if (minAge > 21 || maxAge < 35) count++;
    if (minHeight && minHeight !== 'Any Height' && minHeight !== 'Any Height (No Preference)') count++;
    if (selectedMaritalStatus && selectedMaritalStatus !== 'All') count++;
    if (selectedEducation !== 'All Educations') count++;
    if (selectedProfession !== 'All Professions') count++;
    if (minIncome !== 'All Incomes') count++;
    if (selectedDiet !== 'All') count++;
    if (verifiedOnly) count++;
    if (photoOnly) count++;
    if (selectedWorkMode !== 'All' && selectedWorkMode !== 'All Modes') count++;
    if (selectedFamilyType !== 'All' && selectedFamilyType !== 'All Family Types') count++;
    if (selectedFamilyStatus !== 'All' && selectedFamilyStatus !== 'All Financial Statuses') count++;
    if (selectedDrinking !== 'All') count++;
    if (selectedSmoking !== 'All') count++;
    if (membershipFilter && membershipFilter !== 'All') count++;
    if (phoneOnly) count++;
    if (mobileSearchNumber && mobileSearchNumber.trim() !== '') count++;
    return count;
  }, [
    selectedState,
    selectedDistrict,
    selectedReligion,
    selectedCaste,
    minAge,
    maxAge,
    minHeight,
    selectedMaritalStatus,
    selectedEducation,
    selectedProfession,
    minIncome,
    selectedDiet,
    verifiedOnly,
    photoOnly,
    selectedWorkMode,
    selectedFamilyType,
    selectedFamilyStatus,
    selectedDrinking,
    selectedSmoking,
    membershipFilter,
    phoneOnly,
    mobileSearchNumber
  ]);

  const filteredProfiles = useMemo(() => {
    const targetGender = getTargetCandidateGender(currentUser, guestLookingFor);
    const seenIds = new Set();
    const seenPhones = new Set();
    const seenKeys = new Set();

    return profiles
      .filter(p => !isDemoProfile(p))
      .filter(p => {
        if (!p || !p.id) return false;

        // Deduplicate profiles so identical candidates never repeat in the feed
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

        // 0. Exclude current user's own profile (by ID, Name, and Phone)
        if (isSelfProfile(p, currentUser)) return false;

        // 0.1 Strict Opposite Gender Matchmaking Rule:
        // Male users can ONLY see Female profiles (Brides)
        // Female users can ONLY see Male profiles (Grooms)
        // Guests strictly see candidates matching guestLookingFor
        if (!isCandidateMatchingTarget(p, targetGender)) {
          return false;
        }

      // 1. State
      if (selectedState !== 'All States' && p.state !== selectedState) return false;

      // 2. District
      if (selectedDistrict !== 'All Districts' && p.district !== selectedDistrict) return false;

      // 3. Religion
      if (selectedReligion !== 'All Religions') {
        if (selectedReligion === 'Buddhist & Parsi') {
          if (p.religion !== 'Buddhist' && p.religion !== 'Parsi') return false;
        } else if (p.religion !== selectedReligion) {
          return false;
        }
      }

      // 4. Community & Caste
      if (selectedCaste && selectedCaste !== 'All Castes & Communities') {
        const pCaste = (p.caste || '').toLowerCase();
        const target = selectedCaste.toLowerCase();
        
        // Direct substring or inclusion check
        let isMatch = pCaste.includes(target) || target.includes(pCaste);
        
        if (!isMatch) {
          // Token-based matching for composite strings (e.g., "Maratha (96 Kuli / Kunbi)" vs "Maratha - 96 Kuli")
          const targetTokens = target.split(/[\s\/\-\(\),]+/).filter(t => t.length >= 3 && !['other', 'community', 'sub', 'caste'].includes(t));
          const pTokens = pCaste.split(/[\s\/\-\(\),]+/).filter(t => t.length >= 3 && !['other', 'community', 'sub', 'caste'].includes(t));
          
          isMatch = targetTokens.some(tok => pTokens.includes(tok) || pCaste.includes(tok));
        }
        
        if (!isMatch) return false;
      }

      // 5. Age Range
      if (p.age < minAge || p.age > maxAge) return false;

      // 6. Height (Supports range e.g. "5'0\" to 5'5\"" or "5'10\"+" or "5'5\"")
      if (minHeight && minHeight !== 'Any Height' && minHeight !== 'Any Height (No Preference)') {
        const matches = [...minHeight.matchAll(/(\d+)'(\d+)/g)];
        const pInches = parseHeightInches(p.height);
        if (pInches && matches.length > 0) {
          const minH = parseInt(matches[0][1], 10) * 12 + parseInt(matches[0][2], 10);
          if (matches.length > 1) {
            const maxH = parseInt(matches[1][1], 10) * 12 + parseInt(matches[1][2], 10);
            if (pInches < minH || pInches > maxH) return false;
          } else {
            if (pInches < minH) return false;
          }
        }
      }

      // 7. Marital Status
      if (selectedMaritalStatus && selectedMaritalStatus !== 'All') {
        const pStatus = p.maritalStatus || 'Never Married';
        if (selectedMaritalStatus === 'Never Married') {
          if (pStatus !== 'Never Married') return false;
        } else if (selectedMaritalStatus === 'Divorced / Widowed OK') {
          // Open to all statuses
        } else if (selectedMaritalStatus === 'Awaiting Divorce Considered') {
          // Open to all statuses
        } else if (pStatus !== selectedMaritalStatus) {
          return false;
        }
      }

      // 8. Education
      if (selectedEducation !== 'All Educations') {
        const sel = selectedEducation.toLowerCase();
        const cat = (p.educationCategory || '').toLowerCase();
        const firstToken = sel.split(/[\s\/&(]/)[0];
        if (!cat.includes(firstToken) && !sel.split(' / ').some(part => cat.includes(part.trim().toLowerCase()))) {
          return false;
        }
      }

      // 9. Profession / Sector
      if (selectedProfession !== 'All Professions') {
        const prof = (p.profession || '').toLowerCase();
        const comp = (p.company || '').toLowerCase();
        const token = selectedProfession.toLowerCase().split(/[\s\/]/)[0];
        if (!prof.includes(token) && !comp.includes(token)) return false;
      }

      // 10. Minimum Income
      if (minIncome !== 'All Incomes') {
        const reqLPA = parseInt(minIncome.match(/\d+/)?.[0] || '0', 10);
        const pLPA = parseIncomeNum(p.annualIncome);
        if (pLPA < reqLPA) return false;
      }

      // 11. Work Setup / Mode
      if (selectedWorkMode !== 'All' && selectedWorkMode !== 'All Modes') {
        const mode = (p.workLocationType || '').toLowerCase();
        if (selectedWorkMode === 'Hybrid / Remote') {
          if (!mode.includes('hybrid') && !mode.includes('remote')) return false;
        } else if (selectedWorkMode === 'On-site / Office') {
          if (!mode.includes('on-site') && !mode.includes('hospital') && !mode.includes('chambers') && !mode.includes('office') && !mode.includes('business') && !mode.includes('administrative') && !mode.includes('flights')) return false;
        }
      }

      // 12. Family Type
      if (selectedFamilyType !== 'All' && selectedFamilyType !== 'All Family Types') {
        const fType = (p.familyDetails?.type || '').toLowerCase();
        if (selectedFamilyType === 'Nuclear Family') {
          if (!fType.includes('nuclear')) return false;
        } else if (selectedFamilyType === 'Joint Family') {
          if (!fType.includes('joint')) return false;
        }
      }

      // 13. Family Financial Status
      if (selectedFamilyStatus !== 'All' && selectedFamilyStatus !== 'All Financial Statuses') {
        const fStatus = (p.familyDetails?.financialStatus || '').toLowerCase();
        if (selectedFamilyStatus === 'Middle Class') {
          if (!fStatus.includes('middle class') || fStatus.includes('upper middle')) return false;
        } else if (selectedFamilyStatus === 'Upper Middle Class') {
          if (!fStatus.includes('upper middle')) return false;
        } else if (selectedFamilyStatus === 'Rich / Affluent') {
          if (!fStatus.includes('rich') && !fStatus.includes('affluent') && !fStatus.includes('hni') && !fStatus.includes('ultra')) return false;
        }
      }

      // 14. Dietary Preference
      if (selectedDiet !== 'All') {
        const diet = (p.diet || '').toLowerCase();
        if (selectedDiet === 'Vegetarian' && !diet.includes('vegetarian')) return false;
        if (selectedDiet === 'Pure Vegetarian' && !diet.includes('pure vegetarian') && !diet.includes('strict jain')) return false;
        if (selectedDiet === 'Eggetarian' && !diet.includes('eggetarian')) return false;
        if (selectedDiet === 'Non-Vegetarian' && !diet.includes('non-vegetarian')) return false;
        if (selectedDiet === 'Strict Jain' && !diet.includes('jain')) return false;
      }

      // 15. Drinking Habit
      if (selectedDrinking !== 'All') {
        const drink = p.drinking;
        if (selectedDrinking === 'Never Drinks') {
          if (drink !== 'Never') return false;
        } else if (selectedDrinking === 'Social / Occasional OK') {
          if (drink !== 'Never' && drink !== 'Socially' && drink !== 'Occasionally') return false;
        }
      }

      // 16. Smoking Habit
      if (selectedSmoking !== 'All') {
        const smoke = p.smoking;
        if (selectedSmoking === 'Non-Smoker Only') {
          if (smoke !== 'No' && smoke !== 'Never') return false;
        }
      }

      // 17. Trust & Verification Only
      if (verifiedOnly && !p.verified && !p.aadhaarVerified) return false;

      // 18. Public Photos Only
      if (photoOnly && (p.photoVisibility === 'request' || !p.photo)) return false;

      // 19. Membership Plan (Paid vs Not Paid)
      if (membershipFilter && membershipFilter !== 'All') {
        const isProfilePaid = Boolean(p.isPaid || (p.membership && p.membership !== 'free'));
        if (membershipFilter === 'Paid' && !isProfilePaid) return false;
        if (membershipFilter === 'Not Paid' && isProfilePaid) return false;
      }

      // 20. Mobile Number Available
      if (phoneOnly && !p.phone && !p.mobile) return false;

      // 21. Mobile Number Direct Search
      if (mobileSearchNumber && mobileSearchNumber.trim() !== '') {
        const queryClean = mobileSearchNumber.replace(/\D/g, '');
        const phoneClean = (p.phone || '').replace(/\D/g, '');
        const mobileClean = (p.mobile || '').replace(/\D/g, '');
        if (!phoneClean.includes(queryClean) && !mobileClean.includes(queryClean)) {
          return false;
        }
      }

      return true;
    });
  }, [
    profiles,
    currentUser,
    guestLookingFor,
    selectedState,
    selectedDistrict,
    selectedReligion,
    selectedCaste,
    minAge,
    maxAge,
    minHeight,
    selectedMaritalStatus,
    selectedEducation,
    selectedProfession,
    minIncome,
    selectedDiet,
    verifiedOnly,
    photoOnly,
    selectedWorkMode,
    selectedFamilyType,
    selectedFamilyStatus,
    selectedDrinking,
    selectedSmoking,
    membershipFilter,
    phoneOnly,
    mobileSearchNumber
  ]);

  const filteredMatchesCount = filteredProfiles.length;

  // Profiles for website showcase:
  // - If user is logged in with gender, strictly filter by opposite gender
  // - If guest / unauthenticated, provide ALL candidates (both Gents and Women) to WebsiteView
  const websiteProfiles = useMemo(() => {
    if (currentUser?.gender) {
      const targetGender = getTargetCandidateGender(currentUser);
      return profiles.filter(p => {
        if (isSelfProfile(p, currentUser)) return false;
        return isCandidateMatchingTarget(p, targetGender);
      });
    }
    return profiles;
  }, [profiles, currentUser]);

  const totalUnreadChatCount = currentUser ? conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0) : 0;

  return (
    <ThemeProvider>
      <PhotoPrivacyProvider>
        {/* Premium Luxury Splash Screen on initial app launch */}
        {showSplash && (
          <SplashScreen onFinish={handleSplashFinish} duration={2800} />
        )}
        {viewMode === 'website' ? (
          <>
            {/* 1. Website View */}
            <WebsiteView 
              profiles={websiteProfiles}
              currentUser={currentUser}
              currentScreen={currentScreen}
              interestsSent={interestsSent}
              onToggleInterest={handleToggleInterest}
              onRequestSendInterest={handleOpenSendInterest}
              shortlisted={shortlisted}
              onToggleShortlist={handleToggleShortlist}
              onSelectProfile={handleSelectProfile}
              selectedReligion={selectedReligion}
              onSelectReligion={(rel) => setSelectedReligion(rel)}
              onQuickSearch={(filters) => {
                if (filters?.gender) setGuestLookingFor(filters.gender);
                if (filters?.state) setSelectedState(filters.state);
                if (filters?.district) setSelectedDistrict(filters.district);
                if (filters?.religion) setSelectedReligion(filters.religion);
                if (filters?.minAge) setMinAge(filters.minAge);
                if (filters?.maxAge) setMaxAge(filters.maxAge);
              }}
              onStartChat={(pid) => {
                handleStartChat(pid);
                setViewMode('app');
                setActiveTab('chat');
              }}
              onOpenLogin={() => setCurrentScreen('login')}
              onOpenRegister={handleOpenRegister}
              onLogout={handleLogout}
              onOpenOffers={handleOpenOffers}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              unreadNotificationsCount={unreadNotificationsCount}
              candidateStatuses={CANDIDATE_STATUSES}
              myStatus={myStatus}
              onOpenStatusViewer={handleOpenStatusViewer}
              onOpenStatusEditor={handleOpenStatusEditor}
              onSelectPlanForPayment={handleSelectPlanForPayment}
              onOpenAadhaarVerification={() => {
                setAadhaarOrigin('website');
                setCurrentScreen('verify-aadhaar');
              }}
              viewMode={viewMode}
              setViewMode={setViewMode}
              isProduction={isProduction}
              onToggleProductionMode={handleToggleProductionMode}
              membershipPlans={membershipPlans}
              offers={activeOffers}
              onOpenAppModal={() => setIsAppModalOpen(true)}
              onOpenEditProfile={() => setIsEditProfileModalOpen(true)}
            />

            {/* Global Edit Profile Modal on Website */}
            {isEditProfileModalOpen && (
              <EditProfileModal
                isOpen={isEditProfileModalOpen}
                currentUser={currentUser}
                onClose={() => setIsEditProfileModalOpen(false)}
                onProfileUpdated={(updatedProfile) => {
                  setCurrentUser(prev => {
                    const base = prev || {};
                    const merged = { ...base, ...updatedProfile };
                    try {
                      localStorage.setItem('i4u_auth_user', JSON.stringify(merged));
                    } catch (e) {}
                    return merged;
                  });
                  showToast('Profile updated and saved to Supabase! ✨');
                }}
              />
            )}

            {/* SCREEN 1: Dedicated Login Modal on Website */}
            {currentScreen === 'login' && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#D4AF37]/40 relative">
                  <LoginScreen 
                    onLoginSuccess={handleLoginSuccess}
                    setCurrentScreen={setCurrentScreen}
                    onNavigateToRegister={handleOpenRegister}
                    onBack={() => setCurrentScreen('app')}
                  />
                </div>
              </div>
            )}

            {/* SCREEN 2: Dedicated Register Modal on Website */}
            {currentScreen === 'register' && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className={`w-full ${registeredVerifiedPhone ? 'max-w-xl max-h-[90vh]' : 'max-w-md'} overflow-y-auto bg-white rounded-3xl shadow-2xl border border-[#D4AF37]/40 relative`}>
                  {registeredVerifiedPhone ? (
                    <RegistrationWizard 
                      initialData={{ mobile: registeredVerifiedPhone, mobileVerified: true }}
                      onRegistrationComplete={(regData) => {
                        setRegisteredVerifiedPhone(null);
                        if (regData?.aadhaarVerified) {
                          handleAadhaarVerificationSuccess(regData);
                        } else {
                          handleVerificationSuccess(regData);
                        }
                        setCurrentScreen('app');
                      }}
                      onProceedToVerification={(regData) => {
                        setRegisteredVerifiedPhone(null);
                        handleProceedToVerification(regData);
                      }}
                      setCurrentScreen={setCurrentScreen}
                      onNavigateToLogin={() => {
                        setRegisteredVerifiedPhone(null);
                        setCurrentScreen('login');
                      }}
                      onBack={() => setRegisteredVerifiedPhone(null)}
                    />
                  ) : (
                    <RegisterPhoneVerification 
                      onVerificationSuccess={(phone) => setRegisteredVerifiedPhone(phone)}
                      onGoogleLogin={(user) => {
                        handleLoginSuccess(user);
                        setCurrentScreen('app');
                      }}
                      onNavigateToLogin={() => {
                        setRegisteredVerifiedPhone(null);
                        setCurrentScreen('login');
                      }}
                      onBack={() => setCurrentScreen('app')}
                      isWebsiteModal={true}
                    />
                  )}
                </div>
              </div>
            )}

            {/* SCREEN 3.5: Aadhaar Verification Modal on Website */}
            {currentScreen === 'verify-aadhaar' && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#D4AF37]/40 relative">
                  <AadhaarVerificationScreen 
                    registrationData={pendingRegistration || currentUser}
                    onVerificationSuccess={(data) => {
                      handleAadhaarVerificationSuccess(data);
                      setCurrentScreen('app');
                    }}
                    onBack={() => setCurrentScreen('app')}
                    isProduction={isProduction}
                  />
                </div>
              </div>
            )}

            {/* SCREEN 3.8: Dedicated Offers & Plans Screen */}
            {currentScreen === 'offers' && (
              <MobileOffersAndPlansSheet 
                isOpen={true}
                onClose={() => setCurrentScreen('app')}
                isWebsiteModal={true}
                currentUser={currentUser}
                onSelectPlanForPayment={handleSelectPlanForPayment}
                onOpenLogin={() => setCurrentScreen('login')}
                onViewInvoices={() => {
                  setCurrentScreen('app');
                  setViewMode('app');
                  setActiveTab('account');
                }}
                plans={membershipPlans}
                offers={activeOffers}
              />
            )}

            {/* Overlays in Website Mode */}
            {selectedProfile && (
              <ProfileModal 
                profile={selectedProfile}
                currentUser={currentUser}
                onClose={() => setSelectedProfile(null)}
                onToggleInterest={handleToggleInterest}
                isInterested={isProfileInterested(selectedProfile)}
                onToggleShortlist={handleToggleShortlist}
                isShortlisted={isProfileShortlisted(selectedProfile)}
                onOpenAadhaarVerification={() => {
                  setAadhaarOrigin('app');
                  setCurrentScreen('verify-aadhaar');
                }}
                onOpenOffers={handleOpenOffers}
                onUnlockContact={handleUnlockContact}
                onStartChat={(pid) => {
                  setSelectedProfile(null);
                  handleStartChat(pid);
                  setViewMode('app');
                  setActiveTab('chat');
                }}
                allProfiles={profiles}
                onSelectProfile={handleSelectProfile}
                onRequestSendInterest={handleOpenSendInterest}
                onStartAudioCall={handleStartAudioCall}
                onStartVideoCall={handleStartVideoCall}
              />
            )}

            {/* WhatsApp Status System Overlays */}
            <WhatsAppStatusSystem
              myStatus={myStatus}
              activeStoryViewer={activeStoryViewer}
              onCloseStoryViewer={() => setActiveStoryViewer(null)}
              isWebsite={true}
              statusEditorOpen={isStatusEditorOpen}
              onCloseStatusEditor={() => setIsStatusEditorOpen(false)}
              onOpenStatusEditor={handleOpenStatusEditor}
              statusMenuOpen={statusMenuData}
              onCloseStatusMenu={() => setStatusMenuData(null)}
              onOpenStatusMenu={handleOpenStatusMenu}
              onSaveMyStatus={handleSaveMyStatus}
              onDeleteMyStatus={handleDeleteMyStatus}
              onToggleHideMyStatus={handleToggleHideMyStatus}
              onHideOtherStatus={handleHideOtherStatus}
              onRemoveOtherStatus={handleRemoveOtherStatus}
              onOpenProfile={handleSelectProfile}
              onOpenChat={(pid) => {
                setActiveStoryViewer(null);
                handleStartChat(pid);
                setViewMode('app');
                setActiveTab('chat');
              }}
              onToggleInterest={handleToggleInterest}
              isInterested={isProfileInterested(activeStoryViewer?.profile)}
            />

            {/* Mobile Notifications Center Sheet */}
            <MobileNotificationsSheet 
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              isWebsiteModal={true}
              currentUser={currentUser}
              onOpenLogin={() => {
                setIsNotificationsOpen(false);
                setCurrentScreen('login');
              }}
              notifications={currentUser ? notifications : []}
              profiles={profiles}
              onMarkAsRead={handleMarkNotificationAsRead}
              onMarkAllAsRead={handleMarkAllNotificationsAsRead}
              onDeleteNotification={handleDeleteNotification}
              onAcceptInterest={handleAcceptInterestNotification}
              onDeclineInterest={handleDeclineInterestNotification}
              onSendInterest={handleToggleInterest}
              onOpenChat={(profileId, initialMsg) => {
                setIsNotificationsOpen(false);
                handleStartChat(profileId, initialMsg);
                setViewMode('app');
                setActiveTab('chat');
              }}
              onOpenProfile={(profile) => {
                setIsNotificationsOpen(false);
                handleSelectProfile(profile);
              }}
              onSimulateNotification={handleSimulateNotification}
            />

            {/* Mobile Offers & Membership Plans Sheet */}
            <MobileOffersAndPlansSheet 
              isOpen={isOffersSheetOpen}
              onClose={() => setIsOffersSheetOpen(false)}
              isWebsiteModal={true}
              currentUser={currentUser}
              onSelectPlanForPayment={handleSelectPlanForPayment}
              onOpenLogin={() => {
                setIsOffersSheetOpen(false);
                setCurrentScreen('login');
              }}
              onViewInvoices={() => {
                setIsOffersSheetOpen(false);
                setViewMode('app');
                setActiveTab('account');
              }}
              plans={membershipPlans}
              offers={activeOffers}
            />

            {/* Mobile Multi-Method Payment Modal */}
            <MobilePaymentModal 
              isOpen={isPaymentModalOpen}
              plan={selectedPlanForPayment}
              durationMonths={paymentDuration}
              initialCoupon={paymentCoupon}
              currentUser={currentUser}
              offers={activeOffers}
              onClose={() => setIsPaymentModalOpen(false)}
              onPaymentSuccess={handlePaymentSuccess}
              onViewInvoice={(inv) => {
                setIsPaymentModalOpen(false);
                setActiveInvoice(inv);
              }}
              isWebsiteModal={true}
            />

            {/* Official Matrimony GST Tax Invoice Modal */}
            <PaymentInvoiceModal 
              invoice={activeInvoice}
              currentUser={currentUser}
              onClose={() => setActiveInvoice(null)}
              isWebsiteModal={true}
            />

            {/* Authentic Matrimonial Interest Message Composer Modal in Website Mode */}
            {interestModalCandidate && !isAppModalOpen && (
              <SendInterestModal 
                isOpen={Boolean(interestModalCandidate)}
                candidate={interestModalCandidate}
                currentUser={currentUser}
                isAlreadyInterested={isProfileInterested(interestModalCandidate)}
                isIncomingInterest={Boolean(
                  notifications.some(n => 
                    n.type === 'interest_received' && 
                    n.status !== 'accepted' && 
                    (n.profileId === interestModalCandidate.id || n.profileId === interestModalCandidate.registerId || n.profileId === interestModalCandidate.register_id)
                  )
                )}
                onSendInterest={handleConfirmSendInterest}
                onAcceptInterest={handleAcceptIncomingInterest}
                onClose={() => setInterestModalCandidate(null)}
                isWebsiteModal={true}
              />
            )}

            {/* 80% Screen Mobile App Modal Over Website */}
            <MobileAppModal 
              isOpen={isAppModalOpen}
              onClose={() => setIsAppModalOpen(false)}
              onSwitchToFullApp={() => {
                setIsAppModalOpen(false);
                setViewMode('app');
              }}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              isProduction={isProduction}
              onSwitchDemoGender={handleSwitchDemoGender}
              onLogout={handleLogout}
              onOpenLogin={() => {
                setIsAppModalOpen(false);
                setCurrentScreen('login');
              }}
              onOpenRegister={() => {
                setIsAppModalOpen(false);
                handleOpenRegister();
              }}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              profiles={profiles}
              filteredProfiles={filteredProfiles}
              interestsSent={interestsSent}
              onToggleInterest={handleToggleInterest}
              shortlisted={shortlisted}
              onToggleShortlist={handleToggleShortlist}
              selectedProfile={selectedProfile}
              setSelectedProfile={setSelectedProfile}
              onSelectProfile={handleSelectProfile}
              conversations={conversations}
              setConversations={setConversations}
              activeChatProfileId={activeChatProfileId}
              setActiveChatProfileId={setActiveChatProfileId}
              isDirectChatOpen={isDirectChatOpen}
              setIsDirectChatOpen={setIsDirectChatOpen}
              notifications={notifications}
              unreadNotificationsCount={unreadNotificationsCount}
              isNotificationsOpen={isNotificationsOpen}
              setIsNotificationsOpen={setIsNotificationsOpen}
              onMarkNotificationAsRead={handleMarkNotificationAsRead}
              onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
              onDeleteNotification={handleDeleteNotification}
              onAcceptInterestNotification={handleAcceptInterestNotification}
              onDeclineInterestNotification={handleDeclineInterestNotification}
              onSimulateNotification={handleSimulateNotification}
              myStatus={myStatus}
              candidateStatuses={CANDIDATE_STATUSES}
              hiddenStatusIds={hiddenStatusIds}
              deletedStatusIds={deletedStatusIds}
              onOpenStatusViewer={handleOpenStatusViewer}
              onOpenStatusEditor={handleOpenStatusEditor}
              onOpenStatusMenu={handleOpenStatusMenu}
              onSaveMyStatus={handleSaveMyStatus}
              onDeleteMyStatus={handleDeleteMyStatus}
              onToggleHideMyStatus={handleToggleHideMyStatus}
              onHideOtherStatus={handleHideOtherStatus}
              onRemoveOtherStatus={handleRemoveOtherStatus}
              activeStoryViewer={activeStoryViewer}
              setActiveStoryViewer={setActiveStoryViewer}
              isStatusEditorOpen={isStatusEditorOpen}
              setIsStatusEditorOpen={setIsStatusEditorOpen}
              statusMenuData={statusMenuData}
              setStatusMenuData={setStatusMenuData}
              isFilterSheetOpen={isFilterSheetOpen}
              setIsFilterSheetOpen={setIsFilterSheetOpen}
              activeFiltersCount={activeFiltersCount}
              onResetFilters={handleResetFilters}
              selectedState={selectedState}
              setSelectedState={setSelectedState}
              selectedDistrict={selectedDistrict}
              setSelectedDistrict={setSelectedDistrict}
              selectedReligion={selectedReligion}
              setSelectedReligion={setSelectedReligion}
              selectedCaste={selectedCaste}
              setSelectedCaste={setSelectedCaste}
              minAge={minAge}
              setMinAge={setMinAge}
              maxAge={maxAge}
              setMaxAge={setMaxAge}
              minHeight={minHeight}
              setMinHeight={setMinHeight}
              selectedMaritalStatus={selectedMaritalStatus}
              setSelectedMaritalStatus={setSelectedMaritalStatus}
              selectedEducation={selectedEducation}
              setSelectedEducation={setSelectedEducation}
              selectedProfession={selectedProfession}
              setSelectedProfession={setSelectedProfession}
              minIncome={minIncome}
              setMinIncome={setMinIncome}
              selectedDiet={selectedDiet}
              setSelectedDiet={setSelectedDiet}
              selectedDrinking={selectedDrinking}
              setSelectedDrinking={setSelectedDrinking}
              selectedSmoking={selectedSmoking}
              setSelectedSmoking={setSelectedSmoking}
              selectedWorkMode={selectedWorkMode}
              setSelectedWorkMode={setSelectedWorkMode}
              selectedFamilyType={selectedFamilyType}
              setSelectedFamilyType={setSelectedFamilyType}
              selectedFamilyStatus={selectedFamilyStatus}
              setSelectedFamilyStatus={setSelectedFamilyStatus}
              verifiedOnly={verifiedOnly}
              setVerifiedOnly={setVerifiedOnly}
              photoOnly={photoOnly}
              setPhotoOnly={setPhotoOnly}
              membershipFilter={membershipFilter}
              setMembershipFilter={setMembershipFilter}
              phoneOnly={phoneOnly}
              setPhoneOnly={setPhoneOnly}
              mobileSearchNumber={mobileSearchNumber}
              setMobileSearchNumber={setMobileSearchNumber}
              isOffersSheetOpen={isOffersSheetOpen}
              setIsOffersSheetOpen={setIsOffersSheetOpen}
              onOpenOffers={handleOpenOffers}
              membershipPlans={membershipPlans}
              offers={activeOffers}
              selectedPlanForPayment={selectedPlanForPayment}
              paymentDuration={paymentDuration}
              paymentCoupon={paymentCoupon}
              isPaymentModalOpen={isPaymentModalOpen}
              setIsPaymentModalOpen={setIsPaymentModalOpen}
              activeInvoice={activeInvoice}
              setActiveInvoice={setActiveInvoice}
              handleSelectPlanForPayment={handleSelectPlanForPayment}
              handlePaymentSuccess={handlePaymentSuccess}
              handleUnlockContact={handleUnlockContact}
              isPhotoManagerOpen={isPhotoManagerOpen}
              setIsPhotoManagerOpen={setIsPhotoManagerOpen}
              photoManagerTab={photoManagerTab}
              setPhotoManagerTab={setPhotoManagerTab}
              onUpdatePhotos={handlePhotoUpdateAction}
              isThemeSettingsOpen={isThemeSettingsOpen}
              setIsThemeSettingsOpen={setIsThemeSettingsOpen}
              handleStartChat={handleStartChat}
              onAadhaarVerificationComplete={handleAadhaarVerificationSuccess}
              showToast={showToast}
              interestsSegment={interestsSegment}
              setInterestsSegment={setInterestsSegment}
              declinedReceivedIds={declinedReceivedIds}
              handleDeclineReceivedInterest={handleDeclineReceivedInterest}
              handleUndoDeclineReceivedInterest={handleUndoDeclineReceivedInterest}
              handleAcceptReceivedInterest={handleAcceptReceivedInterest}
              onRequestSendInterest={handleOpenSendInterest}
              interestModalCandidate={interestModalCandidate}
              setInterestModalCandidate={setInterestModalCandidate}
              onStartAudioCall={handleStartAudioCall}
              onStartVideoCall={handleStartVideoCall}
            />

            {/* Floating Toast Notification */}
            {toastMessage && (
              <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none max-w-md w-[90%]">
                <div className="bg-[#0B192C]/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#D4AF37]/50 flex items-center space-x-2.5 text-xs font-semibold backdrop-blur-md">
                  <Sparkles className="w-4 h-4 text-[#DFB76C] shrink-0" />
                  <span className="truncate">{toastMessage}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <DeviceFrameSimulator 
            deviceMode={deviceMode} 
            setDeviceMode={setDeviceMode}
            currentScreen={currentScreen}
            setCurrentScreen={setCurrentScreen}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            unreadNotificationsCount={unreadNotificationsCount}
            activeStoryViewer={activeStoryViewer}
            onOpenOffers={handleOpenOffers}
            onOpenThemeSettings={handleOpenThemeSettings}
            onSwitchToWebsite={() => setViewMode('website')}
            isProduction={isProduction}
            onToggleProductionMode={handleToggleProductionMode}
            currentUser={currentUser}
            onLogout={handleLogout}
            onSwitchDemoGender={handleSwitchDemoGender}
          >
        
        {/* Universal Theme & Appearance Settings Sheet (for Login/Register/Verification screens) */}
        {currentScreen !== 'app' && (
          <MobileThemeSettingsSheet 
            isOpen={isThemeSettingsOpen}
            onClose={() => setIsThemeSettingsOpen(false)}
          />
        )}

        {/* Floating Mobile Toast Notification */}
        {toastMessage && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none w-[90%]">
            <div className="bg-[#0B192C]/95 text-white px-3.5 py-2.5 rounded-2xl shadow-xl border border-[#D4AF37]/50 flex items-center space-x-2 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#DFB76C] shrink-0" />
              <span className="truncate">{toastMessage}</span>
            </div>
          </div>
        )}

      {/* SCREEN 1: Dedicated Login Page */}
      {currentScreen === 'login' && (
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess}
          setCurrentScreen={setCurrentScreen}
          onNavigateToRegister={handleOpenRegister}
          onBack={() => setCurrentScreen('app')}
        />
      )}

      {/* SCREEN 2: Dedicated Registration Wizard */}
      {currentScreen === 'register' && (
        registeredVerifiedPhone ? (
          <RegistrationWizard 
            initialData={{ mobile: registeredVerifiedPhone, mobileVerified: true }}
            onRegistrationComplete={(regData) => {
              setRegisteredVerifiedPhone(null);
              if (regData?.aadhaarVerified) {
                handleAadhaarVerificationSuccess(regData);
              } else {
                handleVerificationSuccess(regData);
              }
            }}
            onProceedToVerification={(regData) => {
              setRegisteredVerifiedPhone(null);
              handleProceedToVerification(regData);
            }}
            setCurrentScreen={setCurrentScreen}
            onNavigateToLogin={() => {
              setRegisteredVerifiedPhone(null);
              setCurrentScreen('login');
            }}
            onBack={() => setRegisteredVerifiedPhone(null)}
          />
        ) : (
          <RegisterPhoneVerification 
            onVerificationSuccess={(phone) => setRegisteredVerifiedPhone(phone)}
            onGoogleLogin={(user) => {
              handleLoginSuccess(user);
              setCurrentScreen('app');
            }}
            onNavigateToLogin={() => {
              setRegisteredVerifiedPhone(null);
              setCurrentScreen('login');
            }}
            onBack={() => setCurrentScreen('app')}
          />
        )
      )}

      {/* SCREEN 3: Mobile Phone SMS OTP Verification */}
      {currentScreen === 'verify-mobile' && (
        <MobileVerificationScreen 
          registrationData={pendingRegistration || currentUser}
          onVerificationSuccess={handleVerificationSuccess}
          onBack={() => setCurrentScreen('app')}
        />
      )}

      {/* SCREEN 3.5: Mobile Aadhaar UIDAI Verification */}
      {currentScreen === 'verify-aadhaar' && (
        <AadhaarVerificationScreen 
          registrationData={pendingRegistration || currentUser}
          onVerificationSuccess={handleAadhaarVerificationSuccess}
          onBack={() => {
            if (aadhaarOrigin === 'website') {
              setViewMode('website');
            }
            setCurrentScreen('app');
          }}
          isProduction={isProduction}
        />
      )}

      {/* SCREEN 3.8: Dedicated Offers & Plans Screen */}
      {currentScreen === 'offers' && (
        <MobileOffersAndPlansSheet 
          isOpen={true}
          onClose={() => setCurrentScreen('app')}
          currentUser={currentUser}
          onSelectPlanForPayment={handleSelectPlanForPayment}
          onOpenLogin={() => setCurrentScreen('login')}
          onViewInvoices={() => {
            setCurrentScreen('app');
            setActiveTab('account');
          }}
          plans={membershipPlans}
          offers={activeOffers}
        />
      )}

      {/* SCREEN 4: Main Application Shell (Tabs) */}
      {currentScreen === 'app' && (
        <MobileAppShell
          activeTab={activeTab}
          setActiveTab={(tabId) => {
            if (tabId === 'chat' && activeTab !== 'chat') {
              setIsDirectChatOpen(false);
            }
            setActiveTab(tabId);
          }}
          unreadCount={totalUnreadChatCount}
          interestCount={currentUser ? interestsSent.length : 0}
          unreadNotificationsCount={unreadNotificationsCount}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          currentUser={currentUser}
          onOpenFilter={() => setIsFilterSheetOpen(true)}
          onOpenLogin={() => setCurrentScreen('login')}
          deviceType={deviceMode}
          activeFiltersCount={activeFiltersCount}
          hideFloatingNotification={Boolean(selectedProfile || isDirectChatOpen || activeTab === 'chat')}
          hideBottomNav={Boolean(activeTab === 'chat' && isDirectChatOpen)}
          overlays={
            <>
              {/* Mobile Notifications Center Sheet */}
              <MobileNotificationsSheet 
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                currentUser={currentUser}
                onOpenLogin={() => {
                  setIsNotificationsOpen(false);
                  setCurrentScreen('login');
                }}
                notifications={currentUser ? notifications : []}
                profiles={profiles}
                onMarkAsRead={handleMarkNotificationAsRead}
                onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                onDeleteNotification={handleDeleteNotification}
                onAcceptInterest={handleAcceptInterestNotification}
                onDeclineInterest={handleDeclineInterestNotification}
                onSendInterest={(profileId) => {
                  handleToggleInterest(profileId);
                }}
                onOpenChat={(profileId, initialMsg) => {
                  setIsNotificationsOpen(false);
                  handleStartChat(profileId, initialMsg);
                }}
                onOpenProfile={(profile) => {
                  setIsNotificationsOpen(false);
                  handleSelectProfile(profile);
                }}
                onSimulateNotification={handleSimulateNotification}
              />

              {/* Mobile Profile Detail Sheet Modal */}
              {selectedProfile && (
                <MobileProfileDetailSheet 
                  profile={selectedProfile}
                  currentUser={currentUser}
                  onClose={() => setSelectedProfile(null)}
                  onToggleInterest={handleToggleInterest}
                  isInterested={isProfileInterested(selectedProfile)}
                  onToggleShortlist={handleToggleShortlist}
                  isShortlisted={isProfileShortlisted(selectedProfile)}
                  onStartChat={handleStartChat}
                  onRequestSendInterest={handleOpenSendInterest}
                  onStartAudioCall={handleStartAudioCall}
                  onStartVideoCall={handleStartVideoCall}
                  onOpenAadhaarVerification={() => {
                    setAadhaarOrigin('app');
                    setCurrentScreen('verify-aadhaar');
                  }}
                  onOpenOffers={handleOpenOffers}
                  onUnlockContact={handleUnlockContact}
                />
              )}

              {/* Mobile Bottom Filter Sheet */}
              <MobileFilterBottomSheet 
                isOpen={isFilterSheetOpen}
                onClose={() => setIsFilterSheetOpen(false)}
                selectedState={selectedState}
                setSelectedState={setSelectedState}
                selectedDistrict={selectedDistrict}
                setSelectedDistrict={setSelectedDistrict}
                selectedReligion={selectedReligion}
                setSelectedReligion={setSelectedReligion}
                selectedCaste={selectedCaste}
                setSelectedCaste={setSelectedCaste}
                minAge={minAge}
                setMinAge={setMinAge}
                maxAge={maxAge}
                setMaxAge={setMaxAge}
                minHeight={minHeight}
                setMinHeight={setMinHeight}
                selectedMaritalStatus={selectedMaritalStatus}
                setSelectedMaritalStatus={setSelectedMaritalStatus}
                selectedEducation={selectedEducation}
                setSelectedEducation={setSelectedEducation}
                selectedProfession={selectedProfession}
                setSelectedProfession={setSelectedProfession}
                minIncome={minIncome}
                setMinIncome={setMinIncome}
                selectedDiet={selectedDiet}
                setSelectedDiet={setSelectedDiet}
                selectedDrinking={selectedDrinking}
                setSelectedDrinking={setSelectedDrinking}
                selectedSmoking={selectedSmoking}
                setSelectedSmoking={setSelectedSmoking}
                selectedWorkMode={selectedWorkMode}
                setSelectedWorkMode={setSelectedWorkMode}
                selectedFamilyType={selectedFamilyType}
                setSelectedFamilyType={setSelectedFamilyType}
                selectedFamilyStatus={selectedFamilyStatus}
                setSelectedFamilyStatus={setSelectedFamilyStatus}
                verifiedOnly={verifiedOnly}
                setVerifiedOnly={setVerifiedOnly}
                photoOnly={photoOnly}
                setPhotoOnly={setPhotoOnly}
                membershipFilter={membershipFilter}
                setMembershipFilter={setMembershipFilter}
                phoneOnly={phoneOnly}
                setPhoneOnly={setPhoneOnly}
                mobileSearchNumber={mobileSearchNumber}
                setMobileSearchNumber={setMobileSearchNumber}
                onReset={handleResetFilters}
                totalMatching={filteredMatchesCount}
                activeFiltersCount={activeFiltersCount}
                currentUser={currentUser}
              />

              {/* WhatsApp Status System Overlays: Story Viewer, Status Creator (Photo/Video ≤60s/Text), Context Menu */}
              <WhatsAppStatusSystem
                myStatus={myStatus}
                activeStoryViewer={activeStoryViewer}
                onCloseStoryViewer={() => setActiveStoryViewer(null)}
                statusEditorOpen={isStatusEditorOpen}
                onCloseStatusEditor={() => setIsStatusEditorOpen(false)}
                onOpenStatusEditor={handleOpenStatusEditor}
                statusMenuOpen={statusMenuData}
                onCloseStatusMenu={() => setStatusMenuData(null)}
                onOpenStatusMenu={handleOpenStatusMenu}
                onSaveMyStatus={handleSaveMyStatus}
                onDeleteMyStatus={handleDeleteMyStatus}
                onToggleHideMyStatus={handleToggleHideMyStatus}
                onHideOtherStatus={handleHideOtherStatus}
                onRemoveOtherStatus={handleRemoveOtherStatus}
                onOpenProfile={handleSelectProfile}
                onOpenChat={(pid) => handleStartChat(pid)}
                onToggleInterest={handleToggleInterest}
                isInterested={isProfileInterested(activeStoryViewer?.profile)}
              />

              {/* Mobile Photo Management Bottom Sheet (Confined to mobile device frame) */}
              <MobilePhotoManagerSheet 
                isOpen={isPhotoManagerOpen}
                onClose={() => setIsPhotoManagerOpen(false)}
                initialTab={photoManagerTab}
                currentUser={currentUser}
                onUpdatePhotos={handlePhotoUpdateAction}
              />

              {/* Photo Screenshot Restriction Mobile Alert & Shutter Privacy Shield */}
              <ScreenshotRestrictedBanner />
              <ScreenshotCaptureBlockOverlay />

              {/* Mobile Offers & Membership Plans Sheet */}
              <MobileOffersAndPlansSheet 
                isOpen={isOffersSheetOpen}
                onClose={() => setIsOffersSheetOpen(false)}
                currentUser={currentUser}
                onSelectPlanForPayment={handleSelectPlanForPayment}
                onOpenLogin={() => {
                  setIsOffersSheetOpen(false);
                  setCurrentScreen('login');
                }}
                onViewInvoices={() => {
                  setIsOffersSheetOpen(false);
                  setActiveTab('account');
                }}
                plans={membershipPlans}
                offers={activeOffers}
              />

              {/* Mobile Multi-Method Payment Modal */}
              <MobilePaymentModal 
                isOpen={isPaymentModalOpen}
                plan={selectedPlanForPayment}
                durationMonths={paymentDuration}
                initialCoupon={paymentCoupon}
                currentUser={currentUser}
                offers={activeOffers}
                onClose={() => setIsPaymentModalOpen(false)}
                onPaymentSuccess={handlePaymentSuccess}
                onViewInvoice={(inv) => {
                  setIsPaymentModalOpen(false);
                  setActiveInvoice(inv);
                }}
              />

              {/* Official Matrimony GST Tax Invoice Modal */}
              <PaymentInvoiceModal 
                invoice={activeInvoice}
                currentUser={currentUser}
                onClose={() => setActiveInvoice(null)}
              />

              {/* Mobile Theme & Appearance Settings Sheet (strictly bounded to mobile screen) */}
              <MobileThemeSettingsSheet 
                isOpen={isThemeSettingsOpen}
                onClose={() => setIsThemeSettingsOpen(false)}
              />

              {/* Authentic Matrimonial Interest Message Composer Modal inside Mobile App */}
              {interestModalCandidate && (
                <SendInterestModal 
                  isOpen={Boolean(interestModalCandidate)}
                  candidate={interestModalCandidate}
                  currentUser={currentUser}
                  isAlreadyInterested={isProfileInterested(interestModalCandidate)}
                  isIncomingInterest={Boolean(
                    notifications.some(n => 
                      n.type === 'interest_received' && 
                      n.status !== 'accepted' && 
                      (n.profileId === interestModalCandidate.id || n.profileId === interestModalCandidate.registerId || n.profileId === interestModalCandidate.register_id)
                    )
                  )}
                  onSendInterest={handleConfirmSendInterest}
                  onAcceptInterest={handleAcceptIncomingInterest}
                  onClose={() => setInterestModalCandidate(null)}
                  isWebsiteModal={false}
                />
              )}
            </>
          }
        >
          {/* Tab 1: Discover / Feed */}
          {activeTab === 'feed' && (
            <MobileMatchFeed 
              profiles={filteredProfiles}
              activeFiltersCount={activeFiltersCount}
              onResetFilters={handleResetFilters}
              currentUser={currentUser}
              currentScreen={currentScreen}
              interestsSent={interestsSent}
              onToggleInterest={handleToggleInterest}
              shortlisted={shortlisted}
              onToggleShortlist={handleToggleShortlist}
              onSelectProfile={handleSelectProfile}
              onStartChat={handleStartChat}
              onStartAudioCall={handleStartAudioCall}
              onStartVideoCall={handleStartVideoCall}
              onRequestSendInterest={handleOpenSendInterest}
              onOpenFilter={() => setIsFilterSheetOpen(true)}
              onOpenOffers={handleOpenOffers}
              offers={activeOffers}
              myStatus={myStatus}
              candidateStatuses={CANDIDATE_STATUSES}
              hiddenStatusIds={hiddenStatusIds}
              deletedStatusIds={deletedStatusIds}
              onOpenStatusViewer={handleOpenStatusViewer}
              onOpenStatusEditor={handleOpenStatusEditor}
              onOpenStatusMenu={handleOpenStatusMenu}
              onOpenAadhaarVerification={() => {
                setAadhaarOrigin('app');
                setCurrentScreen('verify-aadhaar');
              }}
            />
          )}

          {/* Tab 2: Advanced Search */}
          {activeTab === 'search' && (
            <MobileSearchScreen 
              profiles={filteredProfiles}
              currentUser={currentUser}
              interestsSent={interestsSent}
              onToggleInterest={handleToggleInterest}
              shortlisted={shortlisted}
              onToggleShortlist={handleToggleShortlist}
              onSelectProfile={handleSelectProfile}
              onStartChat={handleStartChat}
              onOpenFilter={() => setIsFilterSheetOpen(true)}
              activeFiltersCount={activeFiltersCount}
            />
          )}

          {/* Tab 3: Interests & Matches */}
          {activeTab === 'interests' && (
            <MobileInterestsScreen 
              profiles={profiles}
              currentUser={currentUser}
              onOpenLogin={() => setCurrentScreen('login')}
              interestsSent={interestsSent}
              onToggleInterest={handleToggleInterest}
              shortlisted={shortlisted}
              onToggleShortlist={handleToggleShortlist}
              onSelectProfile={handleSelectProfile}
              onStartChat={handleStartChat}
              activeSegment={interestsSegment}
              onSegmentChange={setInterestsSegment}
              declinedReceivedIds={declinedReceivedIds}
              onDeclineReceivedInterest={handleDeclineReceivedInterest}
              onUndoDeclineReceivedInterest={handleUndoDeclineReceivedInterest}
              onAcceptReceivedInterest={handleAcceptReceivedInterest}
            />
          )}

          {/* Tab 4: Messages / In-App Chat */}
          {activeTab === 'chat' && (
            <MobileChatScreen 
              profiles={profiles}
              currentUser={currentUser}
              onOpenLogin={() => setCurrentScreen('login')}
              conversations={conversations}
              setConversations={setConversations}
              activeProfileId={activeChatProfileId}
              setActiveProfileId={setActiveChatProfileId}
              onSelectProfile={handleSelectProfile}
              isDirectChatOpen={isDirectChatOpen}
              setIsDirectChatOpen={setIsDirectChatOpen}
              onOpenOffers={handleOpenOffers}
              onStartAudioCall={handleStartAudioCall}
              onStartVideoCall={handleStartVideoCall}
              onRequestSendInterest={handleOpenSendInterest}
              onToggleInterest={handleToggleInterest}
            />
          )}

          {/* Tab 5: Account & Profile */}
          {activeTab === 'account' && (
            <MobileAccountScreen 
              currentUser={currentUser}
              profiles={filteredProfiles || profiles}
              onSelectProfile={handleSelectProfile}
              onToggleInterest={handleToggleInterest}
              interestsSent={interestsSent}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              unreadNotificationsCount={unreadNotificationsCount}
              onOpenPhotoManager={(tab = 'single') => {
                setPhotoManagerTab(tab);
                setIsPhotoManagerOpen(true);
              }}
              onNavigateToInterests={(segment = 'sent') => {
                setInterestsSegment(segment);
                setActiveTab('interests');
              }}
              onUpdateLocation={(loc) => {
                setCurrentUser(prev => ({ ...prev, ...loc }));
                showToast(`Location set to ${loc.district} Dist., ${loc.state}`);
              }}
              onUpdatePhotos={handlePhotoUpdateAction}
              onUpdateProfile={(updated) => {
                setCurrentUser(prev => {
                  const base = prev || {};
                  const merged = { ...base, ...updated };
                  try {
                    localStorage.setItem('i4u_auth_user', JSON.stringify(merged));
                  } catch (e) {}
                  return merged;
                });
                setProfiles(prev => prev.map(p => (p.id === updated.id || (updated.phone && (p.phone === updated.phone || p.mobile === updated.phone))) ? { ...p, ...updated } : p));
                showToast('Profile updated successfully! ✨');
              }}
              onLoginSuccess={handleLoginSuccess}
              onRegistrationComplete={(regData) => {
                if (regData?.aadhaarVerified) {
                  handleAadhaarVerificationSuccess(regData);
                } else {
                  handleVerificationSuccess(regData);
                }
              }}
              onOpenLogin={() => setCurrentScreen('login')}
              onOpenRegister={handleOpenRegister}
              onOpenVerification={() => {
                setPendingRegistration(currentUser);
                setCurrentScreen('verify-mobile');
              }}
              onOpenAadhaarVerification={() => {
                setPendingRegistration(currentUser);
                setAadhaarOrigin('app');
                setCurrentScreen('verify-aadhaar');
              }}
              interestCount={interestsSent.length}
              shortlistCount={shortlisted.length}
              onOpenOffers={handleOpenOffers}
              offers={activeOffers}
              onViewInvoice={handleViewInvoice}
              onDeleteAccount={handleDeleteAccount}
              onOpenThemeSettings={handleOpenThemeSettings}
              isProduction={isProduction}
              onToggleProductionMode={handleToggleProductionMode}
              onLogout={handleLogout}
            />
          )}
        </MobileAppShell>
      )}

    </DeviceFrameSimulator>
    )}

    {/* Realtime WebRTC Incoming Call Overlay */}
    {incomingCallSession && (
      <IncomingCallModal 
        incomingCall={incomingCallSession}
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
      />
    )}

    {/* Encrypted Matrimonial Audio Calling Modal */}
    {activeAudioCallCandidate && (
      <AudioCallModal 
        isOpen={Boolean(activeAudioCallCandidate)}
        candidate={activeAudioCallCandidate}
        currentUser={currentUser}
        isCaller={isCallCaller}
        callSession={activeCallSession}
        onClose={() => {
          setActiveAudioCallCandidate(null);
          setActiveCallSession(null);
        }}
      />
    )}

    {/* Live HD Matrimonial Video Meeting Modal */}
    {activeVideoCallCandidate && (
      <VideoCallModal 
        isOpen={Boolean(activeVideoCallCandidate)}
        candidate={activeVideoCallCandidate}
        currentUser={currentUser}
        isCaller={isCallCaller}
        callSession={activeCallSession}
        onClose={() => {
          setActiveVideoCallCandidate(null);
          setActiveCallSession(null);
        }}
      />
    )}

    {/* Luxury Premium Upgrade Prompt Modal */}
    {premiumPromptFeature && (
      <PremiumUpgradePromptModal 
        isOpen={Boolean(premiumPromptFeature)}
        feature={premiumPromptFeature}
        candidateName="Members"
        onClose={() => setPremiumPromptFeature(null)}
        onOpenPlans={() => {
          setPremiumPromptFeature(null);
          handleOpenOffers();
        }}
      />
    )}

    </PhotoPrivacyProvider>
    </ThemeProvider>
  );
}
