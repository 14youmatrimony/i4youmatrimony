import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Bell, 
  Heart, 
  Star, 
  Eye, 
  MessageCircle, 
  Check, 
  CheckCheck, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck, 
  Trash2, 
  Clock,
  Users,
  Lock
} from 'lucide-react';
import { usePhotoPrivacy } from '../../context/PhotoPrivacyContext';

export default function MobileNotificationsSheet({
  isOpen,
  onClose,
  isWebsiteModal = false,
  currentUser = null,
  onOpenLogin,
  notifications = [],
  profiles = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onAcceptInterest,
  onDeclineInterest,
  onSendInterest,
  onOpenChat,
  onOpenProfile,
  onSimulateNotification
}) {
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'interest' | 'shortlist' | 'visitor' | 'contact_view' | 'message'
  const { triggerScreenshotBlock } = usePhotoPrivacy();

  // Side Scroll state & refs for Filter Pills Bar
  const filterScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);

  const checkFilterScroll = useCallback(() => {
    const el = filterScrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    setCanScrollLeft(hasOverflow && el.scrollLeft > 6);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const el = filterScrollRef.current;
    if (!el) return;

    const timer = setTimeout(checkFilterScroll, 60);
    el.addEventListener('scroll', checkFilterScroll, { passive: true });

    // Enable smooth mouse wheel side scrolling
    const onWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        checkFilterScroll();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    window.addEventListener('resize', checkFilterScroll);
    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', checkFilterScroll);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', checkFilterScroll);
    };
  }, [isOpen, checkFilterScroll]);

  const handleFilterScroll = (direction) => {
    const el = filterScrollRef.current;
    if (el) {
      const amount = direction === 'left' ? -160 : 160;
      el.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkFilterScroll, 250);
    }
  };

  const handleMouseDown = (e) => {
    const el = filterScrollRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftStartRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const el = filterScrollRef.current;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    el.scrollLeft = scrollLeftStartRef.current - walk;
    checkFilterScroll();
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  if (!isOpen) return null;

  const unreadCount = (notifications || []).filter(n => n && !n.isRead).length;

  const filteredNotifications = (notifications || []).filter(Boolean).filter(notif => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'interest') return notif?.type === 'interest_received';
    if (activeFilter === 'shortlist') return notif?.type === 'profile_shortlisted';
    if (activeFilter === 'visitor') return notif?.type === 'profile_visitor';
    if (activeFilter === 'contact_view') return notif?.type === 'contact_viewed';
    if (activeFilter === 'message') return notif?.type === 'message_received';
    return true;
  });

  const getProfile = (profileId) => {
    return profiles.find(p => p.id === profileId) || null;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'interest_received':
        return (
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs border border-rose-200">
            <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-rose-600" />
          </div>
        );
      case 'profile_shortlisted':
        return (
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs border border-amber-200">
            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-500" />
          </div>
        );
      case 'profile_visitor':
        return (
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs border border-purple-200">
            <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-600" />
          </div>
        );
      case 'contact_viewed':
        return (
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs border border-emerald-200">
            <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </div>
        );
      case 'message_received':
        return (
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs border border-blue-200">
            <MessageCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-blue-500" />
          </div>
        );
      default:
        return (
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Bell className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </div>
        );
    }
  };

  const getCategoryBadge = (type) => {
    switch (type) {
      case 'interest_received':
        return (
          <span className="text-[8.5px] sm:text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-0.5">
            <Heart className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-rose-600" /> Interest Received
          </span>
        );
      case 'profile_shortlisted':
        return (
          <span className="text-[8.5px] sm:text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5">
            <Star className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-amber-500" /> Shortlisted
          </span>
        );
      case 'profile_visitor':
        return (
          <span className="text-[8.5px] sm:text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-0.5">
            <Users className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-purple-600" /> Visitor
          </span>
        );
      case 'contact_viewed':
        return (
          <span className="text-[8.5px] sm:text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
            <Eye className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> Contact Viewed
          </span>
        );
      case 'message_received':
        return (
          <span className="text-[8.5px] sm:text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-0.5">
            <MessageCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-blue-500" /> Message
          </span>
        );
      default:
        return null;
    }
  };

  const safeNotifs = (notifications || []).filter(Boolean);
  const counts = {
    all: safeNotifs.length,
    interest: safeNotifs.filter(n => n?.type === 'interest_received').length,
    shortlist: safeNotifs.filter(n => n?.type === 'profile_shortlisted').length,
    visitor: safeNotifs.filter(n => n?.type === 'profile_visitor').length,
    contact_view: safeNotifs.filter(n => n?.type === 'contact_viewed').length,
    message: safeNotifs.filter(n => n?.type === 'message_received').length
  };

  const sheetContent = (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50">
      
      {/* Top Header */}
      <header className="bg-[#0B192C] text-white px-2.5 sm:px-4 py-2 flex items-center justify-between border-b border-[#D4AF37]/30 shadow-xs shrink-0 z-30">
        <div className="flex items-center space-x-1.5 min-w-0">
          {!isWebsiteModal && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 -ml-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Back"
              title="Back"
            >
              <ChevronLeft className="w-4.5 h-4.5 text-[#DFB76C]" />
            </button>
          )}

          <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
            <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-tr from-[#D4AF37] to-[#DFB76C] text-[#0B192C] flex items-center justify-center shadow-2xs shrink-0">
              <Bell className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-[#0B192C]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1 sm:space-x-1.5">
                <h2 className="font-serif font-bold text-[11.5px] sm:text-sm text-white tracking-wide truncate">
                  Notifications
                </h2>
                {currentUser && unreadCount > 0 ? (
                  <span className="text-[8px] sm:text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-600 text-white shadow-2xs">
                    {unreadCount} New
                  </span>
                ) : (
                  <span className="text-[8px] font-semibold px-1.5 py-0.2 rounded-full bg-white/15 text-slate-300">
                    {currentUser ? 'Caught up' : 'Login'}
                  </span>
                )}
              </div>
              <p className="text-[8.5px] sm:text-[9px] text-slate-300 truncate">Live matrimonial activity & alerts</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {unreadCount > 0 && onMarkAllAsRead && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="text-[9.5px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#DFB76C] border border-[#DFB76C]/30 flex items-center gap-1 transition-all cursor-pointer"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3 h-3 text-[#DFB76C]" />
              <span className="hidden xs:inline">Read all</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {!currentUser ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-xs space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 mx-auto flex items-center justify-center shadow-xs">
              <Lock className="w-7 h-7 text-[#DFB76C]" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-base text-slate-800">Login Required</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Please log in to your account to view your notifications, activity alerts, and match updates.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenLogin) onOpenLogin();
              }}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
            >
              Log In / Register
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Pills with Interactive Smooth Side Scroll */}
          <div className="relative bg-white border-b border-slate-200 shadow-2xs group/filter">
        {/* Left Side Scroll Indicator & Arrow */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center bg-gradient-to-r from-white via-white/95 to-transparent pr-3 pl-1">
            <button
              type="button"
              onClick={() => handleFilterScroll('left')}
              className="w-5.5 h-5.5 rounded-full bg-[#0B192C] text-[#DFB76C] shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Scroll left"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Filter Pills Track */}
        <div 
          ref={filterScrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1.5 shrink-0 overflow-x-auto scroll-smooth select-none cursor-grab active:cursor-grabbing touch-pan-x status-scroll-bar no-scrollbar scrollbar-none text-xs"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 sm:px-3 py-1 rounded-full font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer text-[10px] sm:text-[11px] md:text-xs ${
              activeFilter === 'all'
                ? 'bg-[#0B192C] text-[#DFB76C] shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('interest')}
            className={`px-2.5 sm:px-3 py-1 rounded-full font-bold whitespace-nowrap shrink-0 flex items-center gap-1 transition-all cursor-pointer text-[10px] sm:text-[11px] md:text-xs ${
              activeFilter === 'interest'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/50'
            }`}
          >
            <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current shrink-0" /> Interests ({counts.interest})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('message')}
            className={`px-2.5 sm:px-3 py-1 rounded-full font-bold whitespace-nowrap shrink-0 flex items-center gap-1 transition-all cursor-pointer text-[10px] sm:text-[11px] md:text-xs ${
              activeFilter === 'message'
                ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-300'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/50'
            }`}
          >
            <MessageCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current shrink-0" /> Messages ({counts.message})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('shortlist')}
            className={`px-2.5 sm:px-3 py-1 rounded-full font-bold whitespace-nowrap shrink-0 flex items-center gap-1 transition-all cursor-pointer text-[10px] sm:text-[11px] md:text-xs ${
              activeFilter === 'shortlist'
                ? 'bg-amber-500 text-[#0B192C] shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/50'
            }`}
          >
            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current shrink-0" /> Shortlist ({counts.shortlist})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('visitor')}
            className={`px-2.5 sm:px-3 py-1 rounded-full font-bold whitespace-nowrap shrink-0 flex items-center gap-1 transition-all cursor-pointer text-[10px] sm:text-[11px] md:text-xs ${
              activeFilter === 'visitor'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/50'
            }`}
          >
            <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> Visitors ({counts.visitor})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('contact_view')}
            className={`px-2.5 sm:px-3 py-1 rounded-full font-bold whitespace-nowrap shrink-0 flex items-center gap-1 transition-all cursor-pointer text-[10px] sm:text-[11px] md:text-xs ${
              activeFilter === 'contact_view'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/50'
            }`}
          >
            <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> Contacts ({counts.contact_view})
          </button>
        </div>

        {/* Right Side Scroll Indicator & Arrow */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center bg-gradient-to-l from-white via-white/95 to-transparent pl-3 pr-1">
            <button
              type="button"
              onClick={() => handleFilterScroll('right')}
              className="w-5.5 h-5.5 rounded-full bg-[#0B192C] text-[#DFB76C] shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse"
              title="Scroll right"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Notifications Scroll List */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="py-8 px-4 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-xs text-slate-800">No notifications in this category</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              You're completely up to date. Incoming interests, messages, and contact views will appear here instantly.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const profile = getProfile(notif.profileId);
            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.isRead && onMarkAsRead) {
                    onMarkAsRead(notif.id);
                  }
                }}
                className={`p-2 sm:p-2.5 rounded-xl border transition-all relative ${
                  notif.isRead 
                    ? 'bg-white border-slate-200/90 shadow-2xs' 
                    : 'bg-gradient-to-r from-amber-50/30 via-white to-orange-50/20 border-[#DFB76C]/60 shadow-xs'
                }`}
              >
                {/* Unread Glowing Dot */}
                {!notif.isRead && (
                  <span 
                    className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-rose-200 animate-pulse" 
                    title="Unread notification"
                  />
                )}

                {/* Header Row: Icon + Category Badge + Timestamp */}
                <div className="flex items-center justify-between gap-1 mb-1 pr-2">
                  <div className="flex items-center space-x-1 sm:space-x-1.5 flex-wrap gap-y-1">
                    {getNotificationIcon(notif?.type)}
                    {getCategoryBadge(notif?.type)}
                    {notif.badge && (
                      <span className="text-[8px] sm:text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                        {notif.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-medium text-slate-400 flex items-center gap-0.5 shrink-0">
                    <Clock className="w-2.5 h-2.5" />
                    {notif.time}
                  </span>
                </div>

                {/* Notification Content Body */}
                <div className="space-y-1 pl-6 sm:pl-7">
                  <h4 className="text-[11px] sm:text-[12px] font-bold text-slate-900 leading-snug">
                    {notif.title}
                  </h4>
                  <p className="text-[10px] sm:text-[10.5px] text-slate-600 leading-normal">
                    {notif.message}
                  </p>

                  {/* Candidate Mini Profile Card */}
                  {profile && (
                    <div 
                      onClick={() => {
                        if (onOpenProfile) onOpenProfile(profile);
                      }}
                      className="my-1.5 p-1.5 bg-slate-50 hover:bg-slate-100/90 rounded-lg border border-slate-200 flex items-center justify-between gap-1.5 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                        <img 
                          src={profile.photo} 
                          alt={profile.name}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            triggerScreenshotBlock?.('right-click');
                          }}
                          draggable={false}
                          className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full object-cover shrink-0 border border-slate-300 shadow-2xs select-none"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1">
                            <span className="text-[10.5px] sm:text-[11.5px] font-bold text-slate-900 truncate group-hover:text-[#8C6D1F] transition-colors">
                              {profile.name}
                            </span>
                            {profile.aadhaarVerified && (
                              <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 shrink-0" title="Aadhaar Verified" />
                            )}
                          </div>
                          <div className="text-[8.5px] sm:text-[9.5px] text-slate-500 flex items-center flex-wrap gap-x-1 leading-tight">
                            <span>{profile.age} yrs</span>
                            <span>•</span>
                            <span className="truncate max-w-[125px] sm:max-w-none">{profile.profession}</span>
                            {profile.city && (
                              <>
                                <span>•</span>
                                <span className="shrink-0 text-slate-600 font-medium">📍 {profile.city}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-0.5 text-[#8C6D1F] text-[9px] sm:text-[10px] font-semibold shrink-0 pr-0.5">
                        <span>Profile</span>
                        <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  )}

                  {/* Personalized Quote / Message Preview Bubble */}
                  {notif.quote && (
                    <div className="px-2 py-0.5 sm:py-1 rounded-md bg-slate-100/80 border border-slate-200/70 text-slate-600 text-[9px] sm:text-[9.5px] italic font-medium leading-snug line-clamp-2">
                      "{notif.quote.replace(/^["'\s]+|["'\s]+$/g, '')}"
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className="pt-1 flex flex-wrap items-center gap-1 sm:gap-1.5">
                    {/* Scenario 1: Interest Received */}
                    {notif?.type === 'interest_received' && (
                      <>
                        {notif.status === 'accepted' ? (
                          <div className="flex items-center space-x-1">
                            <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Check className="w-2.5 h-2.5 stroke-[2.5]" /> Interest Accepted
                            </span>
                            {profile && onOpenChat && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenChat(profile.id);
                                }}
                                className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#0B192C] text-[#DFB76C] hover:bg-black transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <MessageCircle className="w-2.5 h-2.5" /> Chat
                              </button>
                            )}
                          </div>
                        ) : notif.status === 'declined' ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            <X className="w-2.5 h-2.5 stroke-[2.5]" /> Declined
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onAcceptInterest) onAcceptInterest(notif.id, notif.profileId);
                              }}
                              className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[9px] sm:text-[10px] shadow-2xs transition-all cursor-pointer flex items-center gap-0.5"
                            >
                              <Check className="w-2.5 h-2.5 stroke-[2.5]" /> Accept Interest
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDeclineInterest) onDeclineInterest(notif.id);
                              }}
                              className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-rose-300 bg-rose-50 text-rose-600 hover:text-rose-700 hover:bg-rose-100 text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer flex items-center gap-0.5 active:scale-95 shadow-2xs"
                              title="Decline Interest"
                            >
                              <X className="w-2.5 h-2.5 stroke-[2.5]" />
                              <span>Decline</span>
                            </button>
                            {profile && onOpenProfile && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenProfile(profile);
                                }}
                                className="px-2 py-0.5 sm:py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-[9px] sm:text-[10px] font-semibold transition-colors cursor-pointer ml-auto"
                              >
                                View Details
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {/* Scenario 2: Profile Shortlisted */}
                    {notif?.type === 'profile_shortlisted' && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSendInterest) onSendInterest(notif.profileId);
                          }}
                          className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-bold text-[9px] sm:text-[10px] shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-0.5"
                        >
                          <Heart className="w-2.5 h-2.5 fill-[#0B192C]" /> Express Interest
                        </button>
                        {profile && onOpenProfile && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenProfile(profile);
                            }}
                            className="px-2 py-0.5 sm:py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-[9px] sm:text-[10px] font-semibold transition-colors cursor-pointer"
                          >
                            View Profile
                          </button>
                        )}
                        {profile && onOpenChat && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenChat(profile.id);
                            }}
                            className="px-2 py-0.5 sm:py-1 rounded-lg bg-slate-900 text-[#DFB76C] hover:bg-black font-bold text-[9px] sm:text-[10px] transition-colors cursor-pointer flex items-center gap-0.5"
                          >
                            <MessageCircle className="w-2.5 h-2.5" /> Chat
                          </button>
                        )}
                      </>
                    )}

                    {/* Scenario 3: Contact Viewed */}
                    {notif?.type === 'contact_viewed' && (
                      <>
                        {profile && onOpenChat && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenChat(profile.id);
                            }}
                            className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-[#0B192C] hover:bg-slate-900 text-[#DFB76C] font-bold text-[9px] sm:text-[10px] shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-0.5"
                          >
                            <MessageCircle className="w-2.5 h-2.5" /> Start Chat
                          </button>
                        )}
                        {profile && onOpenProfile && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenProfile(profile);
                            }}
                            className="px-2 py-0.5 sm:py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-[9px] sm:text-[10px] font-semibold transition-colors cursor-pointer"
                          >
                            View Profile
                          </button>
                        )}
                      </>
                    )}

                    {/* Scenario 4: Message Received */}
                    {notif?.type === 'message_received' && (
                      <>
                        {profile && onOpenChat && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenChat(profile.id);
                            }}
                            className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] sm:text-[10px] shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-0.5"
                          >
                            <MessageCircle className="w-2.5 h-2.5 fill-white" /> Reply in Chat
                          </button>
                        )}
                        {profile && onOpenProfile && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenProfile(profile);
                            }}
                            className="px-2 py-0.5 sm:py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-[9px] sm:text-[10px] font-semibold transition-colors cursor-pointer"
                          >
                            View Profile
                          </button>
                        )}
                      </>
                    )}

                    {/* Delete notification trigger */}
                    {onDeleteNotification && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNotification(notif.id);
                        }}
                        className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors cursor-pointer ml-auto"
                        title="Dismiss notification"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
        </>
      )}

    </div>
  );

  if (isWebsiteModal) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[88vh] h-full sm:h-auto bg-slate-50 rounded-2xl shadow-2xl border border-[#D4AF37]/35 flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {sheetContent}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col h-full w-full overflow-hidden animate-in slide-in-from-right-4 duration-200">
      {sheetContent}
    </div>
  );
}
