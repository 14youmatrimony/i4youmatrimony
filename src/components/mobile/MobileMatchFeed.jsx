import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
  Heart, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Send, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  MessageCircle, 
  Navigation,
  Plus, 
  Pencil, 
  EyeOff, 
  Trash2, 
  X, 
  Camera, 
  Video, 
  CheckCircle2, 
  Filter, 
  RotateCcw, 
  SlidersHorizontal, 
  Lock,
  Crown,
  ChevronRight,
  Tag,
  FileCheck2,
  ShieldAlert,
  LayoutGrid,
  Square
} from 'lucide-react';
import { usePhotoPrivacy } from '../../context/PhotoPrivacyContext';
import { calculateLocationMatch } from '../../data/locationData';
import { useTheme } from '../../context/ThemeContext';
import { 
  getTargetCandidateGender, 
  isCandidateMatchingTarget, 
  getTargetGenderLabel, 
  isSelfProfile, 
  resolveProfileGender 
} from '../../utils/genderMatch';

export default function MobileMatchFeed({
  profiles,
  currentUser,
  interestsSent,
  onToggleInterest,
  shortlisted,
  onToggleShortlist,
  onSelectProfile,
  onStartChat,
  onOpenFilter,
  myStatus,
  candidateStatuses = {},
  hiddenStatusIds = new Set(),
  deletedStatusIds = new Set(),
  onOpenStatusViewer,
  onOpenStatusEditor,
  onOpenStatusMenu,
  activeFiltersCount = 0,
  onResetFilters,
  onOpenOffers,
  offers = [],
  onOpenAadhaarVerification,
  currentScreen = 'app'
}) {
  const { feedLayout, setFeedLayout } = useTheme();
  const { triggerScreenshotBlock, screenshotRestricted, watermarkEnabled } = usePhotoPrivacy();
  
  // Dynamic active offer from Python Admin Database
  const activeOffer = useMemo(() => {
    return (offers || []).find(o => o.is_active === 1 || o.is_active === true || o.is_active === '1') || null;
  }, [offers]);
  const targetCandidateGender = useMemo(() => {
    return getTargetCandidateGender(currentUser);
  }, [currentUser]);

  // Defense-in-depth: Ensure displayed profiles strictly match opposite gender and exclude own profile
  const filteredProfiles = useMemo(() => {
    return (profiles || []).filter(p => {
      if (isSelfProfile(p, currentUser)) return false;
      return isCandidateMatchingTarget(p, targetCandidateGender);
    });
  }, [profiles, currentUser, targetCandidateGender]);
  const hasPaidPlan = Boolean(currentUser?.membership && currentUser?.membership !== 'free');
  const longPressTimer = useRef(null);

  // Scroll & drag handling for smooth horizontal status exploration
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const dragDistanceRef = useRef(0);

  const updateScrollButtons = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    setCanScrollLeft(hasOverflow && el.scrollLeft > 6);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const timer = setTimeout(updateScrollButtons, 60);
    el.addEventListener('scroll', updateScrollButtons, { passive: true });

    // Smooth horizontal scrolling on mouse wheel
    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });

    window.addEventListener('resize', updateScrollButtons);
    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', updateScrollButtons);
      el.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons, profiles]);

  const handleMouseDown = (e) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftStartRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current);
    dragDistanceRef.current = Math.abs(walk);
    el.scrollLeft = scrollLeftStartRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const handleBubbleClick = (action) => {
    if (dragDistanceRef.current > 6) return;
    action();
  };

  // Long-press detection (500 ms) for mobile touch
  const handlePressStart = useCallback((profile, isOwnStatus, hasStatus) => {
    longPressTimer.current = setTimeout(() => {
      onOpenStatusMenu && onOpenStatusMenu(profile, isOwnStatus, hasStatus);
    }, 500);
  }, [onOpenStatusMenu]);

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Filtered list of candidate stories (Strict opposite gender, prioritize those with active statuses, show up to 20)
  const storyProfiles = useMemo(() => {
    const valid = (profiles || []).filter(p => {
      if (hiddenStatusIds.has(p.id) || deletedStatusIds.has(p.id)) return false;
      if (isSelfProfile(p, currentUser)) return false;
      return isCandidateMatchingTarget(p, targetCandidateGender);
    });
    return [...valid].sort((a, b) => {
      const aHas = !!candidateStatuses[a.id];
      const bHas = !!candidateStatuses[b.id];
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return 0;
    }).slice(0, 20);
  }, [profiles, candidateStatuses, hiddenStatusIds, deletedStatusIds, currentUser, targetCandidateGender]);

  return (
    <div className="space-y-4 pb-6">

      {/* ── Top WhatsApp-Style Status Avatars Bar with Smooth Side Scrolling (Only after login) ── */}
      {currentUser && (
        <div className="relative bg-white border-b border-slate-200 group/status shadow-2xs">
        


        {/* Subtle Edge Fade Gradients */}
        {canScrollLeft && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-7 bg-gradient-to-r from-white via-white/80 to-transparent z-10" />
        )}
        {canScrollRight && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-7 bg-gradient-to-l from-white via-white/80 to-transparent z-10" />
        )}

        {/* Scrollable Avatars Row */}
        <div 
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="py-2.5 px-3 overflow-x-auto flex space-x-3.5 scroll-smooth select-none cursor-grab active:cursor-grabbing touch-pan-x status-scroll-bar scrollbar-none no-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* 1. My Status Bubble */}
          <div
            className="flex flex-col items-center shrink-0 cursor-pointer space-y-1 w-16 select-none group"
            onTouchStart={() => handlePressStart(currentUser, true, !!myStatus)}
            onTouchEnd={handlePressEnd}
            onTouchCancel={handlePressEnd}
            onContextMenu={(e) => {
              e.preventDefault();
              onOpenStatusMenu && onOpenStatusMenu(currentUser, true, !!myStatus);
            }}
            onClick={() => handleBubbleClick(() => {
              if (myStatus && onOpenStatusViewer) {
                onOpenStatusViewer(currentUser, myStatus, true);
              } else if (onOpenStatusEditor) {
                onOpenStatusEditor();
              }
            })}
            title={myStatus ? "Tap to view • Long-press for options" : "Tap to add status"}
          >
            <div className="relative">
              {/* WhatsApp Story Ring */}
              <div className={`w-14 h-14 rounded-full p-0.5 transition-transform group-active:scale-95 ${
                myStatus
                  ? (myStatus.isHidden 
                      ? 'bg-slate-400 ring-2 ring-slate-300' 
                      : 'bg-gradient-to-tr from-[#D4AF37] via-[#DFB76C] to-[#8C6D1F] ring-2 ring-amber-200')
                  : 'bg-slate-200'
              }`}>
                <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden ring-2 ring-white">
                  {currentUser?.photo ? (
                    <img src={currentUser.photo} alt="My Status" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Bottom Right Badge: Plus if no status, Camera / EyeOff if has status */}
              {!myStatus ? (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#D4AF37] rounded-full border-2 border-white flex items-center justify-center shadow-xs">
                  <Plus className="w-3 h-3 text-[#0B192C] stroke-[3]" />
                </div>
              ) : myStatus.isHidden ? (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-slate-600 rounded-full border-2 border-white flex items-center justify-center shadow-xs">
                  <EyeOff className="w-2.5 h-2.5 text-white" />
                </div>
              ) : (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-600 rounded-full border-2 border-white flex items-center justify-center shadow-xs">
                  {myStatus?.type === 'video' ? (
                    <Video className="w-2.5 h-2.5 text-white" />
                  ) : (
                    <Camera className="w-2.5 h-2.5 text-white" />
                  )}
                </div>
              )}
            </div>

            <span className="text-[10px] font-bold text-slate-800 truncate w-full text-center">
              My Status
            </span>
            <span className="text-[9px] text-slate-400 font-medium truncate max-w-full text-center flex items-center justify-center space-x-0.5">
              {myStatus ? (myStatus.isHidden ? 'Hidden' : 'View') : '+ Add'}
            </span>
          </div>

          {/* 2. Candidate Status Bubbles */}
          {storyProfiles.map(p => {
            const isInterested = interestsSent.includes(p.id);
            const locMatch = calculateLocationMatch(currentUser, p);
            const status = candidateStatuses[p.id];
            const hasStatus = !!status;

            return (
              <div 
                key={p.id}
                className="flex flex-col items-center shrink-0 cursor-pointer space-y-1 w-16 select-none group"
                onTouchStart={() => handlePressStart(p, false, hasStatus)}
                onTouchEnd={handlePressEnd}
                onTouchCancel={handlePressEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onOpenStatusMenu && onOpenStatusMenu(p, false, hasStatus);
                }}
                onClick={() => handleBubbleClick(() => {
                  if (hasStatus && onOpenStatusViewer) {
                    onOpenStatusViewer(p, status, false);
                  } else if (onSelectProfile) {
                    onSelectProfile(p);
                  }
                })}
                title={`${p.name} • Tap to view • Long-press for options`}
              >
                <div className="relative">
                  {/* WhatsApp Gradient Story Ring */}
                  <div className={`w-14 h-14 rounded-full p-0.5 transition-transform group-active:scale-95 ${
                    hasStatus
                      ? (status?.type === 'video'
                          ? 'bg-gradient-to-tr from-blue-500 via-indigo-500 to-teal-400 ring-2 ring-blue-300'
                          : 'bg-gradient-to-tr from-[#D4AF37] via-[#DFB76C] to-[#8C6D1F] ring-2 ring-amber-200')
                      : isInterested 
                      ? 'bg-emerald-500' 
                      : locMatch?.type === 'same_district'
                      ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 ring-2 ring-emerald-300'
                      : 'bg-slate-300'
                  }`}>
                    <img 
                      src={p.photo} 
                      alt={p.name}
                      className="w-full h-full rounded-full object-cover ring-2 ring-white" 
                    />
                  </div>

                  {/* Verified Shield or Video indicator */}
                  {status?.type === 'video' ? (
                    <span className="w-4 h-4 bg-blue-600 rounded-full absolute -bottom-0.5 -right-0.5 border border-white flex items-center justify-center shadow-xs">
                      <Video className="w-2.5 h-2.5 text-white" />
                    </span>
                  ) : p.verified ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-500 absolute -bottom-0.5 -right-0.5 bg-white rounded-full shadow-xs" />
                  ) : null}
                </div>

                <span className="text-[10px] font-semibold text-slate-800 truncate w-full text-center">
                  {p.name.split(' ')[0]}
                </span>
                <span className="text-[9px] text-[#8C6D1F] font-bold truncate max-w-full text-center">
                  {status?.type === 'video' ? `🎥 ${status.duration || 20}s` : p.district || p.city}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* ── Card Stack for Mobile ─────────────────────────────────────────── */}
      <div className="px-3 space-y-4">

        {/* Festive Offer Banner - Only shown if active offer exists in Admin panel and user is not paid */}
        {onOpenOffers && !hasPaidPlan && activeOffer && (
          <div 
            onClick={onOpenOffers}
            className="bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#0B192C] border border-[#D4AF37]/50 rounded-2xl p-3 text-white flex items-center justify-between cursor-pointer hover:border-[#D4AF37] transition-all shadow-md group active:scale-[0.99]"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#DFB76C] text-[#0B192C] flex items-center justify-center shrink-0 font-bold shadow-xs">
                <Crown className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h4 className="font-serif font-bold text-xs text-white truncate">{activeOffer.title || 'Special Matrimony Offer'}</h4>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-600 text-white shrink-0 animate-pulse">
                    {activeOffer.discount_percent}% OFF
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 truncate">
                  {activeOffer.description || 'Unlock phone numbers, addresses & direct chat'} • Code: <strong className="text-[#DFB76C] font-mono">{activeOffer.code}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              className="ml-2 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] text-[10px] font-extrabold shrink-0 group-hover:scale-105 transition-transform flex items-center space-x-1 shadow-xs cursor-pointer"
            >
              <span>View Plans</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Aadhaar Verification Mandatory Banner: Only shown to registered & logged-in users who have NOT yet completed Aadhaar verification. Completely hidden on Register/Login screens, for guests, and for already-verified users. */}
        {(() => {
          // Check if user is registered and logged in
          const isUserLoggedIn = Boolean(
            currentUser && 
            (currentUser.id || currentUser.mobile || currentUser.phone || currentUser.email) && 
            !currentUser.isGuest &&
            currentUser.isLoggedIn !== false
          );

          // 1. Must NOT appear on Register page, Login page, or for unauthenticated/guest users
          if (!isUserLoggedIn || currentScreen === 'login' || currentScreen === 'register') {
            return null;
          }

          const isApproved = Boolean(
            currentUser?.aadhaarVerified || 
            currentUser?.aadhaar_verified === 1 || 
            currentUser?.aadhaar_verified === true || 
            currentUser?.aadhaar_status === 'approved' || 
            currentUser?.aadhaarStatus === 'approved'
          );

          // 2. If already verified, do NOT show it. Do NOT show any "verified" banner either - keep it completely hidden!
          if (isApproved || !onOpenAadhaarVerification) return null;
          return (
            <div 
              onClick={onOpenAadhaarVerification}
              className="bg-gradient-to-r from-slate-900 via-amber-950/70 to-slate-900 border border-amber-400/50 rounded-2xl p-3 text-white flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all shadow-md group active:scale-[0.99] animate-in fade-in"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0 font-bold">
                  <FileCheck2 className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <h4 className="font-serif font-bold text-xs text-amber-200 truncate">
                      {currentUser?.aadhaar_status === 'sent_back' ? 'Aadhaar Re-upload Required' : (currentUser?.aadhaar_front_image ? 'Aadhaar Review Pending' : 'Aadhaar Verification Pending')}
                    </h4>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full shrink-0 ${currentUser?.aadhaar_status === 'sent_back' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-900'}`}>
                      {currentUser?.aadhaar_status === 'sent_back' ? 'Sent Back' : (currentUser?.aadhaar_front_image ? 'Pending' : 'Required')}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 truncate">
                    {currentUser?.aadhaar_status === 'sent_back' 
                      ? (currentUser?.aadhaarRejectionReason || currentUser?.aadhaar_rejection_reason || 'Photo is unclear. Tap to re-upload.')
                      : 'Authenticate UIDAI records to unlock verified contact numbers & get trust badge.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="ml-2 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] text-[10px] font-extrabold shrink-0 group-hover:scale-105 transition-transform flex items-center space-x-1 shadow-xs cursor-pointer"
              >
                <span>{currentUser?.aadhaar_status === 'sent_back' ? 'Re-upload' : (currentUser?.aadhaar_front_image ? 'View Status' : 'Verify UID')}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          );
        })()}

        {/* Active Filter Indicator Banner */}
        {activeFiltersCount > 0 && (
          <div className="bg-amber-50/90 border border-[#D4AF37]/35 rounded-2xl px-3.5 py-2.5 flex items-center justify-between text-xs shadow-2xs">
            <div className="flex items-center space-x-2 text-[#8C6D1F]">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#8C6D1F]" />
              <span className="font-bold text-[11px]">
                {activeFiltersCount} Filter{activeFiltersCount > 1 ? 's' : ''} Active • {filteredProfiles.length} Match{filteredProfiles.length !== 1 ? 'es' : ''}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-bold">
              <button
                type="button"
                onClick={onOpenFilter}
                className="text-[#0B192C] hover:underline cursor-pointer"
              >
                Modify
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={onResetFilters}
                className="text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        )}

        {/* Quick Feed Layout Switcher Bar */}
        {filteredProfiles.length > 0 && (
          <div className="flex items-center justify-between px-1 py-1">
            <span className="text-[11px] font-bold text-slate-700">
              {filteredProfiles.length} {getTargetGenderLabel(currentUser)} • {feedLayout === 'grid4' ? '4-Profile Grid' : 'Single Card'}
            </span>

            <div className="flex items-center space-x-0.5 bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/60 shadow-2xs">
              <button
                type="button"
                onClick={() => setFeedLayout('single')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                  feedLayout === 'single'
                    ? 'bg-white text-[#0B192C] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Single Full Card (1 Profile at a time - Classic)"
              >
                <Square className="w-3 h-3" />
                <span>1 Card</span>
              </button>

              <button
                type="button"
                onClick={() => setFeedLayout('grid4')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                  feedLayout === 'grid4'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="4-Profile Grid (4 Profiles at a time - 2x2)"
              >
                <LayoutGrid className="w-3 h-3" />
                <span>4 Grid</span>
              </button>
            </div>
          </div>
        )}

        {/* Empty State when no profiles match */}
        {filteredProfiles.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white rounded-3xl border border-slate-200 shadow-sm mx-1 space-y-3.5 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-[#8C6D1F] border border-amber-200 flex items-center justify-center mx-auto shadow-2xs">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-base text-[#0B192C]">No Profiles Match Your Criteria</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Try widening your location, age, or community preferences to discover more compatible profiles.
              </p>
            </div>
            <div className="pt-2 flex justify-center space-x-2.5">
              <button
                type="button"
                onClick={onResetFilters}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
              <button
                type="button"
                onClick={onOpenFilter}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] text-xs font-extrabold shadow-sm cursor-pointer flex items-center space-x-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Adjust Filters</span>
              </button>
            </div>
          </div>
        ) : feedLayout === 'grid4' ? (
          /* ── 4-Profile Grid View (2x2 Layout - 4 Profiles at a time) ────────── */
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {filteredProfiles.map((profile) => {
              const isInterested = interestsSent.includes(profile.id);
              const isShortlisted = shortlisted.includes(profile.id);

              return (
                <div 
                  key={profile.id}
                  onClick={() => onSelectProfile(profile)}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col relative group cursor-pointer active:scale-[0.98]"
                >
                  {/* Photo Container */}
                  <div 
                    className="relative aspect-[4/4.2] w-full bg-slate-100 overflow-hidden select-none photo-protected"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (screenshotRestricted) triggerScreenshotBlock('right-click');
                    }}
                  >
                    <img 
                      src={profile.photo} 
                      alt={profile.name}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      className={`w-full h-full object-cover select-none pointer-events-none transition-transform duration-300 group-hover:scale-105 ${
                        profile.hidePhotos
                          ? 'blur-2xl scale-125 opacity-30 grayscale'
                          : profile.photoVisibility === 'request'
                          ? 'blur-xl scale-110 opacity-70'
                          : profile.photoVisibility === 'accepted' && !isInterested
                          ? 'blur-lg scale-110 opacity-75'
                          : ''
                      }`} 
                    />
                    
                    {/* Dark gradient for bottom text contrast */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none"></div>

                    {/* Top Match Score Badge (Left) */}
                    {profile.matchScore && (
                      <div className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-md bg-[#0B192C]/85 backdrop-blur-md border border-[#D4AF37]/50 shadow-xs flex items-center space-x-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-[#DFB76C] animate-pulse" />
                        <span className="font-mono font-black text-[9px] text-[#DFB76C]">
                          {profile.matchScore}%
                        </span>
                      </div>
                    )}

                    {/* Top Verification Shield & Paid Crown (Right) */}
                    <div className="absolute top-1.5 right-1.5 z-10 flex items-center space-x-1">
                      {Boolean(profile.isPaid || (profile.membership && profile.membership !== 'free')) && (
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs" title="Paid Member">
                          <Crown className="w-3 h-3 text-white fill-current" />
                        </span>
                      )}
                      {profile.aadhaarVerified ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs" title="Aadhaar Verified">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                        </span>
                      ) : profile.verified ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs" title="Verified Member">
                          <ShieldCheck className="w-3.5 h-3.5 text-white" />
                        </span>
                      ) : null}
                    </div>

                    {/* Photo Privacy Lock Badge */}
                    {(profile.hidePhotos || profile.photoVisibility === 'request' || (profile.photoVisibility === 'accepted' && !isInterested)) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2 pointer-events-none text-center bg-black/40 backdrop-blur-xs">
                        <Lock className="w-4 h-4 text-[#DFB76C] mb-1" />
                        <span className="text-[8.5px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                          🔒 Protected
                        </span>
                      </div>
                    )}

                    {/* Bottom Overlay Info on Photo */}
                    <div className="absolute bottom-1.5 left-2 right-2 text-white">
                      <h4 className="font-serif font-bold text-xs leading-tight truncate drop-shadow-sm">
                        {profile.name}
                      </h4>
                      <p className="text-[9.5px] text-slate-200 truncate mt-0.5">
                        {profile.age} yrs • {profile.height}
                      </p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-2 space-y-1.5 flex-1 flex flex-col justify-between bg-white">
                    <div className="space-y-1">
                      {/* Location */}
                      <div className="flex items-center space-x-1 text-[10px] text-slate-600 truncate">
                        <MapPin className="w-2.5 h-2.5 text-[#DFB76C] shrink-0" />
                        <span className="truncate font-semibold">{profile.district || profile.city}</span>
                      </div>

                      {/* Profession */}
                      <div className="flex items-center space-x-1 text-[10px] text-slate-800 truncate">
                        <Briefcase className="w-2.5 h-2.5 text-[#1E3A8A] shrink-0" />
                        <span className="truncate">{profile.profession}</span>
                      </div>

                      {/* Income Pill */}
                      {profile.annualIncome && (
                        <div className="pt-0.5">
                          <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60 truncate inline-block max-w-full">
                            {profile.annualIncome}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Compact Action Buttons */}
                    <div className="pt-1.5 flex items-center justify-between gap-1 border-t border-slate-100">
                      {/* Shortlist */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleShortlist(profile.id);
                        }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                          isShortlisted 
                            ? 'bg-rose-50 border-rose-200 text-rose-600' 
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
                        }`}
                        title="Shortlist"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isShortlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>

                      {/* Direct Chat */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartChat(profile.id);
                        }}
                        className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 text-[#1E3A8A] flex items-center justify-center shrink-0 cursor-pointer"
                        title="Chat"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>

                      {/* Connect / Send Interest */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleInterest(profile.id);
                        }}
                        className={`flex-1 h-7 rounded-full text-[10px] font-bold transition-all flex items-center justify-center space-x-1 shadow-2xs truncate cursor-pointer ${
                          isInterested 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C]'
                        }`}
                        title={isInterested ? "Interest Sent" : "Send Interest"}
                      >
                        {isInterested ? (
                          <>
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span className="truncate">Sent</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-2.5 h-2.5" />
                            <span className="truncate">Connect</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Single Full Card View (1 Profile at a time - Classic) ─────────── */
          <div className="space-y-4">
            {filteredProfiles.map((profile) => {
              const isInterested = interestsSent.includes(profile.id);
              const isShortlisted = shortlisted.includes(profile.id);

              return (
                <div 
                  key={profile.id}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-md hover:border-[#D4AF37]/60 hover:shadow-xl transition-all relative flex flex-col group"
                >
                  {/* Full Mobile Width Photo */}
                  <div 
                    className="relative h-96 bg-slate-100 cursor-pointer overflow-hidden select-none photo-protected group"
                    onClick={() => onSelectProfile(profile)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (screenshotRestricted) triggerScreenshotBlock('right-click');
                    }}
                  >
                    <img 
                      src={profile.photo} 
                      alt={profile.name}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      className={`w-full h-full object-cover select-none pointer-events-none transition-transform duration-300 group-hover:scale-102 ${
                        profile.hidePhotos
                          ? 'blur-2xl scale-125 opacity-30 grayscale'
                          : profile.photoVisibility === 'request'
                          ? 'blur-xl scale-110 opacity-70'
                          : profile.photoVisibility === 'accepted' && !isInterested
                          ? 'blur-lg scale-110 opacity-75'
                          : ''
                      }`} 
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none"></div>

                    {/* Photo Privacy Lock Shield Overlay if restricted */}
                    {(profile.hidePhotos || profile.photoVisibility === 'request' || (profile.photoVisibility === 'accepted' && !isInterested)) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none text-center">
                        <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-[#D4AF37]/50 flex items-center justify-center text-[#DFB76C] mb-2 shadow-lg">
                          {profile.hidePhotos ? <EyeOff className="w-6 h-6 text-rose-400" /> : <Lock className="w-6 h-6 text-[#DFB76C]" />}
                        </div>
                        <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white font-bold text-xs shadow-md">
                          {profile.hidePhotos 
                            ? 'Photos Hidden by Member' 
                            : profile.photoVisibility === 'request'
                            ? '🔒 Photo Visible on Request'
                            : '🔒 Visible to Accepted Matches'}
                        </span>
                        <span className="text-[10px] text-slate-200 mt-1 drop-shadow-md">
                          {profile.photoVisibility === 'request' ? 'Tap profile to send photo request' : 'Connect to request full photo access'}
                        </span>
                      </div>
                    )}

                    {/* Bottom Overlay on Photo */}
                    <div className="absolute bottom-3 left-3 right-3 text-white flex items-end justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <h3 className="font-serif font-bold text-xl drop-shadow-sm truncate">
                            {profile.name}
                          </h3>
                          {profile.aadhaarVerified ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white border border-emerald-400 text-[10px] font-bold flex items-center gap-1 shadow-sm shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-white stroke-[2.5]" />
                              <span>Aadhaar Verified</span>
                            </span>
                          ) : profile.verified ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" title="Verified Member" />
                          ) : null}
                          {Boolean(profile.isPaid || (profile.membership && profile.membership !== 'free')) && (
                            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9.5px] font-extrabold flex items-center gap-1 shadow-sm shrink-0">
                              <Crown className="w-2.5 h-2.5 fill-current" />
                              <span>Paid Member</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-200 mt-0.5">
                          {profile.age} yrs • {profile.height}
                        </p>

                        <div className="flex items-center space-x-1 text-xs text-slate-200 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-[#DFB76C] shrink-0" />
                          <span className="truncate"><strong className="text-white font-semibold">{profile.district || profile.city}</strong>{profile.state ? `, ${profile.state}` : ''}</span>
                        </div>
                      </div>

                      {/* Match Percentage in Small Digital Badge */}
                      {profile.matchScore && (
                        <div className="shrink-0 mb-0.5">
                          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-[#0B192C]/85 backdrop-blur-md border border-[#D4AF37]/50 shadow-md">
                            <Sparkles className="w-3 h-3 text-[#DFB76C] shrink-0 animate-pulse" />
                            <span className="font-mono font-black text-xs text-[#DFB76C] tracking-tight">
                              {profile.matchScore}%
                            </span>
                            <span className="text-[8.5px] font-bold uppercase text-slate-300 tracking-wide">
                              Match
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Meta Body */}
                  <div className="p-3.5 space-y-3 bg-white">
                    <div className="flex items-start space-x-2 text-xs text-slate-700">
                      <Briefcase className="w-4 h-4 text-[#1E3A8A] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 truncate">{profile.profession}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {profile.company}
                          {(profile.jobLocation || profile.jobPlace) && (
                            <span className="text-slate-500 font-normal"> • 📍 {profile.jobLocation || profile.jobPlace}</span>
                          )}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded border border-emerald-200">
                        {profile.annualIncome}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-600">
                      <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{profile.education}</span>
                    </div>

                    {/* Membership Plan Row */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      {Boolean(profile.isPaid || (profile.membership && profile.membership !== 'free')) ? (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-extrabold flex items-center gap-1 shrink-0 shadow-2xs">
                          <Crown className="w-3.5 h-3.5 text-[#D4AF37] fill-current" />
                          <span>{profile.membershipPlan || 'VIP Member'}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-semibold shrink-0">
                          Free Basic
                        </span>
                      )}
                    </div>

                    {/* Mobile Action Controls */}
                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                      {/* Shortlist Heart */}
                      <button
                        onClick={() => onToggleShortlist(profile.id)}
                        className={`p-2.5 rounded-full border transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xs ${
                          isShortlisted 
                            ? 'bg-rose-50 border-rose-200 text-rose-600' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50/50'
                        }`}
                        title="Shortlist"
                      >
                        <Heart className={`w-5 h-5 ${isShortlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>

                      {/* Direct Chat */}
                      <button
                        onClick={() => onStartChat(profile.id)}
                        className="p-2.5 rounded-full bg-blue-50 border border-blue-200 text-[#1E3A8A] transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xs hover:bg-[#0B192C] hover:text-[#DFB76C]"
                        title="Chat"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>

                      {/* Connect / Send Interest */}
                      <button
                        onClick={() => onToggleInterest(profile.id)}
                        className={`flex-1 py-2.5 px-4 rounded-full text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 shadow-md cursor-pointer active:scale-95 ${
                          isInterested 
                            ? 'bg-emerald-600 text-white shadow-emerald-600/20' 
                            : 'bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] text-[#0B192C] shadow-[#D4AF37]/30 hover:brightness-105 btn-luxury-shimmer'
                        }`}
                      >
                        {isInterested ? (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Interest Sent</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Send Interest</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
