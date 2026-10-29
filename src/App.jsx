import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { fetchLiveProfiles, recordLivePayment, registerLiveProfile, deletePersonalAccount, verifyLiveAadhaar, updateLivePhotos, updateLiveUserProfile, profileSyncChannel, mapSupabaseRowToProfile, fetchLivePlans, fetchLiveOffers, fetchLiveUserProfile, compressBase64Image, purgeDemoProfilesFromSupabase, isDemoProfile, fetchUserNotifications, markNotificationAsReadApi, deleteNotificationApi } from './services/api';
import { addCacheBuster } from './utils/cacheBuster';
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
import { fcmNotificationService } from './services/fcmNotificationService';
import PremiumUpgradePromptModal from './components/calling/PremiumUpgradePromptModal';
import { getAppMode, setAppMode } from './config/appConfig';
import { sendInAppNotificationWithEmail } from './services/emailNotificationService';

import { 
  INITIAL_PROFILES, 
  INITIAL_CONVERSATIONS, 
  DEMO_USER, 
  DEMO_USER_FEMALE, 
  DEMO_USER_MALE, 
  getConversationsForUser 
} from './data/mockProfiles';
import { 
  getTargetCandidateGender, 
  isCandidateMatchingTarget, 
  normalizeGender, 
  isSelfProfile 
} from './utils/genderMatch';
import { Sparkles } from 'lucide-react';

// Real notification state initializer: No hardcoded or mock arrays
export const getNotificationsForUser = () => [];
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
    const isAutoGenerated = user.isDraft || 
      (user.registerId && cleanPhone && user.registerId.toUpperCase() === `I4Y${cleanPhone.slice(-4)}` && user.name === `Member ${cleanPhone.slice(-4)}`);
    if (isAutoGenerated) {
      localStorage.removeItem('i4u_auth_user');
      return null;
    }
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

/**
 * Parameterized Route & Deep Link Strategy
 * Parses pathname, parameterized query parameters (?chat_id=..., ?user_id=..., ?tab=..., ?screen=..., ?reset=...),
 * and hash without throwing errors or 404 for SPA routing.
 */
export const parseRouteParams = (urlString = (typeof window !== 'undefined' ? window.location.href : '')) => {
  try {
    if (!urlString || typeof window === 'undefined') return { viewMode: null };
    const url = new URL(urlString, window.location?.origin || 'http://localhost');
    const rawPath = (url.pathname || '').toLowerCase().replace(/^\/+|\/+$/g, '');
    const segments = rawPath.split('/').filter(Boolean);
    const params = url.searchParams;

    // 1. Admin redirect detection
    if (segments.length > 0 && ['admin', 'super-admin', 'superadmin', 'admin-console', 'admin-portal'].includes(segments[0])) {
      return { isAdmin: true, viewMode: 'website' };
    }

    let viewMode = null;
    let currentScreen = null;
    let activeTab = null;
    let targetChatUserId = null;
    let targetChatId = null;
    let targetProfileId = null;

    // 2. Parse Path Segments (e.g. /app, /app/chat/:id, /chat/:id, /profile/:id)
    if (segments.length > 0) {
      if (segments[0] === 'app' || segments[0] === 'mobile') {
        viewMode = 'app';
        if (segments[1] === 'chat') {
          activeTab = 'chat';
          if (segments[2]) targetChatUserId = segments[2];
          if (segments[3]) targetChatId = segments[3];
        } else if (segments[1] === 'profile') {
          if (segments[2]) targetProfileId = segments[2];
        } else if (['feed', 'search', 'interests', 'chat', 'account'].includes(segments[1])) {
          activeTab = segments[1];
        } else if (['login', 'register', 'offers', 'verify-aadhaar'].includes(segments[1])) {
          currentScreen = segments[1];
        }
      } else if (segments[0] === 'chat') {
        viewMode = 'app';
        activeTab = 'chat';
        if (segments[1]) targetChatUserId = segments[1];
        if (segments[2]) targetChatId = segments[2];
      } else if (segments[0] === 'profile') {
        if (segments[1]) targetProfileId = segments[1];
      } else if (['feed', 'search', 'interests', 'account'].includes(segments[0])) {
        viewMode = 'app';
        activeTab = segments[0];
      } else if (['login', 'register', 'offers', 'verify-aadhaar'].includes(segments[0])) {
        currentScreen = segments[0];
      }
    }

    // 3. Parse Query Parameters (e.g. ?mode=app, ?tab=chat, ?chat_id=..., ?user_id=...)
    const modeParam = (params.get('mode') || params.get('view') || '').toLowerCase();
    if (modeParam === 'app' || params.has('app')) viewMode = 'app';
    if (modeParam === 'website') viewMode = 'website';

    const tabParam = (params.get('tab') || '').toLowerCase();
    if (['feed', 'search', 'interests', 'chat', 'account'].includes(tabParam)) {
      activeTab = tabParam;
      viewMode = 'app';
    }

    const screenParam = (params.get('screen') || '').toLowerCase();
    if (['login', 'register', 'offers', 'verify-aadhaar', 'app'].includes(screenParam)) {
      currentScreen = screenParam;
    }

    const qChatId = params.get('chat_id') || params.get('chatId') || params.get('conversation_id') || params.get('conversationId');
    const qUserId = params.get('user_id') || params.get('userId') || params.get('sender_id') || params.get('senderId') || params.get('target_id');
    if (qChatId || qUserId) {
      viewMode = 'app';
      activeTab = 'chat';
      if (qChatId) targetChatId = qChatId;
      if (qUserId) targetChatUserId = qUserId;
    }

    const qProfileId = params.get('profile') || params.get('profile_id') || params.get('profileId') || params.get('id');
    if (qProfileId && !qChatId && !qUserId) {
      targetProfileId = qProfileId;
    }

    // 4. Parse Hash
    const hash = (url.hash || '').replace('#', '').toLowerCase();
    if (hash === 'app') viewMode = 'app';
    if (hash === 'website') viewMode = 'website';

    return {
      isAdmin: false,
      viewMode,
      currentScreen,
      activeTab,
      targetChatUserId,
      targetChatId,
      targetProfileId,
      hasReset: params.has('reset'),
      hasReload: params.has('reload')
    };
  } catch (e) {
    return { viewMode: null };
  }
};

