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
  respondBackendInterest,
  fetchBackendReceivedInterests,
  fetchBackendSentInterests
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
    const ids = new Set();
    const extractFromObj = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (obj.id) ids.add(String(obj.id));
      if (obj.register_id) ids.add(String(obj.register_id));
      if (obj.registerId) ids.add(String(obj.registerId));
      if (obj.user_id) ids.add(String(obj.user_id));
      if (obj.userId) ids.add(String(obj.userId));
    };

    if (typeof userOrId === 'string') {
      const clean = userOrId.trim();
      if (clean) ids.add(clean);
    } else if (typeof userOrId === 'object') {
      extractFromObj(userOrId);
    }

    if (typeof window !== 'undefined') {
      try {
        // Cross-match with current authenticated user
        const authRaw = localStorage.getItem('i4u_auth_user');
        if (authRaw) {
          const auth = JSON.parse(authRaw);
          const currentMatches = Array.from(ids).some(
            id => id === String(auth.id) || id === String(auth.register_id) || id === String(auth.registerId)
          );
          if (currentMatches) {
            extractFromObj(auth);
          }
        }

        // Cross-match with cached profiles list to resolve UUID <-> register_id
        const profilesRaw = localStorage.getItem('i4u_cached_profiles');
        if (profilesRaw) {
          const profiles = JSON.parse(profilesRaw);
          if (Array.isArray(profiles)) {
            const matched = profiles.find(p => p && (
              Array.from(ids).some(id => 
                id === String(p.id) || 
                id === String(p.register_id) || 
                id === String(p.registerId) ||
                id === String(p.user_id)
              )
            ));
            if (matched) {
              extractFromObj(matched);
            }
          }
        }
      } catch (e) {}
    }

    return Array.from(ids).filter(Boolean);
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
   * Generates all possible canonical pair keys across all identifier aliases
   */
  getAllPairKeys(userA, userB) {
    const idsA = this.getUserIds(userA);
    const idsB = this.getUserIds(userB);
    const keys = [];
    idsA.forEach((a) => {
      idsB.forEach((b) => {
        if (a && b) {
          keys.push([String(a), String(b)].sort().join(':::'));
        }
      });
    });
    return Array.from(new Set(keys));
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

  /**
   * Atomically mark a pair as accepted in in-memory cache and localStorage
   * Unlocks Audio & Video calling instantly for both participants
   */
  markPairAcceptedLocally(userA, userB) {
    if (!userA || !userB) return;
    const idsA = this.getUserIds(userA);
    const idsB = this.getUserIds(userB);
    const allKeys = this.getAllPairKeys(userA, userB);

    allKeys.forEach((key) => {
      this.statusCache.set(key, 'accepted');
    });

    if (typeof window !== 'undefined') {
      try {
        const pairsRaw = localStorage.getItem('i4u_accepted_pairs') || '[]';
        const pairs = JSON.parse(pairsRaw);
        allKeys.forEach((pk) => {
          if (pk && !pairs.includes(pk)) pairs.push(pk);
        });
        localStorage.setItem('i4u_accepted_pairs', JSON.stringify(pairs));
      } catch (e) {}

      try {
        idsA.forEach((uidA) => {
          const key = `i4u_accepted_interests_${uidA}`;
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          idsB.forEach((uidB) => {
            if (!list.includes(String(uidB))) list.push(String(uidB));
          });
          localStorage.setItem(key, JSON.stringify(list));
        });

        idsB.forEach((uidB) => {
          const key = `i4u_accepted_interests_${uidB}`;
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          idsA.forEach((uidA) => {
            if (!list.includes(String(uidA))) list.push(String(uidA));
          });
          localStorage.setItem(key, JSON.stringify(list));
        });

        const globalKey = 'i4u_accepted_interests';
        const globalList = JSON.parse(localStorage.getItem(globalKey) || '[]');
        [...idsA, ...idsB].forEach((id) => {
          if (!globalList.includes(String(id))) globalList.push(String(id));
        });
        localStorage.setItem(globalKey, JSON.stringify(globalList));
      } catch (e) {}

      try {
        const records = this.getLocalRecords();
        let changed = false;
        records.forEach((r) => {
          const m1 = idsA.includes(String(r.senderId)) && idsB.includes(String(r.receiverId));
          const m2 = idsB.includes(String(r.senderId)) && idsA.includes(String(r.receiverId));
          if (m1 || m2) {
            r.status = 'accepted';
            r.updatedAt = new Date().toISOString();
            changed = true;
          }
        });
        if (changed) {
          this.saveLocalRecords(records);
        }
      } catch (e) {}
    }
  }

  handleRealtimeStatusUpdate(payload) {
    if (!payload) return;
    const { userAId, userBId, status, senderId, receiverId } = payload;
    const idA = userAId || senderId;
    const idB = userBId || receiverId;

    if (idA && idB) {
      const allKeys = this.getAllPairKeys(idA, idB);
      allKeys.forEach((key) => {
        this.statusCache.set(key, status);
      });

      if (status === 'accepted') {
        this.markPairAcceptedLocally(idA, idB);
      }
    }

    this.notifyListeners(payload);

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('i4u_interest_status_change', { detail: payload }));
      } catch (e) {}
    }
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
   * Fetches all accepted connections for a user from Supabase 'interests' table
   * Ensures calling features are immediately unlocked for both participants.
   * Returns: Promise<string[]> (array of partner identifiers)
   */
  async fetchAcceptedConnections(userOrId) {
    if (!userOrId) return [];
    const userIds = this.getUserIds(userOrId);
    if (!userIds.length) return [];

    const partnerIdsSet = new Set();

    // 1. Query Supabase 'interests' table
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: asSender, error: errSender } = await supabase
          .from('interests')
          .select('receiver_id, status, updated_at')
          .in('sender_id', userIds)
          .eq('status', 'accepted');

        if (!errSender && Array.isArray(asSender)) {
          asSender.forEach((row) => {
            if (row.receiver_id && !userIds.includes(String(row.receiver_id))) {
              partnerIdsSet.add(String(row.receiver_id));
            }
          });
        }

        const { data: asReceiver, error: errReceiver } = await supabase
          .from('interests')
          .select('sender_id, status, updated_at')
          .in('receiver_id', userIds)
          .eq('status', 'accepted');

        if (!errReceiver && Array.isArray(asReceiver)) {
          asReceiver.forEach((row) => {
            if (row.sender_id && !userIds.includes(String(row.sender_id))) {
              partnerIdsSet.add(String(row.sender_id));
            }
          });
        }
      } catch (err) {
        console.warn('[InterestService] fetchAcceptedConnections notice:', err);
      }
    }

    // 2. Cross-reference with local storage records
    try {
      const records = this.getLocalRecords();
      records.forEach((r) => {
        if (r && r.status === 'accepted') {
          const sId = String(r.senderId);
          const rId = String(r.receiverId);
          if (userIds.includes(sId) && !userIds.includes(rId)) partnerIdsSet.add(rId);
          if (userIds.includes(rId) && !userIds.includes(sId)) partnerIdsSet.add(sId);
        }
      });

      const pairsRaw = localStorage.getItem('i4u_accepted_pairs');
      if (pairsRaw) {
        const pairs = JSON.parse(pairsRaw);
        if (Array.isArray(pairs)) {
          pairs.forEach((pk) => {
            const parts = String(pk).split(':::');
            if (parts.length === 2) {
              if (userIds.includes(parts[0]) && !userIds.includes(parts[1])) partnerIdsSet.add(parts[1]);
              if (userIds.includes(parts[1]) && !userIds.includes(parts[0])) partnerIdsSet.add(parts[0]);
            }
          });
        }
      }
    } catch (e) {}

    const partnerList = Array.from(partnerIdsSet);

    // Synchronize local cache and pairs
    partnerList.forEach((partnerId) => {
      this.markPairAcceptedLocally(userOrId, partnerId);
    });

    return partnerList;
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

    const pairKeys = this.getAllPairKeys(userA, userB);
    for (const key of pairKeys) {
      if (this.statusCache.get(key) === 'accepted') {
        return 'accepted';
      }
    }

    // 0. Check canonical accepted pairs in localStorage for instant connection resolution
    try {
      const acceptedPairsRaw = localStorage.getItem('i4u_accepted_pairs');
      if (acceptedPairsRaw) {
        const pairs = JSON.parse(acceptedPairsRaw);
        if (Array.isArray(pairs) && pairKeys.some(k => pairs.includes(k))) {
          this.markPairAcceptedLocally(userA, userB);
          return 'accepted';
        }
      }
    } catch (e) {}

    // 1. Check Supabase 'interests' table with comprehensive query and updated_at ordering
    if (isSupabaseConfigured() && supabase) {
      try {
        let interestRows = [];
        
        // Compound query
        try {
          const cleanIdsA = idsA.filter(Boolean).map(id => id.replace(/["']/g, '')).join(',');
          const cleanIdsB = idsB.filter(Boolean).map(id => id.replace(/["']/g, '')).join(',');
          const { data, error } = await supabase
            .from('interests')
            .select('sender_id, receiver_id, status, updated_at')
            .or(`and(sender_id.in.(${cleanIdsA}),receiver_id.in.(${cleanIdsB})),and(sender_id.in.(${cleanIdsB}),receiver_id.in.(${cleanIdsA}))`)
            .order('updated_at', { ascending: false })
            .limit(10);

          if (!error && Array.isArray(data)) {
            interestRows = data;
          }
        } catch (e) {}

        // Fallback query by separate IN clauses if compound returned nothing or errored
        if (!interestRows || interestRows.length === 0) {
          try {
            const { data: rows1 } = await supabase
              .from('interests')
              .select('sender_id, receiver_id, status, updated_at')
              .in('sender_id', idsA)
              .in('receiver_id', idsB)
              .order('updated_at', { ascending: false })
              .limit(5);

            const { data: rows2 } = await supabase
              .from('interests')
              .select('sender_id, receiver_id, status, updated_at')
              .in('sender_id', idsB)
              .in('receiver_id', idsA)
              .order('updated_at', { ascending: false })
              .limit(5);

            interestRows = [...(rows1 || []), ...(rows2 || [])];
          } catch (e) {}
        }

        if (interestRows.length > 0) {
          // If ANY record between these two users is 'accepted', they are permanently unlocked!
          const isAnyAccepted = interestRows.some(r => r && r.status === 'accepted');
          if (isAnyAccepted) {
            this.markPairAcceptedLocally(userA, userB);
            return 'accepted';
          }

          const isAnyRejected = interestRows.some(r => r && r.status === 'rejected');
          const latestStatus = interestRows[0]?.status || (isAnyRejected ? 'rejected' : 'pending');
          pairKeys.forEach(k => this.statusCache.set(k, latestStatus));
          return latestStatus;
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
      if (status === 'accepted') {
        this.markPairAcceptedLocally(userA, userB);
      } else {
        pairKeys.forEach(k => this.statusCache.set(k, status));
      }
      return status;
    }

    // 3. Check localStorage interestsSent and accepted lists (bidirectional)
    try {
      const hasAcceptedA = idsA.some((uid) => {
        const acceptedRawA = localStorage.getItem(`i4u_accepted_interests_${uid}`);
        const acceptedListA = acceptedRawA ? JSON.parse(acceptedRawA) : [];
        return Array.isArray(acceptedListA) && idsB.some((id) => acceptedListA.includes(id));
      }) || (() => {
        const acceptedRaw = localStorage.getItem('i4u_accepted_interests');
        const acceptedList = acceptedRaw ? JSON.parse(acceptedRaw) : [];
        return Array.isArray(acceptedList) && idsB.some((id) => acceptedList.includes(id));
      })();

      const hasAcceptedB = idsB.some((uid) => {
        const acceptedRawB = localStorage.getItem(`i4u_accepted_interests_${uid}`);
        const acceptedListB = acceptedRawB ? JSON.parse(acceptedRawB) : [];
        return Array.isArray(acceptedListB) && idsA.some((id) => acceptedListB.includes(id));
      });

      if (hasAcceptedA || hasAcceptedB) {
        this.markPairAcceptedLocally(userA, userB);
        return 'accepted';
      }

      const hasSent = idsA.some((uid) => {
        const sentRaw = localStorage.getItem(`i4u_interests_sent_${uid}`);
        const sentList = sentRaw ? JSON.parse(sentRaw) : [];
        return Array.isArray(sentList) && idsB.some((id) => sentList.includes(id));
      }) || (() => {
        const sentRaw = localStorage.getItem('i4u_interests_sent');
        const sentList = sentRaw ? JSON.parse(sentRaw) : [];
        return Array.isArray(sentList) && idsB.some((id) => sentList.includes(id));
      })();

      const hasTargetSent = idsB.some((uid) => {
        const targetSentRaw = localStorage.getItem(`i4u_interests_sent_${uid}`);
        const targetSentList = targetSentRaw ? JSON.parse(targetSentRaw) : [];
        return Array.isArray(targetSentList) && idsA.some((id) => targetSentList.includes(id));
      });

      const hasReceived = idsA.some((uid) => {
        const receivedRaw = localStorage.getItem(`i4u_received_interests_${uid}`);
        const receivedList = receivedRaw ? JSON.parse(receivedRaw) : [];
        return Array.isArray(receivedList) && idsB.some((id) => receivedList.includes(id));
      });

      if (hasSent || hasTargetSent || hasReceived) {
        pairKeys.forEach(k => this.statusCache.set(k, 'pending'));
        return 'pending';
      }

      const declinedRaw = localStorage.getItem('i4u_declined_received_ids');
      const declinedList = declinedRaw ? JSON.parse(declinedRaw) : [];
      if (Array.isArray(declinedList) && idsB.some((id) => declinedList.includes(id))) {
        pairKeys.forEach(k => this.statusCache.set(k, 'rejected'));
        return 'rejected';
      }
    } catch (e) {}

    pairKeys.forEach(k => this.statusCache.set(k, 'none'));
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

    const pairKeys = this.getAllPairKeys(userA, userB);
    for (const key of pairKeys) {
      if (this.statusCache.get(key) === 'accepted') {
        return 'accepted';
      }
    }

    // 0. Check canonical accepted pairs
    try {
      const acceptedPairsRaw = localStorage.getItem('i4u_accepted_pairs');
      if (acceptedPairsRaw) {
        const pairs = JSON.parse(acceptedPairsRaw);
        if (Array.isArray(pairs) && pairKeys.some(k => pairs.includes(k))) {
          this.markPairAcceptedLocally(userA, userB);
          return 'accepted';
        }
      }
    } catch (e) {}

    // Check localStorage accepted lists
    try {
      const hasAcceptedA = idsA.some((uid) => {
        const acceptedRawA = localStorage.getItem(`i4u_accepted_interests_${uid}`);
        const acceptedListA = acceptedRawA ? JSON.parse(acceptedRawA) : [];
        return Array.isArray(acceptedListA) && idsB.some((id) => acceptedListA.includes(id));
      }) || (() => {
        const acceptedRaw = localStorage.getItem('i4u_accepted_interests');
        const acceptedList = acceptedRaw ? JSON.parse(acceptedRaw) : [];
        return Array.isArray(acceptedList) && idsB.some((id) => acceptedList.includes(id));
      })();

      const hasAcceptedB = idsB.some((uid) => {
        const acceptedRawB = localStorage.getItem(`i4u_accepted_interests_${uid}`);
        const acceptedListB = acceptedRawB ? JSON.parse(acceptedRawB) : [];
        return Array.isArray(acceptedListB) && idsA.some((id) => acceptedListB.includes(id));
      });

      if (hasAcceptedA || hasAcceptedB) {
        this.markPairAcceptedLocally(userA, userB);
        return 'accepted';
      }
    } catch (e) {}

    for (const key of pairKeys) {
      if (this.statusCache.has(key)) {
        return this.statusCache.get(key);
      }
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
      pairKeys.forEach(k => this.statusCache.set(k, status));
      return status;
    }

    try {
      const hasSent = idsA.some((uid) => {
        const sentRaw = localStorage.getItem(`i4u_interests_sent_${uid}`);
        const sentList = sentRaw ? JSON.parse(sentRaw) : [];
        return Array.isArray(sentList) && idsB.some((id) => sentList.includes(id));
      }) || (() => {
        const sentRaw = localStorage.getItem('i4u_interests_sent');
        const sentList = sentRaw ? JSON.parse(sentRaw) : [];
        return Array.isArray(sentList) && idsB.some((id) => sentList.includes(id));
      })();

      const hasTargetSent = idsB.some((uid) => {
        const targetSentRaw = localStorage.getItem(`i4u_interests_sent_${uid}`);
        const targetSentList = targetSentRaw ? JSON.parse(targetSentRaw) : [];
        return Array.isArray(targetSentList) && idsA.some((id) => targetSentList.includes(id));
      });

      const hasReceived = idsA.some((uid) => {
        const receivedRaw = localStorage.getItem(`i4u_received_interests_${uid}`);
        const receivedList = receivedRaw ? JSON.parse(receivedRaw) : [];
        return Array.isArray(receivedList) && idsB.some((id) => receivedList.includes(id));
      });

      if (hasSent || hasTargetSent || hasReceived) {
        pairKeys.forEach(k => this.statusCache.set(k, 'pending'));
        return 'pending';
      }

      const declinedRaw = localStorage.getItem('i4u_declined_received_ids');
      const declinedList = declinedRaw ? JSON.parse(declinedRaw) : [];
      if (Array.isArray(declinedList) && idsB.some((id) => declinedList.includes(id))) {
        pairKeys.forEach(k => this.statusCache.set(k, 'rejected'));
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
          // Strictly only records where currentUser is receiver_id, and NOT sender_id
          rawRecords = data.filter(r => {
            const sId = String(r.sender_id || '');
            const rId = String(r.receiver_id || '');
            return receiverIds.includes(rId) && !receiverIds.includes(sId);
          });
        } else if (error) {
          console.warn('[InterestService] Supabase interests query notice:', error.message);
        }
      } catch (err) {
        console.warn('[InterestService] Supabase query error:', err);
      }
    }

    // 2. Query backend API if available
    try {
      const backendRows = await fetchBackendReceivedInterests();
      if (Array.isArray(backendRows)) {
        backendRows.forEach((r) => {
          const sId = String(r.sender_id || r.senderId || '');
          const rId = String(r.receiver_id || r.receiverId || '');
          if (receiverIds.includes(rId) && !receiverIds.includes(sId)) {
            const exists = rawRecords.some((existing) => String(existing.id) === String(r.id));
            if (!exists) rawRecords.push(r);
          }
        });
      }
    } catch (e) {}

    // 3. Merge local records for offline / cross-tab fallback
    const localRecords = this.getLocalRecords().filter((r) => {
      const sId = String(r.senderId || '');
      const rId = String(r.receiverId || '');
      return receiverIds.includes(rId) && !receiverIds.includes(sId);
    });

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

    // 4. Check localStorage receiver cache
    try {
      receiverIds.forEach((uid) => {
        const storedReceived = localStorage.getItem(`i4u_received_interests_${uid}`);
        if (storedReceived) {
          const parsed = JSON.parse(storedReceived);
          if (Array.isArray(parsed)) {
            parsed.forEach((pId) => {
              const strPid = String(pId);
              if (receiverIds.includes(strPid)) return; // Strictly ignore self!
              const exists = Array.isArray(rawRecords) && rawRecords.some(
                (r) => r && String(r.sender_id || r.senderId) === strPid
              );
              if (!exists) {
                rawRecords.push({
                  id: `loc_${strPid}`,
                  sender_id: strPid,
                  receiver_id: uid,
                  status: 'pending',
                  message: 'Expressed interest in connecting with you.',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              }
            });
          }
        }
      });
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
        const cleanIds = missingSenderIds.map((id) => String(id).replace(/["']/g, '')).filter(Boolean);
        if (cleanIds.length > 0) {
          const idListStr = cleanIds.join(',');
          const { data: dbProfiles } = await supabase
            .from('profiles')
            .select('id, register_id, name, age, gender, height, photo, city, district, state, profession, education, verified, aadhaar_verified')
            .or(`id.in.(${idListStr}),register_id.in.(${idListStr})`);

          if (Array.isArray(dbProfiles)) {
            dbProfiles.forEach((p) => {
              if (p?.id) profilesMap.set(String(p.id), p);
              if (p?.register_id) profilesMap.set(String(p.register_id), p);
            });
          }
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
      const resolvedInterestId = rec.id || rec.interest_id || rec.interestId || notifUniqueId;

      return {
        id: notifUniqueId,
        notification_id: notifUniqueId,
        interest_id: resolvedInterestId,
        interestId: resolvedInterestId,
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

    // Deduplicate incoming received interest records by interest_id and sender_id
    const seenInterestIds = new Set();
    const seenSenderIds = new Set();
    const deduplicatedEnriched = [];

    for (const item of enriched) {
      if (!item) continue;
      const intId = String(item.interest_id || item.id || '');
      const sId = String(item.sender_id || item.senderId || '');
      const sRegId = String(item.sender?.register_id || item.sender?.registerId || '');

      if (intId && !intId.startsWith('loc_') && !intId.startsWith('interest_') && seenInterestIds.has(intId)) {
        continue;
      }
      if (sId && seenSenderIds.has(sId)) {
        continue;
      }
      if (sRegId && seenSenderIds.has(sRegId)) {
        continue;
      }

      if (intId) seenInterestIds.add(intId);
      if (sId) seenSenderIds.add(sId);
      if (sRegId) seenSenderIds.add(sRegId);
      deduplicatedEnriched.push(item);
    }

    // Final sanity check: Strictly ensure receiver is current user and sender is NOT current user
    const finalReceived = deduplicatedEnriched.filter(item => {
      const sId = String(item.sender_id || item.senderId || '');
      const rId = String(item.receiver_id || item.receiverId || '');
      return !receiverIds.includes(sId) && (receiverIds.includes(rId) || !rId);
    });

    console.log(`Found [${finalReceived.length}] records for receiver`);
    return finalReceived;
  }

  /**
   * Fetches outgoing interests sent by a user.
   * JOINs receiver profile data so the sender can view the status of their sent requests.
   * Strictly lists ONLY records where the logged-in user is sender_id.
   */
  async getSentInterests(userOrId, allProfiles = []) {
    if (!userOrId) return [];

    const senderIds = this.getUserIds(userOrId);
    if (!senderIds.length) return [];

    const userId = senderIds[0];
    console.log(`Fetching sent interests for user: [${userId}]`);

    let rawRecords = [];

    // 1. Query Supabase 'interests' table
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('interests')
          .select('*')
          .in('sender_id', senderIds)
          .order('updated_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          // Strictly only records where currentUser is sender_id, and NOT receiver_id
          rawRecords = data.filter(r => {
            const sId = String(r.sender_id || '');
            const rId = String(r.receiver_id || '');
            return senderIds.includes(sId) && !senderIds.includes(rId);
          });
        }
      } catch (err) {
        console.warn('[InterestService] Supabase sent interests query notice:', err);
      }
    }

    // 2. Query backend API if available
    try {
      const backendRows = await fetchBackendSentInterests();
      if (Array.isArray(backendRows)) {
        backendRows.forEach((r) => {
          const sId = String(r.sender_id || r.senderId || '');
          const rId = String(r.receiver_id || r.receiverId || '');
          if (senderIds.includes(sId) && !senderIds.includes(rId)) {
            const exists = rawRecords.some((existing) => String(existing.id) === String(r.id));
            if (!exists) rawRecords.push(r);
          }
        });
      }
    } catch (e) {}

    // 3. Merge local records
    const localRecords = this.getLocalRecords().filter((r) => {
      const sId = String(r.senderId || '');
      const rId = String(r.receiverId || '');
      return senderIds.includes(sId) && !senderIds.includes(rId);
    });

    localRecords.forEach((localRec) => {
      const exists = rawRecords.some((r) => String(r.receiver_id || r.receiverId) === String(localRec.receiverId));
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

    // 4. Merge localStorage interestsSent
    try {
      senderIds.forEach((uid) => {
        const storedSent = localStorage.getItem(`i4u_interests_sent_${uid}`);
        if (storedSent) {
          const parsed = JSON.parse(storedSent);
          if (Array.isArray(parsed)) {
            parsed.forEach((pId) => {
              const strPid = String(pId);
              if (senderIds.includes(strPid)) return;
              const exists = rawRecords.some((r) => String(r.receiver_id || r.receiverId) === strPid);
              if (!exists) {
                rawRecords.push({
                  id: `loc_sent_${strPid}`,
                  sender_id: uid,
                  receiver_id: strPid,
                  status: 'pending',
                  message: '',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              }
            });
          }
        }
      });
      const globalSent = localStorage.getItem('i4u_interests_sent');
      if (globalSent) {
        const parsed = JSON.parse(globalSent);
        if (Array.isArray(parsed)) {
          parsed.forEach((pId) => {
            const strPid = String(pId);
            if (senderIds.includes(strPid)) return;
            const exists = rawRecords.some((r) => String(r.receiver_id || r.receiverId) === strPid);
            if (!exists) {
              rawRecords.push({
                id: `loc_sent_${strPid}`,
                sender_id: userId,
                receiver_id: strPid,
                status: 'pending',
                message: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          });
        }
      }
    } catch (e) {}

    // 5. Map & JOIN receiver profile details
    const profilesMap = new Map();
    if (Array.isArray(allProfiles)) {
      allProfiles.forEach((p) => {
        if (!p) return;
        if (p.id) profilesMap.set(String(p.id), p);
        if (p.register_id) profilesMap.set(String(p.register_id), p);
        if (p.registerId) profilesMap.set(String(p.registerId), p);
      });
    }

    const seenReceiverIds = new Set();
    const result = [];
    rawRecords.forEach((rec) => {
      const recId = String(rec.receiver_id || rec.receiverId || '');
      if (!recId || senderIds.includes(recId)) return;
      if (seenReceiverIds.has(recId)) return;
      seenReceiverIds.add(recId);

      const receiverProfile = profilesMap.get(recId) || (Array.isArray(allProfiles) ? allProfiles.find(p => p && (
        String(p.id) === recId || String(p.register_id) === recId || String(p.registerId) === recId
      )) : null);

      result.push({
        ...rec,
        id: rec.id || `sent_${recId}`,
        sender_id: String(rec.sender_id || rec.senderId || userId),
        receiver_id: recId,
        receiver: receiverProfile || { id: recId },
        profile: receiverProfile || { id: recId },
        status: rec.status || 'pending'
      });
    });

    console.log(`Found [${result.length}] records for sender`);
    return result;
  }

  /**
   * Subscribe to real-time incoming interest notifications for a user (receiver or sender)
   */
  subscribeToInterestInbox(userOrId, onNewInterest) {
    if (!userOrId || !onNewInterest) return () => {};

    const targetUserIds = this.getUserIds(userOrId);
    if (!targetUserIds.length) return () => {};

    const channels = [];
    const processedEvents = new Map();

    // Deduplicate rapid duplicate/looping events (e.g. from multiple channels / cross-tab echo)
    const emitEvent = (update) => {
      if (!update || !onNewInterest) return;
      const intId = update.interest_id || update.interestId || update.id;
      const sId = String(update.senderId || update.sender_id || update.userAId || '');
      const rId = String(update.receiverId || update.receiver_id || update.userBId || '');
      const status = update.status || 'pending';
      const event = update.event || '';

      // CRITICAL CHECK: An incoming interest (pending) must ONLY be emitted to the receiver!
      // The sender must NEVER receive an incoming interest event in their inbox.
      if (status === 'pending' && event !== 'interest-accepted') {
        if (sId && targetUserIds.includes(sId) && !targetUserIds.includes(rId)) {
          return; // Suppress outgoing interest from triggering sender's inbox!
        }
        if (rId && !targetUserIds.includes(rId)) {
          return; // Suppress event not addressed to this user's inbox!
        }
      }

      const sig = `${intId || `${sId}->${rId}`}:${status}:${event}`;
      const now = Date.now();
      if (processedEvents.has(sig) && (now - processedEvents.get(sig) < 1500)) {
        return; // Suppress duplicate event within 1.5s
      }
      processedEvents.set(sig, now);
      if (processedEvents.size > 80) {
        for (const [k, t] of processedEvents.entries()) {
          if (now - t > 6000) processedEvents.delete(k);
        }
      }
      onNewInterest(update);
    };

    if (isSupabaseConfigured() && supabase && typeof supabase.channel === 'function') {
      const subId = generateUUID().slice(0, 8);
      const primaryId = targetUserIds[0];

      targetUserIds.forEach((targetId) => {
        try {
          const chn = supabase.channel(`user-interest-inbox-${targetId}`, {
            config: { broadcast: { self: false } }
          });

          chn
            .on('broadcast', { event: 'interest-received' }, ({ payload }) => {
              if (payload) {
                console.log('[InterestService] Real-time interest received:', payload);
                emitEvent({ ...payload, event: 'interest-received', status: payload.status || 'pending' });
              }
            })
            .on('broadcast', { event: 'interest-accepted' }, ({ payload }) => {
              if (payload) {
                console.log('[InterestService] Real-time interest accepted:', payload);
                this.handleRealtimeStatusUpdate(payload);
                emitEvent({ ...payload, event: 'interest-accepted', status: 'accepted' });
              }
            })
            .on('broadcast', { event: 'interest-rejected' }, ({ payload }) => {
              if (payload) {
                console.log('[InterestService] Real-time interest rejected:', payload);
                this.handleRealtimeStatusUpdate(payload);
                emitEvent({ ...payload, event: 'interest-rejected', status: 'rejected' });
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
                emitEvent({ ...payload, event: 'interest-accepted', status: 'accepted' });
              }
            })
            .subscribe();

          channels.push(callChn);
        } catch (e) {}
      });

      // Single dedicated postgres_changes listener for this subscriber
      try {
        const dbChangeChn = supabase
          .channel(`user-interests-db-${primaryId}-${subId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'interests' },
            (payload) => {
              const row = payload?.new;
              if (!row) return;
              const sId = String(row.sender_id || '');
              const rId = String(row.receiver_id || '');
              if (row.status === 'pending') {
                if (!targetUserIds.includes(rId)) {
                  return; // Pending interest notification is ONLY for receiver!
                }
              } else {
                if (!targetUserIds.includes(sId) && !targetUserIds.includes(rId)) {
                  return;
                }
              }
              console.log('[InterestService] Real-time postgres_changes event on interests:', row.status, sId, rId);
              const isAccepted = row.status === 'accepted';
              const partnerId = targetUserIds.includes(sId) ? rId : sId;
              const updatePayload = {
                id: row.id,
                interest_id: row.id,
                interestId: row.id,
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
              emitEvent(updatePayload);
            }
          )
          .subscribe();

        channels.push(dbChangeChn);
      } catch (e) {}
    }

    // Direct window event listener for instant single-page sync
    const handleWindowEvt = (e) => {
      if (!e?.detail) return;
      const update = e.detail;
      const sId = String(update.senderId || update.sender_id || update.userAId || '');
      const rId = String(update.receiverId || update.receiver_id || update.userBId || '');
      const status = update.status || 'pending';
      const event = update.event || '';

      if (status === 'pending' && event !== 'interest-accepted') {
        if (!rId || !targetUserIds.includes(rId)) {
          return; // Strictly only for receiver!
        }
      } else {
        const ids = [
          update.userAId,
          update.userBId,
          update.senderId,
          update.receiverId,
          update.responderId,
          update.partnerId
        ].filter(Boolean).map(String);

        if (!targetUserIds.some(id => ids.includes(String(id)))) {
          return;
        }
      }

      emitEvent(update);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('i4u_interest_status_change', handleWindowEvt);
    }

    // Also listen to local status change events (in-memory + cross-tab)
    const unsubLocal = this.onStatusChange((update) => {
      if (!update) return;
      const sId = String(update.senderId || update.sender_id || update.userAId || '');
      const rId = String(update.receiverId || update.receiver_id || update.userBId || '');
      const status = update.status || 'pending';
      const event = update.event || '';

      if (status === 'pending' && event !== 'interest-accepted') {
        if (!rId || !targetUserIds.includes(rId)) {
          return; // Strictly only for receiver!
        }
      } else {
        const ids = [
          update.userAId,
          update.userBId,
          update.senderId,
          update.receiverId,
          update.responderId,
          update.partnerId
        ].filter(Boolean).map(String);

        if (!targetUserIds.some(id => ids.includes(String(id)))) {
          return;
        }
      }

      emitEvent(update);
    });

    return () => {
      unsubLocal();
      if (typeof window !== 'undefined') {
        window.removeEventListener('i4u_interest_status_change', handleWindowEvt);
      }
      if (supabase && typeof supabase.removeChannel === 'function' && channels.length > 0) {
        channels.forEach((chn) => {
          if (chn) {
            try { supabase.removeChannel(chn); } catch (e) {}
          }
        });
      }
      channels.length = 0;
      processedEvents.clear();
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
        const cleanSenderId = String(senderId).replace(/["']/g, '');
        const cleanReceiverId = String(receiverId).replace(/["']/g, '');
        const { data: existingRows } = await supabase
          .from('interests')
          .select('id, sender_id, receiver_id, status')
          .or(`and(sender_id.eq.${cleanSenderId},receiver_id.eq.${cleanReceiverId}),and(sender_id.eq.${cleanReceiverId},receiver_id.eq.${cleanSenderId})`)
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
        senderId: String(senderId),
        receiverId: String(receiverId),
        status: 'pending',
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
   * Records interest accepted (status: 'accepted')
   * Single-request connection flow: Connection is fully established for BOTH users immediately.
   * Neither user is required to send a return request.
   */
  async acceptInterest(receiver, sender) {
    const receiverId = typeof receiver === 'string' ? receiver : (receiver?.id || receiver?.registerId || receiver?.register_id);
    const senderId = typeof sender === 'string' ? sender : (sender?.id || sender?.registerId || sender?.register_id);
    if (!receiverId || !senderId) return;

    const allPairKeys = this.getAllPairKeys(receiver, sender);
    allPairKeys.forEach((pk) => this.statusCache.set(pk, 'accepted'));

    const receiverIds = this.getUserIds(receiver);
    const senderIds = this.getUserIds(sender);

    // Atomically mark accepted across all cache keys and local storage
    this.markPairAcceptedLocally(receiver, sender);

    // 1. Update local records (bidirectional)
    const records = this.getLocalRecords().filter((r) => {
      const match1 = senderIds.includes(String(r.senderId)) && receiverIds.includes(String(r.receiverId));
      const match2 = senderIds.includes(String(r.receiverId)) && receiverIds.includes(String(r.senderId));
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
      // Add all sender IDs to each of receiver's accepted lists
      receiverIds.forEach((rid) => {
        const key = `i4u_accepted_interests_${rid}`;
        const raw = localStorage.getItem(key) || '[]';
        const list = JSON.parse(raw);
        senderIds.forEach((sid) => {
          if (!list.includes(String(sid))) list.push(String(sid));
        });
        localStorage.setItem(key, JSON.stringify(list));
      });

      // Global fallback
      const acceptedRaw = localStorage.getItem('i4u_accepted_interests') || '[]';
      const globalList = JSON.parse(acceptedRaw);
      senderIds.forEach((sid) => {
        if (!globalList.includes(String(sid))) globalList.push(String(sid));
      });
      localStorage.setItem('i4u_accepted_interests', JSON.stringify(globalList));

      // Also add receiver IDs to sender's accepted lists (instant sender session unlock)
      senderIds.forEach((sid) => {
        const key = `i4u_accepted_interests_${sid}`;
        const raw = localStorage.getItem(key) || '[]';
        const list = JSON.parse(raw);
        receiverIds.forEach((rid) => {
          if (!list.includes(String(rid))) list.push(String(rid));
        });
        localStorage.setItem(key, JSON.stringify(list));
      });

      // Canonical accepted pairs store
      const pairsRaw = localStorage.getItem('i4u_accepted_pairs') || '[]';
      const pairs = JSON.parse(pairsRaw);
      allPairKeys.forEach((pk) => {
        if (pk && !pairs.includes(pk)) pairs.push(pk);
      });
      localStorage.setItem('i4u_accepted_pairs', JSON.stringify(pairs));
    } catch (e) {}

    const receiverName = typeof receiver === 'object' ? (receiver.name || 'Candidate') : 'Candidate';
    const receiverPhoto = typeof receiver === 'object' ? (receiver.photo || receiver.photo_url || null) : null;
    const senderName = typeof sender === 'object' ? (sender.name || 'Candidate') : 'Candidate';

    // 3. Save to Supabase 'interests' and 'notifications' table
    if (isSupabaseConfigured() && supabase) {
      try {
        const cleanSenderId = String(senderId).replace(/["']/g, '');
        const cleanReceiverId = String(receiverId).replace(/["']/g, '');

        let existingRows = [];
        try {
          const { data: rows1 } = await supabase
            .from('interests')
            .select('id, sender_id, receiver_id, status')
            .in('sender_id', senderIds)
            .in('receiver_id', receiverIds);

          const { data: rows2 } = await supabase
            .from('interests')
            .select('id, sender_id, receiver_id, status')
            .in('sender_id', receiverIds)
            .in('receiver_id', senderIds);

          existingRows = [...(rows1 || []), ...(rows2 || [])];
        } catch (e) {}

        if (existingRows.length > 0) {
          for (const row of existingRows) {
            const { error: updErr } = await supabase
              .from('interests')
              .update({
                status: 'accepted',
                updated_at: new Date().toISOString()
              })
              .eq('id', row.id);
            if (updErr) console.warn('[InterestService] Supabase interests accept update notice:', updErr.message);
          }
        } else {
          const { error: insErr } = await supabase
            .from('interests')
            .insert([
              {
                id: generateUUID(),
                sender_id: cleanSenderId,
                receiver_id: cleanReceiverId,
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
        const cleanSenderId = String(senderId).replace(/["']/g, '');
        const cleanReceiverId = String(receiverId).replace(/["']/g, '');
        const { data: existingRows } = await supabase
          .from('interests')
          .select('id, sender_id, receiver_id, status')
          .or(`and(sender_id.eq.${cleanSenderId},receiver_id.eq.${cleanReceiverId}),and(sender_id.eq.${cleanReceiverId},receiver_id.eq.${cleanSenderId})`)
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
