import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  ChevronLeft,
  Store,
  Image as ImageIcon,
  Video,
  MessageSquare,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Upload,
  LogOut,
  Mail,
  Lock,
  Link,
  Phone,
  Users,
  Send,
  ShieldCheck,
  FileText,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { forceLogout } from '../../services/authService';
import { sendPhoneOtp, verifyPhoneOtp } from '../../services/phoneAuth';
import {
  VENDOR_CATEGORIES,
  INDIAN_STATES_AND_UTS,
  SERVICE_AREA_OPTIONS,
  getServiceDistrictsForState,
  isYouTubeUrl,
  getYouTubeEmbedUrl,
  fetchMyVendorProfile,
  saveVendorProfile,
  uploadVendorVerificationDoc,
  addVendorMediaFile,
  addVendorYouTubeUrl,
  removeVendorMedia,
  fetchVendorInquiries,
  sendVendorReply,
  markVendorInquiryRead
} from '../../services/vendorService';

const VENDOR_CATEGORY_OPTIONS = VENDOR_CATEGORIES.filter(c => c.id !== 'all');
const VENDOR_STATE_OPTIONS = INDIAN_STATES_AND_UTS.filter(s => s !== 'All States');

function getCategoryDetailPlaceholder(category) {
  switch (category) {
    case 'bridal_groom_car':
      return 'List bridal/groom car models (e.g. Mercedes E-Class, BMW 5 Series, Audi A6), floral car decor options, chauffeur availability, and seating capacity...';
    case 'tourist_bus':
      return 'Specify bus models (e.g. Volvo 45-Seater, BharatBenz 35-Seater, Tempo Traveller 17-Seater), AC/pushback seating capacity, and long-trip package terms...';
    case 'stage_hall_decoration':
    case 'auditorium_convention':
      return 'Describe wedding stage themes, mandapam styles, hall/auditorium capacity, floral/lighting setups, and reception backdrop packages...';
    case 'catering_food':
      return 'Specify Sadhya/buffet menus, crew strength, uniformed serving staff, live counters, and maximum guest capacity...';
    default:
      return 'Describe your wedding packages, specialties, crew/team strength, and key highlights...';
  }
}

