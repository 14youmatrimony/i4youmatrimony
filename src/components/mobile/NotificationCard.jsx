import React, { useState } from 'react';
import { 
  Heart, 
  Clock, 
  ShieldCheck, 
  Check, 
  X, 
  ChevronRight, 
  MessageCircle, 
  Bell 
} from 'lucide-react';

/**
 * NotificationCard
 * Interactive notification card component for matrimonial interest notifications and alerts.
 * Strictly adheres to project English-only guidelines.
 */
export default function NotificationCard({
  item = {},
  onAccept,
  onDecline,
  onViewProfile,
  onOpenChat,
  onMarkAsRead
}) {
  const [internalStatus, setInternalStatus] = useState(item.status || 'pending');
  const [isReadState, setIsReadState] = useState(Boolean(item.isRead));

  const status = item.status !== undefined ? item.status : internalStatus;
  const isRead = item.isRead !== undefined ? item.isRead : isReadState;

  const handleCardClick = () => {
    if (!isRead) {
      setIsReadState(true);
      if (onMarkAsRead) onMarkAsRead(item.id);
    }
    if (onViewProfile && (item.profile || item.sender)) {
      onViewProfile(item.profile || item.sender);
    }
  };

  const handleAcceptClick = (e) => {
    e.stopPropagation();
    setInternalStatus('accepted');
    setIsReadState(true);
    if (onAccept) onAccept(item.id, item.profile?.id || item.senderId);
    if (onMarkAsRead) onMarkAsRead(item.id);
  };

  const handleDeclineClick = (e) => {
    e.stopPropagation();
    setInternalStatus('declined');
    setIsReadState(true);
    if (onDecline) onDecline(item.id);
    if (onMarkAsRead) onMarkAsRead(item.id);
  };

  const handleChatClick = (e) => {
    e.stopPropagation();
    if (onOpenChat) {
      onOpenChat(item.senderId || item.profile?.id || item.userId);
    }
  };

  const profile = item.profile || item.sender;

  return (
    <div
      onClick={handleCardClick}
      className={`p-3 sm:p-3.5 rounded-xl border transition-all duration-200 relative cursor-pointer group ${
        !isRead
          ? 'bg-amber-50/30 border-[#DFB76C]/70 shadow-xs hover:border-[#D4AF37]'
          : 'bg-white border-slate-200/90 shadow-2xs hover:bg-slate-50/70 hover:border-slate-300'
      }`}
    >
      {/* Unread Indicator Pulse */}
      {!isRead && (
        <span 
          className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200 animate-pulse" 
          title="Unread notification"
        />
      )}

      {/* Top Header: Category Icon, Title, and Timestamp */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Heart className="w-4 h-4 fill-rose-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1">
              <span className="font-bold text-xs sm:text-sm text-slate-900 truncate group-hover:text-[#8C6D1F] transition-colors">
                {item.title || 'Interest from Verified Member'}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" title="Verified Member" />
            </div>
            {(item.subtitle || item.message) && (
              <p className="text-[11px] text-slate-500 truncate leading-snug">
                {item.subtitle || item.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1 text-[10px] text-slate-400 shrink-0">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{item.time || 'Just now'}</span>
        </div>
      </div>

      {/* Optional Candidate Mini Preview */}
      {profile && (
        <div className="my-2 p-2 bg-slate-50 hover:bg-amber-50/50 rounded-lg border border-slate-200/80 flex items-center justify-between gap-2 transition-colors">
          <div className="flex items-center space-x-2 min-w-0">
            {profile.photo && (
              <img
                src={profile.photo}
                alt={profile.name || 'Candidate'}
                className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 select-none"
              />
            )}
            <div className="min-w-0 text-left">
              <span className="text-[11px] font-bold text-slate-800 truncate block">
                {profile.name || 'Verified Candidate'}
              </span>
              <span className="text-[9.5px] text-slate-500 truncate block">
                {[profile.age ? `${profile.age} yrs` : null, profile.profession, profile.city || profile.location]
                  .filter(Boolean)
                  .join(' • ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        {status === 'accepted' ? (
          <div className="flex items-center space-x-1.5 flex-wrap gap-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10.5px]">
              <Check className="w-3 h-3 stroke-[2.5]" /> Interest Accepted
            </span>
            {onOpenChat && (
              <button
                type="button"
                onClick={handleChatClick}
                className="px-2.5 py-1 rounded-lg bg-[#0B192C] text-[#DFB76C] hover:bg-black font-bold text-[10.5px] transition-colors flex items-center gap-1 shadow-2xs"
              >
                <MessageCircle className="w-3 h-3" />
                <span>Chat</span>
              </button>
            )}
          </div>
        ) : status === 'declined' ? (
          <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-500 font-medium px-2 py-0.5 rounded-md bg-slate-100">
            <X className="w-3 h-3" /> Declined
          </span>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleAcceptClick}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[10.5px] shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3 stroke-[2.5]" />
              <span>Accept</span>
            </button>
            <button
              type="button"
              onClick={handleDeclineClick}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-600 hover:text-rose-600 font-medium text-[10.5px] transition-all flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Decline</span>
            </button>
          </div>
        )}

        {/* View Profile Action Link */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onViewProfile) onViewProfile(profile || item);
          }}
          className="flex items-center space-x-0.5 text-[#8C6D1F] hover:text-[#0B192C] font-bold text-[10.5px] transition-colors ml-auto cursor-pointer"
        >
          <span>View Profile</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
