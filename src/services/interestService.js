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

    // 2. Check local records
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

    // 3. Check localStorage interestsSent and received
    try {
      const currentUid = idsA[0];
      const targetUid = idsB[0];
      const sentRaw = localStorage.getItem(`i4u_interests_sent_${currentUid}`) || localStorage.getItem('i4u_interests_sent');
      const sentList = sentRaw ? JSON.parse(sentRaw) : [];
      const hasSent = Array.isArray(idsB) && Array.isArray(sentList) && idsB.some((id) => sentList.includes(id));

      const acceptedRaw = localStorage.getItem(`i4u_accepted_interests_${currentUid}`) || localStorage.getItem('i4u_accepted_interests');
      const acceptedList = acceptedRaw ? JSON.parse(acceptedRaw) : [];
      const hasAccepted = Array.isArray(idsB) && Array.isArray(acceptedList) && idsB.some((id) => acceptedList.includes(id));

      if (hasAccepted) {
        if (pairKey) this.statusCache.set(pairKey, 'accepted');
        return 'accepted';
      }

      if (hasSent) {
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
      const acceptedRaw = localStorage.getItem(`i4u_accepted_interests_${currentUid}`) || localStorage.getItem('i4u_accepted_interests');
      const acceptedList = acceptedRaw ? JSON.parse(acceptedRaw) : [];
      if (Array.isArray(idsB) && Array.isArray(acceptedList) && idsB.some((id) => acceptedList.includes(id))) {
        if (pairKey) this.statusCache.set(pairKey, 'accepted');
        return 'accepted';
      }

      const sentRaw = localStorage.getItem(`i4u_interests_sent_${currentUid}`) || localStorage.getItem('i4u_interests_sent');
      const sentList = sentRaw ? JSON.parse(sentRaw) : [];
      if (Array.isArray(idsB) && Array.isArray(sentList) && idsB.some((id) => sentList.includes(id))) {
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

      const sName = (senderProfile?.name && senderProfile.name.toLowerCase() !== 'verified member')
        ? senderProfile.name
        : (rec.sender_name || rec.senderName || 'Candidate');

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
   * Subscribe to real-time incoming interest notifications for a receiver
   */
  subscribeToInterestInbox(userOrId, onNewInterest) {
    if (!userOrId || !onNewInterest) return () => {};

    const receiverIds = this.getUserIds(userOrId);
    if (!receiverIds.length) return () => {};

    const channels = [];

    if (isSupabaseConfigured() && supabase) {
      receiverIds.forEach((targetId) => {
        try {
          const chn = supabase.channel(`user-interest-inbox-${targetId}`, {
            config: { broadcast: { self: false } }
          });

          chn
            .on('broadcast', { event: 'interest-received' }, ({ payload }) => {
              if (payload) {
                console.log('[InterestService] Real-time interest received:', payload);
                onNewInterest(payload);
              }
            })
            .on('broadcast', { event: 'interest-accepted' }, ({ payload }) => {
              if (payload) {
                console.log('[InterestService] Real-time interest accepted:', payload);
                this.handleRealtimeStatusUpdate(payload);
                onNewInterest(payload);
              }
            })
            .on('broadcast', { event: 'interest-rejected' }, ({ payload }) => {
              if (payload) {
                console.log('[InterestService] Real-time interest rejected:', payload);
                this.handleRealtimeStatusUpdate(payload);
                onNewInterest(payload);
              }
            })
            .subscribe();

          channels.push(chn);
        } catch (e) {
          console.warn('[InterestService] Channel subscription error:', e);
        }
      });
    }

    // Also listen to local status change events
    const unsubLocal = this.onStatusChange((update) => {
      if (update && receiverIds.includes(String(update.userBId))) {
        onNewInterest(update);
      }
    });

    return () => {
      unsubLocal();
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
        await supabase.from('interests').upsert([
          {
            sender_id: String(senderId),
            receiver_id: String(receiverId),
            status: 'pending',
            message: message || '',
            updated_at: new Date().toISOString()
          }
        ]);
      } catch (e) {
        console.warn('[InterestService] Supabase interests upsert notice:', e);
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
    this.notifyListeners(updatePayload.payload);
  }

  /**
   * Records interest accepted (status: 'accepted')
   */
  async acceptInterest(receiver, sender) {
    const receiverId = typeof receiver === 'string' ? receiver : (receiver?.id || receiver?.registerId || receiver?.register_id);
    const senderId = typeof sender === 'string' ? sender : (sender?.id || sender?.registerId || sender?.register_id);
    if (!receiverId || !senderId) return;

    const pairKey = this.getPairKey(receiver, sender);
    if (pairKey) this.statusCache.set(pairKey, 'accepted');

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
      status: 'accepted',
      updatedAt: new Date().toISOString()
    });
    this.saveLocalRecords(records);

    // Persist to user accepted list in localStorage
    try {
      const acceptedRaw = localStorage.getItem(`i4u_accepted_interests_${receiverId}`) || localStorage.getItem('i4u_accepted_interests');
      const list = acceptedRaw ? JSON.parse(acceptedRaw) : [];
      if (!list.includes(String(senderId))) list.push(String(senderId));
      localStorage.setItem(`i4u_accepted_interests_${receiverId}`, JSON.stringify(list));
      localStorage.setItem('i4u_accepted_interests', JSON.stringify(list));
    } catch (e) {}

    // Save to Supabase 'interests' table
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('interests').upsert([
          {
            sender_id: String(senderId),
            receiver_id: String(receiverId),
            status: 'accepted',
            updated_at: new Date().toISOString()
          }
        ]);
      } catch (e) {}

      // Synchronize with secure backend (FastAPI / PostgreSQL)
      respondBackendInterest({ sender_id: String(senderId), action: 'accept' }).catch(() => {});

      // Insert notification for original sender
      try {
        const receiverName = typeof receiver === 'object' ? receiver.name : 'A Candidate';
        await supabase.from('notifications').insert([
          {
            recipient_id: String(senderId),
            recipient_register_id: sender?.register_id || sender?.registerId || null,
            type: 'interest_accepted',
            title: `Interest Accepted by ${receiverName}! 🎉`,
            message: `${receiverName} accepted your interest! Voice and video calling is now unlocked.`,
            metadata: {
              responderId: String(receiverId),
              responderName: receiverName
            },
            is_read: false,
            created_at: new Date().toISOString()
          }
        ]);
      } catch (e) {}

      // Broadcast on Supabase channels
      const targetIds = [senderId, sender?.register_id, sender?.registerId].filter(Boolean);
      targetIds.forEach((sid) => {
        try {
          const syncChannel = supabase.channel(`user-call-inbox-${sid}`);
          syncChannel.subscribe((chnStatus) => {
            if (chnStatus === 'SUBSCRIBED') {
              syncChannel.send({
                type: 'broadcast',
                event: 'interest-accepted',
                payload: {
                  responderId: String(receiverId),
                  status: 'accepted',
                  timestamp: Date.now()
                }
              }).catch(() => {});
              setTimeout(() => { try { supabase.removeChannel(syncChannel); } catch (e) {} }, 3000);
            }
          });

          const intChannel = supabase.channel(`user-interest-inbox-${sid}`);
          intChannel.subscribe((chnStatus) => {
            if (chnStatus === 'SUBSCRIBED') {
              intChannel.send({
                type: 'broadcast',
                event: 'interest-accepted',
                payload: {
                  userAId: String(receiverId),
                  userBId: String(senderId),
                  status: 'accepted',
                  timestamp: Date.now()
                }
              }).catch(() => {});
              setTimeout(() => { try { supabase.removeChannel(intChannel); } catch (e) {} }, 3000);
            }
          });
        } catch (e) {}
      });
    }

    // Broadcast realtime event across tabs and channels
    const updatePayload = {
      type: 'interest_status_change',
      payload: {
        userAId: String(receiverId),
        userBId: String(senderId),
        status: 'accepted'
      }
    };
    if (this.crossTabChannel) {
      try { this.crossTabChannel.postMessage(updatePayload); } catch (e) {}
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
        await supabase.from('interests').upsert([
          {
            sender_id: String(senderId),
            receiver_id: String(receiverId),
            status: 'rejected',
            updated_at: new Date().toISOString()
          }
        ]);
      } catch (e) {}

      // Synchronize with secure backend (FastAPI / PostgreSQL)
      respondBackendInterest({ sender_id: String(senderId), action: 'reject' }).catch(() => {});
    }

    // Broadcast update
    const updatePayload = {
      type: 'interest_status_change',
      payload: {
        userAId: String(receiverId),
        userBId: String(senderId),
        status: 'rejected'
      }
    };
    if (this.crossTabChannel) {
      try { this.crossTabChannel.postMessage(updatePayload); } catch (e) {}
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
 * Returns: { status, isAccepted, isPending, isRejected, isNone, loading }
 */
export function useInterestStatus(currentUser, targetProfile) {
  const [status, setStatus] = useState(() => interestService.getRelationshipStatusSync(currentUser, targetProfile));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Fetch initial status from DB / storage
    interestService.getRelationshipStatus(currentUser, targetProfile).then((newStatus) => {
      if (isMounted) {
        setStatus(newStatus);
        setLoading(false);
      }
    });

    // Subscribe to live status changes (local + cross-tab)
    const unsubscribe = interestService.onStatusChange((update) => {
      if (!isMounted || !update) return;
      const idsA = interestService.getUserIds(currentUser);
      const idsB = interestService.getUserIds(targetProfile);

      const match =
        (idsA.includes(String(update.userAId)) && idsB.includes(String(update.userBId))) ||
        (idsB.includes(String(update.userAId)) && idsA.includes(String(update.userBId)));

      if (match) {
        setStatus(update.status);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
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
    status, // 'none' | 'pending' | 'accepted' | 'rejected'
    isAccepted: status === 'accepted',
    isPending: status === 'pending',
    isRejected: status === 'rejected',
    isNone: status === 'none',
    loading
  };
}
