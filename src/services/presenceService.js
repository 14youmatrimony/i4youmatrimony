/**
 * Real-Time User Presence & Online/Offline Status Service
 * Powered by Supabase Realtime Presence & Broadcast Channels
 *
 * Accurately tracks when users are actively online or offline:
 * - When online: Green indicator dot & Online status
 * - When offline: Red indicator dot & Offline status
 */

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabase.js';

class PresenceService {
  constructor() {
    this.channel = null;
    this.currentUser = null;
    this.onlineUsers = new Map(); // key -> presence payload
    this.listeners = new Set();
    this.broadcastChannel = null;
    this.isSubscribed = false;

    // Cross-tab synchronization via BroadcastChannel
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        this.broadcastChannel = new BroadcastChannel('i4u_presence_sync_bus');
        this.broadcastChannel.onmessage = (event) => {
          const data = event?.data;
          if (!data) return;
          if (data.type === 'PRESENCE_SYNC' && Array.isArray(data.users)) {
            data.users.forEach((u) => {
              if (u && (u.user_id || u.id)) {
                const uid = String(u.user_id || u.id);
                this.onlineUsers.set(uid, u);
                if (u.register_id) this.onlineUsers.set(String(u.register_id), u);
              }
            });
            this.notifyListeners();
          } else if (data.type === 'USER_OFFLINE' && data.userId) {
            this.onlineUsers.delete(String(data.userId));
            if (data.registerId) this.onlineUsers.delete(String(data.registerId));
            this.notifyListeners();
          }
        };
      } catch (e) {
        console.warn('[PresenceService] BroadcastChannel unavailable:', e);
      }
    }

    // Window/page lifecycle events for accurate untracking
    if (typeof window !== 'undefined') {
      const handleLeave = () => {
        this.untrackUser(true);
      };
      window.addEventListener('beforeunload', handleLeave);
      window.addEventListener('pagehide', handleLeave);
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.currentUser) {
          this.trackUser(this.currentUser);
        }
      });
    }
  }

  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.warn('[PresenceService] Listener error:', err);
      }
    });
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    return () => {};
  }

  /**
   * Track current authenticated user's presence in Supabase Realtime channel
   */
  async trackUser(user) {
    if (!user) return;
    this.currentUser = user;

    const cleanUserId = String(user.id || user.uid || user.userId || '').trim();
    const cleanRegId = String(user.registerId || user.register_id || '').trim();
    const cleanPhone = String(user.phone || user.mobile || '').replace(/\D/g, '');
    const cleanName = user.name || user.fullName || user.full_name || 'Member';

    if (!cleanUserId && !cleanRegId) return;

    const presenceKey = cleanUserId || cleanRegId;

    // Register self in local onlineUsers map immediately
    const selfPayload = {
      user_id: cleanUserId,
      id: cleanUserId,
      register_id: cleanRegId,
      phone: cleanPhone,
      name: cleanName,
      online_at: new Date().toISOString()
    };
    if (cleanUserId) this.onlineUsers.set(cleanUserId, selfPayload);
    if (cleanRegId) this.onlineUsers.set(cleanRegId, selfPayload);
    this.notifyListeners();

    // Broadcast to other local browser tabs
    try {
      this.broadcastChannel?.postMessage({
        type: 'PRESENCE_SYNC',
        users: [selfPayload]
      });
    } catch (e) {}

    // Update profiles table is_online flag if supported
    if (isSupabaseConfigured() && supabase) {
      try {
        const updatePayload = {
          is_online: true,
          last_seen: new Date().toISOString()
        };
        const idFilter = cleanUserId || cleanRegId;
        supabase
          .from('profiles')
          .update(updatePayload)
          .or(`id.eq.${idFilter},register_id.eq.${idFilter}`)
          .then(() => {})
          .catch(() => {});
      } catch (e) {}
    }

    // Connect to Supabase Realtime presence channel
    if (!isSupabaseConfigured() || !supabase) return;

    if (this.channel) {
      try {
        await this.channel.track(selfPayload);
      } catch (err) {
        console.warn('[PresenceService] channel.track error:', err);
      }
      return;
    }

    try {
      this.channel = supabase.channel('online_users_presence', {
        config: {
          presence: {
            key: presenceKey,
          },
        },
      });

      this.channel
        .on('presence', { event: 'sync' }, () => {
          this.handlePresenceSync();
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.handlePresenceJoin(key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this.handlePresenceLeave(key, leftPresences);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            this.isSubscribed = true;
            try {
              await this.channel.track(selfPayload);
            } catch (trackErr) {
              console.warn('[PresenceService] track error on subscribe:', trackErr);
            }
          }
        });
    } catch (err) {
      console.warn('[PresenceService] init presence channel warning:', err);
    }
  }

  handlePresenceSync() {
    if (!this.channel) return;
    try {
      const state = this.channel.presenceState();
      const updatedMap = new Map();

      // Preserve self if logged in
      if (this.currentUser) {
        const myId = String(this.currentUser.id || '');
        const myReg = String(this.currentUser.registerId || this.currentUser.register_id || '');
        const selfPayload = {
          user_id: myId,
          id: myId,
          register_id: myReg,
          name: this.currentUser.name || '',
          online_at: new Date().toISOString()
        };
        if (myId) updatedMap.set(myId, selfPayload);
        if (myReg) updatedMap.set(myReg, selfPayload);
      }

      Object.entries(state).forEach(([key, presences]) => {
        if (!Array.isArray(presences)) return;
        presences.forEach((presence) => {
          if (!presence) return;
          const uId = String(presence.user_id || presence.id || key || '').trim();
          const rId = String(presence.register_id || '').trim();
          const phone = String(presence.phone || '').replace(/\D/g, '');

          if (uId) updatedMap.set(uId, presence);
          if (rId) updatedMap.set(rId, presence);
          if (phone && phone.length >= 10) updatedMap.set(phone, presence);
        });
      });

      this.onlineUsers = updatedMap;
      this.notifyListeners();
    } catch (err) {
      console.warn('[PresenceService] handlePresenceSync error:', err);
    }
  }

  handlePresenceJoin(key, newPresences) {
    if (!Array.isArray(newPresences)) return;
    newPresences.forEach((presence) => {
      if (!presence) return;
      const uId = String(presence.user_id || presence.id || key || '').trim();
      const rId = String(presence.register_id || '').trim();
      const phone = String(presence.phone || '').replace(/\D/g, '');

      if (uId) this.onlineUsers.set(uId, presence);
      if (rId) this.onlineUsers.set(rId, presence);
      if (phone && phone.length >= 10) this.onlineUsers.set(phone, presence);
    });
    this.notifyListeners();
  }

  handlePresenceLeave(key, leftPresences) {
    const keyStr = String(key || '').trim();
    if (keyStr) this.onlineUsers.delete(keyStr);

    if (Array.isArray(leftPresences)) {
      leftPresences.forEach((presence) => {
        if (!presence) return;
        const uId = String(presence.user_id || presence.id || '').trim();
        const rId = String(presence.register_id || '').trim();
        const phone = String(presence.phone || '').replace(/\D/g, '');

        if (uId) this.onlineUsers.delete(uId);
        if (rId) this.onlineUsers.delete(rId);
        if (phone) this.onlineUsers.delete(phone);
      });
    }

    // Keep current user online locally
    if (this.currentUser) {
      const myId = String(this.currentUser.id || '');
      const myReg = String(this.currentUser.registerId || this.currentUser.register_id || '');
      if (myId) this.onlineUsers.set(myId, { user_id: myId });
      if (myReg) this.onlineUsers.set(myReg, { user_id: myId });
    }

    this.notifyListeners();
  }

  /**
   * Untrack current user on logout or page close
   */
  async untrackUser(isUnload = false) {
    const userToUntrack = this.currentUser;
    this.currentUser = null;

    if (userToUntrack) {
      const myId = String(userToUntrack.id || '');
      const myReg = String(userToUntrack.registerId || userToUntrack.register_id || '');
      if (myId) this.onlineUsers.delete(myId);
      if (myReg) this.onlineUsers.delete(myReg);

      try {
        this.broadcastChannel?.postMessage({
          type: 'USER_OFFLINE',
          userId: myId,
          registerId: myReg
        });
      } catch (e) {}

      if (isSupabaseConfigured() && supabase) {
        try {
          const idFilter = myId || myReg;
          supabase
            .from('profiles')
            .update({ is_online: false, last_seen: new Date().toISOString() })
            .or(`id.eq.${idFilter},register_id.eq.${idFilter}`)
            .then(() => {})
            .catch(() => {});
        } catch (e) {}
      }
    }

    if (this.channel) {
      try {
        await this.channel.untrack();
      } catch (e) {}

      if (!isUnload) {
        try {
          supabase.removeChannel(this.channel);
          this.channel = null;
          this.isSubscribed = false;
        } catch (e) {}
      }
    }

    this.notifyListeners();
  }

  /**
   * Check whether a given user or candidate profile is currently ONLINE.
   * Returns true if online, false if offline.
   */
  isUserOnline(profileOrId) {
    if (!profileOrId) return false;

    // Self check: current logged-in user is always online in their own active session
    if (this.currentUser) {
      const myId = String(this.currentUser.id || '');
      const myReg = String(this.currentUser.registerId || this.currentUser.register_id || '');
      const myPhone = String(this.currentUser.phone || this.currentUser.mobile || '').replace(/\D/g, '');

      if (typeof profileOrId === 'string' || typeof profileOrId === 'number') {
        const idStr = String(profileOrId).trim();
        if ((myId && idStr === myId) || (myReg && idStr.toUpperCase() === myReg.toUpperCase())) {
          return true;
        }
      } else if (typeof profileOrId === 'object') {
        const tId = String(profileOrId.id || profileOrId.user_id || '').trim();
        const tReg = String(profileOrId.register_id || profileOrId.registerId || '').trim();
        const tPhone = String(profileOrId.phone || profileOrId.mobile || '').replace(/\D/g, '');

        if (
          (myId && tId && myId === tId) ||
          (myReg && tReg && myReg.toUpperCase() === tReg.toUpperCase()) ||
          (myPhone && tPhone && myPhone.length >= 10 && myPhone === tPhone)
        ) {
          return true;
        }
      }
    }

    // Resolve target identifiers
    const candidateKeys = [];
    if (typeof profileOrId === 'string' || typeof profileOrId === 'number') {
      candidateKeys.push(String(profileOrId).trim());
    } else if (typeof profileOrId === 'object') {
      if (profileOrId.id) candidateKeys.push(String(profileOrId.id).trim());
      if (profileOrId.user_id) candidateKeys.push(String(profileOrId.user_id).trim());
      if (profileOrId.register_id) candidateKeys.push(String(profileOrId.register_id).trim());
      if (profileOrId.registerId) candidateKeys.push(String(profileOrId.registerId).trim());
      if (profileOrId.phone) {
        const cleanP = String(profileOrId.phone).replace(/\D/g, '');
        if (cleanP) candidateKeys.push(cleanP);
      }
      if (profileOrId.mobile) {
        const cleanM = String(profileOrId.mobile).replace(/\D/g, '');
        if (cleanM) candidateKeys.push(cleanM);
      }
    }

    // Check against live presence state
    for (const key of candidateKeys) {
      if (!key) continue;
      if (this.onlineUsers.has(key)) return true;
      const upperKey = key.toUpperCase();
      if (this.onlineUsers.has(upperKey)) return true;
    }

    return false;
  }

  /**
   * Formatted status text: "Online" or "Offline"
   */
  getUserStatus(profileOrId) {
    return this.isUserOnline(profileOrId) ? 'Online' : 'Offline';
  }
}

export const presenceService = new PresenceService();

/**
 * React hook to observe user presence reactively
 */
export function useUserPresence(profileOrId) {
  const [isOnline, setIsOnline] = useState(() => presenceService.isUserOnline(profileOrId));

  useEffect(() => {
    setIsOnline(presenceService.isUserOnline(profileOrId));
    const unsubscribe = presenceService.subscribe(() => {
      setIsOnline(presenceService.isUserOnline(profileOrId));
    });
    return unsubscribe;
  }, [
    profileOrId?.id,
    profileOrId?.user_id,
    profileOrId?.register_id,
    profileOrId?.registerId,
    typeof profileOrId === 'string' ? profileOrId : null
  ]);

  return isOnline;
}

/**
 * React hook that forces a re-render when global presence changes
 */
export function usePresenceSync() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = presenceService.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  return tick;
}
