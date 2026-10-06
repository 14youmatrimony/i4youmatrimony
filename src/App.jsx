import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { fetchLiveProfiles, recordLivePayment, registerLiveProfile, deletePersonalAccount, verifyLiveAadhaar, updateLivePhotos, fetchLivePlans, fetchLiveOffers, fetchLiveUserProfile } from './services/api';
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
import LoginScreen from './components/LoginScreen';
import RegistrationWizard from './components/RegistrationWizard';
import MobileVerificationScreen from './components/MobileVerificationScreen';
import AadhaarVerificationScreen from './components/AadhaarVerificationScreen';
import WhatsAppStatusSystem from './components/mobile/WhatsAppStatusSystem';
import MobileNotificationsSheet from './components/mobile/MobileNotificationsSheet';
import MobileOffersAndPlansSheet from './components/mobile/MobileOffersAndPlansSheet';
import MobilePaymentModal from './components/mobile/MobilePaymentModal';
import PaymentInvoiceModal from './components/mobile/PaymentInvoiceModal';
import MobileThemeSettingsSheet from './components/mobile/MobileThemeSettingsSheet';
import AdminConsoleView from './components/admin/AdminConsoleView';
import { ThemeProvider } from './context/ThemeContext';
import { MEMBERSHIP_PLANS, formatBackendPlan } from './data/plansData';
import WebsiteView from './components/website/WebsiteView';
import MobileAppModal from './components/mobile/MobileAppModal';
import ProfileModal from './components/ProfileModal';
import { getAppMode, setAppMode, APP_CONFIG } from './config/appConfig';

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

