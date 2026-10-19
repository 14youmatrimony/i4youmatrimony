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
      const hasSent = idsB.some((id) => sentList.includes(id));

      const acceptedRaw = localStorage.getItem(`i4u_accepted_interests_${currentUid}`) || localStorage.getItem('i4u_accepted_interests');
      const acceptedList = acceptedRaw ? JSON.parse(acceptedRaw) : [];
      const hasAccepted = idsB.some((id) => acceptedList.includes(id));

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
      if (idsB.some((id) => declinedList.includes(id))) {
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
      if (idsB.some((id) => acceptedList.includes(id))) {
        if (pairKey) this.statusCache.set(pairKey, 'accepted');
        return 'accepted';
      }

      const sentRaw = localStorage.getItem(`i4u_interests_sent_${currentUid}`) || localStorage.getItem('i4u_interests_sent');
      const sentList = sentRaw ? JSON.parse(sentRaw) : [];
      if (idsB.some((id) => sentList.includes(id))) {
        if (pairKey) this.statusCache.set(pairKey, 'pending');
        return 'pending';
      }

      const declinedRaw = localStorage.getItem('i4u_declined_received_ids');
      const declinedList = declinedRaw ? JSON.parse(declinedRaw) : [];
      if (idsB.some((id) => declinedList.includes(id))) {
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
      senderId,
      receiverId,
      message,
      status: 'pending',
      updatedAt: new Date().toISOString()
    });
    this.saveLocalRecords(records);

    // Save to Supabase if table exists
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('interests').upsert([
          {
            sender_id: senderId,
            receiver_id: receiverId,
            status: 'pending',
            message,
            updated_at: new Date().toISOString()
          }
        ]);
      } catch (e) {}
    }

    // Broadcast update
    const updatePayload = {
      type: 'interest_status_change',
      payload: {
        userAId: senderId,
        userBId: receiverId,
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
      senderId,
      receiverId,
      status: 'accepted',
      updatedAt: new Date().toISOString()
    });
    this.saveLocalRecords(records);

    // Persist to user accepted list in localStorage
    try {
      const acceptedRaw = localStorage.getItem(`i4u_accepted_interests_${receiverId}`) || localStorage.getItem('i4u_accepted_interests');
      const list = acceptedRaw ? JSON.parse(acceptedRaw) : [];
      if (!list.includes(senderId)) list.push(senderId);
      localStorage.setItem(`i4u_accepted_interests_${receiverId}`, JSON.stringify(list));
      localStorage.setItem('i4u_accepted_interests', JSON.stringify(list));
    } catch (e) {}

    // Save to Supabase if table exists
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('interests').upsert([
          {
            sender_id: senderId,
            receiver_id: receiverId,
            status: 'accepted',
            updated_at: new Date().toISOString()
          }
        ]);
      } catch (e) {}
    }

    // Broadcast realtime event across tabs and channels
    const updatePayload = {
      type: 'interest_status_change',
      payload: {
        userAId: receiverId,
        userBId: senderId,
        status: 'accepted'
      }
    };
    if (this.crossTabChannel) {
      try { this.crossTabChannel.postMessage(updatePayload); } catch (e) {}
    }
    this.notifyListeners(updatePayload.payload);

    // Also broadcast on Supabase channel for cross-device updates
    if (isSupabaseConfigured() && supabase) {
      try {
        const syncChannel = supabase.channel(`user-call-inbox-${senderId}`);
        syncChannel.send({
          type: 'broadcast',
          event: 'interest-accepted',
          payload: {
            responderId: receiverId,
            status: 'accepted',
            timestamp: Date.now()
          }
        }).catch(() => {});
      } catch (e) {}
    }
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
      senderId,
      receiverId,
      status: 'rejected',
      updatedAt: new Date().toISOString()
    });
    this.saveLocalRecords(records);

    // Broadcast update
    const updatePayload = {
      type: 'interest_status_change',
      payload: {
        userAId: receiverId,
        userBId: senderId,
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
