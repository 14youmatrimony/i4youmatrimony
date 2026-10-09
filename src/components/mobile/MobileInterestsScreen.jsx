import React, { useState } from 'react';
import { 
  Heart, 
  Send, 
  Check, 
  X, 
  MessageCircle, 
  Sparkles, 
  MapPin, 
  ShieldCheck,
  UserCheck,
  Lock
} from 'lucide-react';
import { usePhotoPrivacy } from '../../context/PhotoPrivacyContext';
import { getTargetCandidateGender, isCandidateMatchingTarget, normalizeGender } from '../../utils/genderMatch';
import { getAppMode } from '../../config/appConfig';

export default function MobileInterestsScreen({
  profiles,
  currentUser,
  onOpenLogin,
  interestsSent,
  onToggleInterest,
  shortlisted,
  onToggleShortlist,
  onSelectProfile,
  onStartChat,
  activeSegment: externalSegment,
  onSegmentChange,
  declinedReceivedIds = [],
  onDeclineReceivedInterest,
  onUndoDeclineReceivedInterest,
  onAcceptReceivedInterest
}) {
  const { triggerScreenshotBlock, screenshotRestricted } = usePhotoPrivacy();
  const [internalSegment, setInternalSegment] = useState('sent'); // 'sent' | 'received' | 'shortlist'
  const [localDeclinedIds, setLocalDeclinedIds] = useState([]);

  // If user is not logged in, display the Login Required screen immediately
  if (!currentUser) {
    return (
      <div className="p-4 min-h-[460px] flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        <div className="w-full max-w-sm p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 text-center shadow-lg">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 mx-auto flex items-center justify-center mb-4 shadow-sm">
            <Lock className="w-8 h-8 text-[#DFB76C]" />
          </div>
          <h3 className="font-serif font-bold text-lg mb-2">Login Required</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Please log in or register to view sent and received interests, shortlisted profiles, and mutual matches.
          </p>
          <button
            type="button"
            onClick={onOpenLogin}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Log In / Register</span>
          </button>
        </div>
      </div>
    );
  }

  const activeSegment = externalSegment !== undefined ? externalSegment : internalSegment;
  const setActiveSegment = (seg) => {
    if (onSegmentChange) {
      onSegmentChange(seg);
    } else {
      setInternalSegment(seg);
    }
  };

  const effectiveDeclinedIds = Array.from(new Set([
    ...(Array.isArray(declinedReceivedIds) ? declinedReceivedIds : []),
    ...localDeclinedIds
  ]));

  const targetCandidateGender = getTargetCandidateGender(currentUser);
  const isMaleUser = normalizeGender(currentUser?.gender) === 'male';
  // Male user receives interests from Women; Female user receives interests from Gents
  const initialReceivedCandidateIds = Array.isArray(currentUser?.receivedInterests)
    ? currentUser.receivedInterests
    : (getAppMode() ? [] : (isMaleUser ? ['p1', 'p3', 'p5'] : ['p2', 'p4', 'p6']));

  const oppositeGenderProfiles = profiles.filter(p => {
    if (currentUser?.id && p.id === currentUser.id) return false;
    if (currentUser?.mobile && (p.mobile === currentUser.mobile || p.phone === currentUser.mobile)) return false;
    return isCandidateMatchingTarget(p.gender, targetCandidateGender);
  });

  const sentProfiles = oppositeGenderProfiles.filter(p => interestsSent.includes(p.id));
  const shortlistedProfiles = oppositeGenderProfiles.filter(p => shortlisted.includes(p.id));
  const receivedProfiles = oppositeGenderProfiles.filter(p => 
    initialReceivedCandidateIds.includes(p.id) &&
    !effectiveDeclinedIds.includes(p.id) &&
    !interestsSent.includes(p.id)
  );
  const declinedProfiles = oppositeGenderProfiles.filter(p => effectiveDeclinedIds.includes(p.id));

  const handleDecline = (profileId, profileName) => {
    setLocalDeclinedIds(prev => (prev.includes(profileId) ? prev : [...prev, profileId]));
    if (onDeclineReceivedInterest) {
      onDeclineReceivedInterest(profileId);
    }
  };

  const handleUndoDecline = (profileId) => {
    setLocalDeclinedIds(prev => prev.filter(id => id !== profileId));
    if (onUndoDeclineReceivedInterest) {
      onUndoDeclineReceivedInterest(profileId);
    }
  };

  return (
    <div className="p-3 space-y-4 pb-6">
      
      {/* Mobile Segmented Control */}
      <div className="bg-slate-200/80 p-1 rounded-2xl flex text-xs font-bold text-slate-700">
        <button
          onClick={() => setActiveSegment('sent')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeSegment === 'sent' 
              ? 'bg-white text-[#0B192C] shadow-sm' 
              : 'text-slate-600'
          }`}
        >
          Sent ({sentProfiles.length})
        </button>
        <button
          onClick={() => setActiveSegment('received')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeSegment === 'received' 
              ? 'bg-white text-[#0B192C] shadow-sm' 
              : 'text-slate-600'
          }`}
        >
          Received ({receivedProfiles.length})
        </button>
        <button
          onClick={() => setActiveSegment('shortlist')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeSegment === 'shortlist' 
              ? 'bg-white text-[#0B192C] shadow-sm' 
              : 'text-slate-600'
          }`}
        >
          Shortlist ({shortlistedProfiles.length})
        </button>
      </div>

      {/* Segment Content */}
      <div className="space-y-3">
        {activeSegment === 'sent' && (
          <>
            {sentProfiles.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                You haven't sent any interests yet. Explore matches to connect!
              </div>
            ) : (
              sentProfiles.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-3.5 flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center space-x-3 min-w-0" onClick={() => onSelectProfile(p)}>
                    <img 
                      src={p.photo} 
                      alt={p.name} 
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (screenshotRestricted) triggerScreenshotBlock('right-click');
                      }}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-[#DFB76C] select-none photo-protected" 
                    />
                    <div className="min-w-0">
                      <h4 className="font-serif font-bold text-sm text-slate-900 truncate">{p.name}</h4>
                      <p className="text-[11px] text-slate-500">{p.profession}</p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Interest Sent • Pending Reply</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => onStartChat(p.id)}
                      className="p-2 rounded-xl bg-blue-50 text-[#1E3A8A] hover:bg-blue-100"
                      title="Message"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onToggleInterest(p.id)}
                      className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 text-[10px] font-bold"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeSegment === 'received' && (
          <>
            {receivedProfiles.length === 0 ? (
              <div className="py-12 px-6 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
                  <Check className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h4 className="font-serif font-bold text-sm text-slate-900">All Received Interests Handled</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  You have responded to all incoming matrimonial connection requests. New interests from compatible matches will show up here.
                </p>
              </div>
            ) : (
              receivedProfiles.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3 shadow-sm transition-all">
                  <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectProfile(p)}>
                    <img 
                      src={p.photo} 
                      alt={p.name} 
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (screenshotRestricted) triggerScreenshotBlock('right-click');
                      }}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#DFB76C] select-none photo-protected" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="font-serif font-bold text-sm text-slate-900 truncate">{p.name}</h4>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <p className="text-[11px] text-slate-500">{p.age} yrs • {p.district || p.city}{p.state ? `, ${p.state}` : ''}</p>
                      <p className="text-[11px] font-bold text-[#8C6D1F] mt-0.5">{p.gunasMatch} ({p.matchScore}% Milan)</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (onAcceptReceivedInterest) {
                          onAcceptReceivedInterest(p.id);
                        } else {
                          onToggleInterest(p.id);
                          onStartChat(p.id);
                        }
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Accept Interest</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecline(p.id, p.name)}
                      className="px-4 py-2 rounded-xl border-2 border-rose-500 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                      title="Decline Interest"
                    >
                      <X className="w-4 h-4 stroke-[2.8]" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Declined Requests Section with Undo / Reconsider */}
            {declinedProfiles.length > 0 && (
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Declined Requests ({declinedProfiles.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {declinedProfiles.map(dp => (
                    <div key={dp.id} className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between border border-slate-200">
                      <div className="flex items-center space-x-3 min-w-0 cursor-pointer" onClick={() => onSelectProfile(dp)}>
                        <img 
                          src={dp.photo} 
                          alt={dp.name} 
                          className="w-10 h-10 rounded-xl object-cover grayscale opacity-75 border border-slate-200" 
                        />
                        <div className="min-w-0">
                          <h5 className="font-serif font-bold text-xs text-slate-700 truncate">{dp.name}</h5>
                          <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                            <X className="w-3 h-3 stroke-[2.5]" /> Politely Declined
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUndoDecline(dp.id)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 text-[11px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                      >
                        Reconsider
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeSegment === 'shortlist' && (
          <>
            {shortlistedProfiles.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                Your shortlist is empty. Tap the heart icon on any card to save profiles here!
              </div>
            ) : (
              shortlistedProfiles.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-3.5 flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center space-x-3 min-w-0" onClick={() => onSelectProfile(p)}>
                    <img 
                      src={p.photo} 
                      alt={p.name} 
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (screenshotRestricted) triggerScreenshotBlock('right-click');
                      }}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-rose-200 select-none photo-protected" 
                    />
                    <div className="min-w-0">
                      <h4 className="font-serif font-bold text-sm text-slate-900 truncate">{p.name}</h4>
                      <p className="text-[11px] text-slate-500">{p.district || p.city}{p.state ? `, ${p.state}` : ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => onToggleInterest(p.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#D4AF37] text-[#0B192C] font-bold text-xs"
                    >
                      Connect
                    </button>
                    <button
                      onClick={() => onToggleShortlist(p.id)}
                      className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

    </div>
  );
}