// Live sample notifications: Interest received, Profile shortlisted, Contact viewed, and Chat message (Tailored strictly to opposite gender)
export const getNotificationsForUser = (user) => {
  const isMale = (user?.gender || '').toLowerCase() === 'male';
  if (isMale) {
    // Gent user: all incoming notifications are strictly from Women (Female candidates)
    return [
      {
        id: 'notif-1',
        type: 'interest_received',
        profileId: 'p1', // Dr. Ananya Kulkarni (Female)
        title: 'Dr. Ananya Kulkarni sent you an Interest! 💖',
        message: 'Dr. Ananya reviewed your profile and shared family values. She expressed interest in taking things forward.',
        quote: '“Namaste Rohan, I liked your profile and career aspirations. Our family in Nashik would love to connect with yours!”',
        time: '12m ago',
        isRead: false,
        status: 'pending',
        badge: '33/36 Gunas Match'
      },
      {
        id: 'notif-2',
        type: 'profile_shortlisted',
        profileId: 'p3', // Meera Venkatraman (Female)
        title: 'Meera Venkatraman shortlisted your profile! ⭐',
        message: 'Meera added your profile to her private shortlist for family horoscope matching.',
        quote: '“Profile shortlisted for weekend family discussion & astrology review.”',
        time: '45m ago',
        isRead: false,
        status: 'pending',
        badge: 'Finance Director • CA'
      },
      {
        id: 'notif-3',
        type: 'contact_viewed',
        profileId: 'p5', // Priyanka Rathore (Female)
        title: 'Contact Details Viewed 👁️',
        message: 'Priyanka Rathore & family viewed your verified phone number & astrological horoscope.',
        quote: 'Verified contact accessed via Aadhaar matrimonial authentication protocol.',
        time: '2h ago',
        isRead: false,
        status: 'pending',
        badge: 'Aadhaar Verified'
      },
      {
        id: 'notif-4',
        type: 'message_received',
        profileId: 'p1', // Dr. Ananya Kulkarni (Female)
        title: 'New Message from Dr. Ananya Kulkarni 💬',
        message: 'Dr. Ananya sent you a direct message in matrimonial chat.',
        quote: '“Namaste! My parents saw your details and would love to arrange a video call this Sunday.”',
        time: '3h ago',
        isRead: false,
        status: 'pending',
        badge: '1 Unread Message'
      },
      {
        id: 'notif-5',
        type: 'interest_received',
        profileId: 'p7', // Dr. Zoya Farooqui (Female)
        title: 'Dr. Zoya Farooqui sent you an Interest 💖',
        message: 'Dr. Zoya expressed interest in connecting with you.',
        quote: '“Liked your profile and shared interest in healthcare and travel!”',
        time: 'Yesterday',
        isRead: true,
        status: 'accepted',
        badge: 'Universal Match'
      }
    ];
  } else {
    // Woman user: all incoming notifications are strictly from Gents (Male candidates)
    return [
      {
        id: 'notif-1',
        type: 'interest_received',
        profileId: 'p2', // Rohan Jayasimha (Male)
        title: 'Rohan Jayasimha sent you an Interest! 💖',
        message: 'Rohan reviewed your profile and career aspirations. He expressed interest in taking things forward.',
        quote: '“Namaste Priya! Really liked your design profile and creative vision. Would love to connect!”',
        time: '12m ago',
        isRead: false,
        status: 'pending',
        badge: '32/36 Gunas Match'
      },
      {
        id: 'notif-2',
        type: 'profile_shortlisted',
        profileId: 'p4', // Kabir Singh Sodhi (Male)
        title: 'Kabir Singh Sodhi shortlisted your profile! ⭐',
        message: 'Kabir added your profile to his private shortlist for family review.',
        quote: '“Profile shortlisted for weekend family discussion & compatibility review.”',
        time: '45m ago',
        isRead: false,
        status: 'pending',
        badge: 'Director • Punjab'
      },
      {
        id: 'notif-3',
        type: 'contact_viewed',
        profileId: 'p6', // Adv. Arjun Deshmukh (Male)
        title: 'Contact Details Viewed 👁️',
        message: 'Adv. Arjun Deshmukh & family viewed your verified phone number & horoscope.',
        quote: 'Verified contact accessed via Aadhaar matrimonial authentication protocol.',
        time: '2h ago',
        isRead: false,
        status: 'pending',
        badge: 'Aadhaar Verified'
      },
      {
        id: 'notif-4',
        type: 'message_received',
        profileId: 'p2', // Rohan Jayasimha (Male)
        title: 'New Message from Rohan Jayasimha 💬',
        message: 'Rohan sent you a direct message in matrimonial chat.',
        quote: '“Namaste! My parents saw your details and would love to arrange a call this Sunday.”',
        time: '3h ago',
        isRead: false,
        status: 'pending',
        badge: '1 Unread Message'
      },
      {
        id: 'notif-5',
        type: 'interest_received',
        profileId: 'p8', // Dr. Ashwin Nambiar (Male)
        title: 'Dr. Ashwin Nambiar sent you an Interest 💖',
        message: 'Dr. Ashwin expressed interest in connecting with you.',
        quote: '“Liked your profile and shared values in health and lifestyle!”',
        time: 'Yesterday',
        isRead: true,
        status: 'accepted',
        badge: 'Universal Match'
      }
    ];
  }
};

export const INITIAL_NOTIFICATIONS = getNotificationsForUser(DEMO_USER);

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

