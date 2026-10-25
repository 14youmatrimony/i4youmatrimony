import React from 'react';
import { 
  Heart, 
  Clock, 
  ShieldCheck, 
  Check, 
  X, 
  ChevronRight, 
  MessageCircle, 
  Bell, 
  Eye, 
  Star, 
  Users,
  Trash2
} from 'lucide-react';
import { addCacheBuster } from '../../utils/cacheBuster';

/**
 * NotificationCard
 * Reusable & interactive notification card for matrimonial notifications.
 * Supports standalone mode (via `item`) and rich sheet mode (via `notif` & `profile`).
 * Strictly adheres to project English-only guidelines.
 */
export default function NotificationCard({
  item,
  notif: propNotif,
  profile: propProfile,
  isRead: propIsRead,
  onCardClick,
  onAcceptInterest,
  onDeclineInterest,
  onSendInterest,
  onOpenChat,
  onOpenProfile,
  onMarkAsRead,
  onDeleteNotification,
  triggerScreenshotBlock,
  getNotificationIcon: customGetIcon,
  getCategoryBadge: customGetBadge
}) {
  // Normalize notification data between simple item mode and rich notif mode
  const notif = propNotif || item || {};
  const profile = propProfile || notif.profile || notif.sender;
  const isRead = propIsRead !== undefined ? propIsRead : Boolean(notif.isRead || notif.is_read);
  const status = notif.status || 'pending';

  // Helper to validate and clean genuine candidate names
  const cleanValidName = (name) => {
    if (!name || typeof name !== 'string') return null;
    const clean = name.trim();
    const lower = clean.toLowerCase();
    if (
      lower === '' ||
      lower === 'verified member' ||
      lower === 'a verified member' ||
      lower === 'member' ||
      lower === 'a member' ||
      lower === 'candidate' ||
      lower === 'verified candidate' ||
      lower === 'someone' ||
      lower === 'null' ||
      lower === 'undefined'
    ) {
      return null;
    }
    return clean;
  };

  // Dynamic variable bindings for real sender details from API / database
  const candidateName = 
    cleanValidName(notif.sender_name) ||
    cleanValidName(notif.senderName) ||
    cleanValidName(notif.sender?.name) ||
    cleanValidName(profile?.name) ||
    cleanValidName(notif.interest_from?.name) ||
    cleanValidName(notif.metadata?.senderName) ||
    (profile?.register_id ? `Member ${profile.register_id}` : null) ||
    (notif.sender_id && !String(notif.sender_id).startsWith('sim-') ? `Member ${notif.sender_id}` : null) ||
    'Candidate';

  const rawPhoto = profile?.photo || profile?.photo_url || notif.sender_photo || notif.senderPhoto || notif.sender_image || profile?.avatar || notif.sender?.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';
  const candidatePhoto = addCacheBuster(rawPhoto);

  const displayAge = profile?.age || notif.sender_age || notif.senderAge || notif.sender?.age || null;
  const displayProfession = profile?.profession || notif.sender_profession || notif.senderProfession || notif.sender?.profession || null;
  const displayLocation = profile?.district || profile?.city || profile?.location || notif.sender_location || notif.sender_city || notif.sender_district || notif.sender?.city || null;
  const isVerified = Boolean(profile?.aadhaarVerified || profile?.verified || profile?.aadhaar_verified || notif.sender_verified || notif.sender?.verified);

  // Compute clean dynamic title without hardcoded or looping 'Verified Member'
  const computedTitle = (() => {
    if (notif.title) {
      const sanitizedTitle = notif.title.replace(/a verified member|verified member/gi, candidateName).trim();
      if (!sanitizedTitle.toLowerCase().includes('verified member')) {
        return sanitizedTitle;
      }
    }
    if (notif.type === 'message' || notif.type === 'chat_message' || notif.type === 'message_received') {
      return `💬 Message from ${candidateName}`;
    }
    if (notif.type === 'shortlist' || notif.type === 'profile_shortlisted') {
      return `⭐ ${candidateName} shortlisted your profile!`;
    }
    if (notif.type === 'contact' || notif.type === 'contact_viewed') {
      return `👁️ Contact Details Viewed by ${candidateName}`;
    }
    return `💖 Interest from ${candidateName}!`;
  })();

  // Compute clean dynamic message body without 'Verified Member'
  const computedMessage = (() => {
    const rawMsg = notif.message || notif.subtitle || '';
    if (!rawMsg) return '';
    return rawMsg.replace(/a verified member|verified member/gi, candidateName).trim();
  })();

  const defaultIcon = () => {
    switch (notif.type) {
      case 'interest':
      case 'interest_received':
        return (
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs border border-rose-200">
            <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-rose-500" />
          </div>
        );
      case 'shortlist':
      case 'profile_shortlisted':
        return (
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs border border-amber-200">
            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-500" />
          </div>
        );
      case 'visitor':
      case 'profile_visitor':
        return (
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs border border-purple-200">
            <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-600" />
          </div>
        );
      case 'contact':
      case 'contact_viewed':
        return (
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs border border-emerald-200">
            <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </div>
        );
      case 'message':
      case 'chat_message':
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

  const defaultBadge = () => {
    switch (notif.type) {
      case 'interest':
      case 'interest_received':
        return (
          <span className="text-[8.5px] sm:text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-0.5">
            <Heart className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-rose-600" /> Interest Received
          </span>
        );
      case 'shortlist':
      case 'profile_shortlisted':
        return (
          <span className="text-[8.5px] sm:text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5">
            <Star className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-amber-500" /> Shortlisted
          </span>
        );
      case 'visitor':
      case 'profile_visitor':
        return (
          <span className="text-[8.5px] sm:text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-0.5">
            <Users className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-purple-600" /> Visitor
          </span>
        );
      case 'contact':
      case 'contact_viewed':
        return (
          <span className="text-[8.5px] sm:text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
            <Eye className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> Contact Viewed
          </span>
        );
      case 'message':
      case 'chat_message':
      case 'message_received':
        return (
          <span className="text-[8.5px] sm:text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-0.5">
            <MessageCircle className="w-2.5 h-2.5 sm:w-2.5 sm:h-2.5 fill-blue-500" /> Message
          </span>
        );
      default:
        return null;
    }
  };

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick();
    } else {
      if (!isRead && onMarkAsRead) onMarkAsRead(notif.id);
      if (profile && onOpenProfile) onOpenProfile(profile);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`p-2.5 sm:p-3 rounded-xl border transition-all relative cursor-pointer hover:border-[#DFB76C] hover:shadow-xs group ${
        isRead
          ? 'bg-white border-slate-200/90 shadow-2xs hover:bg-slate-50/70'
          : 'bg-gradient-to-r from-amber-50/30 via-white to-orange-50/20 border-[#DFB76C]/60 shadow-xs hover:border-[#D4AF37]'
      }`}
      title={
        notif.type === 'message_received'
          ? 'Click to open chat and reply directly'
          : 'Click to open candidate profile'
      }
    >
      {/* Unread Glowing Dot */}
      {!isRead && (
        <span
          className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-rose-200 animate-pulse"
          title="Unread notification"
        />
      )}

      {/* Header Row: Icon + Category Badge + Timestamp */}
      <div className="flex items-center justify-between gap-1 mb-1 pr-2">
        <div className="flex items-center space-x-1 sm:space-x-1.5 flex-wrap gap-y-1">
          {customGetIcon ? customGetIcon(notif.type) : defaultIcon()}
          {customGetBadge ? customGetBadge(notif.type) : defaultBadge()}
          {notif.badge && (
            <span className="text-[8px] sm:text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
              {notif.badge}
            </span>
          )}
        </div>
        <span className="text-[8px] sm:text-[9px] font-medium text-slate-400 flex items-center gap-0.5 shrink-0">
          <Clock className="w-2.5 h-2.5" />
          {notif.time || 'Just now'}
        </span>
      </div>

      {/* Notification Content Body */}
      <div className="space-y-1 pl-6 sm:pl-7">
        <h4 className="text-[11px] sm:text-[12px] font-bold text-slate-900 leading-snug group-hover:text-[#8C6D1F] transition-colors">
          {computedTitle}
        </h4>
        {computedMessage && (
          <p className="text-[10px] sm:text-[10.5px] text-slate-600 leading-normal">
            {computedMessage}
          </p>
        )}

        {/* Candidate Mini Profile Card */}
        {(profile || notif.sender_name || notif.sender_photo) && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (!isRead && onMarkAsRead) onMarkAsRead(notif.notification_id || notif.id);
              if (onOpenProfile) onOpenProfile(profile || notif.sender || notif);
            }}
            className="my-1.5 p-1.5 bg-slate-50 hover:bg-amber-50/70 rounded-lg border border-slate-200 hover:border-[#DFB76C]/70 flex items-center justify-between gap-1.5 cursor-pointer transition-colors group/card shadow-2xs"
            title="Click to view full candidate profile"
          >
            <div className="flex items-center space-x-1.5 min-w-0 flex-1">
              <img
                key={candidatePhoto}
                src={candidatePhoto}
                alt={candidateName}
                onContextMenu={(e) => {
                  e.preventDefault();
                  triggerScreenshotBlock?.('right-click');
                }}
                draggable={false}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shrink-0 border border-slate-300 shadow-2xs select-none"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1">
                  <span className="text-[10.5px] sm:text-[11.5px] font-bold text-slate-900 truncate group-hover/card:text-[#8C6D1F] transition-colors">
                    {candidateName}
                  </span>
                  {isVerified && (
                    <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 shrink-0" title="Aadhaar Verified" />
                  )}
                </div>
                <div className="text-[8.5px] sm:text-[9.5px] text-slate-500 flex items-center flex-wrap gap-x-1 leading-tight">
                  {displayAge && <span>{displayAge} yrs</span>}
                  {displayAge && displayProfession && <span>•</span>}
                  {displayProfession && (
                    <span className="truncate max-w-[125px] sm:max-w-none">{displayProfession}</span>
                  )}
                  {displayLocation && (
                    <>
                      {(displayAge || displayProfession) && <span>•</span>}
                      <span className="shrink-0 text-slate-600 font-medium">📍 {displayLocation}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-0.5 text-[#8C6D1F] text-[9px] sm:text-[10px] font-bold shrink-0 pr-1">
              <span>Profile</span>
              <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 group-hover/card:translate-x-0.5 transition-transform" />
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
          {(notif.type === 'interest_received' || notif.type === 'interest') && (
            <>
              {status === 'accepted' ? (
                <div className="flex items-center space-x-1 flex-wrap gap-1">
                  <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" /> Interest Accepted
                  </span>
                  {profile && onOpenChat && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isRead && onMarkAsRead) onMarkAsRead(notif.id);
                        onOpenChat(
                          notif.user_id || notif.userId || notif.senderId || profile.id,
                          null,
                          notif.chat_id || notif.chatId || notif.conversation_id
                        );
                      }}
                      className="text-[9px] sm:text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#0B192C] text-[#DFB76C] hover:bg-black transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <MessageCircle className="w-2.5 h-2.5" /> Chat
                    </button>
                  )}
                  {profile && onOpenProfile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isRead && onMarkAsRead) onMarkAsRead(notif.id);
                        onOpenProfile(profile);
                      }}
                      className="text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 transition-colors cursor-pointer"
                    >
                      View Profile
                    </button>
                  )}
                </div>
              ) : status === 'declined' ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  <X className="w-2.5 h-2.5 stroke-[2.5]" /> Declined
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAcceptInterest) onAcceptInterest(notif.id, profile?.id || notif.senderId || notif.profileId);
                    }}
                    className="px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[9px] sm:text-[10px] shadow-2xs transition-all cursor-pointer flex items-center gap-0.5"
                  >
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" /> Accept Interest
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDeclineInterest) onDeclineInterest(notif.id);
                    }}
                    className="px-2 sm:px-2.5 py-1 rounded-lg border border-rose-300 bg-rose-50 text-rose-600 hover:text-rose-700 hover:bg-rose-100 text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer flex items-center gap-0.5 active:scale-95 shadow-2xs"
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
                        if (!isRead && onMarkAsRead) onMarkAsRead(notif.id);
                        onOpenProfile(profile);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-[#DFB76C]/60 hover:border-[#D4AF37] bg-white text-slate-800 text-[9px] sm:text-[10px] font-bold transition-colors cursor-pointer ml-auto flex items-center gap-0.5 shadow-2xs"
                    >
                      <span>View Profile</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* Scenario 2: Profile Shortlisted */}
          {(notif.type === 'profile_shortlisted' || notif.type === 'shortlist') && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSendInterest) onSendInterest(profile?.id || notif.profileId);
                }}
                className="px-2 sm:px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-bold text-[9px] sm:text-[10px] shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-0.5"
              >
                <Heart className="w-2.5 h-2.5 fill-[#0B192C]" /> Express Interest
              </button>
              {profile && onOpenProfile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isRead && onMarkAsRead) onMarkAsRead(notif.id);
                    onOpenProfile(profile);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-[9px] sm:text-[10px] font-bold transition-colors cursor-pointer"
                >
                  View Profile
                </button>
              )}
              {profile && onOpenChat && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isRead && onMarkAsRead) onMarkAsRead(notif.id);
                    onOpenChat(
                      notif.user_id || notif.userId || notif.senderId || profile.id,
                      null,
                      notif.chat_id || notif.chatId || notif.conversation_id
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 text-[#DFB76C] hover:bg-black font-bold text-[9px] sm:text-[10px] transition-colors cursor-pointer flex items-center gap-0.5"
                >
                  <MessageCircle className="w-2.5 h-2.5" /> Chat
                </button>
              )}
            </>
          )}

          {/* Scenario 3: Contact Viewed */}
          {(notif.type === 'contact_viewed' || notif.type === 'contact') && (
            <>
              {profile && onOpenProfile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isRead && onMarkAsRead) onMarkAsRead(notif.id);
                    onOpenProfile(profile);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] sm:text-[10px] shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Eye className="w-2.5 h-2.5" /> View Profile
                </button>
              )}
              {profile && onOpenChat && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isRead && onMarkAsRead) onMarkAsRead(notif.id);
                    onOpenChat(
                      notif.user_id || notif.userId || notif.senderId || profile.id,
                      null,
                      notif.chat_id || notif.chatId || notif.conversation_id
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#0B192C] hover:bg-slate-900 text-[#DFB76C] font-bold text-[9px] sm:text-[10px] shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                >
                  <MessageCircle className="w-2.5 h-2.5" /> Start Chat
                </button>
              )}
            </>
          )}

          {/* Scenario 4: Message Received */}
          {(notif.type === 'message_received' || notif.type === 'chat_message' || notif.type === 'message') && (
            <>
              {profile && onOpenChat && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isRead && onMarkAsRead) onMarkAsRead(notif.id);
                    onOpenChat(
                      notif.user_id || notif.userId || notif.senderId || profile.id,
                      notif.quote || notif.message,
                      notif.chat_id || notif.chatId || notif.conversation_id
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] sm:text-[10px] shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                >
                  <MessageCircle className="w-2.5 h-2.5 fill-white" /> Reply in Chat
                </button>
              )}
              {profile && onOpenProfile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isRead && onMarkAsRead) onMarkAsRead(notif.id);
                    onOpenProfile(profile);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-[9px] sm:text-[10px] font-bold transition-colors cursor-pointer"
                >
                  View Profile
                </button>
              )}
            </>
          )}

          {/* Delete / Dismiss Notification trigger */}
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
}
