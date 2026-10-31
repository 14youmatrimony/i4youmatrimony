/**
 * Real-Time Cross-Platform Profile Synchronization Service
 * 
 * Synchronizes user profile modifications (profile picture, personal details, contact info)
 * instantaneously across:
 * 1. All active sessions belonging to the user (Web browser tabs, Android, iOS, Tablet).
 * 2. Admin Console ('admin_room') and Super Admin Console ('super_admin_room').
 * 
 * Utilizes:
 * - Supabase Realtime broadcast channels for zero-infrastructure edge distribution.
 * - HTML5 BroadcastChannel API for sub-millisecond local cross-tab / multi-window sync.
 * - Socket.io client bridge option for dedicated microservice architectures.
 * - Cache-busting URL parameter generation (?t=timestamp) to bypass CDN and browser cache.
 */

import { supabase, isSupabaseConfigured } from './supabase.js';
import { addCacheBuster } from '../utils/cacheBuster.js';

class ProfileSyncService {
  constructor() {
    this.currentUserId = null;
    this.userChannel = null;
    this.adminChannel = null;
    this.superAdminChannel = null;
    this.listeners = new Set();
    this.adminListeners = new Set();
    this.broadcastChannel = null;
    this.socket = null;
    this.lastProcessedTimestamps = new Map();

    // Initialize cross-tab synchronization for instant desktop/browser tab reflection
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        this.broadcastChannel = new BroadcastChannel('i4u_profile_sync_bus');
        this.broadcastChannel.onmessage = (event) => {
          const payload = event?.data;
          if (payload && payload.userId) {
            this.notifyListeners(payload, 'local_broadcast');
          }
        };
      } catch (e) {
        console.warn('[ProfileSyncService] BroadcastChannel not available:', e);
      }
    }
  }

  /**
   * Subscribe an authenticated user to their dedicated personal profile sync channel.
   * Catches updates made from any other device or app instance.
   * 
   * @param {Object|string} userOrId - Authenticated user object or ID
   * @param {Function} callback - Callback triggered when profile updates
   * @returns {Function} Unsubscribe cleanup function
   */
  subscribeUser(userOrId, callback) {
    if (!userOrId) return () => {};
    const userId = typeof userOrId === 'object' 
      ? String(userOrId.id || userOrId.registerId || userOrId.register_id || userOrId.phone || '') 
      : String(userOrId);

    if (!userId) return () => {};

    if (typeof callback === 'function') {
      this.listeners.add(callback);
    }

    if (this.currentUserId === userId && this.userChannel) {
      return () => {
        if (callback) this.listeners.delete(callback);
      };
    }

    this.currentUserId = userId;

    if (isSupabaseConfigured() && supabase) {
      if (this.userChannel) {
        try { supabase.removeChannel(this.userChannel); } catch (e) {}
      }

      const channelName = `profile-sync-${userId}`;
      this.userChannel = supabase.channel(channelName, {
        config: { broadcast: { self: false } }
      });

      this.userChannel
        .on('broadcast', { event: 'PROFILE_UPDATED' }, ({ payload }) => {
          if (!payload) return;
          this.notifyListeners(payload, 'supabase_remote');
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[ProfileSyncService] Subscribed to real-time sync channel: ${channelName}`);
          }
        });
    }

    return () => {
      if (callback) this.listeners.delete(callback);
      if (this.listeners.size === 0 && this.userChannel && supabase) {
        try { supabase.removeChannel(this.userChannel); } catch (e) {}
        this.userChannel = null;
      }
    };
  }

  /**
   * Subscribe an Admin or Super Admin dashboard to global profile update notifications.
   * 
   * @param {'admin'|'super_admin'} role - Role level
   * @param {Function} callback - Callback triggered on any user update
   * @returns {Function} Unsubscribe cleanup function
   */
  subscribeAdmin(role = 'admin', callback) {
    if (typeof callback !== 'function') return () => {};
    this.adminListeners.add(callback);

    if (!isSupabaseConfigured() || !supabase) {
      return () => this.adminListeners.delete(callback);
    }

    const channelName = role === 'super_admin' ? 'super-admin-profile-sync' : 'admin-profile-sync';
    let targetChannel = role === 'super_admin' ? this.superAdminChannel : this.adminChannel;

    if (!targetChannel) {
      targetChannel = supabase.channel(channelName, {
        config: { broadcast: { self: true } }
      });

      targetChannel
        .on('broadcast', { event: 'PROFILE_UPDATED' }, ({ payload }) => {
          if (!payload) return;
          this.notifyAdminListeners(payload);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[ProfileSyncService] Subscribed to ${channelName}`);
          }
        });

      if (role === 'super_admin') {
        this.superAdminChannel = targetChannel;
      } else {
        this.adminChannel = targetChannel;
      }
    }

    return () => {
      this.adminListeners.delete(callback);
    };
  }

  /**
   * Broadcast a PROFILE_UPDATED event to all active sessions across all platforms:
   * 1. User's personal room (Web, Android, iOS, Tablet).
   * 2. Admin Room and Super Admin Room channels.
   * 3. Local browser tabs via BroadcastChannel.
   * 
   * @param {Object} params
   * @param {string} params.userId - Target user unique ID
   * @param {string} [params.newProfilePicUrl] - Updated avatar URL
   * @param {Object} [params.updatedData] - Additional updated profile fields (name, phone, bio, etc.)
   * @param {number} [params.lastUpdated] - Epoch timestamp for cache-busting
   */
  async broadcastProfileUpdate({ userId, newProfilePicUrl, updatedData = {}, lastUpdated = Date.now() }) {
    if (!userId) return false;
    const cleanUserId = String(userId);

    // Ensure cache-busting parameter (?t=timestamp) is appended to the avatar URL
    const cacheBustedPhoto = newProfilePicUrl ? addCacheBuster(newProfilePicUrl, lastUpdated) : undefined;

    const payload = {
      userId: cleanUserId,
      newProfilePicUrl: cacheBustedPhoto,
      updatedData: {
        ...updatedData,
        ...(cacheBustedPhoto ? { photo: cacheBustedPhoto, photo_url: cacheBustedPhoto } : {})
      },
      lastUpdated,
      timestamp: lastUpdated
    };

    // 1. Broadcast locally across browser tabs and windows
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (e) {
        console.warn('[ProfileSyncService] Local broadcast warning:', e);
      }
    }

    // 2. Broadcast to user's remote device channel via Supabase Realtime
    if (isSupabaseConfigured() && supabase) {
      try {
        const userSyncChannel = supabase.channel(`profile-sync-${cleanUserId}`);
        await userSyncChannel.send({
          type: 'broadcast',
          event: 'PROFILE_UPDATED',
          payload
        });
      } catch (err) {
        console.warn('[ProfileSyncService] Failed to broadcast to user channel:', err);
      }

      // 3. Broadcast to admin_room and super_admin_room channels
      try {
        const adminSync = supabase.channel('admin-profile-sync');
        await adminSync.send({
          type: 'broadcast',
          event: 'PROFILE_UPDATED',
          payload
        });
      } catch (err) {
        console.warn('[ProfileSyncService] Failed to broadcast to admin channel:', err);
      }

      try {
        const superAdminSync = supabase.channel('super-admin-profile-sync');
        await superAdminSync.send({
          type: 'broadcast',
          event: 'PROFILE_UPDATED',
          payload
        });
      } catch (err) {
        console.warn('[ProfileSyncService] Failed to broadcast to super-admin channel:', err);
      }
    }

    // 4. If connected to a custom Socket.io server instance, emit the event
    if (this.socket && this.socket.connected) {
      try {
        this.socket.emit('PROFILE_UPDATE_EVENT', payload);
      } catch (e) {
        console.warn('[ProfileSyncService] Socket.io emit warning:', e);
      }
    }

    return true;
  }

  /**
   * Internal dispatcher to notify user listeners with deduplication
   */
  notifyListeners(payload, source) {
    if (!payload || !payload.userId) return;
    const key = `${payload.userId}_${payload.lastUpdated}`;
    if (this.lastProcessedTimestamps.has(key)) return;
    this.lastProcessedTimestamps.set(key, Date.now());

    // Clean up cache
    if (this.lastProcessedTimestamps.size > 200) {
      const oldestKey = this.lastProcessedTimestamps.keys().next().value;
      this.lastProcessedTimestamps.delete(oldestKey);
    }

    console.log(`[ProfileSyncService] Profile update received (${source}) for user ${payload.userId}`);
    this.listeners.forEach((callback) => {
      try {
        callback(payload);
      } catch (err) {
        console.error('[ProfileSyncService] Listener error:', err);
      }
    });
  }

  /**
   * Internal dispatcher for admin dashboards
   */
  notifyAdminListeners(payload) {
    if (!payload) return;
    this.adminListeners.forEach((callback) => {
      try {
        callback(payload);
      } catch (err) {
        console.error('[ProfileSyncService] Admin listener error:', err);
      }
    });
  }

  /**
   * Connect to an external Socket.io cluster (if deployed alongside Supabase)
   */
  connectSocketIo(socketInstance) {
    if (!socketInstance) return;
    this.socket = socketInstance;
    this.socket.on('PROFILE_UPDATED', (payload) => {
      if (payload && payload.userId) {
        this.notifyListeners(payload, 'socket_io');
        this.notifyAdminListeners(payload);
      }
    });
  }
}

export const profileSyncService = new ProfileSyncService();
export default profileSyncService;