export default function VendorPortalScreen({ onBack, showToast }) {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  // 2-Step Registration Wizard State
  const [regStep, setRegStep] = useState(1); // 1 = Mobile OTP Verification, 2 = Business Details
  const [regMobile, setRegMobile] = useState('');
  const [regOtpInput, setRegOtpInput] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpBusy, setRegOtpBusy] = useState(false);
  const [regOtpConfirmation, setRegOtpConfirmation] = useState(null);
  const [regIsSimulatedOtp, setRegIsSimulatedOtp] = useState(false);
  const [regDemoOtpCode, setRegDemoOtpCode] = useState('');
  const [regMobileVerified, setRegMobileVerified] = useState(false);
  const [regCountdown, setRegCountdown] = useState(0);

  // Staged media & verification doc during Step 2 registration
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [stagedPhotos, setStagedPhotos] = useState([]); // File[]
  const [stagedVideos, setStagedVideos] = useState([]); // File[]

  const [activePortalTab, setActivePortalTab] = useState('profile'); // 'profile' | 'media' | 'inbox'
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [form, setForm] = useState({
    business_name: '',
    owner_name: '',
    phone: '',
    whatsapp_number: '',
    state: 'Kerala',
    district: 'Ernakulam',
    city_address: '',
    address: '',
    service_area: 'Entire District',
    experience_years: '',
    license_number: '',
    category: 'event_management',
    pricing_range: '',
    description: '',
    staff_details: '',
    verification_doc_url: '',
    is_mobile_verified: false
  });

  // Media state (for existing profile)
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [savingYoutube, setSavingYoutube] = useState(false);

  // Inbox state
  const [inquiries, setInquiries] = useState([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const districtOptionsForState = useMemo(() => {
    const list = getServiceDistrictsForState(form.state || 'Kerala').filter(d => d !== 'All Districts');
    return list.length > 0 ? [...list, 'All India'] : ['All India'];
  }, [form.state]);

  useEffect(() => {
    if (regCountdown <= 0) return undefined;
    const t = setTimeout(() => setRegCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [regCountdown]);

  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      if (!isSupabaseConfigured()) {
        setAuthLoading(false);
        return;
      }
      try {
        const { data } = await supabase.auth.getUser();
        if (mounted) {
          setAuthUser(data?.user || null);
        }
      } catch (e) {
        if (mounted) setAuthUser(null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };
    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const loadVendorData = async (userId) => {
    if (!userId) return;
    setLoadingVendor(true);
    try {
      const profile = await fetchMyVendorProfile(userId);
      setVendorProfile(profile);
      if (profile) {
        setForm({
          business_name: profile.business_name || '',
          owner_name: profile.owner_name || '',
          phone: profile.phone || '',
          whatsapp_number: profile.whatsapp_number || '',
          state: profile.state || 'Kerala',
          district: profile.district || 'Ernakulam',
          city_address: profile.city_address || '',
          address: profile.address || '',
          service_area: profile.service_area || 'Entire District',
          experience_years: profile.experience_years || '',
          license_number: profile.license_number || '',
          category: profile.category || 'event_management',
          pricing_range: profile.pricing_range || '',
          description: profile.description || '',
          staff_details: profile.staff_details || '',
          verification_doc_url: profile.verification_doc_url || '',
          is_mobile_verified: Boolean(profile.is_mobile_verified)
        });
        setLoadingInquiries(true);
        const list = await fetchVendorInquiries(profile.id);
        setInquiries(list);
        setLoadingInquiries(false);
      }
    } catch (err) {
      console.warn('[VendorPortalScreen] loadVendorData error:', err);
    } finally {
      setLoadingVendor(false);
    }
  };

  useEffect(() => {
    if (authUser?.id) {
      loadVendorData(authUser.id);
    }
  }, [authUser?.id]);

  const photos = useMemo(() => {
    return (vendorProfile?.media || []).filter(m => m.media_type === 'image');
  }, [vendorProfile]);

  const videos = useMemo(() => {
    return (vendorProfile?.media || []).filter(m => m.media_type === 'video');
  }, [vendorProfile]);

  const unreadInquiriesCount = useMemo(() => {
    return inquiries.filter(i => !i.is_read && (i.sender_role || 'customer') === 'customer').length;
  }, [inquiries]);

  const groupedThreads = useMemo(() => {
    const map = new Map();
    (inquiries || []).forEach((item) => {
      const cid = String(item.customer_id || '');
      if (!cid) return;
      if (!map.has(cid)) {
        map.set(cid, {
          customerId: cid,
          customerName: item.customer_name || 'Member',
          customerPhone: item.customer_phone || '',
          messages: [],
          unreadCount: 0,
          lastAt: item.created_at
        });
      }
      const thread = map.get(cid);
      thread.messages.push(item);
      if ((item.sender_role || 'customer') === 'customer' && !item.is_read) {
        thread.unreadCount += 1;
      }
      thread.lastAt = item.created_at;
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime()
    );
  }, [inquiries]);

  const activeThread = useMemo(() => {
    if (!groupedThreads.length) return null;
    if (selectedCustomerId) {
      return groupedThreads.find(t => t.customerId === selectedCustomerId) || groupedThreads[0];
    }
    return groupedThreads[0];
  }, [groupedThreads, selectedCustomerId]);

  useEffect(() => {
    if (!vendorProfile?.id || !isSupabaseConfigured() || !supabase) return undefined;
    const ch = supabase
      .channel(`vendor-inbox-${vendorProfile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vendor_inquiries', filter: `vendor_id=eq.${vendorProfile.id}` },
        async () => {
          const list = await fetchVendorInquiries(vendorProfile.id);
          setInquiries(list);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [vendorProfile?.id]);

  // Step 1: Send Mobile OTP
  const handleSendVendorOtp = async () => {
    setAuthError('');
    const digits = regMobile.replace(/\D/g, '');
    if (digits.length !== 10) {
      setAuthError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setRegOtpBusy(true);
    try {
      const res = await sendPhoneOtp(digits);
      if (!res?.success) {
        throw new Error(res?.error || 'Could not send OTP.');
      }
      setRegOtpConfirmation(res.confirmationResult || null);
      setRegOtpSent(true);
      setRegCountdown(30);
      if (res.isSimulated) {
        setRegIsSimulatedOtp(true);
        setRegDemoOtpCode(res.demoOtp || '482916');
      } else {
        setRegIsSimulatedOtp(false);
        setRegDemoOtpCode('');
      }
      showToast?.('OTP sent to your mobile number.');
    } catch (err) {
      setAuthError(err.message || 'Failed to send OTP.');
    } finally {
      setRegOtpBusy(false);
    }
  };

  // Step 1: Verify Mobile OTP
  const handleVerifyVendorOtp = async () => {
    setAuthError('');
    const cleanOtp = regOtpInput.replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setAuthError('Please enter the 6-digit OTP.');
      return;
    }
    setRegOtpBusy(true);
    try {
      const clean10 = regMobile.replace(/\D/g, '').slice(-10);
      const res = await verifyPhoneOtp(regOtpConfirmation, cleanOtp, regIsSimulatedOtp, clean10);
      if (!res?.success) {
        throw new Error(res?.error || 'Invalid OTP. Please check and try again.');
      }
      setRegMobileVerified(true);
      setForm(prev => ({
        ...prev,
        phone: `+91 ${clean10}`,
        whatsapp_number: prev.whatsapp_number || `+91 ${clean10}`,
        is_mobile_verified: true
      }));
      // Check if Supabase Phone Auth created a real session
      if (isSupabaseConfigured()) {
        const { data } = await supabase.auth.getUser().catch(() => ({ data: null }));
        if (data?.user) {
          setAuthUser(data.user);
        }
      }
      showToast?.('Mobile number verified.');
    } catch (err) {
      setAuthError(err.message || 'OTP verification failed.');
    } finally {
      setRegOtpBusy(false);
    }
  };

  // Sign-In Handler
  const handleVendorLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail.trim() || !authPassword) {
      setAuthError('Please enter your email and password.');
      return;
    }
    setAuthBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword
      });
      if (error) throw error;
      if (data?.user) {
        setAuthUser(data.user);
        showToast?.('Signed in to Vendor Portal.');
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVendorSignOut = async () => {
    await forceLogout(() => {
      setAuthUser(null);
      setVendorProfile(null);
      setInquiries([]);
    });
  };

  // Upload Verification Document (Owner ID or Shop License) to Cloudflare R2
  const handleVerificationDocUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingDoc(true);
    setErrorMessage('');
    setAuthError('');
    try {
      const vendorKey = vendorProfile?.id || authUser?.id || `reg_${regMobile.replace(/\D/g, '') || Date.now()}`;
      const docUrl = await uploadVendorVerificationDoc({ vendorKey, file });
      setForm(prev => ({ ...prev, verification_doc_url: docUrl }));
      showToast?.('Verification document uploaded.');
    } catch (err) {
      const msg = err.message || 'Verification document upload failed.';
      setErrorMessage(msg);
      setAuthError(msg);
    } finally {
      setUploadingDoc(false);
    }
  };

  // Step 2 Complete Registration Submit
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setAuthError('');
    setErrorMessage('');

    if (!regMobileVerified) {
      setAuthError('Please verify your mobile number in Step 1 first.');
      return;
    }
    if (!form.business_name.trim() || !form.owner_name.trim() || !form.city_address.trim() || !form.address.trim()) {
      setAuthError('Please fill in Business Name, Owner Name, Town/City, and Full Street Address.');
      return;
    }
    if (!form.verification_doc_url) {
      setAuthError('Please upload an Owner ID or Shop License verification document.');
      return;
    }

    setSavingProfile(true);
    try {
      let activeUser = authUser;
      if (!activeUser) {
        if (!authEmail.trim() || !authPassword || authPassword.length < 6) {
          throw new Error('Please enter a valid Business Email and Password (min 6 characters) for your vendor login.');
        }
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: { data: { role: 'vendor', phone: form.phone } }
        });
        if (signUpErr) throw signUpErr;
        activeUser = signUpData?.user;
        if (!activeUser) {
          throw new Error('Could not create vendor account. Please try again.');
        }
        setAuthUser(activeUser);
      }

      const saved = await saveVendorProfile(activeUser.id, {
        ...form,
        is_mobile_verified: true
      });

      const uploadedMedia = [];
      for (let i = 0; i < stagedPhotos.length; i += 1) {
        const item = await addVendorMediaFile({
          vendorId: saved.id,
          file: stagedPhotos[i],
          mediaType: 'image',
          sortOrder: i
        });
        uploadedMedia.push(item);
      }
      for (let i = 0; i < stagedVideos.length; i += 1) {
        const item = await addVendorMediaFile({
          vendorId: saved.id,
          file: stagedVideos[i],
          mediaType: 'video',
          sortOrder: 100 + i
        });
        uploadedMedia.push(item);
      }

      setStagedPhotos([]);
      setStagedVideos([]);
      setVendorProfile({ ...saved, media: uploadedMedia });
      setStatusMessage('Registration submitted. Account Under Review: Your profile and documents are awaiting Super Admin verification and approval.');
      showToast?.('Vendor registration submitted for Super Admin verification.');
    } catch (err) {
      setAuthError(err.message || 'Unable to submit registration.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Update existing vendor profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setStatusMessage('');
    setErrorMessage('');

    if (!form.business_name.trim() || !form.owner_name.trim() || !form.phone.trim() || !form.city_address.trim()) {
      setErrorMessage('Please fill in Business Name, Owner Name, Phone, and Town/City.');
      return;
    }

    setSavingProfile(true);
    try {
      const saved = await saveVendorProfile(authUser.id, form, vendorProfile?.id || null);
      setVendorProfile(prev => ({
        ...saved,
        media: prev?.media || []
      }));
      const isLive = Boolean(saved.is_verified && saved.is_approved);
      setStatusMessage(
        isLive
          ? 'Business profile updated and live.'
          : 'Account Under Review: Your profile and documents are awaiting Super Admin verification and approval.'
      );
      showToast?.('Vendor business profile saved.');
    } catch (err) {
      setErrorMessage(err.message || 'Unable to save business profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || !vendorProfile?.id) return;

    const remaining = 10 - photos.length;
    if (remaining <= 0) {
      setErrorMessage('Maximum of 10 photos reached. Delete an existing photo first.');
      return;
    }

    setUploadingPhoto(true);
    setErrorMessage('');
    try {
      const toUpload = files.slice(0, remaining);
      const uploadedItems = [];
      for (let i = 0; i < toUpload.length; i += 1) {
        const item = await addVendorMediaFile({
          vendorId: vendorProfile.id,
          file: toUpload[i],
          mediaType: 'image',
          sortOrder: photos.length + i
        });
        uploadedItems.push(item);
      }
      setVendorProfile(prev => ({
        ...prev,
        media: [...(prev?.media || []), ...uploadedItems]
      }));
      showToast?.(`${uploadedItems.length} photo(s) uploaded.`);
    } catch (err) {
      setErrorMessage(err.message || 'Photo upload failed.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !vendorProfile?.id) return;

    if (videos.length >= 2) {
      setErrorMessage('Maximum of 2 promotional videos allowed. Remove an existing video first.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('Promotional video must be 20 MB or smaller.');
      return;
    }

    setUploadingVideo(true);
    setErrorMessage('');
    try {
      const item = await addVendorMediaFile({
        vendorId: vendorProfile.id,
        file,
        mediaType: 'video',
        sortOrder: 100 + videos.length
      });
      setVendorProfile(prev => ({
        ...prev,
        media: [...(prev?.media || []), item]
      }));
      showToast?.('Promotional video uploaded.');
    } catch (err) {
      setErrorMessage(err.message || 'Video upload failed.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleAddYouTube = async (e) => {
    e.preventDefault();
    if (!vendorProfile?.id) return;
    if (videos.length >= 2) {
      setErrorMessage('Maximum of 2 promotional videos allowed (including YouTube links).');
      return;
    }
    if (!isYouTubeUrl(youtubeInput)) {
      setErrorMessage('Please enter a valid YouTube URL (e.g. https://youtu.be/...).');
      return;
    }
    setSavingYoutube(true);
    setErrorMessage('');
    try {
      const item = await addVendorYouTubeUrl({
        vendorId: vendorProfile.id,
        youtubeUrl: youtubeInput,
        sortOrder: 100 + videos.length
      });
      setVendorProfile(prev => ({
        ...prev,
        media: [...(prev?.media || []), item]
      }));
      setYoutubeInput('');
      showToast?.('YouTube video link added.');
    } catch (err) {
      setErrorMessage(err.message || 'Could not add YouTube link.');
    } finally {
      setSavingYoutube(false);
    }
  };

  const handleDeleteMedia = async (mediaItem) => {
    try {
      await removeVendorMedia(mediaItem);
      setVendorProfile(prev => ({
        ...prev,
        media: (prev?.media || []).filter(m => m.id !== mediaItem.id)
      }));
      showToast?.('Media deleted.');
    } catch (err) {
      setErrorMessage(err.message || 'Could not delete media.');
    }
  };

  const handleMarkRead = async (inquiry) => {
    if (inquiry.is_read) return;
    await markVendorInquiryRead(inquiry.id);
    setInquiries(prev => prev.map(i => (i.id === inquiry.id ? { ...i, is_read: true } : i)));
  };

  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!vendorProfile?.id || !activeThread || !replyText.trim()) return;
    setSendingReply(true);
    setErrorMessage('');
    try {
      const inserted = await sendVendorReply({
        vendorId: vendorProfile.id,
        businessName: vendorProfile.business_name,
        customerId: activeThread.customerId,
        customerName: activeThread.customerName,
        customerPhone: activeThread.customerPhone,
        message: replyText
      });
      setInquiries(prev => [...prev, inserted]);
      setReplyText('');
      showToast?.('Reply sent to customer inbox.');
    } catch (err) {
      setErrorMessage(err.message || 'Could not send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const buildCustomerWhatsAppReply = (inquiry) => {
    const digits = String(inquiry.customer_phone || '').replace(/\D/g, '');
    if (!digits) return '';
    const normalized = digits.length === 10 ? `91${digits}` : digits;
    const text = encodeURIComponent(
      `Hello ${inquiry.customer_name || ''}, thank you for contacting ${form.business_name || 'us'} via I 4 You Matrimony.`
    );
    return `https://wa.me/${normalized}?text=${text}`;
  };

  const isVendorLive = Boolean(vendorProfile?.is_verified && vendorProfile?.is_approved);

  return (
    <div className="min-h-screen bg-[#FFF7FA] text-[#2E1A36] pb-24">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-[#FDF2F6]/95 backdrop-blur-md border-b border-[#E8C6D1] px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-white border border-[#E8C6D1] text-[#C76B85] hover:bg-[#F9EBF0] transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#F3EEFA] border border-[#D8CBEF] flex items-center justify-center text-[#5B3E8C]">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-[#2E1A36]">
                Business / Vendor Portal
              </h1>
              <p className="text-[11px] text-[#AA98A9]">
                Manage your wedding service listing, verification &amp; inquiries
              </p>
            </div>
          </div>
        </div>

        {authUser && (
          <button
            type="button"
            onClick={handleVendorSignOut}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#E8C6D1] text-xs font-semibold text-[#C76B85] hover:bg-[#F9EBF0] flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        )}
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-5">
        {authLoading && (
          <div className="rounded-3xl bg-white border border-[#E8C6D1] p-8 text-center text-xs text-[#AA98A9]">
            Checking vendor session...
          </div>
        )}

        {/* Vendor Auth & 2-Step Registration Screen */}
        {!authLoading && !authUser && (
          <div className={`rounded-3xl bg-white border border-[#E8C6D1] p-5 sm:p-6 shadow-sm space-y-5 mx-auto mt-3 ${authMode === 'signup' && regStep === 2 ? 'max-w-2xl' : 'max-w-md'}`}>
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-[#F9EBF0] border border-[#E8C6D1] text-[#C76B85] flex items-center justify-center mx-auto">
                <Store className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-[#2E1A36]">
                {authMode === 'login' ? 'Vendor Partner Sign In' : 'Vendor Business Registration'}
              </h2>
              <p className="text-xs text-[#AA98A9]">
                Showcase your services to verified Premium Matrimony families across Kerala &amp; India.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#FFF7FA] border border-[#E8C6D1]">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  authMode === 'login' ? 'bg-[#C76B85] text-white' : 'text-[#5A4463]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError('');
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  authMode === 'signup' ? 'bg-[#C76B85] text-white' : 'text-[#5A4463]'
                }`}
              >
                Register Business
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* MODE A: SIGN IN */}
            {authMode === 'login' && (
              <form onSubmit={handleVendorLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                    Business Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#9D8588] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="contact@yourbusiness.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#9D8588] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full py-2.5 rounded-xl bg-[#C76B85] hover:bg-[#B35872] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {authBusy ? 'Please wait...' : 'Sign In to Vendor Portal'}
                </button>
              </form>
            )}

            {/* MODE B: 2-STEP VENDOR REGISTRATION */}
            {authMode === 'signup' && (
              <div className="space-y-4">
                {/* Step Indicator */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                    regStep === 1 ? 'bg-[#F9EBF0] border-[#8064A2] text-[#C76B85]' : 'bg-[#E7F6EF] border-[#BBE5D3] text-[#1E7F5C]'
                  }`}>
                    <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[11px] font-extrabold shrink-0">1</span>
                    <span>Mobile OTP</span>
                  </div>
                  <div className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                    regStep === 2 ? 'bg-[#F9EBF0] border-[#8064A2] text-[#C76B85]' : 'bg-[#FFF7FA] border-[#E8C6D1] text-[#AA98A9]'
                  }`}>
                    <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[11px] font-extrabold shrink-0">2</span>
                    <span>Business Details</span>
                  </div>
                </div>

                {/* STEP 1: MOBILE OTP VERIFICATION */}
                {regStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                        10-Digit Indian Mobile Number *
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#C76B85]">+91</span>
                          <input
                            type="tel"
                            maxLength={10}
                            disabled={regMobileVerified}
                            value={regMobile}
                            onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="9847000000"
                            className="w-full pl-11 pr-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs font-medium focus:outline-none focus:border-[#8064A2] disabled:opacity-70"
                          />
                        </div>
                        {!regMobileVerified && (
                          <button
                            type="button"
                            onClick={handleSendVendorOtp}
                            disabled={regOtpBusy || regCountdown > 0 || regMobile.replace(/\D/g, '').length !== 10}
                            className="px-3.5 py-2.5 rounded-xl bg-[#C76B85] hover:bg-[#B35872] text-white text-xs font-bold whitespace-nowrap cursor-pointer disabled:opacity-50"
                          >
                            {regOtpBusy ? 'Sending...' : regCountdown > 0 ? `Resend (${regCountdown}s)` : regOtpSent ? 'Resend OTP' : 'Send OTP'}
                          </button>
                        )}
                      </div>
                    </div>

                    {regOtpSent && !regMobileVerified && (
                      <div className="space-y-3 p-3.5 rounded-2xl bg-[#FFF7FA] border border-[#E8C6D1]">
                        {regIsSimulatedOtp && regDemoOtpCode && (
                          <div className="p-2.5 rounded-xl bg-[#F3EEFA] border border-[#D8CBEF] text-[#5B3E8C] text-[11px] font-semibold">
                            Localhost Test Mode: Enter verification OTP <span className="font-mono font-bold underline">{regDemoOtpCode}</span>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                            Enter 6-Digit OTP
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={regOtpInput}
                              onChange={(e) => setRegOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="6-digit OTP"
                              className="flex-1 px-3 py-2.5 rounded-xl bg-white border border-[#E8C6D1] text-xs font-mono tracking-widest focus:outline-none focus:border-[#8064A2]"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyVendorOtp}
                              disabled={regOtpBusy || regOtpInput.length !== 6}
                              className="px-4 py-2.5 rounded-xl bg-[#1E7F5C] hover:bg-[#176448] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                              {regOtpBusy ? 'Verifying...' : 'Verify OTP'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {regMobileVerified && (
                      <div className="p-3 rounded-2xl bg-[#E7F6EF] border border-[#BBE5D3] text-[#1E7F5C] text-xs font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          <span>Mobile Verified (+91 {regMobile})</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-white text-[10px] border border-[#BBE5D3]">
                          Verified
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={!regMobileVerified}
                      onClick={() => setRegStep(2)}
                      className="w-full py-2.5 rounded-xl bg-[#C76B85] hover:bg-[#B35872] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <span>Next: Business &amp; Service Details</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* STEP 2: COMPLETE BUSINESS & SERVICE DETAILS */}
                {regStep === 2 && (
                  <form onSubmit={handleCompleteRegistration} className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#F9EBF0]">
                      <button
                        type="button"
                        onClick={() => setRegStep(1)}
                        className="text-xs font-semibold text-[#C76B85] flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Step 1</span>
                      </button>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E7F6EF] border border-[#BBE5D3] text-[#1E7F5C] text-[11px] font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Mobile Verified</span>
                      </span>
                    </div>

                    {/* Account Login Credentials */}
                    <div className="p-3.5 rounded-2xl bg-[#F3EEFA]/60 border border-[#D8CBEF] grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Business Login Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="owner@yourbusiness.com"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Portal Password *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Business / Shop Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.business_name}
                          onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                          placeholder="e.g. Royal Malabar Events"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Owner Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.owner_name}
                          onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                          placeholder="Full name of business owner"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Service Category *
                        </label>
                        <select
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        >
                          {VENDOR_CATEGORY_OPTIONS.map((c) => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Service Coverage Area *
                        </label>
                        <select
                          value={form.service_area}
                          onChange={(e) => setForm({ ...form, service_area: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        >
                          {SERVICE_AREA_OPTIONS.map((area) => (
                            <option key={area} value={area}>{area}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Verified Mobile Number *
                        </label>
                        <input
                          type="tel"
                          readOnly
                          value={form.phone}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#E7F6EF]/60 border border-[#BBE5D3] text-xs font-semibold text-[#1E7F5C] cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          WhatsApp Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={form.whatsapp_number}
                          onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                          placeholder="+91 9847000000"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          State *
                        </label>
                        <select
                          value={form.state}
                          onChange={(e) => {
                            const nextState = e.target.value;
                            const nextDistricts = getServiceDistrictsForState(nextState).filter(d => d !== 'All Districts');
                            setForm({
                              ...form,
                              state: nextState,
                              district: nextDistricts[0] || 'All India'
                            });
                          }}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        >
                          {VENDOR_STATE_OPTIONS.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          District *
                        </label>
                        <select
                          value={form.district}
                          onChange={(e) => setForm({ ...form, district: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        >
                          {districtOptionsForState.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Town / City *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.city_address}
                          onChange={(e) => setForm({ ...form, city_address: e.target.value })}
                          placeholder="e.g. Edappally, Kochi"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Full Street Address *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          placeholder="Building No, Street, Landmark, PIN"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Years of Experience *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.experience_years}
                          onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
                          placeholder="e.g. 8 Years"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Starting Price Range *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.pricing_range}
                          onChange={(e) => setForm({ ...form, pricing_range: e.target.value })}
                          placeholder="e.g. INR 15,000 - INR 1,20,000"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Business Registration / Udyam / License Number (Optional)
                        </label>
                        <input
                          type="text"
                          value={form.license_number}
                          onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                          placeholder="e.g. UDYAM-KL-00-0000000"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                        Detailed Service / Fleet / Package Description *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder={getCategoryDetailPlaceholder(form.category)}
                        className="w-full p-3 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#5A4463] mb-1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#5B3E8C]" />
                        <span>Team / Crew / Vehicle Capacity Details</span>
                      </label>
                      <textarea
                        rows={2}
                        value={form.staff_details}
                        onChange={(e) => setForm({ ...form, staff_details: e.target.value })}
                        placeholder="Specify crew strength, uniformed staff, fleet count, or seating capacity..."
                        className="w-full p-3 rounded-xl bg-[#F3EEFA]/50 border border-[#D8CBEF] text-xs focus:outline-none focus:border-[#8064A2]"
                      />
                    </div>

                    {/* Verification Document Upload (R2) */}
                    <div className="p-4 rounded-2xl bg-[#F9EBF0]/50 border border-[#E8C6D1] space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-[#C76B85] flex items-center gap-1.5">
                            <FileText className="w-4 h-4" />
                            <span>Verification Document (Owner ID or Shop License) *</span>
                          </p>
                          <p className="text-[11px] text-[#AA98A9]">
                            Uploaded securely to Cloudflare R2 for Super Admin verification.
                          </p>
                        </div>
                        <label className="px-3 py-2 rounded-xl bg-white border border-[#E8C6D1] text-[#C76B85] text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-[#F9EBF0]">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingDoc ? 'Uploading...' : form.verification_doc_url ? 'Replace Document' : 'Upload Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingDoc}
                            onChange={handleVerificationDocUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {form.verification_doc_url && (
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-[#E8C6D1]">
                          <img src={form.verification_doc_url} alt="Verification document" className="w-14 h-14 rounded-lg object-cover border border-[#E8C6D1]" />
                          <div className="text-xs text-[#1E7F5C] font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Document attached for Super Admin review</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Portfolio Photos & Videos (Optional during registration, max 10 photos & 2 videos) */}
                    <div className="p-4 rounded-2xl bg-[#FFF7FA] border border-[#E8C6D1] space-y-3">
                      <p className="text-xs font-bold text-[#2E1A36]">Portfolio Photos &amp; Promotional Videos (Optional)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="p-3 rounded-xl bg-white border border-dashed border-[#8064A2] text-xs font-semibold text-[#C76B85] flex items-center justify-center gap-2 cursor-pointer hover:bg-[#F9EBF0]/40">
                          <ImageIcon className="w-4 h-4" />
                          <span>Photos ({stagedPhotos.length}/10)</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(ev) => {
                              const files = Array.from(ev.target.files || []);
                              ev.target.value = '';
                              setStagedPhotos(prev => [...prev, ...files].slice(0, 10));
                            }}
                            className="hidden"
                          />
                        </label>
                        <label className="p-3 rounded-xl bg-white border border-dashed border-[#D8CBEF] text-xs font-semibold text-[#5B3E8C] flex items-center justify-center gap-2 cursor-pointer hover:bg-[#F3EEFA]/40">
                          <Video className="w-4 h-4" />
                          <span>Videos ({stagedVideos.length}/2, max 20MB)</span>
                          <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            multiple
                            onChange={(ev) => {
                              const files = Array.from(ev.target.files || []).filter(f => f.size <= 20 * 1024 * 1024);
                              ev.target.value = '';
                              setStagedVideos(prev => [...prev, ...files].slice(0, 2));
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingProfile || uploadingDoc}
                      className="w-full py-3 rounded-2xl bg-[#C76B85] hover:bg-[#B35872] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingProfile ? 'Submitting Registration...' : 'Submit for Super Admin Verification'}</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* Authenticated Vendor Dashboard */}
        {!authLoading && authUser && (
          <>
            {/* Status Header Card */}
            <div className="rounded-3xl bg-white border border-[#E8C6D1] p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#AA98A9]">Signed in as {authUser.email || authUser.phone}</p>
                <h2 className="text-sm font-bold text-[#2E1A36]">
                  {vendorProfile?.business_name || 'New Business Profile'}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {vendorProfile?.is_mobile_verified && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E7F6EF] text-[#1E7F5C] border border-[#BBE5D3] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Mobile Verified</span>
                  </span>
                )}
                {vendorProfile ? (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                      isVendorLive
                        ? 'bg-[#E7F6EF] text-[#1E7F5C] border-[#BBE5D3]'
                        : 'bg-[#F9EBF0] text-[#C76B85] border-[#E8C6D1]'
                    }`}
                  >
                    {isVendorLive ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified &amp; Live</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending Verification</span>
                      </>
                    )}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F3EEFA] text-[#5B3E8C] border border-[#D8CBEF]">
                    Profile Setup Required
                  </span>
                )}
              </div>
            </div>

            {/* Strict Pending Lock Banner */}
            {vendorProfile && !isVendorLive && (
              <div className="rounded-2xl bg-[#F9EBF0] border border-[#E8C6D1] p-4 space-y-2">
                <div className="flex items-start gap-2.5 text-[#C76B85]">
                  <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-xs font-bold leading-relaxed">
                    Account Under Review: Your profile and documents are awaiting Super Admin verification and approval.
                  </p>
                </div>
                {vendorProfile.rejection_reason && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    <span className="font-bold">Rejection Reason:</span> {vendorProfile.rejection_reason}
                  </div>
                )}
              </div>
            )}

            {/* Sub-navigation Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-white border border-[#E8C6D1]">
              <button
                type="button"
                onClick={() => setActivePortalTab('profile')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activePortalTab === 'profile'
                    ? 'bg-[#C76B85] text-white shadow-xs'
                    : 'text-[#5A4463] hover:bg-[#F9EBF0]/50'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Business Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePortalTab('media')}
                disabled={!vendorProfile}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                  activePortalTab === 'media'
                    ? 'bg-[#C76B85] text-white shadow-xs'
                    : 'text-[#5A4463] hover:bg-[#F9EBF0]/50'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Media ({photos.length + videos.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePortalTab('inbox')}
                disabled={!vendorProfile}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                  activePortalTab === 'inbox'
                    ? 'bg-[#C76B85] text-white shadow-xs'
                    : 'text-[#5A4463] hover:bg-[#F9EBF0]/50'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Inbox {unreadInquiriesCount > 0 ? `(${unreadInquiriesCount})` : ''}</span>
              </button>
            </div>

            {statusMessage && (
              <div className="p-3 rounded-2xl bg-[#E7F6EF] border border-[#BBE5D3] text-[#1E7F5C] text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: Business Profile Form */}
            {activePortalTab === 'profile' && (
              <form
                onSubmit={handleSaveProfile}
                className="rounded-3xl bg-white border border-[#E8C6D1] p-5 space-y-4 shadow-xs"
              >
                {loadingVendor ? (
                  <p className="text-xs text-[#AA98A9]">Loading your vendor profile...</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Business / Shop Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.business_name}
                          onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                          placeholder="e.g. Royal Malabar Bridal Studio"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Owner Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.owner_name}
                          onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                          placeholder="Full name of business owner"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Service Category *
                        </label>
                        <select
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        >
                          {VENDOR_CATEGORY_OPTIONS.map((c) => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Service Coverage Area
                        </label>
                        <select
                          value={form.service_area}
                          onChange={(e) => setForm({ ...form, service_area: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        >
                          {SERVICE_AREA_OPTIONS.map((area) => (
                            <option key={area} value={area}>{area}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          State *
                        </label>
                        <select
                          value={form.state}
                          onChange={(e) => {
                            const nextState = e.target.value;
                            const nextDistricts = getServiceDistrictsForState(nextState).filter(d => d !== 'All Districts');
                            setForm({
                              ...form,
                              state: nextState,
                              district: nextDistricts[0] || 'All India'
                            });
                          }}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        >
                          {VENDOR_STATE_OPTIONS.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          District *
                        </label>
                        <select
                          value={form.district}
                          onChange={(e) => setForm({ ...form, district: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        >
                          {districtOptionsForState.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Contact Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          readOnly={Boolean(form.is_mobile_verified)}
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+91 98470 00000"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2] read-only:bg-[#E7F6EF]/60 read-only:text-[#1E7F5C]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          WhatsApp Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={form.whatsapp_number}
                          onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                          placeholder="+91 98470 00000"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Town / City *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.city_address}
                          onChange={(e) => setForm({ ...form, city_address: e.target.value })}
                          placeholder="MG Road, Kochi"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Full Street Address
                        </label>
                        <input
                          type="text"
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          placeholder="Building No, Street, Landmark, PIN"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Years of Experience
                        </label>
                        <input
                          type="text"
                          value={form.experience_years}
                          onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
                          placeholder="e.g. 5 Years"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Starting Price Range
                        </label>
                        <input
                          type="text"
                          value={form.pricing_range}
                          onChange={(e) => setForm({ ...form, pricing_range: e.target.value })}
                          placeholder="e.g. INR 25,000 - INR 1,50,000"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                          Business Registration / Udyam / License Number (Optional)
                        </label>
                        <input
                          type="text"
                          value={form.license_number}
                          onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                          placeholder="e.g. UDYAM-KL-00-0000000"
                          className="w-full px-3 py-2.5 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#5A4463] mb-1">
                        Detailed Service / Fleet / Package Description
                      </label>
                      <textarea
                        rows={3}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder={getCategoryDetailPlaceholder(form.category)}
                        className="w-full p-3 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#5A4463] mb-1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#5B3E8C]" />
                        <span>Team / Crew / Vehicle Capacity Details</span>
                      </label>
                      <textarea
                        rows={3}
                        value={form.staff_details}
                        onChange={(e) => setForm({ ...form, staff_details: e.target.value })}
                        placeholder="Specify crew size, uniformed serving staff, vehicle fleet capacity, or on-site team details..."
                        className="w-full p-3 rounded-xl bg-[#F3EEFA]/50 border border-[#D8CBEF] text-xs focus:outline-none focus:border-[#8064A2]"
                      />
                    </div>

                    {/* Verification Document Upload */}
                    <div className="p-4 rounded-2xl bg-[#F9EBF0]/50 border border-[#E8C6D1] space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-[#C76B85] flex items-center gap-1.5">
                            <FileText className="w-4 h-4" />
                            <span>Verification Document (Owner ID / Shop License)</span>
                          </p>
                          <p className="text-[11px] text-[#AA98A9]">Uploaded to Cloudflare R2 for Super Admin verification.</p>
                        </div>
                        <label className="px-3 py-2 rounded-xl bg-white border border-[#E8C6D1] text-[#C76B85] text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-[#F9EBF0]">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingDoc ? 'Uploading...' : form.verification_doc_url ? 'Replace Document' : 'Upload Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingDoc}
                            onChange={handleVerificationDocUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {form.verification_doc_url && (
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-[#E8C6D1]">
                          <img src={form.verification_doc_url} alt="Verification document" className="w-14 h-14 rounded-lg object-cover border border-[#E8C6D1]" />
                          <span className="text-xs text-[#1E7F5C] font-semibold">Verification document attached</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={savingProfile || uploadingDoc}
                      className="w-full py-3 rounded-2xl bg-[#C76B85] hover:bg-[#B35872] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingProfile ? 'Saving...' : vendorProfile ? 'Update Business Profile' : 'Create Business Profile'}</span>
                    </button>
                  </>
                )}
              </form>
            )}

            {/* TAB 2: Media Upload & Delete */}
            {activePortalTab === 'media' && vendorProfile && (
              <div className="space-y-4">
                <div className="rounded-3xl bg-white border border-[#E8C6D1] p-5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#2E1A36]">Portfolio Photos ({photos.length} / 10)</h3>
                      <p className="text-[11px] text-[#AA98A9]">Uploaded directly to Cloudflare R2 in WebP format.</p>
                    </div>
                    <label className="px-3.5 py-2 rounded-xl bg-[#F9EBF0] hover:bg-[#FADCD0] border border-[#E8C6D1] text-[#C76B85] text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingPhoto ? 'Uploading...' : 'Add Photos'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploadingPhoto || photos.length >= 10}
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {photos.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-[#FFF7FA] border border-dashed border-[#E8C6D1] text-center text-xs text-[#AA98A9]">
                      No photos uploaded yet. Add up to 10 photos of your work.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {photos.map((photo) => (
                        <div key={photo.id} className="relative group rounded-2xl overflow-hidden border border-[#E8C6D1] aspect-square bg-[#FFF7FA]">
                          <img src={photo.media_url} alt="Vendor portfolio" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleDeleteMedia(photo)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                            title="Delete photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl bg-white border border-[#E8C6D1] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#2E1A36]">Promotional Videos ({videos.length} / 2)</h3>
                      <p className="text-[11px] text-[#AA98A9]">Upload short videos (max 20 MB each) or attach a YouTube URL.</p>
                    </div>
                    <label className="px-3.5 py-2 rounded-xl bg-[#F3EEFA] hover:bg-[#EAE1F7] border border-[#D8CBEF] text-[#5B3E8C] text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                      <Video className="w-3.5 h-3.5" />
                      <span>{uploadingVideo ? 'Uploading...' : 'Upload Video (Max 20 MB)'}</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        disabled={uploadingVideo || videos.length >= 2}
                        onChange={handleVideoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <form onSubmit={handleAddYouTube} className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Link className="w-4 h-4 text-[#C76B85] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={youtubeInput}
                        onChange={(e) => setYoutubeInput(e.target.value)}
                        placeholder="Optional YouTube video URL (https://youtube.com/watch?v=...)"
                        disabled={videos.length >= 2}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingYoutube || videos.length >= 2 || !youtubeInput.trim()}
                      className="px-4 py-2 rounded-xl bg-[#C76B85] hover:bg-[#B35872] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{savingYoutube ? 'Adding...' : 'Add YouTube'}</span>
                    </button>
                  </form>

                  {videos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {videos.map((vid) => {
                        const ytEmbed = isYouTubeUrl(vid.media_url) ? getYouTubeEmbedUrl(vid.media_url) : null;
                        return (
                          <div key={vid.id} className="relative rounded-2xl overflow-hidden border border-[#E8C6D1] bg-black">
                            {ytEmbed ? (
                              <iframe src={ytEmbed} title="Vendor YouTube" className="w-full aspect-video border-0" allowFullScreen />
                            ) : (
                              <video src={vid.media_url} controls playsInline className="w-full max-h-48" />
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteMedia(vid)}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/75 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                              title="Delete video"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Vendor Message Box */}
            {activePortalTab === 'inbox' && vendorProfile && (
              <div className="rounded-3xl bg-white border border-[#E8C6D1] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#2E1A36]">
                    Message Box ({groupedThreads.length})
                  </h3>
                  <span className="text-[11px] text-[#AA98A9]">
                    Replies are delivered directly to the member&apos;s Messages tab
                  </span>
                </div>

                {loadingInquiries ? (
                  <p className="text-xs text-[#AA98A9]">Loading messages...</p>
                ) : groupedThreads.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#FFF7FA] border border-dashed border-[#E8C6D1] text-center text-xs text-[#AA98A9]">
                    No customer inquiries yet. Verified &amp; approved listings appear to all Premium Members.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5 space-y-2 max-h-96 overflow-y-auto pr-1">
                      {groupedThreads.map((thread) => {
                        const isSelected = activeThread?.customerId === thread.customerId;
                        const lastMsg = thread.messages[thread.messages.length - 1];
                        return (
                          <button
                            key={thread.customerId}
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(thread.customerId);
                              thread.messages
                                .filter(m => (m.sender_role || 'customer') === 'customer' && !m.is_read)
                                .forEach(m => handleMarkRead(m));
                            }}
                            className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#F9EBF0] border-[#C76B85]'
                                : 'bg-[#FFF7FA] border-[#E8C6D1] hover:border-[#8064A2]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-[#2E1A36] truncate">
                                {thread.customerName}
                              </span>
                              {thread.unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-[#C76B85] text-white text-[10px] font-bold">
                                  {thread.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#AA98A9] truncate mt-0.5">
                              {lastMsg?.message || ''}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {activeThread && (
                      <div className="md:col-span-7 flex flex-col rounded-2xl bg-[#FFF7FA] border border-[#E8C6D1] overflow-hidden">
                        <div className="px-4 py-3 bg-white border-b border-[#E8C6D1] flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-[#2E1A36]">{activeThread.customerName}</p>
                            <p className="text-[11px] text-[#AA98A9] flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{activeThread.customerPhone || 'Not provided'}</span>
                            </p>
                          </div>
                          {buildCustomerWhatsAppReply({ customer_phone: activeThread.customerPhone, customer_name: activeThread.customerName }) && (
                            <a
                              href={buildCustomerWhatsAppReply({ customer_phone: activeThread.customerPhone, customer_name: activeThread.customerName })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#E7F6EF] hover:bg-[#D5EFE2] border border-[#BBE5D3] text-[#1E7F5C] text-[11px] font-bold"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>WhatsApp</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <div className="p-3.5 space-y-2.5 max-h-72 overflow-y-auto">
                          {activeThread.messages.map((m) => {
                            const isVendorMsg = m.sender_role === 'vendor';
                            return (
                              <div
                                key={m.id}
                                className={`flex ${isVendorMsg ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                                    isVendorMsg
                                      ? 'bg-[#C76B85] text-white rounded-br-none'
                                      : 'bg-white border border-[#E8C6D1] text-[#2E1A36] rounded-bl-none'
                                  }`}
                                >
                                  <p>{m.message}</p>
                                  <p className={`text-[9px] mt-1 ${isVendorMsg ? 'text-white/75' : 'text-[#AA98A9]'}`}>
                                    {m.created_at ? new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <form onSubmit={handleSendReply} className="p-3 bg-white border-t border-[#E8C6D1] flex items-center gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your reply to the customer..."
                            className="flex-1 px-3 py-2 rounded-xl bg-[#FFF7FA] border border-[#E8C6D1] text-xs focus:outline-none focus:border-[#8064A2]"
                          />
                          <button
                            type="submit"
                            disabled={sendingReply || !replyText.trim()}
                            className="px-3.5 py-2 rounded-xl bg-[#C76B85] hover:bg-[#B35872] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{sendingReply ? 'Sending...' : 'Send'}</span>
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