export default function App() {
  // Initialize viewMode from URL (?mode=app | ?mode=website) or hash (#app | #website) or localStorage
  const getInitialViewMode = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode') || params.get('view');
      if (modeParam === 'app' || modeParam === 'website' || modeParam === 'admin') {
        return modeParam;
      }
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash === 'app' || hash === 'website' || hash === 'admin') {
        return hash;
      }
      const saved = localStorage.getItem('i4u_view_mode');
      if (saved === 'app' || saved === 'website' || saved === 'admin') {
        return saved;
      }
    } catch (e) {}
    return 'website';
  };

  const [viewMode, setViewModeState] = useState(getInitialViewMode); // 'website' | 'app' | 'admin'

  const setViewMode = (mode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem('i4u_view_mode', mode);
      const url = new URL(window.location.href);
      url.searchParams.set('mode', mode);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
  };

  const [deviceMode, setDeviceMode] = useState('fit'); // 'fit' | 'ios' | 'android' | 'wide'
  const [currentScreen, setCurrentScreen] = useState('app'); // 'app' | 'login' | 'register' | 'verify-mobile'
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

  // Application Data & State
  const [profiles, setProfiles] = useState(() => {
    return getAppMode() ? [] : INITIAL_PROFILES;
  });

  // Synchronize candidate profiles from Python Admin Backend
  useEffect(() => {
    fetchLiveProfiles().then(liveList => {
      if (liveList && liveList.length > 0) {
        setProfiles(liveList);
      }
    });
  }, [isProduction]);

  // Synchronize dynamic membership plans & promotional offers from Python Admin Database
  const [membershipPlans, setMembershipPlans] = useState(MEMBERSHIP_PLANS);
  const [activeOffers, setActiveOffers] = useState([]);

  const syncPlansAndOffers = useCallback(async () => {
    try {
      const [livePlans, liveOffers] = await Promise.all([
        fetchLivePlans(),
        fetchLiveOffers()
      ]);
      if (Array.isArray(livePlans)) {
        setMembershipPlans(livePlans.map(formatBackendPlan));
      }
      if (Array.isArray(liveOffers)) {
        setActiveOffers(liveOffers);
      }

      // Synchronize logged-in user profile status (e.g. Aadhaar Sent Back / Approved by Admin)
      let targetUserId = null;
      try {
        const s = localStorage.getItem('i4u_auth_user');
        if (s) {
          const parsed = JSON.parse(s);
          targetUserId = parsed?.id;
        }
      } catch (e) {}

      if (!targetUserId && window.__currentUserId) {
        targetUserId = window.__currentUserId;
      }
      if (!targetUserId) {
        targetUserId = 'p_1790963054403'; // Default candidate in database (Priya Sharma)
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
            if (!prev) return prev;
            const updated = {
              ...prev,
              aadhaar_status: isSentBack ? 'sent_back' : (isAadhaarApproved ? 'approved' : 'pending'),
              aadhaarStatus: isSentBack ? 'sent_back' : (isAadhaarApproved ? 'approved' : 'pending'),
              aadhaar_rejection_reason: isSentBack ? (liveUser.aadhaar_rejection_reason || liveUser.aadhaarRejectionReason) : null,
              aadhaarRejectionReason: isSentBack ? (liveUser.aadhaar_rejection_reason || liveUser.aadhaarRejectionReason) : null,
              aadhaarVerified: isAadhaarApproved,
              aadhaar_verified: isAadhaarApproved ? 1 : 0,
              governmentIdVerified: isAadhaarApproved,
              verified: isAadhaarApproved ? true : (isSentBack ? false : prev.verified),
              aadhaar_front_image: liveUser.aadhaar_front_image || prev.aadhaar_front_image || null,
              aadhaar_back_image: liveUser.aadhaar_back_image || prev.aadhaar_back_image || null
            };
            try {
              localStorage.setItem('i4u_auth_user', JSON.stringify(updated));
              if (updated.aadhaarVerified) {
                localStorage.setItem('i4u_aadhaar_verified', 'true');
              } else {
                localStorage.removeItem('i4u_aadhaar_verified');
              }
            } catch (e) {}
            return updated;
          });
        }
      }
    } catch (e) {
      console.warn('[Sync] Failed to fetch live plans or offers:', e);
    }
  }, []);

  useEffect(() => {
    syncPlansAndOffers();

    // Auto-refresh when user/admin switches tabs or window gains focus
    const handleFocus = () => {
      syncPlansAndOffers();
    };
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (!document.hidden) syncPlansAndOffers();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Fast background sync every 1500ms to immediately reflect admin changes on app screen
    const interval = setInterval(syncPlansAndOffers, 1500);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [syncPlansAndOffers, isProduction]);

  const [interestsSent, setInterestsSent] = useState(() => {
    return getAppMode() ? [] : (DEMO_USER.interestsSent || []);
  });
  const [shortlisted, setShortlisted] = useState(() => {
    return getAppMode() ? [] : (DEMO_USER.shortlisted || []);
  });
  const [declinedReceivedIds, setDeclinedReceivedIds] = useState([]);
  const [conversations, setConversations] = useState(() => {
    if (getAppMode()) {
      try {
        const saved = localStorage.getItem('i4u_conversations');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return INITIAL_CONVERSATIONS;
  });
  const [activeChatProfileId, setActiveChatProfileId] = useState('p1');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      if (localStorage.getItem('i4u_logged_out') === 'true') {
        return null;
      }
      const saved = localStorage.getItem('i4u_auth_user');
      if (saved) {
        let user = JSON.parse(saved);
        const isAadhaarDone = localStorage.getItem('i4u_aadhaar_verified') === 'true';
        if (isAadhaarDone) {
          user = { ...user, aadhaarVerified: true, verified: true };
        }
        if (!user.membership || user.membership === 'free') {
          user.membership = 'free';
          user.contactCredits = 0;
          user.unlockedContacts = user.unlockedContacts || [];
        }
        return user;
      }
      if (getAppMode()) {
        return null;
      }
      return DEMO_USER;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    if (currentUser?.id) {
      window.__currentUserId = currentUser.id;
    }
  }, [currentUser?.id]);
  const [toastMessage, setToastMessage] = useState('');
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [aadhaarOrigin, setAadhaarOrigin] = useState('app');
  const [isDirectChatOpen, setIsDirectChatOpen] = useState(false);

  // WhatsApp Status Management State
  const [myStatus, setMyStatus] = useState(() => {
    if (getAppMode()) return null;
    return {
      id: 'my-status-init',
      type: 'photo',
      mediaUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
      caption: 'Traditional family celebration at ancestral home in Pune 🏛️✨',
      timestamp: 'Just now',
      duration: null,
      viewsCount: 18,
      isHidden: false
    };
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
      const saved = localStorage.getItem('i4u_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(n => n && typeof n === 'object' && n.type);
        }
      }
    } catch (e) {}
    return getAppMode() ? [] : INITIAL_NOTIFICATIONS;
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Membership Plans, Offers & Payment Gateway State
  const [isOffersSheetOpen, setIsOffersSheetOpen] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [paymentDuration, setPaymentDuration] = useState(6);
  const [paymentCoupon, setPaymentCoupon] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);

  const unreadNotificationsCount = (notifications || []).filter(n => n && !n.isRead).length;

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
        setCurrentUser(saved ? JSON.parse(saved) : DEMO_USER);
      } catch (e) {
        setCurrentUser(DEMO_USER);
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
      setShortlisted(DEMO_USER.shortlisted || []);
      setProfiles(INITIAL_PROFILES);
      setMyStatus({
        id: 'my-status-init',
        type: 'photo',
        mediaUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
        caption: 'Traditional family celebration at ancestral home in Pune 🏛️✨',
        timestamp: 'Just now',
        duration: null,
        viewsCount: 18,
        isHidden: false
      });
      showToast('🧪 Switched to Demo Mode (Simulated Data & Matches)');
    }
  };

  // Logout handler
  const handleLogout = () => {
    try {
      localStorage.removeItem('i4u_auth_user');
      localStorage.setItem('i4u_logged_out', 'true');
      localStorage.removeItem('i4u_aadhaar_verified');
    } catch (e) {}
    setCurrentUser(null);
    setSelectedProfile(null);
    setActiveTab('feed');
    if (viewMode === 'app') {
      setCurrentScreen('login');
    } else {
      setCurrentScreen('app');
    }
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
    const profile = profiles.find(p => p.id === profileId);
    setDeclinedReceivedIds(prev => prev.filter(id => id !== profileId));
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true, status: 'accepted' } : n));
    if (!interestsSent.includes(profileId)) {
      setInterestsSent(prev => [...prev, profileId]);
    }
    setConversations(prev => {
      if (!prev.find(c => c.profileId === profileId)) {
        return [...prev, {
          profileId,
          unreadCount: 0,
          messages: [
            {
              id: 'init-' + Date.now(),
              sender: 'them',
              text: `Namaste! Thank you for accepting my interest. Our family in ${profile?.city || 'India'} is happy to take this forward.`,
              time: 'Just now',
              status: 'read'
            }
          ]
        }];
      }
      return prev;
    });
    showToast(`Accepted interest from ${profile?.name || 'candidate'}! Chat unlocked ✨`);
  };

  const handleDeclineInterestNotification = (notifId) => {
    const notif = notifications.find(n => n.id === notifId);
    if (notif?.profileId) {
      setDeclinedReceivedIds(prev => (prev.includes(notif.profileId) ? prev : [...prev, notif.profileId]));
    }
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true, status: 'declined' } : n));
    showToast('Interest politely declined');
  };

  const handleDeclineReceivedInterest = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    setDeclinedReceivedIds(prev => (prev.includes(profileId) ? prev : [...prev, profileId]));
    setNotifications(prev => prev.map(n => n.profileId === profileId ? { ...n, isRead: true, status: 'declined' } : n));
    showToast(`Politely declined interest from ${profile?.name || 'candidate'}`);
  };

  const handleUndoDeclineReceivedInterest = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    setDeclinedReceivedIds(prev => prev.filter(id => id !== profileId));
    setNotifications(prev => prev.map(n => n.profileId === profileId ? { ...n, status: 'pending' } : n));
    showToast(`Reconsidered interest from ${profile?.name || 'candidate'} ✨`);
  };

  const handleAcceptReceivedInterest = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    setDeclinedReceivedIds(prev => prev.filter(id => id !== profileId));
    if (!interestsSent.includes(profileId)) {
      setInterestsSent(prev => [...prev, profileId]);
    }
    setNotifications(prev => prev.map(n => n.profileId === profileId ? { ...n, isRead: true, status: 'accepted' } : n));
    
    // Ensure chat conversation thread exists
    setConversations(prev => {
      if (!prev.find(c => c.profileId === profileId)) {
        return [...prev, {
          profileId,
          unreadCount: 0,
          messages: [
            {
              id: 'init-' + Date.now(),
              sender: 'them',
              text: `Namaste! Thank you for accepting my interest. Our family in ${profile?.city || 'India'} is happy to take this forward.`,
              time: 'Just now',
              status: 'read'
            }
          ]
        }];
      }
      return prev;
    });

    showToast(`Accepted interest from ${profile?.name || 'candidate'}! ✨ Chat unlocked.`);
    handleStartChat(profileId);
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

  // Handle profile selection: Protected - only logged in members can open profiles
  const handleSelectProfile = (profile) => {
    if (!profile) return;
    if (!currentUser) {
      showToast('🔒 Please register free to view complete profile & horoscope details');
      setCurrentScreen('register');
      return;
    }
    setSelectedProfile(profile);
  };

  // Toggle Interest (Connect)
  const handleToggleInterest = (profileId) => {
    if (!currentUser) {
      showToast('🔒 Please register free to express interest in matches');
      setCurrentScreen('register');
      return;
    }
    const profile = profiles.find(p => p.id === profileId);
    if (interestsSent.includes(profileId)) {
      setInterestsSent(prev => prev.filter(id => id !== profileId));
      showToast(`Interest withdrawn`);
    } else {
      setInterestsSent(prev => [...prev, profileId]);
      showToast(`Interest sent to ${profile?.name || 'profile'}! ✨`);

      // Ensure a conversation thread exists
      setConversations(prev => {
        if (!prev.find(c => c.profileId === profileId)) {
          return [...prev, {
            profileId,
            unreadCount: 0,
            messages: [
              {
                id: 'init-' + Date.now(),
                sender: 'me',
                text: `Namaste! Sent you an interest on I 4 You. Looking forward to connecting.`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'delivered'
              }
            ],
            autoReplies: [
              `Namaste! Thank you for connecting. Our family in ${profile?.city || 'India'} is happy to take this forward.`,
              `Glad to connect with you. Would love to schedule a friendly voice or video call this weekend.`
            ]
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
      setCurrentScreen('register');
      return;
    }
    const profile = profiles.find(p => p.id === profileId);
    if (shortlisted.includes(profileId)) {
      setShortlisted(prev => prev.filter(id => id !== profileId));
      showToast(`Removed from shortlist`);
    } else {
      setShortlisted(prev => [...prev, profileId]);
      showToast(`Added ${profile?.name?.split(' ')[0]} to shortlist ❤️`);
    }
  };

  // Start chat directly with candidate
  const handleStartChat = (profileId) => {
    if (!currentUser) {
      showToast('🔒 Please sign in first to chat with members');
      setCurrentScreen('login');
      return;
    }

    const hasPaidPlan = Boolean(currentUser.membership && currentUser.membership !== 'free');
    if (!hasPaidPlan) {
      showToast('👑 Active subscription required to chat directly with verified members. Upgrade now (50% OFF)!');
      handleOpenOffers();
      return;
    }

    const profile = profiles.find(p => p.id === profileId);
    setActiveChatProfileId(profileId);
    setIsDirectChatOpen(true);
    setSelectedProfile(null);
    setCurrentScreen('app');
    setActiveTab('chat');

    // Ensure a conversation thread exists for this profile
    setConversations(prev => {
      if (!prev.find(c => c.profileId === profileId)) {
        return [...prev, {
          profileId,
          unreadCount: 0,
          messages: [
            {
              id: 'init-' + Date.now(),
              sender: 'them',
              text: `Namaste! Thank you for connecting. I reviewed your profile and our family values align wonderfully.`,
              time: 'Just now',
              status: 'read'
            }
          ],
          autoReplies: [
            `Namaste! Thank you for reaching out. Our family in ${profile?.city || 'India'} is happy to take this forward.`,
            `Glad to connect with you! Would love to schedule a friendly phone or video call with our families.`,
            `Our elders were also really happy looking at our horoscope compatibility and educational background.`,
            `Wishing you and your family an auspicious day ahead!`
          ]
        }];
      }
      return prev;
    });
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

  const handleSaveMyStatus = (newStatus) => {
    setMyStatus(newStatus);
    showToast('Status shared successfully! ✨');
  };

  const handleDeleteMyStatus = () => {
    setMyStatus(null);
    showToast('Status deleted');
  };

  const handleToggleHideMyStatus = () => {
    setMyStatus(prev => {
      if (!prev) return prev;
      const nextHidden = !prev.isHidden;
      showToast(nextHidden ? 'Status hidden from candidate feeds 🔒' : 'Status made visible to matches ✨');
      return { ...prev, isHidden: nextHidden };
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
      const updated = {
        ...(prev || {}),
        name: verifiedData.fullName || prev?.name,
        mobile: verifiedData.mobile || prev?.mobile,
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
      setInterestsSent(isMale ? ['p1', 'p3', 'p5'] : ['p2', 'p4', 'p6']);
      setShortlisted(isMale ? ['p1', 'p3', 'p5', 'p7'] : ['p2', 'p4', 'p6', 'p8']);
      setConversations(isMale ? CONVERSATIONS_FOR_MALE : CONVERSATIONS_FOR_FEMALE);
      setNotifications(getNotificationsForUser(updated));
      setActiveChatProfileId(isMale ? 'p1' : 'p2');

      // Synchronize candidate profile registration with Python Admin Backend & Database
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
      setInterestsSent(isMale ? ['p1', 'p3', 'p5'] : ['p2', 'p4', 'p6']);
      setShortlisted(isMale ? ['p1', 'p3', 'p5', 'p7'] : ['p2', 'p4', 'p6', 'p8']);
      setConversations(isMale ? CONVERSATIONS_FOR_MALE : CONVERSATIONS_FOR_FEMALE);
      setNotifications(getNotificationsForUser(updated));
      setActiveChatProfileId(isMale ? 'p1' : 'p2');

      // Synchronize candidate registration and live verification with Python Admin Backend & Database
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
      ? (currentUser?.name && currentUser.name !== 'Verified Member' ? currentUser.name : DEMO_USER.name)
      : userData.name;
    const resolvedGender = normalizeGender(userData?.gender || currentUser?.gender) === 'male' ? 'Male' : 'Female';
    const isMale = resolvedGender === 'Male';
    const updatedUser = {
      ...(currentUser || {}),
      ...userData,
      name: finalName,
      gender: resolvedGender,
      mobileVerified: true,
      verified: true
    };
    try {
      localStorage.removeItem('i4u_logged_out');
      localStorage.setItem('i4u_auth_user', JSON.stringify(updatedUser));
    } catch (e) {}
    setCurrentUser(updatedUser);
    setInterestsSent(updatedUser.interestsSent || (isMale ? ['p1', 'p3', 'p5'] : ['p2', 'p4', 'p6']));
    setShortlisted(updatedUser.shortlisted || (isMale ? ['p1', 'p3', 'p5', 'p7'] : ['p2', 'p4', 'p6', 'p8']));
    setConversations(getConversationsForUser(updatedUser));
    setNotifications(getNotificationsForUser(updatedUser));
    setActiveChatProfileId(isMale ? 'p1' : 'p2');
    setCurrentScreen('app');
    setActiveTab('feed');
  };

  // 1-Click Demo Persona Switcher (Bride Priya vs Groom Rohan)
  const handleSwitchDemoGender = (targetGender) => {
    const isMale = (targetGender || '').toLowerCase() === 'male';
    const persona = isMale ? DEMO_USER_MALE : DEMO_USER_FEMALE;
    setCurrentUser(persona);
    setInterestsSent(persona.interestsSent || (isMale ? ['p1', 'p3', 'p5'] : ['p2', 'p4', 'p6']));
    setShortlisted(persona.shortlisted || (isMale ? ['p1', 'p3', 'p5', 'p7'] : ['p2', 'p4', 'p6', 'p8']));
    setConversations(getConversationsForUser(persona));
    setNotifications(getNotificationsForUser(persona));
    setActiveChatProfileId(isMale ? 'p1' : 'p2');
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
      try {
        localStorage.removeItem('i4u_auth_user');
      } catch (e) {}
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
      try {
        localStorage.removeItem('i4u_auth_user');
      } catch (e) {}
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

    return profiles.filter(p => {
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

  const totalUnreadChatCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <ThemeProvider>
      <PhotoPrivacyProvider>
        {viewMode === 'admin' ? (
          <AdminConsoleView 
            profiles={profiles}
            setProfiles={setProfiles}
            currentUser={currentUser}
            onSwitchToWebsite={() => setViewMode('website')}
            onSwitchToApp={() => setViewMode('app')}
            isProduction={isProduction}
            onToggleProductionMode={handleToggleProductionMode}
          />
        ) : viewMode === 'website' ? (
          <>
            {/* 1. Website View */}
            <WebsiteView 
              profiles={websiteProfiles}
              currentUser={currentUser}
              currentScreen={currentScreen}
              interestsSent={interestsSent}
              onToggleInterest={handleToggleInterest}
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
              onOpenRegister={() => setCurrentScreen('register')}
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
            />

            {/* SCREEN 1: Dedicated Login Modal on Website */}
            {currentScreen === 'login' && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#D4AF37]/40 relative">
                  <LoginScreen 
                    onLoginSuccess={handleLoginSuccess}
                    setCurrentScreen={setCurrentScreen}
                    onNavigateToRegister={() => setCurrentScreen('register')}
                    onBack={() => setCurrentScreen('app')}
                  />
                </div>
              </div>
            )}

            {/* SCREEN 2: Dedicated Register Modal on Website */}
            {currentScreen === 'register' && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-[#D4AF37]/40 relative">
                  <RegistrationWizard 
                    onRegistrationComplete={(regData) => {
                      if (regData?.aadhaarVerified) {
                        handleAadhaarVerificationSuccess(regData);
                      } else {
                        handleVerificationSuccess(regData);
                      }
                      setCurrentScreen('app');
                    }}
                    setCurrentScreen={setCurrentScreen}
                    onNavigateToLogin={() => setCurrentScreen('login')}
                    onBack={() => setCurrentScreen('app')}
                  />
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
                isInterested={interestsSent.includes(selectedProfile.id)}
                onToggleShortlist={handleToggleShortlist}
                isShortlisted={shortlisted.includes(selectedProfile.id)}
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
              isInterested={interestsSent.includes(activeStoryViewer?.profile?.id)}
            />

            {/* Mobile Notifications Center Sheet */}
            <MobileNotificationsSheet 
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              isWebsiteModal={true}
              notifications={notifications}
              profiles={profiles}
              onMarkAsRead={handleMarkNotificationAsRead}
              onMarkAllAsRead={handleMarkAllNotificationsAsRead}
              onDeleteNotification={handleDeleteNotification}
              onAcceptInterest={handleAcceptInterestNotification}
              onDeclineInterest={handleDeclineInterestNotification}
              onSendInterest={handleToggleInterest}
              onOpenChat={(profileId) => {
                setIsNotificationsOpen(false);
                handleStartChat(profileId);
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
                setCurrentScreen('register');
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
          onNavigateToRegister={() => setCurrentScreen('register')}
          onBack={() => setCurrentScreen('app')}
        />
      )}

      {/* SCREEN 2: Dedicated Registration Wizard */}
      {currentScreen === 'register' && (
        <RegistrationWizard 
          onRegistrationComplete={(regData) => {
            if (regData?.aadhaarVerified) {
              handleAadhaarVerificationSuccess(regData);
            } else {
              handleVerificationSuccess(regData);
            }
          }}
          setCurrentScreen={setCurrentScreen}
          onNavigateToLogin={() => setCurrentScreen('login')}
          onBack={() => setCurrentScreen('app')}
        />
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
          interestCount={interestsSent.length}
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
                notifications={notifications}
                profiles={profiles}
                onMarkAsRead={handleMarkNotificationAsRead}
                onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                onDeleteNotification={handleDeleteNotification}
                onAcceptInterest={handleAcceptInterestNotification}
                onDeclineInterest={handleDeclineInterestNotification}
                onSendInterest={(profileId) => {
                  handleToggleInterest(profileId);
                }}
                onOpenChat={(profileId) => {
                  setIsNotificationsOpen(false);
                  handleStartChat(profileId);
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
                  isInterested={interestsSent.includes(selectedProfile.id)}
                  onToggleShortlist={handleToggleShortlist}
                  isShortlisted={shortlisted.includes(selectedProfile.id)}
                  onStartChat={handleStartChat}
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
                isInterested={interestsSent.includes(activeStoryViewer?.profile?.id)}
              />

              {/* Mobile Photo Management Bottom Sheet (Confined to mobile device frame) */}
              <MobilePhotoManagerSheet 
                isOpen={isPhotoManagerOpen}
                onClose={() => setIsPhotoManagerOpen(false)}
                initialTab={photoManagerTab}
                currentUser={currentUser}
                onUpdatePhotos={(photosData) => {
                  setCurrentUser(prev => {
                    const updated = {
                      ...prev,
                      ...photosData
                    };
                    try {
                      localStorage.setItem('i4u_auth_user', JSON.stringify(updated));
                    } catch (e) {}
                    updateLivePhotos({
                      id: updated?.id,
                      phone: updated?.mobile || updated?.phone,
                      name: updated?.name || updated?.fullName,
                      photo: photosData.photo,
                      singlePhotos: photosData.singlePhotos,
                      familyPhotos: photosData.familyPhotos
                    });
                    return updated;
                  });
                  if (photosData.hidePhotos) {
                    showToast('Photos hidden from public search 🔒');
                  } else if (photosData.photoVisibility === 'accepted') {
                    showToast('Photos set to Accepted Matches only 🔒');
                  } else if (photosData.photoVisibility === 'request') {
                    showToast('Photos set to Request Approval only 🔑');
                  } else {
                    showToast('Profile & Family Photos updated! ✨');
                  }
                }}
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
              profiles={filteredProfiles}
              currentUser={currentUser}
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
              profiles={filteredProfiles}
              currentUser={currentUser}
              conversations={conversations}
              setConversations={setConversations}
              activeProfileId={activeChatProfileId}
              setActiveProfileId={setActiveChatProfileId}
              onSelectProfile={handleSelectProfile}
              isDirectChatOpen={isDirectChatOpen}
              setIsDirectChatOpen={setIsDirectChatOpen}
              onOpenOffers={handleOpenOffers}
            />
          )}

          {/* Tab 5: Account & Profile */}
          {activeTab === 'account' && (
            <MobileAccountScreen 
              currentUser={currentUser}
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
              onUpdatePhotos={(photosData) => {
                setCurrentUser(prev => {
                  const updated = {
                    ...prev,
                    ...photosData
                  };
                  try {
                    localStorage.setItem('i4u_auth_user', JSON.stringify(updated));
                  } catch (e) {}
                  updateLivePhotos({
                    id: updated?.id,
                    phone: updated?.mobile || updated?.phone,
                    name: updated?.name || updated?.fullName,
                    photo: photosData.photo,
                    singlePhotos: photosData.singlePhotos,
                    familyPhotos: photosData.familyPhotos
                  });
                  return updated;
                });
                showToast('Profile & Family Photos updated! ✨');
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
              onOpenRegister={() => setCurrentScreen('register')}
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
    </PhotoPrivacyProvider>
    </ThemeProvider>
  );
}
