/**
 * Interest & Connection Authorization Service for I 4 You Matrimonial Platform
 * 
 * Enforces mutual matrimonial interest verification:
 * Valid Relationship States: 'none' | 'pending' | 'accepted' | 'rejected'
 * 
 * Strict Calling Rule:
 * Audio/Video calling is PERMITTED ONLY IF interest status === 'accepted'
 */

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabase.js';
import {
  sendBackendInterest,
  respondBackendInterest
} from './api.js';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

class InterestService {
  constructor() {
    this.listeners = new Set();
    this.statusCache = new Map();
    this.crossTabChannel = null;

    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        this.crossTabChannel = new BroadcastChannel('i4u_interest_sync');
        this.crossTabChannel.onmessage = (event) => {
          const data = event.data;
          if (data && data.type === 'interest_status_change') {
            this.handleRealtimeStatusUpdate(data.payload);
          }
        };
      } catch (e) {
        console.warn('[InterestService] BroadcastChannel not supported:', e);
      }
    }
  }

  /**
   * Helper to extract all possible identifiers for a user
   */
  getUserIds(userOrId) {
    if (!userOrId) return [];
    if (typeof userOrId === 'string') return [userOrId];
    const ids = [];
    if (userOrId.id) ids.push(String(userOrId.id));
    if (userOrId.register_id && !ids.includes(String(userOrId.register_id))) {
      ids.push(String(userOrId.register_id));
    }
    if (userOrId.registerId && !ids.includes(String(userOrId.registerId))) {
      ids.push(String(userOrId.registerId));
    }
    return ids;
  }

  /**
   * Generates a canonical pair key for caching
   */
  getPairKey(userA, userB) {
    const idA = typeof userA === 'string' ? userA : (userA?.id || userA?.registerId || userA?.register_id);
    const idB = typeof userB === 'string' ? userB : (userB?.id || userB?.registerId || userB?.register_id);
    if (!idA || !idB) return null;
    return [String(idA), String(idB)].sort().join(':::');
  }

  /**
   * Subscribe to real-time interest status updates
   */
  onStatusChange(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners(update) {
    this.listeners.forEach((callback) => {
      try {
        callback(update);
      } catch (err) {
        console.warn('[InterestService] Listener error:', err);
      }
    });
  }

  handleRealtimeStatusUpdate(payload) {
    if (!payload) return;
    const { userAId, userBId, status } = payload;
    const pairKey = this.getPairKey(userAId, userBId);
    if (pairKey) {
      this.statusCache.set(pairKey, status);
    }
    this.notifyListeners(payload);
  }

  /**
   * Completely clears the in-memory relationship status cache.
   * Crucial when navigating between different member profiles or switching users
   * to eliminate data crossover and prevent stale authorization flags.
   */
  clearCache() {
    this.statusCache.clear();
    console.log('[InterestService] Status cache completely cleared');
  }

  /**
   * Clears cached status for a specific user pair.
   */
  clearPairCache(userA, userB) {
    const pairKey = this.getPairKey(userA, userB);
    if (pairKey) {
      this.statusCache.delete(pairKey);
      console.log(`[InterestService] Cleared status cache for pair: ${pairKey}`);
    }
  }

  /**
   * Read locally stored interest records
   */
  getLocalRecords() {
    try {
      const saved = localStorage.getItem('i4u_interests_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }

  /**
   * Save records to local storage
   */
  saveLocalRecords(records) {
    try {
      localStorage.setItem('i4u_interests_records', JSON.stringify(records));
    } catch (e) {}
  }

  /**
   * Checks the relationship status between two users
   * Returns: 'none' | 'pending' | 'accepted' | 'rejected'
   */
  async getRelationshipStatus(userA, userB) {
    if (!userA || !userB) return 'none';

    const idsA = this.getUserIds(userA);
    const idsB = this.getUserIds(userB);
    if (!idsA.length || !idsB.length) return 'none';

    const pairKey = this.getPairKey(userA, userB);
    if (pairKey && this.statusCache.has(pairKey)) {
      return this.statusCache.get(pairKey);
    }

    // 0. Check canonical accepted pairs in localStorage for instant connection resolution
    try {
      const acceptedPairsRaw = localStorage.getItem('i4u_accepted_pairs');
      if (acceptedPairsRaw) {
        const pairs = JSON.parse(acceptedPairsRaw);
        if (Array.isArray(pairs) && pairKey && pairs.includes(pairKey)) {
          this.statusCache.set(pairKey, 'accepted');
          return 'accepted';
        }
      }
    } catch (e) {}

    // 1. Check Supabase 'interests' table if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('interests')
          .select('sender_id, receiver_id, status')
          .or(`and(sender_id.in.(${idsA.map(id => `"${id}"`).join(',')}),receiver_id.in.(${idsB.map(id => `"${id}"`).join(',')})),and(sender_id.in.(${idsB.map(id => `"${id}"`).join(',')}),receiver_id.in.(${idsA.map(id => `"${id}"`).join(',')}))`)
          .limit(1);

        if (!error && data && data.length > 0) {
          const status = data[0].status || 'pending';
          if (pairKey) this.statusCache.set(pairKey, status);
          return status;
        }
      } catch (err) {
        // Table might not exist yet, fallback gracefully
      }
    }

    // 2. Check local records (bidirectional)
    const localRecords = this.getLocalRecords();
    const matchedRecord = localRecords.find((r) => {
      const match1 = idsA.includes(String(r.senderId)) && idsB.includes(String(r.receiverId));
      const match2 = idsB.includes(String(r.senderId)) && idsA.includes(String(r.receiverId));
      return match1 || match2;
    });

    if (matchedRecord) {
      const status = matchedRecord.status || 'pending';
      if (pairKey) this.statusCache.set(pairKey, status);
      return status;
    }

    // 3. Check localStorage interestsSent and accepted lists (bidirectional)
    try {
      const currentUid = idsA[0];
      const targetUid = idsB[0];

      // Check if either user has recorded acceptance of the other
      const acceptedRawA = localStorage.getItem(`i4u_accepted_interests_${currentUid}`) || localStorage.getItem('i4u_accepted_interests');
      const acceptedListA = acceptedRawA ? JSON.parse(acceptedRawA) : [];
      const hasAcceptedA = Array.isArray(idsB) && Array.isArray(acceptedListA) && idsB.some((id) => acceptedListA.includes(id));

      const acceptedRawB = targetUid ? localStorage.getItem(`i4u_accepted_interests_${targetUid}`) : null;
      const acceptedListB = acceptedRawB ? JSON.parse(acceptedRawB) : [];
      const hasAcceptedB = Array.isArray(idsA) && Array.isArray(acceptedListB) && idsA.some((id) => acceptedListB.includes(id));

      if (hasAcceptedA || hasAcceptedB) {
        if (pairKey) this.statusCache.set(pairKey, 'accepted');
        return 'accepted';
      }

      const sentRaw = localStorage.getItem(`i4u_interests_sent_${currentUid}`) || localStorage.getItem('i4u_interests_sent');
      const sentList = sentRaw ? JSON.parse(sentRaw) : [];
      const hasSent = Array.isArray(idsB) && Array.isArray(sentList) && idsB.some((id) => sentList.includes(id));

      // Also check if target user sent to current user (incoming pending request)
      const targetSentRaw = targetUid ? localStorage.getItem(`i4u_interests_sent_${targetUid}`) : null;
      const targetSentList = targetSentRaw ? JSON.parse(targetSentRaw) : [];
      const hasTargetSent = Array.isArray(idsA) && Array.isArray(targetSentList) && idsA.some((id) => targetSentList.includes(id));

      const receivedRaw = localStorage.getItem(`i4u_received_interests_${currentUid}`);
      const receivedList = receivedRaw ? JSON.parse(receivedRaw) : [];
      const hasReceived = Array.isArray(idsB) && Array.isArray(receivedList) && idsB.some((id) => receivedList.includes(id));

      if (hasSent || hasTargetSent || hasReceived) {
        if (pairKey) this.statusCache.set(pairKey, 'pending');
        return 'pending';
      }

      const declinedRaw = localStorage.getItem('i4u_declined_received_ids');
      const declinedList = declinedRaw ? JSON.parse(declinedRaw) : [];
      if (Array.isArray(idsB) && Array.isArray(declinedList) && idsB.some((id) => declinedList.includes(id))) {
        if (pairKey) this.statusCache.set(pairKey, 'rejected');
        return 'rejected';
      }
    } catch (e) {}

    if (pairKey) this.statusCache.set(pairKey, 'none');
    return 'none';
  }

  /**
   * Synchronous check against local memory/cache for immediate UI rendering
   */
  getRelationshipStatusSync(userA, userB) {
    if (!userA || !userB) return 'none';

    const idsA = this.getUserIds(userA);
    const idsB = this.getUserIds(userB);
    if (!idsA.length || !idsB.length) return 'none';

    const pairKey = this.getPairKey(userA, userB);
    if (pairKey && this.statusCache.has(pairKey)) {
      return this.statusCache.get(pairKey);
    }

    // 0. Check canonical accepted pairs
    try {
      const acceptedPairsRaw = localStorage.getItem('i4u_accepted_pairs');
      if (acceptedPairsRaw) {
        const pairs = JSON.parse(acceptedPairsRaw);
        if (Array.isArray(pairs) && pairKey && pairs.includes(pairKey)) {
          this.statusCache.set(pairKey, 'accepted');
          return 'accepted';
        }
      }
    } catch (e) {}

    // Check local records
    const localRecords = this.getLocalRecords();
    const matchedRecord = localRecords.find((r) => {
      const match1 = idsA.includes(String(r.senderId)) && idsB.includes(String(r.receiverId));
      const match2 = idsB.includes(String(r.senderId)) && idsA.includes(String(r.receiverId));
      return match1 || match2;
    });

    if (matchedRecord) {
      const status = matchedRecord.status || 'pending';
      if (pairKey) this.statusCache.set(pairKey, status);
      return status;
    }

    try {
      const currentUid = idsA[0];
      const targetUid = idsB[0];
      const acceptedRawA = localStorage.getItem(`i4u_accepted_interests_${currentUid}`) || localStorage.getItem('i4u_accepted_interests');
      const acceptedListA = acceptedRawA ? JSON.parse(acceptedRawA) : [];
      const hasAcceptedA = Array.isArray(idsB) && Array.isArray(acceptedListA) && idsB.some((id) => acceptedListA.includes(id));

      const acceptedRawB = targetUid ? localStorage.getItem(`i4u_accepted_interests_${targetUid}`) : null;
      const acceptedListB = acceptedRawB ? JSON.parse(acceptedRawB) : [];
      const hasAcceptedB = Array.isArray(idsA) && Array.isArray(acceptedListB) && idsA.some((id) => acceptedListB.includes(id));

      if (hasAcceptedA || hasAcceptedB) {
        if (pairKey) this.statusCache.set(pairKey, 'accepted');
        return 'accepted';
      }

      const sentRaw = localStorage.getItem(`i4u_interests_sent_${currentUid}`) || localStorage.getItem('i4u_interests_sent');
      const sentList = sentRaw ? JSON.parse(sentRaw) : [];
      if (Array.isArray(idsB) && Array.isArray(sentList) && idsB.some((id) => sentList.includes(id))) {
        if (pairKey) this.statusCache.set(pairKey, 'pending');
        return 'pending';
      }

      const receivedRaw = localStorage.getItem(`i4u_received_interests_${currentUid}`);
      const receivedList = receivedRaw ? JSON.parse(receivedRaw) : [];
      if (Array.isArray(idsB) && Array.isArray(receivedList) && idsB.some((id) => receivedList.includes(id))) {
        if (pairKey) this.statusCache.set(pairKey, 'pending');
        return 'pending';
      }

      const declinedRaw = localStorage.getItem('i4u_declined_received_ids');
      const declinedList = declinedRaw ? JSON.parse(declinedRaw) : [];
      if (Array.isArray(idsB) && Array.isArray(declinedList) && idsB.some((id) => declinedList.includes(id))) {
        if (pairKey) this.statusCache.set(pairKey, 'rejected');
        return 'rejected';
      }
    } catch (e) {}

    return 'none';
  }

  /**
   * Resolves detailed directionality and connection state between userA (current user) and userB (target profile)
   * Returns: { status: 'none'|'pending'|'accepted'|'rejected', isAccepted, isPending, isIncoming, isOutgoing, isRejected, isNone }
   */
  getRelationshipDetailsSync(userA, userB) {
    if (!userA || !userB) {
      return { status: 'none', isAccepted: false, isPending: false, isIncoming: false, isOutgoing: false, isRejected: false, isNone: true };
    }

    const idsA = this.getUserIds(userA);
    const idsB = this.getUserIds(userB);
    if (!idsA.length || !idsB.length) {
      return { status: 'none', isAccepted: false, isPending: false, isIncoming: false, isOutgoing: false, isRejected: false, isNone: true };
    }

    const currentStatus = this.getRelationshipStatusSync(userA, userB);
    if (currentStatus === 'accepted') {
      return {
        status: 'accepted',
        isAccepted: true,
        isCallingUnlocked: true,
        isPending: false,
        isIncoming: false,
        isOutgoing: false,
        isRejected: false,
        isNone: false
      };
    }

    if (currentStatus === 'rejected') {
      return {
        status: 'rejected',
        isAccepted: false,
        isCallingUnlocked: false,
        isPending: false,
        isIncoming: false,
        isOutgoing: false,
        isRejected: true,
        isNone: false
      };
    }

    // Determine pending direction: Did userA send to userB (outgoing) or userB send to userA (incoming)?
    const localRecords = this.getLocalRecords();
    const matchedRecord = localRecords.find((r) => {
      const match1 = idsA.includes(String(r.senderId)) && idsB.includes(String(r.receiverId));
      const match2 = idsB.includes(String(r.senderId)) && idsA.includes(String(r.receiverId));
      return match1 || match2;
    });

    if (matchedRecord && matchedRecord.status === 'pending') {
      const isOutgoing = idsA.includes(String(matchedRecord.senderId));
      const isIncoming = idsA.includes(String(matchedRecord.receiverId));
      return {
        status: 'pending',
        isAccepted: false,
        isCallingUnlocked: false,
        isPending: true,
        isIncoming,
        isOutgoing,
        isRejected: false,
        isNone: false
      };
    }

    try {
      const currentUid = idsA[0];
      const receivedRaw = localStorage.getItem(`i4u_received_interests_${currentUid}`);
      const receivedList = receivedRaw ? JSON.parse(receivedRaw) : [];
      if (Array.isArray(idsB) && Array.isArray(receivedList) && idsB.some((id) => receivedList.includes(id))) {
        return {
          status: 'pending',
          isAccepted: false,
          isCallingUnlocked: false,
          isPending: true,
          isIncoming: true,
          isOutgoing: false,
          isRejected: false,
          isNone: false
        };
      }

      const sentRaw = localStorage.getItem(`i4u_interests_sent_${currentUid}`) || localStorage.getItem('i4u_interests_sent');
      const sentList = sentRaw ? JSON.parse(sentRaw) : [];
      if (Array.isArray(idsB) && Array.isArray(sentList) && idsB.some((id) => sentList.includes(id))) {
        return {
          status: 'pending',
          isAccepted: false,
          isCallingUnlocked: false,
          isPending: true,
          isIncoming: false,
          isOutgoing: true,
          isRejected: false,
          isNone: false
        };
      }
    } catch (e) {}

    return {
      status: currentStatus,
      isAccepted: currentStatus === 'accepted',
      isCallingUnlocked: currentStatus === 'accepted',
      isPending: currentStatus === 'pending',
      isIncoming: false,
      isOutgoing: currentStatus === 'pending',
      isRejected: currentStatus === 'rejected',
      isNone: currentStatus === 'none'
    };
  }

  /**
   * Verify if calling is permitted between caller and callee.
   * Returns: { authorized: boolean, status: string, reason: string }
   */
  async verifyCallAuthorization(caller, callee) {
    if (!caller || !callee) {
      return {
        authorized: false,
        status: 'none',
        reason: 'Authentication required. Please sign in to make a call.'
      };
    }

    const status = await this.getRelationshipStatus(caller, callee);

    if (status === 'accepted') {
      return {
        authorized: true,
        status: 'accepted',
        reason: 'Interest is accepted. Call is authorized.'
      };
    }

    if (status === 'pending') {
      return {
        authorized: false,
        status: 'pending',
        reason: 'Interest is pending acceptance. Calling will be unlocked once they accept your interest.'
      };
    }

    if (status === 'rejected') {
      return {
        authorized: false,
        status: 'rejected',
        reason: 'Interest was not accepted. Calling is unavailable.'
      };
    }

    return {
      authorized: false,
      status: 'none',
      reason: 'Please send an Interest first. Calling is unlocked once accepted.'
    };
  }

  /**
   * Fetches incoming interests received by a user.
   * JOINs sender profile data so the receiver can immediately review candidate details.
   * Emits the exact required console logs:
   * "Fetching received interests for user: [userId]"
   * "Found [count] records for receiver"
   */
  async getReceivedInterests(userOrId, allProfiles = []) {
    if (!userOrId) return [];

    const receiverIds = this.getUserIds(userOrId);
    if (!receiverIds.length) return [];

    const userId = receiverIds[0];
    console.log(`Fetching received interests for user: [${userId}]`);

    let rawRecords = [];

    // 1. Query Supabase 'interests' table
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('interests')
          .select('*')
          .in('receiver_id', receiverIds)
          .order('updated_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          rawRecords = data;
        } else if (error) {
          console.warn('[InterestService] Supabase interests query notice:', error.message);
        }
      } catch (err) {
        console.warn('[InterestService] Supabase query error:', err);
      }
    }

    // 2. Merge local records for offline / cross-tab fallback
    const localRecords = this.getLocalRecords().filter((r) =>
      receiverIds.includes(String(r.receiverId))
    );

    localRecords.forEach((localRec) => {
      const exists = Array.isArray(rawRecords) && rawRecords.some(
        (r) => r && String(r.sender_id || r.senderId) === String(localRec.senderId)
      );
      if (!exists) {
        rawRecords.push({
          id: localRec.id,
          sender_id: localRec.senderId,
          receiver_id: localRec.receiverId,
          status: localRec.status || 'pending',
          message: localRec.message || '',
          created_at: localRec.createdAt || localRec.updatedAt || new Date().toISOString(),
          updated_at: localRec.updatedAt || new Date().toISOString()
        });
      }
    });

    // 3. Check localStorage receiver cache
    try {
      const storedReceived = localStorage.getItem(`i4u_received_interests_${userId}`);
      if (storedReceived) {
        const parsed = JSON.parse(storedReceived);
        if (Array.isArray(parsed)) {
          parsed.forEach((pId) => {
            const exists = Array.isArray(rawRecords) && rawRecords.some(
              (r) => r && String(r.sender_id || r.senderId) === String(pId)
            );
            if (!exists) {
              rawRecords.push({
                id: `loc_${pId}`,
                sender_id: pId,
                receiver_id: userId,
                status: 'pending',
                message: 'Expressed interest in connecting with you.',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          });
        }
      }
    } catch (e) {}

    // 4. Map & JOIN sender profile details
    const profilesMap = new Map();
    const missingSenderIds = [];

    if (Array.isArray(allProfiles)) {
      allProfiles.forEach((p) => {
        if (!p) return;
        if (p.id) profilesMap.set(String(p.id), p);
        if (p.register_id) profilesMap.set(String(p.register_id), p);
        if (p.registerId) profilesMap.set(String(p.registerId), p);
      });
    }

    rawRecords.forEach((rec) => {
      const sid = String(rec.sender_id || rec.senderId);
      if (sid && !profilesMap.has(sid) && !missingSenderIds.includes(sid)) {
        missingSenderIds.push(sid);
      }
    });

    // Fetch missing profiles from Supabase if needed
    if (missingSenderIds.length > 0 && isSupabaseConfigured() && supabase) {
      try {
        const { data: dbProfiles } = await supabase
          .from('profiles')
          .select('id, register_id, name, age, gender, height, photo, city, district, state, profession, education, verified, aadhaar_verified')
          .or(`id.in.(${missingSenderIds.map((id) => `"${id}"`).join(',')}),register_id.in.(${missingSenderIds.map((id) => `"${id}"`).join(',')})`);

        if (Array.isArray(dbProfiles)) {
          dbProfiles.forEach((p) => {
            if (p?.id) profilesMap.set(String(p.id), p);
            if (p?.register_id) profilesMap.set(String(p.register_id), p);
          });
        }
      } catch (e) {}
    }

    // Default fallback avatar
    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';

    const enriched = rawRecords.map((rec, index) => {
      const senderId = String(rec.sender_id || rec.senderId);
      const receiverId = String(rec.receiver_id || rec.receiverId);
      let senderProfile = profilesMap.get(senderId);

      // If not in profilesMap directly, try searching allProfiles flexibly
      if (!senderProfile && Array.isArray(allProfiles) && allProfiles.length > 0) {
        senderProfile = allProfiles.find(p => p && (
          String(p.id) === senderId || 
          (p.register_id && String(p.register_id) === senderId) || 
          (p.registerId && String(p.registerId) === senderId)
        ));
      }

      // If still not found in pool, check if rec already carries authentic sender details
      if (!senderProfile && (rec.sender || rec.interest_from)) {
        senderProfile = rec.sender || rec.interest_from;
      }

      const isBadName = (n) => !n || ['verified member', 'a verified member', 'member'].includes(String(n).toLowerCase().trim());
      const sName = !isBadName(senderProfile?.name)
        ? senderProfile.name
        : (!isBadName(rec.sender_name || rec.senderName) ? (rec.sender_name || rec.senderName) : 'Candidate');

      const sPhoto = senderProfile?.photo || senderProfile?.photo_url || rec.sender_photo || defaultAvatar;
      const sAge = senderProfile?.age || rec.sender_age || 26;
      const sProf = senderProfile?.profession || rec.sender_profession || 'Professional';
      const sLoc = senderProfile?.district || senderProfile?.city || rec.sender_location || 'Kerala';
      const sVer = Boolean(senderProfile?.verified || senderProfile?.aadhaar_verified);

      const senderObject = {
        id: senderProfile?.id || senderId,
        register_id: senderProfile?.register_id || senderProfile?.registerId || senderId,
        name: sName,
        photo: sPhoto,
        age: sAge,
        gender: senderProfile?.gender || 'Candidate',
        height: senderProfile?.height || "5'5\"",
        city: sLoc,
        district: senderProfile?.district || sLoc,
        state: senderProfile?.state || 'Kerala',
        location: sLoc,
        profession: sProf,
        education: senderProfile?.education || 'Graduate',
        verified: sVer,
        aadhaarVerified: sVer,
        matchScore: senderProfile?.matchScore || 88,
        gunasMatch: senderProfile?.gunasMatch || '28/36 Gunas'
      };

      const notifUniqueId = rec.notification_id || `interest_${rec.id || senderId}_${receiverId}`;

      return {
        id: notifUniqueId,
        notification_id: notifUniqueId,
        sender_id: senderId,
        receiver_id: receiverId,
        senderId,
        receiverId,
        sender_name: sName,
        sender_photo: sPhoto,
        sender_age: sAge,
        sender_profession: sProf,
        sender_location: sLoc,
        status: rec.status || 'pending',
        message: rec.message || `Expressed matrimonial interest in connecting with you.`,
        created_at: rec.created_at || rec.createdAt || new Date().toISOString(),
        updated_at: rec.updated_at || rec.updatedAt || new Date().toISOString(),
        sender: senderObject,
        profile: senderObject
      };
    });

    console.log(`Found [${enriched.length}] records for receiver`);
    return enriched;
  }

  /**
   * Subscribe to real-time incoming interest notifications for a user (receiver or sender)
   */
  subscribeToInterestInbox(userOrId, onNewInterest) {
    if (!userOrId || !onNewInterest) return () => {};

    const targetUserIds = this.getUserIds(userOrId);
    if (!targetUserIds.length) return () => {};

    const channels = [];

    if (isSupabaseConfigured() && supabase) {
      targetUserIds.forEach((targetId) => {
        try {
          const chn = supabase.channel(`user-interest-inbox-${targetId}`, {
            config: { broadcast: { self: false } }
          });

          chn
            .on('broadcast', { event: 'interest-received' }, ({ payload }) => {
              if (payload) {
                console.log('[InterestService] Real-time interest received:', payload);
                onNewInterest({ ...payload, event: 'interest-received', status: payload.status || 'pending' });
              }
            })
            .on('broadcast', { event: 'interest-accepted' }, ({ payload }) => {
              if (payload) {
                console.log('[InterestService] Real-time interest accepted:', payload);
                this.handleRealtimeStatusUpdate(payload);
                onNewInterest({ ...payload, event: 'interest-accepted', status: 'accepted' });
              }
            })
            .on('broadcast', { event: 'interest-rejected' }, ({ payload }) => {
              if (payload) {
                console.log('[InterestService] Real-time interest rejected:', payload);
                this.handleRealtimeStatusUpdate(payload);
                onNewInterest({ ...payload, event: 'interest-rejected', status: 'rejected' });
              }
            })
            .subscribe();

          channels.push(chn);
        } catch (e) {
          console.warn('[InterestService] Channel subscription error:', e);
        }

        try {
          const callChn = supabase.channel(`user-call-inbox-${targetId}`, {
            config: { broadcast: { self: false } }
          });

          callChn
            .on('broadcast', { event: 'interest-accepted' }, ({ payload }) => {
              if (payload) {
                console.log('[InterestService] Real-time call inbox interest-accepted:', payload);
                this.handleRealtimeStatusUpdate(payload);
                onNewInterest({ ...payload, event: 'interest-accepted', status: 'accepted' });
              }
            })
            .subscribe();

          channels.push(callChn);
        } catch (e) {}

        // Listen directly to Supabase Postgres row mutations for 100% reliable cross-device sync
        try {
          const dbChangeChn = supabase
            .channel(`user-interests-db-${targetId}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'interests' },
              (payload) => {
                const row = payload?.new;
                if (!row) return;
                const sId = String(row.sender_id || '');
                const rId = String(row.receiver_id || '');
                if (targetUserIds.includes(sId) || targetUserIds.includes(rId)) {
                  console.log('[InterestService] Real-time postgres_changes event on interests:', row.status, sId, rId);
                  const isAccepted = row.status === 'accepted';
                  const partnerId = targetUserIds.includes(sId) ? rId : sId;
                  const updatePayload = {
                    event: isAccepted ? 'interest-accepted' : 'interest_status_change',
                    status: row.status,
                    userAId: sId,
                    userBId: rId,
                    senderId: sId,
                    receiverId: rId,
                    responderId: rId,
                    partnerId: partnerId,
                    timestamp: Date.now()
                  };
                  this.handleRealtimeStatusUpdate(updatePayload);
                  if (onNewInterest) onNewInterest(updatePayload);
                }
              }
            )
            .subscribe();

          channels.push(dbChangeChn);
        } catch (e) {}
      });
    }

    // Direct window event listener for instant single-page sync
    const handleWindowEvt = (e) => {
      if (!e?.detail) return;
      const update = e.detail;
      const ids = [
        update.userAId,
        update.userBId,
        update.senderId,
        update.receiverId,
        update.responderId,
        update.partnerId
      ].filter(Boolean).map(String);

      if (targetUserIds.some(id => ids.includes(String(id)))) {
        onNewInterest(update);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('i4u_interest_status_change', handleWindowEvt);
    }

    // Also listen to local status change events (in-memory + cross-tab)
    const unsubLocal = this.onStatusChange((update) => {
      if (!update) return;
      const ids = [
        update.userAId,
        update.userBId,
        update.senderId,
        update.receiverId,
        update.responderId,
        update.partnerId
      ].filter(Boolean).map(String);

      if (targetUserIds.some(id => ids.includes(String(id)))) {
        onNewInterest(update);
      }
    });

    return () => {
      unsubLocal();
      if (typeof window !== 'undefined') {
        window.removeEventListener('i4u_interest_status_change', handleWindowEvt);
      }
      if (supabase && channels.length > 0) {
        channels.forEach((chn) => {
          try { supabase.removeChannel(chn); } catch (e) {}
        });
      }
    };
  }

  /**
   * Records interest sent (status: 'pending')
   */
  async sendInterest(sender, receiver, message = '') {
    const senderId = typeof sender === 'string' ? sender : (sender?.id || sender?.registerId || sender?.register_id);
    const receiverId = typeof receiver === 'string' ? receiver : (receiver?.id || receiver?.registerId || receiver?.register_id);
    if (!senderId || !receiverId) return;

    const pairKey = this.getPairKey(sender, receiver);
    if (pairKey) this.statusCache.set(pairKey, 'pending');

    // Update local records
    const records = this.getLocalRecords().filter((r) => {
      const match1 = String(r.senderId) === String(senderId) && String(r.receiverId) === String(receiverId);
      const match2 = String(r.senderId) === String(receiverId) && String(r.receiverId) === String(senderId);
      return !match1 && !match2;
    });

    records.push({
      id: `int_${Date.now()}`,
      senderId: String(senderId),
      receiverId: String(receiverId),
      message: message || '',
      status: 'pending',
      updatedAt: new Date().toISOString()
    });
    this.saveLocalRecords(records);

    // Save to recipient's local storage cache for instant offline visibility
    try {
      const recCacheKey = `i4u_received_interests_${receiverId}`;
      const recList = JSON.parse(localStorage.getItem(recCacheKey) || '[]');
      if (!recList.includes(String(senderId))) {
        recList.push(String(senderId));
        localStorage.setItem(recCacheKey, JSON.stringify(recList));
      }
    } catch (e) {}

    // Save to Supabase 'interests' and 'notifications' table
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: existingRows } = await supabase
          .from('interests')
          .select('id, sender_id, receiver_id, status')
          .or(`and(sender_id.eq."${senderId}",receiver_id.eq."${receiverId}"),and(sender_id.eq."${receiverId}",receiver_id.eq."${senderId}")`)
          .limit(1);

        if (existingRows && existingRows.length > 0) {
          const { error: updErr } = await supabase
            .from('interests')
            .update({
              sender_id: String(senderId),
              receiver_id: String(receiverId),
              status: 'pending',
              message: message || '',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRows[0].id);
          if (updErr) console.warn('[InterestService] Supabase interests update notice:', updErr.message);
        } else {
          const { error: insErr } = await supabase
            .from('interests')
            .insert([
              {
                id: generateUUID(),
                sender_id: String(senderId),
                receiver_id: String(receiverId),
                status: 'pending',
                message: message || '',
                updated_at: new Date().toISOString()
              }
            ]);
          if (insErr) console.warn('[InterestService] Supabase interests insert notice:', insErr.message);
        }
      } catch (e) {
        console.warn('[InterestService] Supabase interests sync notice:', e);
      }

      // Synchronize with secure backend (FastAPI / PostgreSQL)
      sendBackendInterest({ receiver_id: String(receiverId), message: message || '' }).catch(() => {});

      // Record in notifications table
      try {
        const senderObj = typeof sender === 'object' ? sender : null;
        const senderName = (senderObj?.name && senderObj.name.toLowerCase() !== 'verified member') ? senderObj.name : 'Candidate';
        const senderPhoto = senderObj?.photo || senderObj?.photo_url || null;
        const senderAge = senderObj?.age || null;
        const senderProfession = senderObj?.profession || null;
        const senderCity = senderObj?.city || senderObj?.district || null;

        await supabase.from('notifications').insert([
          {
            id: generateUUID(),
            recipient_id: String(receiverId),
            recipient_register_id: receiver?.register_id || receiver?.registerId || null,
            type: 'interest_received',
            title: `New Matrimonial Interest from ${senderName}`,
            message: message || `${senderName} reviewed your profile on I 4 You and expressed interest in connecting.`,
            metadata: {
              senderId: String(senderId),
              senderName,
              senderPhoto,
              senderAge,
              senderProfession,
              senderCity,
              sender: senderObj ? {
                id: String(senderId),
                name: senderName,
                photo: senderPhoto,
                age: senderAge,
                profession: senderProfession,
                city: senderCity,
                verified: Boolean(senderObj.verified || senderObj.aadhaar_verified)
              } : null,
              message: message || ''
            },
            is_read: false,
            created_at: new Date().toISOString()
          }
        ]);
      } catch (notifErr) {
        console.warn('[InterestService] Supabase notification insert notice:', notifErr);
      }

      // Broadcast on Supabase realtime channels to recipient
      const targetIds = [
        receiverId,
        receiver?.register_id,
        receiver?.registerId
      ].filter(Boolean);

      targetIds.forEach((tid) => {
        try {
          const chn = supabase.channel(`user-interest-inbox-${tid}`);
          chn.subscribe((chnStatus) => {
            if (chnStatus === 'SUBSCRIBED') {
              const senderObj = typeof sender === 'object' ? sender : null;
              const senderDisplayName = (senderObj?.name && senderObj.name.toLowerCase() !== 'verified member') ? senderObj.name : 'Candidate';
              chn.send({
                type: 'broadcast',
                event: 'interest-received',
                payload: {
                  senderId: String(senderId),
                  receiverId: String(receiverId),
                  status: 'pending',
                  message: message || '',
                  senderName: senderDisplayName,
                  senderPhoto: senderObj?.photo || senderObj?.photo_url || null,
                  senderAge: senderObj?.age || null,
                  senderProfession: senderObj?.profession || null,
                  senderCity: senderObj?.city || senderObj?.district || null,
                  sender: senderObj ? {
                    id: String(senderId),
                    name: senderObj.name,
                    photo: senderObj.photo || senderObj.photo_url || null,
                    age: senderObj.age,
                    profession: senderObj.profession,
                    city: senderObj.city || senderObj.district,
                    verified: Boolean(senderObj.verified || senderObj.aadhaar_verified)
                  } : null,
                  timestamp: Date.now()
                }
              }).catch(() => {});
              setTimeout(() => {
                try { supabase.removeChannel(chn); } catch (e) {}
              }, 3000);
            }
          });
        } catch (e) {}
      });
    }

    // Broadcast update across tabs
    const updatePayload = {
      type: 'interest_status_change',
      payload: {
        userAId: String(senderId),
        userBId: String(receiverId),
        status: 'pending'
      }
    };
    if (this.crossTabChannel) {
      try { this.crossTabChannel.postMessage(updatePayload); } catch (e) {}
    }
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('i4u_interest_status_change', { detail: updatePayload.payload }));
      } catch (e) {}
    }
    this.notifyListeners(updatePayload.payload);
  }

  /**
   * Records interest accepted (status: 'accepted')
   * Single-request connection flow: Connection is fully established for BOTH users immediately.
   * Neither user is required to send a return request.
   */
  async acceptInterest(receiver, sender) {
    const receiverId = typeof receiver === 'string' ? receiver : (receiver?.id || receiver?.registerId || receiver?.register_id);
    const senderId = typeof sender === 'string' ? sender : (sender?.id || sender?.registerId || sender?.register_id);
    if (!receiverId || !senderId) return;

    const pairKey = this.getPairKey(receiver, sender);
    if (pairKey) this.statusCache.set(pairKey, 'accepted');

    // 1. Update local records (bidirectional)
    const records = this.getLocalRecords().filter((r) => {
      const match1 = String(r.senderId) === String(senderId) && String(r.receiverId) === String(receiverId);
      const match2 = String(r.senderId) === String(receiverId) && String(r.receiverId) === String(senderId);
      return !match1 && !match2;
    });

    records.push({
      id: `int_${Date.now()}`,
      senderId: String(senderId),
      receiverId: String(receiverId),
      status: 'accepted',
      updatedAt: new Date().toISOString()
    });
    this.saveLocalRecords(records);

    // 2. Persist to BOTH receiver and sender accepted lists in localStorage & canonical accepted pairs
    try {
      // Add sender to receiver's accepted list
      const acceptedRawRec = localStorage.getItem(`i4u_accepted_interests_${receiverId}`) || localStorage.getItem('i4u_accepted_interests');
      const listRec = acceptedRawRec ? JSON.parse(acceptedRawRec) : [];
      if (!listRec.includes(String(senderId))) listRec.push(String(senderId));
      localStorage.setItem(`i4u_accepted_interests_${receiverId}`, JSON.stringify(listRec));
      localStorage.setItem('i4u_accepted_interests', JSON.stringify(listRec));

      // Also add receiver to sender's accepted list (so sender session/cache sees accepted instantly)
      const acceptedRawSend = localStorage.getItem(`i4u_accepted_interests_${senderId}`);
      const listSend = acceptedRawSend ? JSON.parse(acceptedRawSend) : [];
      if (!listSend.includes(String(receiverId))) listSend.push(String(receiverId));
      localStorage.setItem(`i4u_accepted_interests_${senderId}`, JSON.stringify(listSend));

      // Canonical accepted pairs store
      const pairsRaw = localStorage.getItem('i4u_accepted_pairs') || '[]';
      const pairs = JSON.parse(pairsRaw);
      if (pairKey && !pairs.includes(pairKey)) {
        pairs.push(pairKey);
        localStorage.setItem('i4u_accepted_pairs', JSON.stringify(pairs));
      }
    } catch (e) {}

    const receiverName = typeof receiver === 'object' ? (receiver.name || 'Candidate') : 'Candidate';
    const receiverPhoto = typeof receiver === 'object' ? (receiver.photo || receiver.photo_url || null) : null;
    const senderName = typeof sender === 'object' ? (sender.name || 'Candidate') : 'Candidate';

    // 3. Save to Supabase 'interests' and 'notifications' table
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: existingRows } = await supabase
          .from('interests')
          .select('id, sender_id, receiver_id, status')
          .or(`and(sender_id.eq."${senderId}",receiver_id.eq."${receiverId}"),and(sender_id.eq."${receiverId}",receiver_id.eq."${senderId}")`)
          .limit(1);

        if (existingRows && existingRows.length > 0) {
          const { error: updErr } = await supabase
            .from('interests')
            .update({
              status: 'accepted',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRows[0].id);
          if (updErr) console.warn('[InterestService] Supabase interests accept update notice:', updErr.message);
        } else {
          const { error: insErr } = await supabase
            .from('interests')
            .insert([
              {
                id: generateUUID(),
                sender_id: String(senderId),
                receiver_id: String(receiverId),
                status: 'accepted',
                updated_at: new Date().toISOString()
              }
            ]);
          if (insErr) console.warn('[InterestService] Supabase interests accept insert notice:', insErr.message);
        }
      } catch (e) {
        console.warn('[InterestService] Supabase interests accept notice:', e);
      }

      // Synchronize with backend API
      respondBackendInterest({ sender_id: String(senderId), action: 'accept' }).catch(() => {});

      // Insert notification for original sender
      try {
        await supabase.from('notifications').insert([
          {
            id: generateUUID(),
            recipient_id: String(senderId),
            recipient_register_id: sender?.register_id || sender?.registerId || null,
            type: 'interest_accepted',
            title: `Interest Accepted by ${receiverName}! 🎉`,
            message: `${receiverName} accepted your interest! Voice and video calling is now unlocked.`,
            metadata: {
              responderId: String(receiverId),
              responderName: receiverName,
              responderPhoto: receiverPhoto,
              status: 'accepted'
            },
            is_read: false,
            created_at: new Date().toISOString()
          }
        ]);
      } catch (e) {}

      // Broadcast on Supabase channels for ALL target identifiers of both sender and receiver
      const senderTargetIds = [senderId, sender?.register_id, sender?.registerId].filter(Boolean);
      const receiverTargetIds = [receiverId, receiver?.register_id, receiver?.registerId].filter(Boolean);

      const acceptBroadcastPayload = {
        event: 'interest-accepted',
        status: 'accepted',
        userAId: String(receiverId),
        userBId: String(senderId),
        senderId: String(senderId),
        receiverId: String(receiverId),
        responderId: String(receiverId),
        responderName: receiverName,
        responderPhoto: receiverPhoto,
        partnerId: String(receiverId),
        timestamp: Date.now()
      };

      // Broadcast to original sender
      senderTargetIds.forEach((sid) => {
        try {
          const syncChannel = supabase.channel(`user-call-inbox-${sid}`);
          syncChannel.subscribe((chnStatus) => {
            if (chnStatus === 'SUBSCRIBED') {
              syncChannel.send({
                type: 'broadcast',
                event: 'interest-accepted',
                payload: acceptBroadcastPayload
              }).catch(() => {});
              setTimeout(() => { try { supabase.removeChannel(syncChannel); } catch (e) {} }, 4000);
            }
          });

          const intChannel = supabase.channel(`user-interest-inbox-${sid}`);
          intChannel.subscribe((chnStatus) => {
            if (chnStatus === 'SUBSCRIBED') {
              intChannel.send({
                type: 'broadcast',
                event: 'interest-accepted',
                payload: acceptBroadcastPayload
              }).catch(() => {});
              setTimeout(() => { try { supabase.removeChannel(intChannel); } catch (e) {} }, 4000);
            }
          });
        } catch (e) {}
      });

      // Also broadcast to receiver channels (for multi-tab / multi-device sync)
      receiverTargetIds.forEach((rid) => {
        try {
          const syncChannel = supabase.channel(`user-call-inbox-${rid}`);
          syncChannel.subscribe((chnStatus) => {
            if (chnStatus === 'SUBSCRIBED') {
              syncChannel.send({
                type: 'broadcast',
                event: 'interest-accepted',
                payload: acceptBroadcastPayload
              }).catch(() => {});
              setTimeout(() => { try { supabase.removeChannel(syncChannel); } catch (e) {} }, 4000);
            }
          });

          const intChannel = supabase.channel(`user-interest-inbox-${rid}`);
          intChannel.subscribe((chnStatus) => {
            if (chnStatus === 'SUBSCRIBED') {
              intChannel.send({
                type: 'broadcast',
                event: 'interest-accepted',
                payload: acceptBroadcastPayload
              }).catch(() => {});
              setTimeout(() => { try { supabase.removeChannel(intChannel); } catch (e) {} }, 4000);
            }
          });
        } catch (e) {}
      });
    }

    // 4. Broadcast realtime event across tabs and channels
    const updatePayload = {
      type: 'interest_status_change',
      payload: {
        event: 'interest-accepted',
        userAId: String(receiverId),
        userBId: String(senderId),
        senderId: String(senderId),
        receiverId: String(receiverId),
        responderId: String(receiverId),
        partnerId: String(receiverId),
        status: 'accepted',
        timestamp: Date.now()
      }
    };
    if (this.crossTabChannel) {
      try { this.crossTabChannel.postMessage(updatePayload); } catch (e) {}
    }
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('i4u_interest_status_change', { detail: updatePayload.payload }));
      } catch (e) {}
    }
    this.notifyListeners(updatePayload.payload);
  }

  /**
   * Records interest rejected (status: 'rejected')
   */
  async rejectInterest(receiver, sender) {
    const receiverId = typeof receiver === 'string' ? receiver : (receiver?.id || receiver?.registerId || receiver?.register_id);
    const senderId = typeof sender === 'string' ? sender : (sender?.id || sender?.registerId || sender?.register_id);
    if (!receiverId || !senderId) return;

    const pairKey = this.getPairKey(receiver, sender);
    if (pairKey) this.statusCache.set(pairKey, 'rejected');

    // Update local records
    const records = this.getLocalRecords().filter((r) => {
      const match1 = String(r.senderId) === String(senderId) && String(r.receiverId) === String(receiverId);
      const match2 = String(r.senderId) === String(receiverId) && String(r.receiverId) === String(senderId);
      return !match1 && !match2;
    });

    records.push({
      id: `int_${Date.now()}`,
      senderId: String(senderId),
      receiverId: String(receiverId),
      status: 'rejected',
      updatedAt: new Date().toISOString()
    });
    this.saveLocalRecords(records);

    // Update Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: existingRows } = await supabase
          .from('interests')
          .select('id, sender_id, receiver_id, status')
          .or(`and(sender_id.eq."${senderId}",receiver_id.eq."${receiverId}"),and(sender_id.eq."${receiverId}",receiver_id.eq."${senderId}")`)
          .limit(1);

        if (existingRows && existingRows.length > 0) {
          await supabase
            .from('interests')
            .update({
              status: 'rejected',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRows[0].id);
        } else {
          await supabase
            .from('interests')
            .insert([
              {
                id: generateUUID(),
                sender_id: String(senderId),
                receiver_id: String(receiverId),
                status: 'rejected',
                updated_at: new Date().toISOString()
              }
            ]);
        }
      } catch (e) {}

      // Synchronize with secure backend (FastAPI / PostgreSQL)
      respondBackendInterest({ sender_id: String(senderId), action: 'reject' }).catch(() => {});
    }

    // Broadcast update
    const updatePayload = {
      type: 'interest_status_change',
      payload: {
        event: 'interest-rejected',
        userAId: String(receiverId),
        userBId: String(senderId),
        senderId: String(senderId),
        receiverId: String(receiverId),
        responderId: String(receiverId),
        status: 'rejected',
        timestamp: Date.now()
      }
    };
    if (this.crossTabChannel) {
      try { this.crossTabChannel.postMessage(updatePayload); } catch (e) {}
    }
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('i4u_interest_status_change', { detail: updatePayload.payload }));
      } catch (e) {}
    }
    this.notifyListeners(updatePayload.payload);
  }
}

export const interestService = new InterestService();
export default interestService;

/**
 * React Hook to observe real-time matrimonial interest relationship status
 * between the currentUser and a target candidate profile.
 * 
 * Returns: { status, isAccepted, isCallingUnlocked, isPending, isIncoming, isOutgoing, isRejected, isNone, loading }
 */
export function useInterestStatus(currentUser, targetProfile) {
  const [details, setDetails] = useState(() => interestService.getRelationshipDetailsSync(currentUser, targetProfile));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Fetch initial status from DB / storage
    interestService.getRelationshipStatus(currentUser, targetProfile).then((newStatus) => {
      if (isMounted) {
        const updated = interestService.getRelationshipDetailsSync(currentUser, targetProfile);
        setDetails({ ...updated, status: newStatus, isAccepted: newStatus === 'accepted', isCallingUnlocked: newStatus === 'accepted' });
        setLoading(false);
      }
    });

    // Subscribe to live status changes (local + cross-tab + supabase)
    const unsubscribe = interestService.onStatusChange((update) => {
      if (!isMounted || !update) return;
      const idsA = interestService.getUserIds(currentUser);
      const idsB = interestService.getUserIds(targetProfile);

      const updateIds = [
        update.userAId,
        update.userBId,
        update.senderId,
        update.receiverId,
        update.responderId,
        update.partnerId
      ].filter(Boolean).map(String);

      const match =
        idsA.some(id => updateIds.includes(String(id))) &&
        idsB.some(id => updateIds.includes(String(id)));

      if (match) {
        const fresh = interestService.getRelationshipDetailsSync(currentUser, targetProfile);
        const nextStatus = update.status || fresh.status;
        setDetails({
          ...fresh,
          status: nextStatus,
          isAccepted: nextStatus === 'accepted',
          isCallingUnlocked: nextStatus === 'accepted',
          isPending: nextStatus === 'pending',
          isRejected: nextStatus === 'rejected',
          isNone: nextStatus === 'none'
        });
      }
    });

    // Window storage listener for instant cross-tab sync
    const handleStorage = (e) => {
      if (e.key === 'i4u_accepted_pairs' || e.key === 'i4u_interests_records' || e.key?.startsWith('i4u_accepted_interests')) {
        if (isMounted) {
          const fresh = interestService.getRelationshipDetailsSync(currentUser, targetProfile);
          setDetails(fresh);
        }
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    // Direct window event listener for instant single-page sync
    const handleCustomStatus = (e) => {
      if (!isMounted || !e?.detail) return;
      const update = e.detail;
      const idsA = interestService.getUserIds(currentUser);
      const idsB = interestService.getUserIds(targetProfile);
      const updateIds = [
        update.userAId,
        update.userBId,
        update.senderId,
        update.receiverId,
        update.responderId,
        update.partnerId
      ].filter(Boolean).map(String);

      const match =
        idsA.some(id => updateIds.includes(String(id))) &&
        idsB.some(id => updateIds.includes(String(id)));

      if (match) {
        const nextStatus = update.status || 'accepted';
        const fresh = interestService.getRelationshipDetailsSync(currentUser, targetProfile);
        setDetails({
          ...fresh,
          status: nextStatus,
          isAccepted: nextStatus === 'accepted',
          isCallingUnlocked: nextStatus === 'accepted',
          isPending: nextStatus === 'pending',
          isRejected: nextStatus === 'rejected',
          isNone: nextStatus === 'none'
        });
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('i4u_interest_status_change', handleCustomStatus);
    }

    // Live Supabase postgres_changes listener directly on the active candidate pair
    let pairRealtimeChannel = null;
    if (isSupabaseConfigured() && supabase && currentUser && targetProfile) {
      const idsA = interestService.getUserIds(currentUser);
      const idsB = interestService.getUserIds(targetProfile);
      const chnName = `pair-interest-${idsA[0] || 'u'}-${idsB[0] || 'p'}`;
      try {
        pairRealtimeChannel = supabase
          .channel(chnName)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'interests' },
            (payload) => {
              const row = payload?.new;
              if (!row) return;
              const sId = String(row.sender_id || '');
              const rId = String(row.receiver_id || '');
              const matchesPair =
                (idsA.includes(sId) && idsB.includes(rId)) ||
                (idsA.includes(rId) && idsB.includes(sId));
              if (matchesPair && isMounted) {
                console.log('[useInterestStatus] Live postgres_changes update for pair:', row.status);
                const isAcc = row.status === 'accepted';
                const fresh = interestService.getRelationshipDetailsSync(currentUser, targetProfile);
                setDetails({
                  ...fresh,
                  status: row.status,
                  isAccepted: isAcc,
                  isCallingUnlocked: isAcc,
                  isPending: row.status === 'pending',
                  isRejected: row.status === 'rejected',
                  isNone: row.status === 'none'
                });
              }
            }
          )
          .subscribe();
      } catch (e) {}
    }

    // App foreground / tab focus refresh
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && isMounted) {
        interestService.getRelationshipStatus(currentUser, targetProfile).then((st) => {
          if (isMounted) {
            const fresh = interestService.getRelationshipDetailsSync(currentUser, targetProfile);
            setDetails({
              ...fresh,
              status: st,
              isAccepted: st === 'accepted',
              isCallingUnlocked: st === 'accepted'
            });
          }
        });
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      isMounted = false;
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('i4u_interest_status_change', handleCustomStatus);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      if (pairRealtimeChannel && supabase) {
        try { supabase.removeChannel(pairRealtimeChannel); } catch (e) {}
      }
    };
  }, [
    currentUser?.id,
    currentUser?.registerId,
    currentUser?.register_id,
    targetProfile?.id,
    targetProfile?.registerId,
    targetProfile?.register_id
  ]);

  return {
    status: details.status, // 'none' | 'pending' | 'accepted' | 'rejected'
    isAccepted: details.isAccepted,
    isCallingUnlocked: details.isAccepted,
    isPending: details.isPending,
    isIncoming: details.isIncoming,
    isOutgoing: details.isOutgoing,
    isRejected: details.isRejected,
    isNone: details.isNone,
    loading
  };
}