export default function App() {
  // Initialize viewMode from URL strategy (pathname, params, hash, or localStorage)
  const getInitialViewMode = () => {
    try {
      // Check Capacitor native platform
      if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform && window.Capacitor.isNativePlatform()) {
        return 'app';
      }

      const route = parseRouteParams();
      if (route.isAdmin) {
        window.location.href = '/super-admin.html';
        return 'website';
      }
      if (route.viewMode) {
        return route.viewMode;
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

  const setViewMode = useCallback((mode) => {
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
  }, []);

  const [deviceMode, setDeviceMode] = useState('fit'); // 'fit' | 'ios' | 'android' | 'wide'

  // Splash screen state: active on initial load
  const [showSplash, setShowSplash] = useState(true);

  // Authenticated user state initialized synchronously to avoid TDZ errors across child hooks
  const [currentUser, setCurrentUser] = useState(checkStoredUserSession);
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  // Initialize currentScreen based on existing user session and route parameters:
  const [currentScreen, setCurrentScreen] = useState(() => {
    const route = parseRouteParams();
    if (route.currentScreen) return route.currentScreen;
    const hasSession = Boolean(currentUser || checkStoredUserSession());
    if (hasSession) return 'app';
    const initialMode = getInitialViewMode();
    return initialMode === 'app' ? 'login' : 'app';
  });

  // Smooth post-splash transition handler:
  // Respects parameterized deep-link routes and authenticates state
  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
    const authenticatedUser = checkStoredUserSession();
    const route = parseRouteParams();

    if (authenticatedUser) {
      setCurrentUser(prev => prev || authenticatedUser);
      setCurrentScreen(route.currentScreen || 'app');
      setActiveTab(route.activeTab || 'feed');
    } else {
      const isMobileApp = (route.viewMode || getInitialViewMode()) === 'app';
      if (route.currentScreen) {
        setCurrentScreen(route.currentScreen);
      } else if (isMobileApp) {
        setCurrentScreen('login');
      } else {
        setCurrentScreen('app');
      }
    }
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    const route = parseRouteParams();
    return route.activeTab || 'feed';
  }); // 'feed' | 'search' | 'interests' | 'chat' | 'account'

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
    if (!force && now - lastProfilesSyncRef.current < 4000) {
      return; // Cooldown: skip redundant fetch within 4 seconds
    }
    lastProfilesSyncRef.current = now;
    try {
      const currentAuthId = currentUser?.id || currentUser?.user_id || currentUserRef.current?.id || currentUserRef.current?.user_id;
      const liveList = await fetchLiveProfiles(currentAuthId);
      if (Array.isArray(liveList) && liveList.length > 0) {
        setProfiles(liveList);
        try {
          localStorage.setItem('i4u_cached_profiles', JSON.stringify(liveList));
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[Sync Profiles Error]:', e);
    }
  }, [currentUser?.id, currentUser?.user_id]);

  // Ensure any legacy demo profiles in Supabase are completely purged
  useEffect(() => {
    purgeDemoProfilesFromSupabase().catch(() => {});
  }, []);

  // Realtime subscription and state revalidation across all users, tabs, and devices
  useEffect(() => {
    syncLiveProfiles(true);

    // 1. Supabase PostgreSQL Realtime changes
    let realtimeChannel = null;
    let realtimeInterestsChannel = null;

    if (isSupabaseConfigured() && supabase && typeof supabase.channel === 'function') {
      try {
        realtimeChannel = supabase
          .channel('realtime_profiles_sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'profiles' },
            (payload) => {
              console.log('[Realtime Profiles Event]:', payload?.eventType, payload?.new?.id);
              if (payload?.new) {
                const mapped = mapSupabaseRowToProfile(payload.new);
                if (mapped) {
                  setProfiles(prev => {
                    if (!Array.isArray(prev)) return [mapped];
                    const uid = mapped.id;
                    const regId = mapped.registerId || mapped.register_id;
                    const exists = prev.some(p => p.id === uid || (regId && (p.registerId === regId || p.register_id === regId)));
                    if (exists) {
                      return prev.map(p => (p.id === uid || (regId && (p.registerId === regId || p.register_id === regId))) ? { ...p, ...mapped } : p);
                    }
                    return [mapped, ...prev];
                  });

                  // If updated profile is current user, keep current user reactive
                  setCurrentUser(prev => {
                    if (!prev) return prev;
                    if (prev.id === mapped.id || (mapped.registerId && prev.registerId === mapped.registerId) || (mapped.phone && prev.phone === mapped.phone)) {
                      const merged = { ...prev, ...mapped };
                      try { localStorage.setItem('i4u_auth_user', JSON.stringify(merged)); } catch (e) {}
                      return merged;
                    }
                    return prev;
                  });
                }
              }
              syncLiveProfiles(true);
            }
          )
          .on(
            'broadcast',
            { event: 'profile_updated' },
            (event) => {
              console.log('[Realtime Broadcast Profile Sync]:', event);
              syncLiveProfiles(true);
            }
          )
          .subscribe();
      } catch (rtErr) {
        console.warn('[Realtime Profiles Init Warning]:', rtErr);
      }

      // Supabase PostgreSQL Realtime changes for Interests table
      try {
        realtimeInterestsChannel = supabase
          .channel('realtime_interests_global_sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'interests' },
            (payload) => {
              const row = payload?.new;
              if (!row) return;
              console.log('[Realtime Interests Event]:', payload?.eventType, row.status, row.sender_id, row.receiver_id);
              const sId = String(row.sender_id || '');
              const rId = String(row.receiver_id || '');
              const activeUser = currentUserRef.current;
              const currentIds = activeUser ? interestService.getUserIds(activeUser) : [];
              if (currentIds.includes(sId) || currentIds.includes(rId)) {
                const partnerId = currentIds.includes(sId) ? rId : sId;
                const isAccepted = row.status === 'accepted';
                if (isAccepted) {
                  setAcceptedInterests((prev) => {
                    const arr = Array.isArray(prev) ? prev : [];
                    if (arr.includes(partnerId)) return arr;
                    return Array.from(new Set([...arr, partnerId]));
                  });
                  setNotifications((prev) => (prev || []).map(n => {
                    if (n.profileId === partnerId || n.senderId === partnerId || n.receiverId === partnerId) {
                      return { ...n, status: 'accepted', isRead: true };
                    }
                    return n;
                  }));
                }
                const updatePayload = {
                  id: row.id,
                  interest_id: row.id,
                  interestId: row.id,
                  userAId: sId,
                  userBId: rId,
                  senderId: sId,
                  receiverId: rId,
                  responderId: rId,
                  partnerId: partnerId,
                  status: row.status,
                  event: isAccepted ? 'interest-accepted' : 'interest_status_change'
                };
                interestService.handleRealtimeStatusUpdate(updatePayload);
                if (typeof window !== 'undefined') {
                  try {
                    window.dispatchEvent(new CustomEvent('i4u_interest_status_change', { detail: updatePayload }));
                  } catch (e) {}
                }
              }
            }
          )
          .subscribe();
      } catch (intErr) {
        console.warn('[Realtime Interests Global Sync Warning]:', intErr);
      }
    }

    // 2. Cross-tab & Multi-window BroadcastChannel synchronization
    const handleBroadcastSync = (event) => {
      const data = event.data;
      if (data && (data.type === 'PROFILE_UPDATED' || data.profile)) {
        const updated = data.profile;
        const uid = data.userId || updated?.id;
        if (updated) {
          setProfiles(prev => {
            if (!Array.isArray(prev)) return prev;
            return prev.map(p => (p.id === uid || (updated.registerId && p.registerId === updated.registerId) || (updated.phone && p.phone === updated.phone)) ? { ...p, ...updated } : p);
          });
          setCurrentUser(prev => {
            if (!prev) return prev;
            if (prev.id === uid || (updated.registerId && prev.registerId === updated.registerId) || (updated.phone && prev.phone === updated.phone)) {
              const merged = { ...prev, ...updated };
              try { localStorage.setItem('i4u_auth_user', JSON.stringify(merged)); } catch (e) {}
              return merged;
            }
            return prev;
          });
        }
      }
    };

    if (profileSyncChannel) {
      profileSyncChannel.addEventListener('message', handleBroadcastSync);
    }

    // 3. Same-window custom event listener
    const handleLocalSync = (e) => {
      const detail = e.detail;
      if (detail?.profile) {
        const updated = detail.profile;
        const uid = detail.userId || updated?.id;
        setProfiles(prev => {
          if (!Array.isArray(prev)) return prev;
          return prev.map(p => (p.id === uid || (updated.registerId && p.registerId === updated.registerId) || (updated.phone && p.phone === updated.phone)) ? { ...p, ...updated } : p);
        });
        setCurrentUser(prev => {
          if (!prev) return prev;
          if (prev.id === uid || (updated.registerId && prev.registerId === updated.registerId) || (updated.phone && prev.phone === updated.phone)) {
            const merged = { ...prev, ...updated };
            try { localStorage.setItem('i4u_auth_user', JSON.stringify(merged)); } catch (e) {}
            return merged;
          }
          return prev;
        });
      }
    };
    window.addEventListener('i4u_profile_updated', handleLocalSync);

    // 4. Auto-refresh when user/admin switches window or tab gains focus (responsive 4s throttle)
    const handleFocus = () => syncLiveProfiles(false);
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (!document.hidden) syncLiveProfiles(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Periodic background sync every 60s
    const interval = setInterval(() => syncLiveProfiles(true), 60000);

    return () => {
      if (realtimeChannel && supabase && typeof supabase.removeChannel === 'function') {
        try { supabase.removeChannel(realtimeChannel); } catch (e) {}
        realtimeChannel = null;
      }
      if (realtimeInterestsChannel && supabase && typeof supabase.removeChannel === 'function') {
        try { supabase.removeChannel(realtimeInterestsChannel); } catch (e) {}
        realtimeInterestsChannel = null;
      }
      if (profileSyncChannel) {
        profileSyncChannel.removeEventListener('message', handleBroadcastSync);
      }
      window.removeEventListener('i4u_profile_updated', handleLocalSync);
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
  // Real-time Accepted Connections for Single-Request Flow
  const [acceptedInterests, setAcceptedInterests] = useState(() => {
    try {
      const savedUserStr = localStorage.getItem('i4u_auth_user');
      let userId = null;
      if (savedUserStr) {
        const userObj = JSON.parse(savedUserStr);
        userId = userObj?.id || userObj?.registerId || userObj?.register_id;
      }
      const acc = [];
      if (userId) {
        const userAcc = localStorage.getItem(`i4u_accepted_interests_${userId}`);
        if (userAcc) {
          const parsed = JSON.parse(userAcc);
          if (Array.isArray(parsed)) acc.push(...parsed);
        }
      }
      const generalAcc = localStorage.getItem('i4u_accepted_interests');
      if (generalAcc) {
        const parsed = JSON.parse(generalAcc);
        if (Array.isArray(parsed)) acc.push(...parsed);
      }
      const records = JSON.parse(localStorage.getItem('i4u_interests_records') || '[]');
      if (Array.isArray(records) && userId) {
        records.forEach(r => {
          if (r && r.status === 'accepted') {
            if (String(r.senderId) === String(userId)) acc.push(String(r.receiverId));
            if (String(r.receiverId) === String(userId)) acc.push(String(r.senderId));
          }
        });
      }
      return Array.from(new Set(acc.filter(Boolean)));
    } catch (e) {
      return [];
    }
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
  const [activeChatId, setActiveChatId] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Dedicated chat state cleaner: ensures any existing global chat state/cache is completely cleared before rendering a new chat
  const clearGlobalChatState = useCallback(() => {
    setActiveChatProfileId(null);
    setActiveChatId(null);
    setIsDirectChatOpen(false);
    try {
      sessionStorage.removeItem('i4u_active_chat_id');
      sessionStorage.removeItem('i4u_active_partner_id');
    } catch (e) {}
    try {
      interestService.clearCache();
      liveChatService.clearCache();
    } catch (e) {}
  }, []);

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

  // Clean slate when navigating between tabs or away from chat
  useEffect(() => {
    if (activeTab !== 'chat') {
      clearGlobalChatState();
    }
  }, [activeTab, clearGlobalChatState]);

  // Clean slate on user identity change to strictly prevent data bleeding
  useEffect(() => {
    clearGlobalChatState();
    setSelectedProfile(null);
  }, [currentUser?.id, clearGlobalChatState]);

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

  // Persist acceptedInterests to localStorage and sync with live interestService updates
  useEffect(() => {
    try {
      localStorage.setItem('i4u_accepted_interests', JSON.stringify(acceptedInterests));
      const uid = currentUser?.id || localStorage.getItem('i4u_current_user_id');
      if (uid) {
        localStorage.setItem(`i4u_accepted_interests_${uid}`, JSON.stringify(acceptedInterests));
      }
    } catch (e) {}
  }, [acceptedInterests, currentUser?.id]);

  // Real-time listener for accepted connection updates from interestService & cross-tab events
  useEffect(() => {
    const unsub = interestService.onStatusChange((update) => {
      if (!update) return;
      if (update.status === 'accepted') {
        const ids = [
          update.userAId,
          update.userBId,
          update.senderId,
          update.receiverId,
          update.responderId,
          update.partnerId
        ].filter(Boolean).map(String);
        const currentIds = interestService.getUserIds(currentUser);
        if (currentIds.some((id) => ids.includes(String(id)))) {
          const partnerId = ids.find((id) => !currentIds.includes(String(id)));
          if (partnerId) {
            setAcceptedInterests((prev) => {
              const arr = Array.isArray(prev) ? prev : [];
              if (arr.includes(partnerId)) return arr;
              return Array.from(new Set([...arr, partnerId]));
            });
          }
        }
      }
    });

    const handleStorage = (e) => {
      if (e.key === 'i4u_accepted_pairs' || e.key === 'i4u_accepted_interests' || e.key?.startsWith('i4u_accepted_interests_')) {
        try {
          const parsed = JSON.parse(e.newValue || '[]');
          if (Array.isArray(parsed)) {
            setAcceptedInterests((prev) => Array.from(new Set([...(prev || []), ...parsed])));
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsub();
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentUser]);

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
      : profiles.find(item => item && (item.id === profileOrId || item.registerId === profileOrId || item.register_id === profileOrId));
    const targetId = typeof profileOrId === 'string' ? profileOrId : (p?.id || profileOrId?.id);
    const regId = p?.registerId || p?.register_id || profileOrId?.registerId || profileOrId?.register_id;
    const candidateId = p?.id || profileOrId?.id;
    const list = Array.isArray(interestsSent) ? interestsSent : [];
    return Boolean(
      (targetId && list.includes(targetId)) ||
      (candidateId && list.includes(candidateId)) ||
      (regId && list.includes(regId))
    );
  }, [interestsSent, profiles]);

  // Helper to reliably check if connection is fully established (interest accepted)
  const isProfileConnected = useCallback((profileOrId) => {
    if (!profileOrId || !currentUser) return false;
    const p = typeof profileOrId === 'object' 
      ? profileOrId 
      : profiles.find(item => item && (item.id === profileOrId || item.registerId === profileOrId || item.register_id === profileOrId));
    const targetId = typeof profileOrId === 'string' ? profileOrId : (p?.id || profileOrId?.id);
    const regId = p?.registerId || p?.register_id || profileOrId?.registerId || profileOrId?.register_id;
    const accList = Array.isArray(acceptedInterests) ? acceptedInterests : [];
    if ((targetId && accList.includes(targetId)) || (regId && accList.includes(regId))) {
      return true;
    }
    const relStatus = interestService.getRelationshipStatusSync(currentUser, p || targetId);
    return relStatus === 'accepted';
  }, [acceptedInterests, currentUser, profiles]);

  // Helper to reliably check if a candidate profile has been shortlisted
  const isProfileShortlisted = useCallback((profileOrId) => {
    if (!profileOrId) return false;
    const p = typeof profileOrId === 'object' 
      ? profileOrId 
      : profiles.find(item => item && (item.id === profileOrId || item.registerId === profileOrId || item.register_id === profileOrId));
    const targetId = typeof profileOrId === 'string' ? profileOrId : (p?.id || profileOrId?.id);
    const regId = p?.registerId || p?.register_id || profileOrId?.registerId || profileOrId?.register_id;
    const candidateId = p?.id || profileOrId?.id;
    const list = Array.isArray(shortlisted) ? shortlisted : [];
    return Boolean(
      (targetId && list.includes(targetId)) ||
      (candidateId && list.includes(candidateId)) ||
      (regId && list.includes(regId))
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

  // Mobile Notifications State: Strictly dynamic, no mock arrays
  const [notifications, setNotifications] = useState(() => {
    try {
      const savedUser = localStorage.getItem('i4u_auth_user');
      if (!savedUser) return [];
      const saved = localStorage.getItem('i4u_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Strictly exclude old mock notifications and enforce clean objects
          const clean = parsed.filter(n => {
            if (!n || typeof n !== 'object' || !n.type) return false;
            const nid = String(n.id || n.notification_id || '');
            if (
              nid.startsWith('notif-interest-') ||
              nid.startsWith('notif-shortlist-') ||
              nid.startsWith('notif-contact-') ||
              nid.startsWith('sim-')
            ) {
              return false;
            }
            const sName = String(n.sender_name || n.senderName || n.sender?.name || '').toLowerCase();
            const title = String(n.title || '').toLowerCase();
            if (sName.includes('verified member') || title.includes('verified member')) {
              return false;
            }
            return true;
          });
          return clean;
        }
      }
    } catch (e) {}
    return [];
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Synchronize notifications, received interests, and chat conversations with PostgreSQL backend & profiles
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
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

    // 2. Fetch real dynamic notifications from PostgreSQL backend API
    fetchUserNotifications(currentUser, profiles)
      .then((records) => {
        if (!isMounted || !Array.isArray(records)) return;
        setNotifications((prev) => {
          const map = new Map();
          // Filter prev to discard stale mock or 'Verified Member' entries
          (prev || []).forEach(n => {
            const k = n?.notification_id || n?.id;
            const sName = String(n?.sender_name || n?.senderName || n?.sender?.name || '').toLowerCase();
            const title = String(n?.title || '').toLowerCase();
            if (k && !sName.includes('verified member') && !title.includes('verified member') && !k.startsWith('sim-')) {
              map.set(k, n);
            }
          });
          // Merge newly fetched dynamic records from PostgreSQL / Supabase
          records.forEach(rec => {
            if (!rec) return;
            const notifId = rec.notification_id || rec.id || `notif_${rec.sender_id || rec.senderId}_${rec.created_at}`;
            const existing = map.get(notifId);
            map.set(notifId, {
              ...rec,
              notification_id: notifId,
              id: notifId,
              isRead: existing?.isRead !== undefined ? existing.isRead : Boolean(rec.is_read || rec.isRead),
              status: existing?.status || rec.status || 'pending'
            });
          });
          return Array.from(map.values()).sort((a, b) => {
            const tA = new Date(a.created_at || a.timestamp || 0).getTime();
            const tB = new Date(b.created_at || b.timestamp || 0).getTime();
            return tB - tA;
          });
        });
      })
      .catch((e) => console.warn('[App] Error loading notifications:', e));

    // 3. Real-time subscription to incoming interests and accepted connections
    const unsubInterest = interestService.subscribeToInterestInbox(currentUser, (payload) => {
      if (!payload) return;

      const isAcceptedEvent = payload.event === 'interest-accepted' || payload.status === 'accepted';
      const sId = String(payload.senderId || payload.sender_id || '');
      const rId = String(payload.receiverId || payload.receiver_id || payload.responderId || '');
      const uA = String(payload.userAId || '');
      const uB = String(payload.userBId || '');

      const currentIds = interestService.getUserIds(currentUser);
      const allPayloadIds = [sId, rId, uA, uB, payload.responderId, payload.partnerId].filter(Boolean).map(String);
      const partnerId = allPayloadIds.find((id) => !currentIds.includes(String(id)));

      const matchedPartner = (profiles || []).find((p) => p && (
        String(p.id) === partnerId ||
        String(p.register_id) === partnerId ||
        String(p.registerId) === partnerId
      ));
      const partnerName = matchedPartner?.name || payload.responderName || payload.senderName || 'Candidate';

      if (payload.event === 'contact-viewed' || payload.type === 'contact_viewed') {
        const viewerId = String(payload.viewerId || payload.senderId || '');
        const viewerName = payload.viewerName || payload.senderName || 'Candidate';
        const notifId = `cv_${viewerId}_${Date.now()}`;
        setNotifications((prev) => {
          const exists = (prev || []).some(n => (n.type === 'contact_viewed' || n.type === 'contact_view') && (n.profileId === viewerId || n.senderId === viewerId));
          if (exists) return prev;
          return [
            {
              id: notifId,
              notification_id: notifId,
              profileId: viewerId,
              senderId: viewerId,
              type: 'contact_viewed',
              title: `👁️ Contact Viewed by ${viewerName}`,
              message: `${viewerName} viewed your verified contact details and phone number.`,
              time: 'Just now',
              isRead: false,
              created_at: new Date().toISOString(),
              timestamp: Date.now()
            },
            ...(prev || [])
          ];
        });
        showToast(`👁️ ${viewerName} viewed your contact details.`);
        return;
      }

      if (isAcceptedEvent) {
        console.log(`[App] Real-time acceptance received: connection established with ${partnerName} (${partnerId})`);
        const partnerIds = Array.from(new Set([
          partnerId,
          matchedPartner?.id,
          matchedPartner?.registerId,
          matchedPartner?.register_id,
          ...allPayloadIds.filter((id) => !currentIds.includes(String(id)))
        ].filter(Boolean).map(String)));

        if (partnerIds.length > 0) {
          setAcceptedInterests((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            return Array.from(new Set([...arr, ...partnerIds]));
          });

          // Instantly synchronize interestService cache & localStorage so calling unlocks for both users
          if (currentUser) {
            const partnerTarget = matchedPartner || partnerId;
            const allPairKeys = interestService.getAllPairKeys(currentUser, partnerTarget);
            allPairKeys.forEach(pk => interestService.statusCache.set(pk, 'accepted'));
            try {
              currentIds.forEach((cid) => {
                const key = `i4u_accepted_interests_${cid}`;
                const raw = localStorage.getItem(key) || '[]';
                const list = JSON.parse(raw);
                partnerIds.forEach((pid) => {
                  if (!list.includes(pid)) list.push(pid);
                });
                localStorage.setItem(key, JSON.stringify(list));
              });
              const pairsRaw = localStorage.getItem('i4u_accepted_pairs') || '[]';
              const pairs = JSON.parse(pairsRaw);
              allPairKeys.forEach((pk) => {
                if (pk && !pairs.includes(pk)) pairs.push(pk);
              });
              localStorage.setItem('i4u_accepted_pairs', JSON.stringify(pairs));
            } catch (e) {}

            if (typeof window !== 'undefined') {
              try {
                window.dispatchEvent(new CustomEvent('i4u_interest_status_change', {
                  detail: { status: 'accepted', partnerId, timestamp: Date.now() }
                }));
              } catch (e) {}
            }
          }
        }

        // Update notifications to accepted
        setNotifications((prev) => {
          const map = new Map();
          (prev || []).forEach((n) => {
            const k = n?.notification_id || n?.id;
            if (k) map.set(k, n);
          });

          let found = false;
          map.forEach((n, k) => {
            if (partnerIds.includes(String(n.profileId)) || partnerIds.includes(String(n.senderId)) || partnerIds.includes(String(n.receiverId))) {
              map.set(k, { ...n, status: 'accepted', isRead: true });
              found = true;
            }
          });

          if (!found && partnerId) {
            const notifId = `acc_${partnerId}_${Date.now()}`;
            map.set(notifId, {
              id: notifId,
              notification_id: notifId,
              profileId: partnerId,
              senderId: partnerId,
              type: 'interest_accepted',
              title: `Interest Accepted by ${partnerName}! 🎉`,
              message: `${partnerName} accepted your interest! Audio and video calling is now unlocked.`,
              time: 'Just now',
              isRead: false,
              status: 'accepted',
              created_at: new Date().toISOString(),
              timestamp: Date.now()
            });
          }

          return Array.from(map.values()).sort((a, b) => {
            const tA = new Date(a.created_at || a.timestamp || 0).getTime();
            const tB = new Date(b.created_at || b.timestamp || 0).getTime();
            return tB - tA;
          });
        });

        showToast(`🎉 ${partnerName} accepted your interest! Audio & Video calls are now unlocked.`);
        return;
      }

      // If this is an outgoing interest sent by currentUser, do not notify as received!
      if (sId && currentIds.includes(sId) && !currentIds.includes(rId)) {
        return;
      }

      const interestId = payload.interest_id || payload.interestId || payload.id;
      const senderObj = matchedPartner || payload.sender || {
        id: sId,
        name: payload.senderName || 'Candidate',
        photo: payload.senderPhoto || null,
        age: payload.senderAge || null,
        profession: payload.senderProfession || null,
        city: payload.senderCity || payload.senderDistrict || null
      };
      const senderDisplayName = senderObj?.name || payload.senderName || 'Candidate';

      let isDuplicateInterest = false;
      setNotifications((prev) => {
        const notifId = payload.notification_id || (interestId ? `notif_interest_${interestId}` : `live_int_${sId}`);
        const map = new Map();
        (prev || []).forEach(n => {
          const k = n?.notification_id || n?.id;
          if (k) map.set(k, n);
        });

        let targetKey = notifId;
        for (const [k, n] of map.entries()) {
          const nIntId = n.interest_id || n.interestId;
          if (interestId && nIntId && String(nIntId) === String(interestId)) {
            targetKey = k;
            isDuplicateInterest = true;
            break;
          }
          if (String(n.senderId || n.sender_id) === sId && n.type === 'interest') {
            targetKey = k;
            isDuplicateInterest = true;
            break;
          }
        }

        map.set(targetKey, {
          ...(map.get(targetKey) || {}),
          notification_id: targetKey,
          id: targetKey,
          interest_id: interestId,
          interestId: interestId,
          profileId: sId,
          senderId: sId,
          sender_id: sId,
          sender_name: senderDisplayName,
          sender_photo: senderObj.photo,
          sender_age: senderObj.age,
          sender_profession: senderObj.profession,
          sender_location: senderObj.city,
          sender: senderObj,
          profile: senderObj,
          interest_from: senderObj,
          type: 'interest',
          title: `💖 Interest from ${senderDisplayName}`,
          message: payload.message || `${senderDisplayName} expressed interest in connecting with you.`,
          time: 'Just now',
          isRead: false,
          status: 'pending',
          created_at: payload.created_at || new Date().toISOString(),
          timestamp: Date.now()
        });
        return Array.from(map.values()).sort((a, b) => {
          const tA = new Date(a.created_at || a.timestamp || 0).getTime();
          const tB = new Date(b.created_at || b.timestamp || 0).getTime();
          return tB - tA;
        });
      });

      if (!isDuplicateInterest) {
        showToast(`💖 New Interest from ${senderDisplayName}!`);

        // Deliver native web push notification for background delivery
        fcmNotificationService.showWebNotification({
          title: `💖 New Interest from ${senderDisplayName}!`,
          body: payload.message || `${senderDisplayName} expressed interest in connecting with you.`,
          data: {
            chat_id: `chat_${sId}`,
            user_id: sId,
            sender_id: sId,
            type: 'interest'
          }
        });
      }
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
    const myIds = [
      currentUser.id,
      currentUser.user_id,
      currentUser.userId,
      currentUser.register_id,
      currentUser.registerId
    ].filter(Boolean).map(String);
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

      // Do not process messages sent by ourselves or not intended for us (WHERE user_id != current_user_id)
      if (myIds.includes(senderId) || isSelfProfile({ id: senderId }, currentUser)) return;
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

        let nextConvs;
        if (exists) {
          nextConvs = prev.map(c => {
            if (String(c.profileId) === senderIdStr) {
              const currentMsgs = Array.isArray(c.messages) ? c.messages : [];
              const alreadyExists = currentMsgs.some(m =>
                m && (
                  (incomingMsg.id && (m.id === incomingMsg.id || m.tempId === incomingMsg.id)) ||
                  (incomingMsg.tempId && (m.tempId === incomingMsg.tempId || m.id === incomingMsg.tempId)) ||
                  (m.text === text && String(m.sender_id) === senderId && Math.abs(new Date(m.created_at || m.time || 0).getTime() - new Date(incomingMsg.created_at).getTime()) < 3000)
                )
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
          nextConvs = [
            ...prev,
            {
              profileId: senderIdStr,
              unreadCount: isCurrentlyInThisChat ? 0 : 1,
              messages: [incomingMsg],
              autoReplies: []
            }
          ];
        }

        // Persist to localStorage immediately
        try {
          myIds.forEach((uid) => {
            localStorage.setItem(`i4u_conversations_${uid}`, JSON.stringify(nextConvs));
          });
        } catch (e) {}

        return nextConvs;
      });

      // Synchronize to Global Notifications
      const notifId = incoming.id ? `notif_chat_${incoming.id}` : `notif_chat_${Date.now()}`;
      setNotifications(prev => [
        {
          id: notifId,
          notification_id: notifId,
          type: 'chat_message',
          title: `💬 ${senderName}`,
          message: text,
          senderId,
          senderName,
          profileId: senderId,
          conversationId: convId,
          time: 'Just now',
          isRead: false,
          created_at: new Date().toISOString(),
          timestamp: Date.now()
        },
        ...(prev || []).filter(n => n.id !== notifId && n.notification_id !== notifId)
      ]);

      // Notify foreground listeners across screens and tabs
      fcmNotificationService.dispatchForegroundNotification({
        type: 'fcm_chat_message',
        senderId,
        senderName,
        text,
        incomingMsg
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
  }, [currentUser?.id, currentUser?.user_id, currentUser?.userId, currentUser?.register_id, currentUser?.registerId]);

  const unreadNotificationsCount = currentUser ? (notifications || []).filter(n => n && !n.isRead).length : 0;

  const toastTimeoutRef = useRef(null);
  const showToast = (msg) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage('');
    }, 3200);
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
    setActiveChatProfileId(null);
    setIsDirectChatOpen(false);
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
        senderId: null,
        title: `🎉 Payment Confirmed! ${plan.name} Active`,
        message: `Your payment of ₹${invoice.totalAmount} was authorized successfully. ${plan.contactCredits === 999 ? 'Unlimited' : plan.contactCredits} contact unlocks credited!`,
        quote: `GST Tax Invoice #${invoice.invoiceNumber} generated. Full invoice available in Profile.`,
        time: 'Just now',
        isRead: false,
        status: 'completed',
        badge: plan.name,
        invoice: invoice,
        amount: invoice.totalAmount,
        invoiceNumber: invoice.invoiceNumber
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

    // Trigger Contact View Notification & Real-Time Sync to viewed candidate (profileId)
    try {
      const viewerId = String(currentUser.id);
      const viewerName = currentUser.name || 'A candidate';
      const viewerPhoto = currentUser.photo || null;
      const targetId = String(profileId);
      const targetRegId = profile?.registerId || profile?.register_id || null;

      // 1. Save to local storage for target profile
      const viewsKey = `i4u_contact_views_${targetId}`;
      const existingViews = JSON.parse(localStorage.getItem(viewsKey) || '[]');
      const newViewEntry = {
        viewerId,
        viewerName,
        viewerPhoto,
        senderId: viewerId,
        senderName: viewerName,
        senderPhoto: viewerPhoto,
        profileId: viewerId,
        type: 'contact_viewed',
        timestamp: Date.now(),
        created_at: new Date().toISOString()
      };
      if (!existingViews.some(v => String(v.viewerId || v.senderId) === viewerId)) {
        existingViews.unshift(newViewEntry);
        localStorage.setItem(viewsKey, JSON.stringify(existingViews));
      }
      if (targetRegId) {
        const regViewsKey = `i4u_contact_views_${targetRegId}`;
        const regViews = JSON.parse(localStorage.getItem(regViewsKey) || '[]');
        if (!regViews.some(v => String(v.viewerId || v.senderId) === viewerId)) {
          regViews.unshift(newViewEntry);
          localStorage.setItem(regViewsKey, JSON.stringify(regViews));
        }
      }

      // 2. Insert into Supabase notifications table
      if (isSupabaseConfigured() && supabase) {
        supabase.from('notifications').insert([
          {
            recipient_id: targetId,
            recipient_register_id: targetRegId,
            type: 'contact_viewed',
            title: `👁️ Contact Viewed by ${viewerName}`,
            message: `${viewerName} viewed your verified contact details and phone number.`,
            metadata: {
              viewerId,
              viewerName,
              viewerPhoto,
              senderId: viewerId,
              profileId: viewerId
            },
            is_read: false,
            created_at: new Date().toISOString()
          }
        ]).catch(() => {});

        // 3. Broadcast real-time event to target's inbox channel
        const targetIds = [targetId, targetRegId].filter(Boolean);
        targetIds.forEach(tId => {
          const chn = supabase.channel(`user-interest-inbox-${tId}`);
          chn.subscribe((chnStatus) => {
            if (chnStatus === 'SUBSCRIBED') {
              chn.send({
                type: 'broadcast',
                event: 'contact-viewed',
                payload: {
                  event: 'contact-viewed',
                  type: 'contact_viewed',
                  viewerId,
                  viewerName,
                  viewerPhoto,
                  senderId: viewerId,
                  senderName: viewerName,
                  senderPhoto: viewerPhoto,
                  profileId: viewerId,
                  timestamp: Date.now()
                }
              }).catch(() => {});
              setTimeout(() => {
                try { supabase.removeChannel(chn); } catch (e) {}
              }, 3000);
            }
          });
        });
      }

      // 4. Send FCM Push Notification
      fcmNotificationService.dispatchMessagePushNotification({
        recipientId: targetId,
        sender: currentUser,
        messageText: `${viewerName} viewed your contact number.`,
        conversationId: `contact_view_${viewerId}`
      }).catch(() => {});
    } catch (e) {}
  };

  const handleMarkNotificationAsRead = (notifId) => {
    setNotifications(prev => prev.map(n => (n.id === notifId || n.notification_id === notifId) ? { ...n, isRead: true } : n));
    if (currentUser?.id) {
      markNotificationAsReadApi(notifId, currentUser.id);
    }
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    (notifications || []).forEach(n => {
      const k = n.notification_id || n.id;
      if (k && currentUser?.id) markNotificationAsReadApi(k, currentUser.id);
    });
    showToast('All notifications marked as read ✓');
  };

  const handleDeleteNotification = (notifId) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId && n.notification_id !== notifId));
    if (currentUser?.id) {
      deleteNotificationApi(notifId, currentUser.id);
    }
    showToast('Notification dismissed');
  };

  const handleAcceptInterestNotification = (notifId, profileId) => {
    const profile = profiles.find(p => p.id === profileId || p.registerId === profileId || p.register_id === profileId);
    const targetId = profile?.id || profileId;
    const targetRegId = profile?.registerId || profile?.register_id;
    setDeclinedReceivedIds(prev => prev.filter(id => id !== targetId && id !== targetRegId));
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true, status: 'accepted' } : n));
    
    // Single-Request Flow: User B accepts User A's request.
    // Record accepted connection immediately. User B MUST NOT be required to send a return request.
    const targetIds = [targetId, targetRegId].filter(Boolean).map(String);
    setAcceptedInterests(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      return Array.from(new Set([...arr, ...targetIds]));
    });

    // Record acceptance in interestService for real-time WebRTC unlock for BOTH users
    if (currentUser && (profile || targetId)) {
      interestService.acceptInterest(currentUser, profile || targetId).catch(err => console.warn('[App] acceptInterest error:', err));
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
    showToast(`🎉 Connection established with ${profile?.name || 'candidate'}! Audio & Video calls unlocked ✨`);
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

    // Single-Request Flow: User B accepts User A's request.
    // Record accepted connection immediately. User B MUST NOT be required to send a return request.
    const targetIds = [targetId, targetRegId].filter(Boolean).map(String);
    setAcceptedInterests(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      return Array.from(new Set([...arr, ...targetIds]));
    });

    setNotifications(prev => prev.map(n => (n.profileId === targetId || n.profileId === profileId) ? { ...n, isRead: true, status: 'accepted' } : n));
    
    // Record acceptance in interestService for real-time WebRTC unlock for BOTH users
    if (currentUser && (profile || targetId)) {
      interestService.acceptInterest(currentUser, profile || targetId).catch(err => console.warn('[App] acceptInterest error:', err));
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

    showToast(`🎉 Connection established with ${profile?.name || 'candidate'}! Audio & Video calls unlocked ✨`);
    handleStartChat(targetId);
  };

  const handleSimulateNotification = () => {
    if (!currentUser) {
      showToast('Please log in to synchronize notifications');
      return;
    }
    fetchUserNotifications(currentUser, profiles)
      .then((records) => {
        if (Array.isArray(records)) {
          setNotifications(records);
          showToast(`Notifications synchronized with database (${records.length} items) ✓`);
        }
      })
      .catch(() => showToast('Notifications up to date ✓'));
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
    // Completely clear existing chat state, caches, and previous session artifacts
    clearGlobalChatState();
    try {
      interestService.clearCache();
    } catch (e) {}

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

    const list = Array.isArray(interestsSent) ? interestsSent : [];
    const isAlready = Boolean(
      list.includes(targetId) ||
      (targetRegId && list.includes(targetRegId))
    );

    if (isAlready) {
      setInterestsSent(prev => (Array.isArray(prev) ? prev : []).filter(id => id !== targetId && id !== targetRegId));
      showToast(`Interest withdrawn`);
    } else {
      setInterestsSent(prev => {
        const arr = Array.isArray(prev) ? prev : [];
        const cleaned = arr.filter(id => id !== targetId && id !== targetRegId);
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
          title: `💖 New Matrimonial Interest from ${(currentUser?.name && !['verified member', 'a verified member', 'member'].includes(currentUser.name.toLowerCase().trim())) ? currentUser.name : 'A Candidate'}!`,
          message: `${(currentUser?.name && !['verified member', 'a verified member', 'member'].includes(currentUser.name.toLowerCase().trim())) ? currentUser.name : 'A Candidate'} reviewed your profile on I 4 You and expressed interest in connecting with you.`,
          senderName: currentUser?.name,
          senderPhoto: currentUser?.photo,
          profileLink: 'https://i4youmatrimony.com/app'
        }).catch(err => console.warn('[App] Interest email notification notice:', err));
      }

      // Ensure a conversation thread exists
      setConversations(prev => {
        const arr = Array.isArray(prev) ? prev : [];
        if (!arr.find(c => c && (c.profileId === targetId || (targetRegId && c.profileId === targetRegId)))) {
          return [...arr, {
            profileId: targetId,
            unreadCount: 0,
            messages: []
          }];
        }
        return arr;
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

  // Start chat directly with candidate with full isolation and state clearing
  const handleStartChat = useCallback((profileId, initialMessage = null, explicitChatId = null, extraData = {}) => {
    if (!currentUser) {
      showToast('🔒 Please sign in first to chat with members');
      setCurrentScreen('login');
      return;
    }

    const targetId = String(
      (typeof profileId === 'object' ? (profileId?.id || profileId?.userId || profileId?.user_id) : profileId) || ''
    );
    if (!targetId && !explicitChatId) return;

    // 1. Ensure any existing global chat state/cache is completely cleared before rendering the new chat
    clearGlobalChatState();

    const profile = profiles.find(p => 
      p && (
        String(p.id) === targetId || 
        String(p.register_id) === targetId || 
        String(p.registerId) === targetId
      )
    ) || (typeof profileId === 'object' && profileId.id ? profileId : null);

    const partner = profile || {
      id: targetId,
      name: extraData.senderName || extraData.name || 'Candidate',
      photo: extraData.senderPhoto || extraData.photo || 'https://kzvdzospvgzlfkkptadl.supabase.co/storage/v1/object/public/avatars/profile_i4y1021_1791653762897.jpg',
      onlineStatus: 'Online'
    };

    const convId = explicitChatId || [String(currentUser.id), targetId].sort().join(':::');

    // Ensure a conversation thread exists for this profile strictly isolated by targetId & conversation_id
    setConversations(prev => {
      const list = Array.isArray(prev) ? prev : [];
      const existing = list.find(c => String(c.profileId) === targetId || (convId && c.conversation_id === convId));
      if (!existing) {
        return [...list, {
          profileId: targetId,
          conversation_id: convId,
          partnerUser: partner,
          unreadCount: 0,
          messages: [],
          autoReplies: []
        }];
      } else {
        return list.map(c => 
          (String(c.profileId) === targetId || (convId && c.conversation_id === convId))
            ? { ...c, unreadCount: 0, partnerUser: partner, conversation_id: convId } 
            : c
        );
      }
    });

    setActiveChatProfileId(targetId);
    setActiveChatId(convId);
    setIsDirectChatOpen(true);
    setSelectedProfile(null);
    setCurrentScreen('app');
    setActiveTab('chat');
    setViewMode('app');
  }, [currentUser, profiles, clearGlobalChatState, setViewMode, showToast]);

  // Push notification tap handler: FCM onMessageOpenedApp
  // Accurately extracts exact chat_id and user_id from the notification payload,
  // clears existing global chat state, and directly passes them to the chat screen
  useEffect(() => {
    const unsub = fcmNotificationService.onMessageOpenedApp(({ chatId, userId, data }) => {
      console.log('[App] Push notification tapped (onMessageOpenedApp):', { chatId, userId, data });
      if (!userId && !chatId) return;

      const extraData = {
        senderName: data?.senderName || data?.sender_name || data?.name || data?.title,
        senderPhoto: data?.senderPhoto || data?.sender_photo || data?.photo || data?.avatar,
        ...data
      };

      // Completely clear existing global chat state and directly route to the exact chat
      handleStartChat(userId, null, chatId, extraData);
    });

    return () => unsub();
  }, [handleStartChat]);

  // Register device for FCM & native Push Notifications when user is logged in
  useEffect(() => {
    if (!currentUser) return;
    fcmNotificationService.registerForPushNotifications(currentUser).catch((err) => {
      console.warn('[App] Push notification registration note:', err);
    });
  }, [currentUser]);

  // Register Service Worker for FCM and background Web Push delivery
  useEffect(() => {
    fcmNotificationService.registerServiceWorker();
  }, []);

  // Parameterized routes & deep links strategy (SPA routing handler)
  useEffect(() => {
    const applyRouteFromUrl = () => {
      const parsed = parseRouteParams();
      if (parsed.isAdmin) {
        window.location.href = '/super-admin.html';
        return;
      }
      if (parsed.viewMode) {
        setViewModeState(parsed.viewMode);
      }
      if (parsed.activeTab) {
        setActiveTab(parsed.activeTab);
      }
      if (parsed.currentScreen) {
        setCurrentScreen(parsed.currentScreen);
      }
      if (parsed.targetChatUserId || parsed.targetChatId) {
        handleStartChat(parsed.targetChatUserId, null, parsed.targetChatId);
      } else if (parsed.targetProfileId) {
        const found = profiles.find(p => p && (
          String(p.id) === String(parsed.targetProfileId) || 
          String(p.register_id) === String(parsed.targetProfileId) || 
          String(p.registerId) === String(parsed.targetProfileId)
        ));
        if (found) setSelectedProfile(found);
      }
    };

    applyRouteFromUrl();

    window.addEventListener('popstate', applyRouteFromUrl);
    window.addEventListener('hashchange', applyRouteFromUrl);
    return () => {
      window.removeEventListener('popstate', applyRouteFromUrl);
      window.removeEventListener('hashchange', applyRouteFromUrl);
    };
  }, [profiles, handleStartChat]);

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
    const profile = profiles.find(p => p && (p.id === profileId || p.registerId === profileId || p.register_id === profileId)) || interestModalCandidate;
    const targetId = profile?.id || profileId;
    const targetRegId = profile?.registerId || profile?.register_id;

    setDeclinedReceivedIds(prev => (Array.isArray(prev) ? prev : []).filter(id => id !== targetId && id !== targetRegId));
    setNotifications(prev => (Array.isArray(prev) ? prev : []).map(n => 
      n && (n.profileId === targetId || (targetRegId && n.profileId === targetRegId)) 
        ? { ...n, isRead: true, status: 'accepted' } 
        : n
    ));

    // Single-Request Flow: User B accepts User A's request.
    // Record accepted connection immediately. User B MUST NOT be required to send a return request.
    const targetIds = [targetId, targetRegId].filter(Boolean).map(String);
    setAcceptedInterests(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      return Array.from(new Set([...arr, ...targetIds]));
    });

    if (currentUser && (profile || targetId)) {
      interestService.acceptInterest(currentUser, profile || targetId).catch(err => console.warn('[App] acceptInterest error:', err));
    }

    if (replyMessage && replyMessage.trim()) {
      const cleanMsg = replyMessage.trim();
      setConversations(prev => {
        const arr = Array.isArray(prev) ? prev : [];
        const existing = arr.find(c => c && (c.profileId === targetId || (targetRegId && c.profileId === targetRegId)));
        const newMsg = {
          id: 'msg_' + Date.now(),
          sender: 'me',
          text: cleanMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        if (existing) {
          return arr.map(c => c && (c.profileId === targetId || (targetRegId && c.profileId === targetRegId))
            ? { ...c, messages: [...(c.messages || []), newMsg] }
            : c
          );
        }
        return [...arr, {
          profileId: targetId,
          unreadCount: 0,
          messages: [newMsg]
        }];
      });
    }

    setInterestModalCandidate(null);
    showToast(`🎉 Connection established with ${profile?.name || 'candidate'}! Audio & Video calls unlocked ✨`);
  };

  // Confirm sending interest with chosen/customized message
  const handleConfirmSendInterest = (profileId, customMessage) => {
    const profile = profiles.find(p => p && (p.id === profileId || p.registerId === profileId || p.register_id === profileId)) || interestModalCandidate;
    const targetId = profile?.id || profileId;
    const targetRegId = profile?.registerId || profile?.register_id;

    setInterestsSent(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const cleaned = arr.filter(id => id !== targetId && id !== targetRegId);
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
        title: `💖 Matrimonial Interest from ${(currentUser?.name && !['verified member', 'a verified member', 'member'].includes(currentUser.name.toLowerCase().trim())) ? currentUser.name : 'A Candidate'}!`,
        message: customMessage || `${(currentUser?.name && !['verified member', 'a verified member', 'member'].includes(currentUser.name.toLowerCase().trim())) ? currentUser.name : 'A Candidate'} reviewed your profile on I 4 You and expressed interest in connecting with you.`,
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
  const handleAcceptIncomingCall = useCallback((callData) => {
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
  }, []);

  const handleDeclineIncomingCall = useCallback((callData, reason) => {
    webrtcCallService.declineCall({ callData, reason });
    setIncomingCallSession(null);
    showToast('Call declined');
  }, [showToast]);

  // Native Push Incoming Call Handler (wakes device up from background / killed state)
  useEffect(() => {
    if (!currentUser) return;
    const unsub = fcmNotificationService.onIncomingCall(async (callData) => {
      console.log('[App] Push incoming call received:', callData);
      if (!callData || !callData.callId) return;

      const authCheck = await interestService.verifyCallAuthorization(currentUser, callData.caller);
      if (!authCheck.authorized) {
        console.warn('[App] Dropped unauthorized incoming call invite from:', callData.caller?.id, authCheck.reason);
        return;
      }

      setIncomingCallSession(callData);

      if (callData.openedFromNotification && callData.actionId === 'accept') {
        handleAcceptIncomingCall(callData);
      }
    });

    return () => unsub();
  }, [currentUser, handleAcceptIncomingCall]);

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
    const rawPhoto = photosData.photo || photosData.singlePhotos?.[0] || currentUser?.photo;
    const primaryPhoto = addCacheBuster(rawPhoto, Date.now());

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

      // If Supabase Storage returned a permanent URL (https://...), update currentUser and profile feeds seamlessly
      if (syncResult && syncResult.photo && syncResult.photo.startsWith('http')) {
        const finalPhotoUrl = syncResult.photo;
        const finalSingles = Array.isArray(syncResult.singlePhotos) && syncResult.singlePhotos.length > 0
          ? syncResult.singlePhotos
          : (Array.isArray(currentUser?.singlePhotos) && currentUser.singlePhotos.length > 0
              ? [finalPhotoUrl, ...currentUser.singlePhotos.slice(1)]
              : [finalPhotoUrl]);

        setCurrentUser(prev => {
          if (!prev) return prev;
          const refined = {
            ...prev,
            photo: finalPhotoUrl,
            photo_url: finalPhotoUrl,
            singlePhotos: finalSingles
          };
          try {
            localStorage.setItem('i4u_auth_user', JSON.stringify(refined));
          } catch (e) {}
          return refined;
        });

        // Immediately reflect in profiles list & cache so feed and filters display the permanent URL
        setProfiles(prevProfiles => {
          if (!Array.isArray(prevProfiles)) return prevProfiles;
          const uid = currentUser?.id;
          const regId = currentUser?.registerId || currentUser?.register_id;
          const phone = currentUser?.mobile || currentUser?.phone;
          const updated = prevProfiles.map(p => {
            if (p && ((uid && p.id === uid) || (regId && (p.registerId === regId || p.register_id === regId)) || (phone && (p.phone === phone || p.mobile === phone)))) {
              return {
                ...p,
                photo: finalPhotoUrl,
                photo_url: finalPhotoUrl,
                singlePhotos: finalSingles
              };
            }
            return p;
          });
          try {
            localStorage.setItem('i4u_cached_profiles', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    } catch (err) {
      console.warn('[handlePhotoUpdateAction] updateLivePhotos error:', err);
    }
  }, [currentUser, showToast]);

  // Centralized robust profile data updater (syncs state, localStorage, match profiles, Supabase & PostgreSQL backend)
  const handleProfileUpdateAction = useCallback(async (updatedData) => {
    if (!updatedData) return;

    let updatedUser;
    setCurrentUser(prev => {
      const base = prev || {};
      updatedUser = {
        ...base,
        ...updatedData
      };
      try {
        localStorage.setItem('i4u_auth_user', JSON.stringify(updatedUser));
      } catch (e) {}
      return updatedUser;
    });

    setProfiles(prevProfiles => {
      if (!Array.isArray(prevProfiles)) return prevProfiles;
      const uid = updatedData.id || currentUser?.id;
      const regId = updatedData.registerId || updatedData.register_id || currentUser?.registerId;
      const phone = updatedData.phone || updatedData.mobile || currentUser?.phone;
      const updated = prevProfiles.map(p => {
        if (p && ((uid && p.id === uid) || (regId && (p.registerId === regId || p.register_id === regId)) || (phone && (p.phone === phone || p.mobile === phone)))) {
          return { ...p, ...updatedData };
        }
        return p;
      });
      try {
        localStorage.setItem('i4u_cached_profiles', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    showToast('Profile updated successfully! ✨');

    const identifier = updatedData.id || updatedData.registerId || updatedData.register_id || currentUser?.id || currentUser?.registerId || updatedData.phone;
    if (identifier) {
      try {
        await updateLiveUserProfile(identifier, updatedData);
      } catch (err) {
        console.warn('[handleProfileUpdateAction] updateLiveUserProfile error:', err);
      }
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

      setInterestsSent([]);
      setShortlisted([]);
      setConversations([]);
      setNotifications([]);
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

      setInterestsSent([]);
      setShortlisted([]);
      setConversations([]);
      setNotifications([]);
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
    const rawName = userData?.name || currentUser?.name || '';
    const isPlaceholder = !rawName || ['verified member', 'a verified member', 'member'].includes(rawName.toLowerCase().trim());
    const finalName = isPlaceholder ? 'Candidate' : rawName.trim();
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

    // Strictly isolate conversations for real authenticated user (no demo mock bleed)
    const uid = updatedUser.id || updatedUser.user_id || updatedUser.registerId;
    let initialConvs = [];
    try {
      const cached = localStorage.getItem(`i4u_conversations_${uid}`);
      if (cached) initialConvs = JSON.parse(cached);
    } catch (e) {}
    setConversations(Array.isArray(initialConvs) ? initialConvs : []);
    liveChatService.fetchConversationsForUser(updatedUser, profiles).then((fresh) => {
      if (Array.isArray(fresh)) setConversations(fresh);
    }).catch(() => {});

    setNotifications([]);
    setActiveChatProfileId(null);
    setSelectedProfile(null);
    setIsDirectChatOpen(false);
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
    setNotifications([]);
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

  const totalUnreadChatCount = useMemo(() => {
    return computeUnreadMessagesCount(conversations, currentUser, profiles, declinedReceivedIds);
  }, [conversations, currentUser, profiles, declinedReceivedIds]);

  const pendingReceivedInterestsCount = useMemo(() => {
    if (!currentUser) return 0;
    return (notifications || []).filter(n => 
      n && n.type === 'interest' && !n.isRead && n.status !== 'declined'
    ).length;
  }, [currentUser, notifications]);

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
                onProfileUpdated={handleProfileUpdateAction}
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
                key={`website-profile-modal-${selectedProfile.id || selectedProfile.register_id || selectedProfile.registerId}`}
                profile={selectedProfile}
                currentUser={currentUser}
                onClose={() => setSelectedProfile(null)}
                onToggleInterest={handleToggleInterest}
                isInterested={isProfileInterested(selectedProfile)}
                isConnected={isProfileConnected(selectedProfile)}
                onAcceptInterest={handleAcceptIncomingInterest}
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
              onViewInvoice={handleViewInvoice}
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
                  interestModalCandidate &&
                  Array.isArray(notifications) &&
                  notifications.some(n => 
                    n &&
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
              acceptedInterests={acceptedInterests}
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
              activeChatId={activeChatId}
              setActiveChatId={setActiveChatId}
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
              onUpdateProfile={handleProfileUpdateAction}
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
              <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[80] animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none max-w-md w-[90%]">
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
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[80] animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none w-[90%]">
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
          interestCount={pendingReceivedInterestsCount}
          unreadNotificationsCount={unreadNotificationsCount}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          currentUser={currentUser}
          onOpenFilter={() => setIsFilterSheetOpen(true)}
          onOpenLogin={() => setCurrentScreen('login')}
          deviceType={deviceMode}
          activeFiltersCount={activeFiltersCount}
          hideFloatingNotification={Boolean(selectedProfile || isDirectChatOpen || activeTab === 'chat' || isNotificationsOpen)}
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
                onStartAudioCall={handleStartAudioCall}
                onStartVideoCall={handleStartVideoCall}
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
                onViewInvoice={handleViewInvoice}
                onSimulateNotification={handleSimulateNotification}
              />

              {/* Mobile Profile Detail Sheet Modal */}
              {selectedProfile && (
                <MobileProfileDetailSheet 
                  key={`mobile-profile-detail-${selectedProfile.id || selectedProfile.register_id || selectedProfile.registerId}`}
                  profile={selectedProfile}
                  currentUser={currentUser}
                  onClose={() => setSelectedProfile(null)}
                  onToggleInterest={handleToggleInterest}
                  isInterested={isProfileInterested(selectedProfile)}
                  isConnected={isProfileConnected(selectedProfile)}
                  onAcceptInterest={handleAcceptIncomingInterest}
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
                    interestModalCandidate &&
                    Array.isArray(notifications) &&
                    notifications.some(n => 
                      n &&
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
              acceptedInterests={acceptedInterests}
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
              notifications={notifications}
              onOpenLogin={() => setCurrentScreen('login')}
              interestsSent={interestsSent}
              acceptedInterests={acceptedInterests}
              onToggleInterest={handleToggleInterest}
              shortlisted={shortlisted}
              onToggleShortlist={handleToggleShortlist}
              onSelectProfile={handleSelectProfile}
              onStartChat={handleStartChat}
              onStartAudioCall={handleStartAudioCall}
              onStartVideoCall={handleStartVideoCall}
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
              key={`chat-screen-${activeChatProfileId || 'none'}-${activeChatId || 'default'}`}
              profiles={profiles}
              currentUser={currentUser}
              onOpenLogin={() => setCurrentScreen('login')}
              conversations={conversations}
              setConversations={setConversations}
              activeProfileId={activeChatProfileId}
              setActiveProfileId={setActiveChatProfileId}
              activeChatId={activeChatId}
              setActiveChatId={setActiveChatId}
              onSelectProfile={handleSelectProfile}
              isDirectChatOpen={isDirectChatOpen}
              setIsDirectChatOpen={setIsDirectChatOpen}
              onOpenOffers={handleOpenOffers}
              onStartAudioCall={handleStartAudioCall}
              onStartVideoCall={handleStartVideoCall}
              onRequestSendInterest={handleOpenSendInterest}
              onToggleInterest={handleToggleInterest}
              declinedReceivedIds={declinedReceivedIds}
              acceptedInterests={acceptedInterests}
              isConnected={isProfileConnected(activeChatProfileId)}
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
              onUpdateProfile={handleProfileUpdateAction}
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
