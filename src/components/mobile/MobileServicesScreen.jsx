import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  MapPin,
  Lock,
  Crown,
  Phone,
  MessageSquare,
  Send,
  ChevronRight,
  ChevronLeft,
  X,
  Image as ImageIcon,
  Video,
  Users,
  Tag,
  CheckCircle2,
  UserCheck,
  RefreshCw,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import {
  VENDOR_CATEGORIES,
  INDIAN_STATES_AND_UTS,
  getServiceDistrictsForState,
  getCategoryLabel,
  isYouTubeUrl,
  getYouTubeEmbedUrl,
  buildWhatsAppVendorUrl,
  fetchApprovedVendors,
  sendVendorInquiry
} from '../../services/vendorService';
import { supabase } from '../../services/supabase';

export default function MobileServicesScreen({
  currentUser,
  onOpenOffers,
  onOpenLogin,
  onBack,
  showToast
}) {
  const isLocalTesting =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const isLocallyVerifiedOrPaid = Boolean(
    currentUser &&
    (
      (currentUser.membership && String(currentUser.membership).toLowerCase() !== 'free') ||
      currentUser.verified === 1 ||
      currentUser.verified === true ||
      currentUser.aadhaar_verified === 1 ||
      currentUser.aadhaarVerified === true ||
      String(currentUser.aadhaar_status || '').toLowerCase() === 'approved'
    )
  );

  const [supabaseUnlocked, setSupabaseUnlocked] = useState(false);

  useEffect(() => {
    let active = true;
    const verifySupabaseAccess = async () => {
      if (!currentUser?.id) return;
      try {
        const [{ data: profileRow }, { data: payRow }] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, verified, aadhaar_verified, aadhaar_status, status')
            .eq('id', String(currentUser.id))
            .maybeSingle(),
          supabase
            .from('payments')
            .select('id, status, plan_name')
            .eq('user_id', String(currentUser.id))
            .limit(5)
        ]);

        if (!active) return;

        const profileVerified = Boolean(
          profileRow &&
          (
            profileRow.verified === 1 ||
            profileRow.verified === true ||
            profileRow.aadhaar_verified === 1 ||
            profileRow.aadhaar_verified === true ||
            String(profileRow.aadhaar_status || '').toLowerCase() === 'approved'
          )
        );

        const hasActivePayment = Array.isArray(payRow) && payRow.some(p => {
          const st = String(p?.status || '').toLowerCase();
          const plan = String(p?.plan_name || '').toLowerCase();
          return ['completed', 'success', 'paid', 'active', 'captured'].includes(st) && !plan.includes('free');
        });

        if (profileVerified || hasActivePayment) {
          setSupabaseUnlocked(true);
        }
      } catch (err) {
        console.warn('[MobileServicesScreen] Access check notice:', err?.message || err);
      }
    };
    verifySupabaseAccess();
    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  const isPremium = Boolean(isLocalTesting || isLocallyVerifiedOrPaid || supabaseUnlocked);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [activePhotoUrl, setActivePhotoUrl] = useState('');

  // In-app message state
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [sendingInquiry, setSendingInquiry] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);

  const districtOptions = useMemo(() => {
    return getServiceDistrictsForState(selectedState);
  }, [selectedState]);

  const handleStateChange = (newState) => {
    setSelectedState(newState);
    setSelectedDistrict('All Districts');
  };

  const loadVendors = async () => {
    setLoading(true);
    try {
      const list = await fetchApprovedVendors({
        isPremium,
        category: selectedCategory,
        state: selectedState,
        district: selectedDistrict
      });
      setVendors(list);
    } catch (err) {
      console.warn('[MobileServicesScreen] loadVendors error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [isPremium, selectedCategory, selectedState, selectedDistrict]);

  const selectedVendorPhotos = useMemo(() => {
    if (!selectedVendor?.media) return [];
    return selectedVendor.media.filter(m => m.media_type === 'image').slice(0, 10);
  }, [selectedVendor]);

  const selectedVendorVideos = useMemo(() => {
    if (!selectedVendor?.media) return [];
    return selectedVendor.media.filter(m => m.media_type === 'video').slice(0, 2);
  }, [selectedVendor]);

  const handleOpenVendor = (vendor) => {
    if (!isPremium) {
      if (typeof onOpenOffers === 'function') {
        onOpenOffers();
      }
      return;
    }
    setSelectedVendor(vendor);
    const firstImg = vendor?.media?.find(m => m.media_type === 'image')?.media_url || '';
    setActivePhotoUrl(firstImg);
    setInquiryMessage('');
    setInquirySent(false);
  };

  const handleSendInquiry = async (e) => {
    e?.preventDefault();
    if (!selectedVendor) return;
    if (!currentUser) {
      onOpenLogin?.();
      return;
    }
    if (!inquiryMessage.trim()) {
      showToast?.('Please enter a message for the vendor.');
      return;
    }

    setSendingInquiry(true);
    try {
      let authUid = null;
      try {
        const { data } = await supabase.auth.getUser();
        authUid = data?.user?.id || null;
      } catch (err) {}

      const customerId = authUid || (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(currentUser.id || ''))
          ? currentUser.id
          : null
      );

      if (!customerId) {
        throw new Error('Please sign in with your verified account to send an inquiry.');
      }

      await sendVendorInquiry({
        vendorId: selectedVendor.id,
        vendorOwnerUserId: selectedVendor.owner_user_id,
        businessName: selectedVendor.business_name,
        customerId,
        customerName: currentUser.name || 'Premium Member',
        customerPhone: currentUser.phone || currentUser.mobile || '',
        message: inquiryMessage
      });

      setInquirySent(true);
      setInquiryMessage('');
      showToast?.('Your inquiry has been sent to the vendor.');
    } catch (err) {
      showToast?.(err.message || 'Could not send inquiry. Please try again.');
    } finally {
      setSendingInquiry(false);
    }
  };

  return (
    <div className="min-h-full bg-[#FFF9F6] text-[#2C1A1D] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#FFFBF9]/95 backdrop-blur-md border-b border-[#E5D0C6] px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl bg-white border border-[#E5D0C6] text-[#7A2E43] hover:bg-[#FDECE4]/50 transition-colors cursor-pointer"
                aria-label="Back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-9 h-9 rounded-2xl bg-[#FDECE4] border border-[#E6B8A2] flex items-center justify-center text-[#7A2E43]">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-[#2C1A1D]">
                All Services
              </h1>
              <p className="text-[11px] text-[#7B6568]">
                Curated bridal, catering, jewellery &amp; event partners
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadVendors}
            className="p-2 rounded-xl bg-white border border-[#E5D0C6] text-[#7A2E43] hover:bg-[#FDECE4]/50 transition-colors cursor-pointer"
            aria-label="Refresh services"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Cascading State & District Side-by-Side Filters (-20% width, aligned with grid) */}
        <div className="max-w-3xl mx-auto w-[80%] sm:w-full grid grid-cols-2 gap-2.5">
          <div className="relative">
            <MapPin className="w-3.5 h-3.5 text-[#7A2E43] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              aria-label="Filter by state"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/90 shadow-sm border border-[#E6B8A2]/80 hover:border-[#C58B76] text-xs font-semibold text-[#2C1A1D] focus:outline-none focus:border-[#7A2E43] transition-colors cursor-pointer"
            >
              {INDIAN_STATES_AND_UTS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <MapPin className="w-3.5 h-3.5 text-[#C58B76] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              aria-label="Filter by district"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/90 shadow-sm border border-[#E6B8A2]/80 hover:border-[#C58B76] text-xs font-semibold text-[#2C1A1D] focus:outline-none focus:border-[#7A2E43] transition-colors cursor-pointer"
            >
              {districtOptions.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* 3-Column Category Grid (8 Rows x 3 Cards) - Near-Square Proportions (-20% width, +20% height) */}
        <div className="max-w-3xl mx-auto w-[80%] sm:w-full grid grid-cols-3 auto-rows-fr gap-2.5 sm:gap-3">
          {VENDOR_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`group relative rounded-2xl overflow-hidden text-center transition-all duration-300 cursor-pointer border aspect-square min-h-[115px] sm:min-h-[135px] w-full flex flex-col justify-end ${
                  active
                    ? 'border-[#C58B76] ring-2 ring-[#E6B8A2]/70 shadow-md bg-[#FDECE4]'
                    : 'border-[#E5D0C6] hover:border-[#C58B76] bg-white shadow-xs'
                }`}
              >
                <div className="absolute inset-0 overflow-hidden bg-[#FFF9F6]">
                  <img
                    src={cat.image}
                    alt={cat.label}
                    loading="lazy"
                    className="w-full h-full object-cover scale-110 group-hover:scale-125 group-active:scale-125 transition-transform duration-300"
                  />
                </div>
                <div
                  className={`relative z-10 w-full min-h-[38px] px-1.5 py-1.5 flex flex-col justify-center items-center backdrop-blur-sm border-t transition-colors ${
                    active
                      ? 'bg-[#FDECE4]/88 border-[#E6B8A2]/70'
                      : 'bg-[#FFF9F6]/82 border-white/50 group-hover:bg-[#FFF9F6]/90'
                  }`}
                >
                  <span
                    className={`block text-[10px] sm:text-[11px] leading-tight font-bold line-clamp-2 ${
                      active ? 'text-[#7A2E43]' : 'text-[#2C1A1D]'
                    }`}
                  >
                    {cat.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Free User Paywall Banner */}
        {!isPremium && (
          <div className="rounded-3xl bg-gradient-to-br from-[#FDECE4] via-[#FFF9F6] to-[#F3EEFA] border border-[#E6B8A2] p-5 shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white border border-[#E6B8A2] flex items-center justify-center text-[#7A2E43] shrink-0 shadow-xs">
                <Crown className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F3EEFA] border border-[#D8CBEF] text-[#5B3E8C] text-[10px] font-bold uppercase tracking-wider">
                  <Lock className="w-3 h-3" />
                  <span>Premium Exclusive</span>
                </span>
                <p className="text-sm font-semibold text-[#2C1A1D] leading-snug">
                  Wedding Services is exclusive to Premium Members. Upgrade to unlock vendor contacts, photos, and videos.
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => (currentUser ? onOpenOffers?.() : onOpenLogin?.())}
                    className="px-4 py-2 rounded-xl bg-[#7A2E43] hover:bg-[#612234] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>{currentUser ? 'Upgrade to Premium' : 'Sign In / Upgrade'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-48 rounded-3xl bg-white border border-[#E5D0C6]/70 p-4 animate-pulse space-y-3"
              >
                <div className="h-24 rounded-2xl bg-[#FDECE4]/60" />
                <div className="h-4 w-2/3 rounded bg-[#FDECE4]/80" />
                <div className="h-3 w-1/2 rounded bg-[#F3EEFA]/80" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && vendors.length === 0 && (
          <div className="rounded-3xl bg-white border border-[#E5D0C6] p-8 text-center space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FDECE4] text-[#7A2E43] flex items-center justify-center mx-auto">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#2C1A1D]">No Approved Vendors Found</h3>
            <p className="text-xs text-[#7B6568] max-w-xs mx-auto">
              Try selecting another category, state, or district, or check back soon as new verified wedding partners join.
            </p>
          </div>
        )}

        {/* Vendor Cards Grid */}
        {!loading && vendors.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {vendors.map((vendor) => {
              const coverPhoto = vendor.media?.find(m => m.media_type === 'image')?.media_url;
              const photoCount = vendor.media?.filter(m => m.media_type === 'image').length || 0;
              const videoCount = vendor.media?.filter(m => m.media_type === 'video').length || 0;

              return (
                <div
                  key={vendor.id}
                  onClick={() => handleOpenVendor(vendor)}
                  className="rounded-3xl bg-white border border-[#E5D0C6] overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col"
                >
                  {/* Card Media / Locked Preview */}
                  <div className="relative h-40 bg-gradient-to-br from-[#FDECE4] via-[#FFF9F6] to-[#F3EEFA] overflow-hidden">
                    {isPremium && coverPhoto ? (
                      <img
                        src={coverPhoto}
                        alt={vendor.business_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-4 text-center">
                        <div className="w-10 h-10 rounded-2xl bg-white/90 border border-[#E6B8A2] flex items-center justify-center text-[#7A2E43] shadow-xs">
                          {isPremium ? <ImageIcon className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                        </div>
                        <span className="text-[11px] font-semibold text-[#7A2E43]">
                          {isPremium ? 'View Business Profile' : 'Locked Photo & Video Gallery'}
                        </span>
                      </div>
                    )}

                    {/* Category Badge */}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs border border-[#E5D0C6] text-[10px] font-bold text-[#7A2E43]">
                      {getCategoryLabel(vendor.category)}
                    </span>

                    {/* Super Admin Verified Badge */}
                    {vendor.is_verified && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-[#E7F6EF]/95 border border-[#BBE5D3] text-[#1E7F5C] text-[10px] font-bold flex items-center gap-1 shadow-xs">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    )}

                    {/* Media Count Badge (Premium) */}
                    {isPremium && (photoCount > 0 || videoCount > 0) && (
                      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                        {photoCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-semibold flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            <span>{photoCount}</span>
                          </span>
                        )}
                        {videoCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-semibold flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            <span>{videoCount}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#2C1A1D] line-clamp-1">
                        {vendor.business_name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-[#7B6568]">
                        <MapPin className="w-3.5 h-3.5 text-[#C58B76] shrink-0" />
                        <span>{vendor.district}</span>
                      </div>
                    </div>

                    {isPremium ? (
                      <div className="space-y-2 pt-2 border-t border-[#FDECE4]">
                        {vendor.pricing_range && (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1E7F5C] bg-[#E7F6EF] px-2.5 py-1 rounded-lg w-fit">
                            <Tag className="w-3 h-3" />
                            <span>{vendor.pricing_range}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs font-bold text-[#7A2E43]">
                          <span>View Contact &amp; Gallery</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-[#FDECE4] space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-[#7B6568]">
                          <span className="blur-[4px] select-none">+91 98470 12345</span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7A2E43] bg-[#FDECE4] px-2 py-0.5 rounded-full">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Premium</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7B6568] blur-[3px] select-none">
                          Owner Contact &amp; Full Address
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Premium Vendor Detail Modal */}
      {isPremium && selectedVendor && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#FFF9F6] w-full sm:max-w-2xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl border border-[#E5D0C6] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-white border-b border-[#E5D0C6] flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-3">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FDECE4] text-[#7A2E43] text-[10px] font-bold">
                    {getCategoryLabel(selectedVendor.category)}
                  </span>
                  {selectedVendor.is_verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E7F6EF] border border-[#BBE5D3] text-[#1E7F5C] text-[10px] font-bold">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Verified Partner</span>
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-[#2C1A1D] truncate">
                  {selectedVendor.business_name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVendor(null)}
                className="p-2 rounded-full bg-[#FDECE4]/70 hover:bg-[#FDECE4] text-[#7A2E43] cursor-pointer"
                aria-label="Close vendor details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Photos Gallery (up to 10) */}
              {selectedVendorPhotos.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A2E43] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Portfolio Photos ({selectedVendorPhotos.length})</span>
                    </h3>
                  </div>
                  <div className="rounded-2xl overflow-hidden bg-white border border-[#E5D0C6] aspect-video">
                    <img
                      src={activePhotoUrl || selectedVendorPhotos[0].media_url}
                      alt={selectedVendor.business_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {selectedVendorPhotos.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {selectedVendorPhotos.map((img) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setActivePhotoUrl(img.media_url)}
                          className={`w-16 h-12 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer ${
                            (activePhotoUrl || selectedVendorPhotos[0].media_url) === img.media_url
                              ? 'border-[#7A2E43]'
                              : 'border-transparent opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img src={img.media_url} alt="Gallery thumbnail" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Promotional Videos (1-2) */}
              {selectedVendorVideos.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A2E43] flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" />
                    <span>Promotional Videos ({selectedVendorVideos.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedVendorVideos.map((vid) => {
                      const ytEmbed = isYouTubeUrl(vid.media_url) ? getYouTubeEmbedUrl(vid.media_url) : null;
                      return ytEmbed ? (
                        <div key={vid.id} className="rounded-2xl overflow-hidden border border-[#E5D0C6] aspect-video bg-black">
                          <iframe
                            src={ytEmbed}
                            title="Promotional Video"
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <div key={vid.id} className="rounded-2xl overflow-hidden border border-[#E5D0C6] bg-black">
                          <video
                            src={vid.media_url}
                            controls
                            playsInline
                            className="w-full max-h-64"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Business & Owner Details */}
              <div className="rounded-2xl bg-white border border-[#E5D0C6] p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <UserCheck className="w-4 h-4 text-[#7A2E43] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] text-[#7B6568]">Owner / Contact Person</p>
                      <p className="font-bold text-[#2C1A1D]">{selectedVendor.owner_name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-[#1E7F5C] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] text-[#7B6568]">Phone Number</p>
                      <p className="font-bold text-[#2C1A1D]">{selectedVendor.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#C58B76] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] text-[#7B6568]">Location &amp; Address</p>
                      <p className="font-semibold text-[#2C1A1D]">
                        {[selectedVendor.address, selectedVendor.city_address, selectedVendor.district, selectedVendor.state]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                  {selectedVendor.service_area && (
                    <div className="flex items-start gap-2.5">
                      <Store className="w-4 h-4 text-[#7A2E43] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] text-[#7B6568]">Service Coverage Area</p>
                        <p className="font-semibold text-[#2C1A1D]">{selectedVendor.service_area}</p>
                      </div>
                    </div>
                  )}
                  {selectedVendor.experience_years && (
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#1E7F5C] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] text-[#7B6568]">Experience</p>
                        <p className="font-semibold text-[#2C1A1D]">{selectedVendor.experience_years}</p>
                      </div>
                    </div>
                  )}
                  {selectedVendor.pricing_range && (
                    <div className="flex items-start gap-2.5">
                      <Tag className="w-4 h-4 text-[#5B3E8C] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] text-[#7B6568]">Pricing Range</p>
                        <p className="font-bold text-[#1E7F5C]">{selectedVendor.pricing_range}</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedVendor.description && (
                  <div className="pt-2.5 border-t border-[#FDECE4]">
                    <p className="text-[11px] font-bold text-[#7A2E43] mb-1">About Service</p>
                    <p className="text-xs text-[#5A4649] leading-relaxed whitespace-pre-line">
                      {selectedVendor.description}
                    </p>
                  </div>
                )}

                {selectedVendor.staff_details && (
                  <div className="pt-2.5 border-t border-[#FDECE4]">
                    <p className="text-[11px] font-bold text-[#5B3E8C] flex items-center gap-1.5 mb-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>Team / Catering Staff &amp; Service Details</span>
                    </p>
                    <p className="text-xs text-[#5A4649] leading-relaxed whitespace-pre-line bg-[#F3EEFA]/60 p-3 rounded-xl border border-[#D8CBEF]">
                      {selectedVendor.staff_details}
                    </p>
                  </div>
                )}
              </div>

              {/* Contact Actions: WhatsApp + In-App Message */}
              <div className="space-y-3">
                <a
                  href={buildWhatsAppVendorUrl(selectedVendor.whatsapp_number || selectedVendor.phone, selectedVendor.business_name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-2xl bg-[#E7F6EF] hover:bg-[#D5EFE2] border border-[#BBE5D3] text-[#1E7F5C] text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat on WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <form
                  onSubmit={handleSendInquiry}
                  className="rounded-2xl bg-white border border-[#E5D0C6] p-4 space-y-2.5"
                >
                  <label className="block text-xs font-bold text-[#2C1A1D]">
                    Send In-App Message
                  </label>
                  <textarea
                    rows={3}
                    value={inquiryMessage}
                    onChange={(e) => setInquiryMessage(e.target.value)}
                    placeholder="Share your wedding date, venue, and service requirements..."
                    className="w-full p-3 rounded-xl bg-[#FFF9F6] border border-[#E5D0C6] text-xs text-[#2C1A1D] placeholder-[#9D8588] focus:outline-none focus:border-[#C58B76]"
                  />
                  {inquirySent && (
                    <div className="px-3 py-2 rounded-xl bg-[#E7F6EF] border border-[#BBE5D3] text-[#1E7F5C] text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Message delivered to vendor inbox. Replies will appear in your Messages tab.</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={sendingInquiry}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#7A2E43] hover:bg-[#612234] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingInquiry ? 'Sending...' : 'Send In-App Message'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
