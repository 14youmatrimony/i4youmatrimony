import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Heart, 
  Check, 
  X, 
  MessageCircle, 
  ShieldCheck,
  Lock,
  Phone,
  Video,
  CheckCheck,
  Eye
} from 'lucide-react';
import { usePhotoPrivacy } from '../../context/PhotoPrivacyContext';
import { getTargetCandidateGender, isCandidateMatchingTarget, normalizeGender } from '../../utils/genderMatch';
import { getAppMode } from '../../config/appConfig';
import { interestService } from '../../services/interestService';

export default function MobileInterestsScreen({
  profiles = [],
  currentUser,
  onOpenLogin,
  interestsSent = [],
  acceptedInterests = [],
  onToggleInterest,
  shortlisted = [],
  onToggleShortlist,
  onSelectProfile,
  onStartChat,
  onStartAudioCall,
  onStartVideoCall,
  activeSegment: externalSegment,
  onSegmentChange,
  declinedReceivedIds = [],
  onDeclineReceivedInterest,
  onUndoDeclineReceivedInterest,
  onAcceptReceivedInterest,
  notifications = []
}) {
  const { triggerScreenshotBlock, screenshotRestricted } = usePhotoPrivacy();
  const [internalSegment, setInternalSegment] = useState('sent'); // 'sent' | 'received' | 'shortlist'
  const [localDeclinedIds, setLocalDeclinedIds] = useState([]);
  const [liveReceivedInterests, setLiveReceivedInterests] = useState([]);
  const [liveSentInterests, setLiveSentInterests] = useState([]);
  const [isLoadingReceived, setIsLoadingReceived] = useState(false);
  const [isLoadingSent, setIsLoadingSent] = useState(false);

  // Keep latest profiles available to async callbacks without triggering re-subscriptions
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;

  // Fetch received and sent interests on component mount and subscribe to real-time incoming events
  useEffect(() => {
    if (!currentUser) return;
    const userId = currentUser.id || currentUser.register_id || currentUser.registerId;
    console.log(`Fetching received interests for user: [${userId}]`);

    let isMounted = true;
    setIsLoadingReceived(true);

    interestService.getReceivedInterests(currentUser, profilesRef.current)
      .then((records) => {
        if (isMounted) {
          console.log(`Found [${records.length}] records for receiver`);
          setLiveReceivedInterests(records);
          setIsLoadingReceived(false);
        }
      })
      .catch((err) => {
        console.warn('[MobileInterestsScreen] Error fetching received interests:', err);
        if (isMounted) setIsLoadingReceived(false);
      });

    setIsLoadingSent(true);
    interestService.getSentInterests(currentUser, profilesRef.current)
      .then((records) => {
        if (isMounted) {
          console.log(`Found [${records.length}] records for sender`);
          setLiveSentInterests(records);
          setIsLoadingSent(false);
        }
      })
      .catch((err) => {
        console.warn('[MobileInterestsScreen] Error fetching sent interests:', err);
        if (isMounted) setIsLoadingSent(false);
      });

    // Real-time listener for incoming interest alerts with strict cleanup and state deduplication
    const unsub = interestService.subscribeToInterestInbox(currentUser, (payload) => {
      if (!isMounted || !payload) return;
      console.log('[MobileInterestsScreen] Real-time incoming interest event received:', payload);

      const incomingInterestId = payload.interest_id || payload.interestId || payload.id;
      const incomingSenderId = String(payload.senderId || payload.sender_id || payload.userAId || '');
      const incomingReceiverId = String(payload.receiverId || payload.receiver_id || payload.userBId || '');
      const currentIds = [currentUser.id, currentUser.register_id, currentUser.registerId].filter(Boolean).map(String);

      // STRICT TAB FILTERING:
      // If the incoming event was sent by currentUser, refresh Sent and DO NOT add to Received!
      if (incomingSenderId && currentIds.includes(incomingSenderId)) {
        interestService.getSentInterests(currentUser, profilesRef.current)
          .then((records) => {
            if (isMounted && Array.isArray(records)) setLiveSentInterests(records);
          })
          .catch(() => {});
        return;
      }

      // If incoming interest is not addressed to currentUser, reject from received!
      if (incomingReceiverId && !currentIds.includes(incomingReceiverId)) {
        return;
      }

      setLiveReceivedInterests((prev) => {
        const prevArr = Array.isArray(prev) ? prev : [];

        // Check if an interest with this interest_id or senderId already exists in the state array
        const exists = prevArr.some((r) => {
          const rIntId = r.interest_id || r.interestId || r.id;
          const rSenderId = r.senderId || r.sender_id;
          if (incomingInterestId && rIntId && String(incomingInterestId) === String(rIntId)) return true;
          if (incomingSenderId && rSenderId && String(incomingSenderId) === String(rSenderId)) return true;
          return false;
        });

        if (exists) {
          // Deduplicate: update matching record in place instead of appending a duplicate
          return prevArr.map((r) => {
            const rIntId = r.interest_id || r.interestId || r.id;
            const rSenderId = r.senderId || r.sender_id;
            if ((incomingInterestId && rIntId && String(incomingInterestId) === String(rIntId)) ||
                (incomingSenderId && rSenderId && String(incomingSenderId) === String(rSenderId))) {
              return { ...r, ...payload, status: payload.status || r.status };
            }
            return r;
          });
        }

        // New record: deduplicate before appending to state array
        const newRecord = {
          ...payload,
          id: incomingInterestId || `interest_${incomingSenderId}_${Date.now()}`,
          interest_id: incomingInterestId || `interest_${incomingSenderId}_${Date.now()}`,
          interestId: incomingInterestId || `interest_${incomingSenderId}_${Date.now()}`,
          senderId: incomingSenderId,
          sender_id: incomingSenderId,
          receiverId: incomingReceiverId,
          receiver_id: incomingReceiverId,
          status: payload.status || 'pending',
          created_at: payload.created_at || new Date().toISOString()
        };
        return [newRecord, ...prevArr];
      });

      // Background sync to ensure full profile enrichment from Supabase
      interestService.getReceivedInterests(currentUser, profilesRef.current).then((records) => {
        if (isMounted && Array.isArray(records)) {
          setLiveReceivedInterests(records);
        }
      }).catch(() => {});
    });

    return () => {
      isMounted = false;
      if (typeof unsub === 'function') {
        unsub();
      }
    };
  }, [currentUser?.id, currentUser?.register_id, currentUser?.registerId]);

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

  const isGenericPlaceholder = (name) => {
    if (!name || typeof name !== 'string') return true;
    const clean = name.trim().toLowerCase();
    return clean === '' || 
      clean === 'a member' || 
      clean === 'a verified member' || 
      clean === 'verified member' || 
      clean === 'member' || 
      clean === 'candidate' || 
      clean === 'a candidate' ||
      clean === 'verified candidate' ||
      clean === 'someone';
  };

  const targetCandidateGender = getTargetCandidateGender(currentUser);
  const isMaleUser = normalizeGender(currentUser?.gender) === 'male';
  // Strictly dynamic received candidate IDs from real user account only
  const initialReceivedCandidateIds = Array.isArray(currentUser?.receivedInterests)
    ? currentUser.receivedInterests
    : [];

  const isSelfProfile = (p) => {
    if (!p || !currentUser) return false;
    const uId = String(currentUser.id || '');
    const uReg = String(currentUser.register_id || currentUser.registerId || '');
    const pId = String(p.id || '');
    const pReg = String(p.register_id || p.registerId || '');
    if (uId && (pId === uId || pReg === uId)) return true;
    if (uReg && (pId === uReg || pReg === uReg)) return true;
    if (currentUser?.mobile && (p.mobile === currentUser.mobile || p.phone === currentUser.mobile)) return true;
    return false;
  };

  const oppositeGenderProfiles = profiles.filter(p => {
    if (isSelfProfile(p)) return false;
    return isCandidateMatchingTarget(p.gender, targetCandidateGender);
  });

  const isProfileInList = (p, list) => {
    if (!p || !Array.isArray(list)) return false;
    const ids = [p.id, p.registerId, p.register_id].filter(Boolean).map(String);
    const strList = list.map(String);
    return ids.some(id => strList.includes(id));
  };

  const sentProfiles = useMemo(() => {
    const list = [];
    const seen = new Set();
    const currentIds = currentUser ? [currentUser.id, currentUser.register_id, currentUser.registerId].filter(Boolean).map(String) : [];

    // Collect all candidate IDs where currentUser is sender_id
    const sentCandidateIds = new Set((Array.isArray(interestsSent) ? interestsSent : []).map(String));
    (liveSentInterests || []).forEach((rec) => {
      const sId = String(rec.sender_id || rec.senderId || '');
      const rId = String(rec.receiver_id || rec.receiverId || '');
      if (currentIds.includes(sId) && !currentIds.includes(rId) && rId) {
        sentCandidateIds.add(rId);
      }
    });

    (oppositeGenderProfiles || []).forEach(p => {
      if (!p) return;
      const pid = String(p.id || '');
      const regId = String(p.registerId || p.register_id || '');
      const isSent = (pid && sentCandidateIds.has(pid)) || (regId && sentCandidateIds.has(regId));
      if (!isSent) return;

      if (pid && seen.has(pid)) return;
      if (regId && seen.has(regId)) return;
      if (pid) seen.add(pid);
      if (regId) seen.add(regId);
      list.push(p);
    });
    return list;
  }, [oppositeGenderProfiles, interestsSent, liveSentInterests, currentUser]);

  const shortlistedProfiles = useMemo(() => {
    const list = [];
    const seen = new Set();
    (oppositeGenderProfiles || []).forEach(p => {
      if (!p || !isProfileInList(p, shortlisted)) return;
      const pid = String(p.id || '');
      const regId = String(p.registerId || p.register_id || '');
      if (pid && seen.has(pid)) return;
      if (regId && seen.has(regId)) return;
      if (pid) seen.add(pid);
      if (regId) seen.add(regId);
      list.push(p);
    });
    return list;
  }, [oppositeGenderProfiles, shortlisted]);

  // Build real received candidate profiles from live backend query & notifications
  const receivedProfiles = useMemo(() => {
    const list = [];
    const seenCandidateIds = new Set();
    const seenInterestIds = new Set();
    const currentIds = currentUser ? [currentUser.id, currentUser.register_id, currentUser.registerId].filter(Boolean).map(String) : [];

    // 1. Process live received interests from Supabase / interestService
    if (Array.isArray(liveReceivedInterests) && liveReceivedInterests.length > 0) {
      liveReceivedInterests.forEach((rec) => {
        if (!rec) return;
        const sid = String(rec.senderId || rec.sender_id || '');
        const rid = String(rec.receiverId || rec.receiver_id || '');
        const interestId = String(rec.interest_id || rec.interestId || rec.id || '');
        if (!sid || rec.status === 'rejected') return;

        // STRICT FILTER: Current user MUST NOT be the sender of a received interest!
        if (currentIds.includes(sid)) return;
        // STRICT FILTER: If receiverId is present, current user MUST be the receiver!
        if (rid && !currentIds.includes(rid)) return;
        if (isSelfProfile({ id: sid })) return;
        if (Array.isArray(effectiveDeclinedIds) && effectiveDeclinedIds.some(id => String(id) === sid)) return;

        // Deduplicate by interest_id
        if (interestId && !interestId.startsWith('loc_') && seenInterestIds.has(interestId)) {
          return;
        }

        // Deduplicate by candidate / sender ID
        if (seenCandidateIds.has(sid)) {
          return;
        }

        // Lookup profile in all profiles (strictly excluding currentUser!)
        const matching = profiles.find((p) =>
          !isSelfProfile(p) && (
            String(p.id) === sid ||
            (p.register_id && String(p.register_id) === sid) ||
            (p.registerId && String(p.registerId) === sid)
          )
        );

        // Data Mapping: Extract sender or interest_from details from API response
        const senderData = rec.sender || rec.interest_from;
        const defaultAvatar = isMaleUser 
          ? 'https://kzvdzospvgzlfkkptadl.supabase.co/storage/v1/object/public/avatars/profile_i4y1021_1791653762897.jpg'
          : 'https://kzvdzospvgzlfkkptadl.supabase.co/storage/v1/object/public/avatars/profile_i4y1020_1791653762896.jpg';

        const candidateName = (!isGenericPlaceholder(matching?.name) ? matching.name : null) ||
                              (!isGenericPlaceholder(senderData?.name) ? senderData.name : null) ||
                              (!isGenericPlaceholder(rec.sender_name) ? rec.sender_name : null) ||
                              (!isGenericPlaceholder(rec.senderName) ? rec.senderName : null) ||
                              (matching?.register_id ? `Member ${matching.register_id}` : null) ||
                              (sid ? `Member ${sid}` : 'Candidate');

        const base = matching || senderData || {
          id: sid,
          name: candidateName,
          photo: defaultAvatar,
          age: 26,
          city: 'India',
          gunasMatch: '28/36 Gunas',
          matchScore: 88
        };

        const item = {
          ...base,
          id: base.id || sid,
          name: candidateName,
          age: base.age || senderData?.age || 26,
          profession: base.profession || senderData?.profession || 'Professional',
          city: base.city || base.district || senderData?.location || senderData?.city || 'India',
          district: base.district || base.city || senderData?.district || '',
          state: base.state || senderData?.state || '',
          photo: base.photo || base.avatar || senderData?.photo || senderData?.avatar || defaultAvatar,
          interestMessage: rec.message || '',
          interestId: rec.interest_id || rec.interestId || rec.id,
          interest_id: rec.interest_id || rec.interestId || rec.id,
          interestStatus: rec.status || 'pending',
          interestCreatedAt: rec.created_at || rec.createdAt,
          activityType: 'interest',
          isContactView: false
        };

        seenCandidateIds.add(sid);
        if (base.id) seenCandidateIds.add(String(base.id));
        if (base.register_id) seenCandidateIds.add(String(base.register_id));
        if (base.registerId) seenCandidateIds.add(String(base.registerId));
        if (interestId) seenInterestIds.add(interestId);
        list.push(item);
      });
    }

    // 2. Process Notifications: In-App Interest Requests and Contact Views / Requests
    const relevantNotifs = (Array.isArray(notifications) ? notifications : []).filter(n => {
      if (!n) return false;
      const t = n.type || '';
      const isInterestNotif = t === 'interest_received' || t === 'interest';
      const isContactNotif = t === 'contact_viewed' || t === 'contact_view' || t === 'contact' || t === 'contact_request';
      if (!isInterestNotif && !isContactNotif) return false;

      const nSenderId = String(n.senderId || n.sender_id || n.profileId || n.sender?.id || '');
      const nRecipientId = String(n.recipient_id || n.recipientId || n.receiver_id || n.receiverId || '');
      const metaSenderId = String(n.metadata?.senderId || n.metadata?.sender_id || '');

      // STRICT RULES:
      // A) The logged-in user MUST NOT be the sender!
      if (currentIds.includes(nSenderId) || (metaSenderId && currentIds.includes(metaSenderId))) return false;
      // B) If recipient is specified, the logged-in user MUST be the recipient!
      if (nRecipientId && !currentIds.includes(nRecipientId)) return false;
      // C) Never include if candidate is in effectiveDeclinedIds
      if (effectiveDeclinedIds.some(id => String(id) === nSenderId)) return false;

      return true;
    });

    let localContactViews = [];
    try {
      const uIds = [currentUser?.id, currentUser?.register_id, currentUser?.registerId].filter(Boolean).map(String);
      uIds.forEach(uid => {
        const raw = localStorage.getItem(`i4u_contact_views_${uid}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) localContactViews.push(...parsed);
        }
      });
    } catch (e) {}

    const additionalItems = [
      ...relevantNotifs.map(n => ({
        ...n,
        senderId: n.profileId || n.senderId || n.sender_id || n.sender?.id,
        isContactView: n.type === 'contact_viewed' || n.type === 'contact_view' || n.type === 'contact' || n.type === 'contact_request',
        activityType: (n.type === 'contact_viewed' || n.type === 'contact_view' || n.type === 'contact' || n.type === 'contact_request') ? 'contact_view' : 'interest',
        message: n.message || n.text || (n.type === 'contact_viewed' ? 'Viewed your verified contact details and phone number' : '')
      })),
      ...localContactViews.map(cv => ({
        ...cv,
        senderId: cv.senderId || cv.sender_id || cv.viewerId,
        isContactView: true,
        activityType: 'contact_view',
        message: cv.message || 'Viewed your verified contact details and phone number'
      }))
    ];

    additionalItems.forEach(item => {
      if (!item) return;
      const sid = String(item.senderId || item.sender_id || '');
      if (!sid || currentIds.includes(sid) || isSelfProfile({ id: sid })) return;
      if (Array.isArray(effectiveDeclinedIds) && effectiveDeclinedIds.some(id => String(id) === sid)) return;
      if (seenCandidateIds.has(sid)) return;

      const matching = profiles.find((p) =>
        !isSelfProfile(p) && (
          String(p.id) === sid ||
          (p.register_id && String(p.register_id) === sid) ||
          (p.registerId && String(p.registerId) === sid)
        )
      );

      const senderData = item.sender || item.profile;
      const defaultAvatar = isMaleUser 
        ? 'https://kzvdzospvgzlfkkptadl.supabase.co/storage/v1/object/public/avatars/profile_i4y1021_1791653762897.jpg'
        : 'https://kzvdzospvgzlfkkptadl.supabase.co/storage/v1/object/public/avatars/profile_i4y1020_1791653762896.jpg';

      const candidateName = (!isGenericPlaceholder(matching?.name) ? matching.name : null) ||
                            (!isGenericPlaceholder(senderData?.name) ? senderData.name : null) ||
                            (!isGenericPlaceholder(item.sender_name) ? item.sender_name : null) ||
                            (!isGenericPlaceholder(item.senderName) ? item.senderName : null) ||
                            (matching?.register_id ? `Member ${matching.register_id}` : null) ||
                            (sid ? `Member ${sid}` : 'Candidate');

      const base = matching || senderData || {
        id: sid,
        name: candidateName,
        photo: defaultAvatar,
        age: 26,
        city: 'India',
        gunasMatch: '28/36 Gunas',
        matchScore: 88
      };

      const cardItem = {
        ...base,
        id: base.id || sid,
        name: candidateName,
        age: base.age || senderData?.age || 26,
        profession: base.profession || senderData?.profession || 'Professional',
        city: base.city || base.district || senderData?.location || senderData?.city || 'India',
        district: base.district || base.city || senderData?.district || '',
        state: base.state || senderData?.state || '',
        photo: base.photo || base.avatar || senderData?.photo || senderData?.avatar || defaultAvatar,
        interestMessage: item.message || '',
        interestId: item.id || `notif_${sid}`,
        interest_id: item.id || `notif_${sid}`,
        interestStatus: item.status || 'pending',
        interestCreatedAt: item.created_at || item.createdAt || item.timestamp,
        activityType: item.activityType || 'interest',
        isContactView: Boolean(item.isContactView)
      };

      seenCandidateIds.add(sid);
      if (base.id) seenCandidateIds.add(String(base.id));
      if (base.register_id) seenCandidateIds.add(String(base.register_id));
      if (base.registerId) seenCandidateIds.add(String(base.registerId));
      list.push(cardItem);
    });

    return list;
  }, [liveReceivedInterests, notifications, profiles, effectiveDeclinedIds, interestsSent, isMaleUser, currentUser]);

  const declinedProfiles = oppositeGenderProfiles.filter(p => effectiveDeclinedIds.includes(p.id));

  const handleDecline = (profileId, profileName) => {
    setLocalDeclinedIds(prev => (prev.includes(profileId) ? prev : [...prev, profileId]));
    setLiveReceivedInterests(prev => prev.filter(r => String(r.senderId || r.sender_id) !== String(profileId)));
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

  const handleAccept = (profileId) => {
    setLiveReceivedInterests(prev =>
      prev.map(r => String(r.senderId || r.sender_id) === String(profileId) ? { ...r, status: 'accepted' } : r)
    );
    if (onAcceptReceivedInterest) {
      onAcceptReceivedInterest(profileId);
    } else {
      onToggleInterest(profileId);
      onStartChat?.(profileId);
    }
  };

  // If user is not logged in, display the Login Required screen
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
              sentProfiles.map(p => {
                const isAccepted = Boolean(
                  isProfileInList(p, acceptedInterests) ||
                  p.interestStatus === 'accepted' ||
                  interestService.getRelationshipStatusSync(currentUser, p) === 'accepted'
                );

                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-3.5 flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center space-x-3 min-w-0 cursor-pointer" onClick={() => onSelectProfile(p)}>
                      <img 
                        src={p.photo || (String(p.gender).toLowerCase() === 'male' ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800')} 
                        alt={p.name} 
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        onError={(e) => {
                          const fallback = String(p.gender).toLowerCase() === 'male'
                            ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800'
                            : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800';
                          if (e.currentTarget.src !== fallback) {
                            e.currentTarget.src = fallback;
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (screenshotRestricted) triggerScreenshotBlock('right-click');
                        }}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-[#DFB76C] select-none photo-protected" 
                      />
                      <div className="min-w-0">
                        <h4 className="font-serif font-bold text-sm text-slate-900 truncate">{p.name}</h4>
                        <p className="text-[11px] text-slate-500">{p.profession}</p>
                        {isAccepted ? (
                          <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Accepted • Calls Unlocked ✨</span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Interest Sent • Pending Reply</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {isAccepted ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartAudioCall?.(p);
                            }}
                            className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 active:scale-95 transition-all shadow-xs cursor-pointer"
                            title="Start Audio Call"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartVideoCall?.(p);
                            }}
                            className="p-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 active:scale-95 transition-all shadow-xs cursor-pointer"
                            title="Start Video Call"
                          >
                            <Video className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartChat?.(p.id);
                            }}
                            className="p-2 rounded-xl bg-blue-50 text-[#1E3A8A] hover:bg-blue-100 border border-blue-200 active:scale-95 transition-all shadow-xs cursor-pointer"
                            title="Send Message"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartChat?.(p.id);
                            }}
                            className="p-2 rounded-xl bg-blue-50 text-[#1E3A8A] hover:bg-blue-100"
                            title="Message"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleInterest(p.id);
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 text-[10px] font-bold"
                          >
                            Withdraw
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {activeSegment === 'received' && (
          <>
            {isLoadingReceived && receivedProfiles.length === 0 ? (
              <div className="space-y-3">
                {[1, 2].map((k) => (
                  <div key={k} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 animate-pulse">
                    <div className="flex items-center space-x-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-1/2" />
                        <div className="h-3 bg-slate-100 rounded w-1/3" />
                        <div className="h-3 bg-slate-100 rounded w-1/4" />
                      </div>
                    </div>
                    <div className="flex space-x-2 pt-2 border-t border-slate-100">
                      <div className="flex-1 h-9 bg-slate-200 rounded-xl" />
                      <div className="w-24 h-9 bg-slate-100 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : receivedProfiles.length === 0 ? (
              <div className="py-14 px-6 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-[#DFB76C] mx-auto flex items-center justify-center">
                  <Heart className="w-7 h-7 stroke-[2]" />
                </div>
                <h4 className="font-serif font-bold text-base text-slate-900">No requests yet</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  When members review your profile and send connection requests, they will appear here for you to accept or decline.
                </p>
              </div>
            ) : (
              receivedProfiles.map(p => {
                const isAccepted = Boolean(
                  p.interestStatus === 'accepted' ||
                  isProfileInList(p, acceptedInterests) ||
                  interestService.getRelationshipStatusSync(currentUser, p) === 'accepted'
                );

                return (
                  <div key={p.id || p.interestId} className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-3 shadow-sm transition-all hover:border-amber-300">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectProfile(p)}>
                      <img 
                        src={p.photo || (String(p.gender).toLowerCase() === 'male' ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800')} 
                        alt={p.name} 
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                        onError={(e) => {
                          const fallback = String(p.gender).toLowerCase() === 'male'
                            ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800'
                            : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800';
                          if (e.currentTarget.src !== fallback) {
                            e.currentTarget.src = fallback;
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (screenshotRestricted) triggerScreenshotBlock('right-click');
                        }}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#DFB76C] select-none photo-protected" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="font-serif font-bold text-sm text-slate-900 truncate">{p.name}</h4>
                          {p.verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500">{p.age} yrs • {p.district || p.city}{p.state ? `, ${p.state}` : ''}</p>
                        <p className="text-[11px] text-slate-500 truncate">{p.profession || 'Professional'}{p.education ? ` • ${p.education}` : ''}</p>
                        <p className="text-[11px] font-bold text-[#8C6D1F] mt-0.5">{p.gunasMatch || '28/36 Gunas'} ({p.matchScore || 88}% Milan)</p>
                      </div>
                    </div>

                    {p.isContactView ? (
                      <div className="bg-blue-50/80 border border-blue-200/70 rounded-xl p-2.5 text-xs text-blue-950 flex items-center justify-between gap-1.5">
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-800">
                          <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Viewed your verified contact details</span>
                        </span>
                        <span className="text-[10px] text-blue-600 font-bold bg-blue-100/70 px-2 py-0.5 rounded-md">Contact View</span>
                      </div>
                    ) : p.interestMessage ? (
                      <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl p-2.5 text-xs text-amber-950 italic flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold not-italic text-sm leading-none">“</span>
                        <span className="flex-1 not-italic text-[11px] text-slate-700 leading-snug">{p.interestMessage}</span>
                        <span className="text-amber-500 font-bold not-italic text-sm leading-none">”</span>
                      </div>
                    ) : null}

                    {isAccepted ? (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                          <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Connected • Calls Unlocked ✨</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartAudioCall?.(p);
                            }}
                            className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                            title="Start Audio Call"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartVideoCall?.(p);
                            }}
                            className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                            title="Start Video Call"
                          >
                            <Video className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartChat?.(p.id);
                            }}
                            className="p-2 rounded-xl bg-blue-50 text-[#1E3A8A] hover:bg-blue-100 border border-blue-200 active:scale-95 transition-all shadow-xs cursor-pointer"
                            title="Message"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : p.isContactView ? (
                      <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => onToggleInterest(p.id)}
                          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-105 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          <Heart className="w-4 h-4 fill-white" />
                          <span>Send Interest</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onStartChat?.(p.id)}
                          className="py-2 px-3.5 rounded-xl bg-blue-50 text-[#1E3A8A] hover:bg-blue-100 border border-blue-200 active:scale-95 transition-all font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer"
                          title="Message"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Message</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleAccept(p.id)}
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
                    )}
                  </div>
                );
              })
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
                      src={p.photo || (String(p.gender).toLowerCase() === 'male' ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800')} 
                      alt={p.name} 
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      onError={(e) => {
                        const fallback = String(p.gender).toLowerCase() === 'male'
                          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800'
                          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800';
                        if (e.currentTarget.src !== fallback) {
                          e.currentTarget.src = fallback;
                        }
                      }}
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
