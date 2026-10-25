/**
 * Firebase Cloud Messaging (FCM) & Push Notification Service
 * 
 * Provides:
 * 1. Native Capacitor Push Notifications for iOS and Android (@capacitor/push-notifications)
 * 2. High-priority incoming voice & video call wakeups and notification channels
 * 3. Offline chat message notifications with instant tap routing
 * 4. Cross-platform device token synchronization (Supabase & FastAPI backend)
 * 5. Web push and background service-worker fallbacks
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase, isSupabaseConfigured } from './supabase.js';
import { API_BASE } from './api.js';

class FCMNotificationService {
  constructor() {
    this.listeners = new Set();
    this.openedAppListeners = new Set();
    this.incomingCallListeners = new Set();
    this.broadcastChannel = null;
    this.currentUser = null;
    this.deviceToken = null;
    this.isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

    if (typeof window !== 'undefined') {
      // 1. Cross-tab synchronization via BroadcastChannel
      try {
        if (window.BroadcastChannel) {
          this.broadcastChannel = new BroadcastChannel('i4u_fcm_notifications');
          this.broadcastChannel.onmessage = (event) => {
            if (event?.data?.type === 'fcm_message_opened_app' && event.data.payload) {
              this.notifyOpenedAppListeners(event.data.payload);
            } else if (event?.data?.type === 'fcm_incoming_call' && event.data.payload) {
              this.notifyIncomingCallListeners(event.data.payload);
            } else if (event?.data?.payload) {
              this.notifyListeners(event.data.payload);
            }
          };
        }
      } catch (e) {
        console.warn('[FCMService] BroadcastChannel note:', e);
      }

      // 2. Window event listeners
      window.addEventListener('fcm_notification_received', (event) => {
        if (event?.detail) {
          this.notifyListeners(event.detail);
        }
      });

      window.addEventListener('push_notification', (event) => {
        if (event?.detail) {
          this.notifyListeners(event.detail);
        }
      });

      window.addEventListener('fcm_notification_clicked', (event) => {
        if (event?.detail) {
          this.handleNotificationTap(event.detail);
        }
      });

      window.addEventListener('notification_click', (event) => {
        if (event?.detail) {
          this.handleNotificationTap(event.detail);
        }
      });

      // 3. Service Worker postMessage listener for web push clicks
      try {
        if (navigator?.serviceWorker) {
          navigator.serviceWorker.addEventListener('message', (event) => {
            const data = event.data;
            if (data?.type === 'FCM_NOTIFICATION_OPENED' || data?.type === 'NOTIFICATION_CLICK') {
              this.handleNotificationTap(data.payload || data);
            } else if (data?.type === 'FCM_INCOMING_CALL') {
              this.notifyIncomingCallListeners(data.payload || data);
            }
          });
        }
      } catch (e) {}

      // 4. Initialize Capacitor Native Push Notification Listeners
      if (this.isNative) {
        this.initCapacitorPushListeners();
      }
    }
  }

  /**
   * Helper to normalize user identifiers
   */
  getUserIdentifier(userOrId) {
    if (!userOrId) return null;
    if (typeof userOrId === 'string') return userOrId;
    return userOrId.id || userOrId.register_id || userOrId.registerId || null;
  }

  /**
   * Initialize native Push Notifications listeners and Android channels
   */
  async initCapacitorPushListeners() {
    if (!this.isNative) return;

    try {
      // Create high-importance Android Notification Channels
      if (Capacitor.getPlatform() === 'android') {
        try {
          await PushNotifications.createChannel({
            id: 'call_notifications_channel',
            name: 'Incoming Calls',
            description: 'Alerts and ringtones for incoming audio and video calls',
            importance: 5, // IMPORTANCE_HIGH / MAX
            visibility: 1, // VISIBILITY_PUBLIC
            sound: 'ringtone',
            vibration: true,
            lights: true,
            lightColor: '#E11D48'
          });

          await PushNotifications.createChannel({
            id: 'messages_channel',
            name: 'Chat Messages',
            description: 'Alerts for incoming chat messages',
            importance: 4, // IMPORTANCE_HIGH
            visibility: 1,
            vibration: true,
            lights: true,
            lightColor: '#E11D48'
          });
        } catch (channelErr) {
          console.warn('[FCMService] Channel creation note:', channelErr);
        }
      }

      // Registration event: Token obtained from FCM / APNs
      PushNotifications.addListener('registration', async (token) => {
        console.log('[FCMService] Native device push token received:', token.value?.substring(0, 12) + '...');
        this.deviceToken = token.value;

        if (this.currentUser) {
          await this.saveDeviceTokenToBackend(token.value, this.currentUser);
        }
      });

      // Registration error
      PushNotifications.addListener('registrationError', (error) => {
        console.warn('[FCMService] Native registration error:', error);
      });

      // Push notification received while app is running (foreground or active)
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[FCMService] Push received:', notification);
        const data = notification.data || {};
        const notificationType = data.type || data.notification_type || '';

        // Check if this is an incoming call
        if (notificationType === 'incoming_call' || data.callId || data.call_id) {
          const callSession = this.extractCallSessionData(notification);
          this.notifyIncomingCallListeners(callSession);
          return;
        }

        // Standard message or alert
        this.dispatchForegroundNotification({
          type: 'fcm_foreground_push',
          title: notification.title,
          body: notification.body,
          data: data,
          timestamp: new Date().toISOString()
        });
      });

      // Push notification tapped from system tray / lock screen
      PushNotifications.addListener('pushNotificationActionPerformed', (notificationAction) => {
        console.log('[FCMService] Push action performed:', notificationAction);
        const notification = notificationAction?.notification;
        const data = notification?.data || {};
        const notificationType = data.type || data.notification_type || '';

        if (notificationType === 'incoming_call' || data.callId || data.call_id) {
          const callSession = this.extractCallSessionData(notification);
          callSession.actionId = notificationAction.actionId;
          callSession.openedFromNotification = true;
          this.notifyIncomingCallListeners(callSession);
          return;
        }

        this.handleNotificationTap({
          actionId: notificationAction?.actionId,
          notification,
          data,
          chat_id: data.chat_id || data.chatId || data.conversation_id,
          user_id: data.user_id || data.userId || data.sender_id || data.senderId || data.profileId
        });
      });
    } catch (e) {
      console.warn('[FCMService] Failed to init native push listeners:', e);
    }
  }

  /**
   * Helper to format call session data from push payload
   */
  extractCallSessionData(notification) {
    const rawData = notification.data || notification;
    let caller = {};
    if (typeof rawData.caller === 'string') {
      try {
        caller = JSON.parse(rawData.caller);
      } catch (e) {
        caller = { name: rawData.callerName || rawData.caller_name || 'Member' };
      }
    } else if (rawData.caller && typeof rawData.caller === 'object') {
      caller = rawData.caller;
    } else {
      caller = {
        id: rawData.callerId || rawData.caller_id,
        name: rawData.callerName || rawData.caller_name || notification.title || 'Member',
        photo: rawData.callerPhoto || rawData.caller_photo || null,
        city: rawData.callerCity || rawData.caller_city || '',
        profession: rawData.callerProfession || rawData.caller_profession || ''
      };
    }

    return {
      callId: rawData.callId || rawData.call_id || `call_${Date.now()}`,
      channelName: rawData.channelName || rawData.channel_name || `call_session_${rawData.callId || Date.now()}`,
      callType: rawData.callType || rawData.call_type || 'audio',
      caller,
      calleeId: rawData.calleeId || rawData.callee_id || this.getUserIdentifier(this.currentUser),
      timestamp: Number(rawData.timestamp || Date.now()),
      raw: notification
    };
  }

  /**
   * Register device for push notifications (Native & Web)
   */
  async registerForPushNotifications(user) {
    if (!user) return null;
    this.currentUser = user;

    if (this.isNative) {
      try {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
          console.log('[FCMService] Registered for native push notifications');
          return 'granted';
        } else {
          console.warn('[FCMService] Native push notification permission was not granted:', permStatus.receive);
          return permStatus.receive;
        }
      } catch (err) {
        console.warn('[FCMService] Native push registration error:', err);
        return 'error';
      }
    } else {
      // Web Push fallback
      const perm = await this.requestNotificationPermission();
      await this.registerServiceWorker();
      return perm;
    }
  }

  /**
   * Persist push token to Supabase profiles & backend device tokens table
   */
  async saveDeviceTokenToBackend(token, user) {
    if (!token || !user) return;
    const userId = this.getUserIdentifier(user);
    if (!userId) return;

    const platform = this.isNative ? Capacitor.getPlatform() : 'web';
    const nowIso = new Date().toISOString();

    console.log(`[FCMService] Storing ${platform} push token for user ${userId}`);

    // 1. Update Supabase 'profiles' table with FCM token
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({
            fcm_token: token,
            push_token_updated_at: nowIso
          })
          .or(`id.eq.${userId},register_id.eq.${userId}`);
      } catch (e) {
        console.warn('[FCMService] Supabase profile token update notice:', e);
      }

      // 2. Save in dedicated user_device_tokens table (Supabase Edge Function compatible)
      try {
        await supabase.from('user_device_tokens').upsert([
          {
            user_id: String(userId),
            register_id: user.register_id || user.registerId || null,
            platform: platform,
            token: token,
            updated_at: nowIso
          }
        ], { onConflict: 'user_id,platform,token' });
      } catch (e) {
        // Fallback to user_fcm_tokens
        try {
          await supabase.from('user_fcm_tokens').upsert([
            {
              user_id: String(userId),
              token: token,
              platform: platform,
              updated_at: nowIso
            }
          ], { onConflict: 'token' });
        } catch (tokErr) {}
      }
    }

    // 3. Sync with backend API
    try {
      await fetch(`${API_BASE}/public/register-fcm-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: String(userId),
          token: token,
          platform: platform
        })
      });
    } catch (e) {
      // Backend sync error fallback
    }
  }

  /**
   * Dispatch push notification for an incoming audio / video call
   * Uses Supabase 'call_requests' table + Supabase Edge Function 'call-handler'
   */
  async dispatchCallPushNotification({ calleeId, caller, callType = 'audio', callId, channelName }) {
    if (!calleeId || !caller) return false;

    const title = `📞 Incoming ${callType === 'video' ? 'Video' : 'Voice'} Call`;
    const callerName = caller.name || 'A candidate';
    const body = `${callerName} is calling you...`;
    const callerId = String(caller.id || caller.register_id || caller.registerId || '');
    const cleanCallId = String(callId || `call_${Date.now()}`);
    const cleanChannelName = String(channelName || `call-session-${cleanCallId}`);

    // 1. Supabase Native: Record call in 'call_requests' table (triggers Edge Function via pg_net)
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('call_requests').insert([
          {
            id: cleanCallId,
            caller_id: callerId,
            callee_id: String(calleeId),
            caller_name: callerName,
            caller_photo: caller.photo || caller.photo_url || '',
            call_type: callType,
            channel_name: cleanChannelName,
            status: 'ringing',
            created_at: new Date().toISOString()
          }
        ]);
      } catch (err) {
        console.warn('[FCMService] Supabase call_requests insert notice:', err);
      }

      // 2. Direct Supabase Edge Function invocation
      try {
        supabase.functions.invoke('call-handler', {
          body: {
            callId: cleanCallId,
            callerId,
            calleeId: String(calleeId),
            callerName,
            callerPhoto: caller.photo || caller.photo_url || '',
            callType,
            channelName: cleanChannelName
          }
        }).catch((e) => {});
      } catch (fnErr) {
        console.warn('[FCMService] Supabase functions.invoke call-handler notice:', fnErr);
      }
    }

    // 3. Fallback to API backend push
    return this.sendPushNotification({
      recipientId: calleeId,
      title,
      body,
      data: {
        type: 'incoming_call',
        callId: cleanCallId,
        channelName: cleanChannelName,
        callType,
        callerId,
        callerName,
        callerPhoto: caller.photo || caller.photo_url || '',
        callerCity: caller.city || caller.district || '',
        callerProfession: caller.profession || '',
        timestamp: String(Date.now())
      },
      priority: 'high',
      channelId: 'call_notifications_channel',
      sound: 'ringtone'
    });
  }

  /**
   * Dispatch push notification for a chat message
   */
  async dispatchMessagePushNotification({ recipientId, sender, messageText, conversationId }) {
    if (!recipientId || !sender) return false;

    const senderName = sender.name || 'Member';
    const title = `💬 ${senderName}`;
    const body = messageText || 'Sent you a message';

    return this.sendPushNotification({
      recipientId,
      title,
      body,
      data: {
        type: 'chat_message',
        chat_id: String(conversationId || ''),
        chatId: String(conversationId || ''),
        user_id: String(sender.id || sender.register_id || ''),
        userId: String(sender.id || sender.register_id || ''),
        sender_id: String(sender.id || sender.register_id || ''),
        senderName,
        messageText: body,
        timestamp: String(Date.now())
      },
      priority: 'high',
      channelId: 'messages_channel'
    });
  }

  /**
   * Send push notification via backend API or Supabase Edge
   */
  async sendPushNotification({ recipientId, title, body, data = {}, priority = 'high', channelId = 'messages_channel', sound }) {
    if (!recipientId) return false;

    try {
      const response = await fetch(`${API_BASE}/public/send-push-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: String(recipientId),
          title,
          body,
          data,
          priority,
          channel_id: channelId,
          sound
        })
      });

      if (response.ok) {
        const resData = await response.json();
        console.log('[FCMService] Push dispatched successfully:', resData);
        return true;
      }
    } catch (err) {
      console.warn('[FCMService] Backend push notification dispatch note:', err);
    }

    return false;
  }

  /**
   * Helper to robustly extract exact chat_id and user_id from any notification payload structure
   */
  extractNotificationData(payload) {
    if (!payload) return { chatId: null, userId: null, data: {} };
    
    const rawData = payload.data || payload.notification?.data || payload.detail?.data || payload.detail || payload;
    const notification = payload.notification || payload;

    const rawChatId = rawData.chat_id || 
                      rawData.chatId || 
                      rawData.conversation_id || 
                      rawData.conversationId || 
                      payload.chat_id || 
                      payload.chatId || 
                      payload.conversation_id ||
                      null;

    const rawUserId = rawData.user_id || 
                     rawData.userId || 
                     rawData.sender_id || 
                     rawData.senderId || 
                     rawData.profile_id || 
                     rawData.profileId || 
                     rawData.target_id || 
                     rawData.targetId || 
                     payload.user_id || 
                     payload.userId || 
                     payload.sender_id || 
                     payload.senderId || 
                     payload.profileId || 
                     null;

    const title = notification.title || rawData.title || '';
    const body = notification.body || rawData.body || rawData.message || rawData.text || '';

    return {
      chatId: rawChatId ? String(rawChatId).trim() : null,
      userId: rawUserId ? String(rawUserId).trim() : null,
      title,
      body,
      data: rawData,
      raw: payload
    };
  }

  /**
   * Subscribes to incoming call events (foreground or push notification tap)
   */
  onIncomingCall(callback) {
    if (typeof callback !== 'function') return () => {};
    this.incomingCallListeners.add(callback);
    return () => {
      this.incomingCallListeners.delete(callback);
    };
  }

  notifyIncomingCallListeners(callSession) {
    this.incomingCallListeners.forEach((cb) => {
      try {
        cb(callSession);
      } catch (err) {
        console.warn('[FCMService] onIncomingCall callback error:', err);
      }
    });

    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'fcm_incoming_call',
          payload: callSession
        });
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fcm_incoming_call', { detail: callSession }));
      }
    } catch (e) {}
  }

  /**
   * Subscribes to push notification tap / open events
   */
  onMessageOpenedApp(callback) {
    if (typeof callback !== 'function') return () => {};
    this.openedAppListeners.add(callback);
    return () => {
      this.openedAppListeners.delete(callback);
    };
  }

  handleNotificationTap(payload) {
    if (!payload) return;
    const extracted = this.extractNotificationData(payload);

    this.notifyOpenedAppListeners(extracted);

    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'fcm_message_opened_app',
          payload: extracted
        });
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fcm_message_opened_app', { detail: extracted }));
      }
    } catch (e) {}
  }

  notifyOpenedAppListeners(extractedData) {
    this.openedAppListeners.forEach((cb) => {
      try {
        cb(extractedData);
      } catch (err) {
        console.warn('[FCMService] onMessageOpenedApp callback error:', err);
      }
    });
  }

  subscribeToForegroundFCM(callback) {
    if (typeof callback !== 'function') return () => {};
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners(payload) {
    this.listeners.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.warn('[FCMService] Listener callback error:', err);
      }
    });
  }

  /**
   * Register Service Worker for background push notifications
   */
  async registerServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      return reg;
    } catch (err) {
      console.warn('[FCMService] Service worker registration note:', err);
      return null;
    }
  }

  /**
   * Request push notification permission from user
   */
  async requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    try {
      if (Notification.permission === 'granted') return 'granted';
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('[FCMService] Request permission error:', e);
      return 'denied';
    }
  }

  /**
   * Show native system Web Notification (foreground or background)
   */
  async showWebNotification({ title, body, icon, data = {}, tag }) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const notifTitle = title || 'I 4 You Matrimony';
    const options = {
      body: body || 'You have a new update.',
      icon: icon || '/brand-logo.png',
      badge: '/favicon.png',
      tag: tag || data.id || `notif_${Date.now()}`,
      data,
      renotify: true
    };

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && typeof registration.showNotification === 'function') {
          return await registration.showNotification(notifTitle, options);
        }
      }
    } catch (e) {}

    try {
      const n = new Notification(notifTitle, options);
      n.onclick = () => {
        window.focus();
        this.handleNotificationTap(data);
        n.close();
      };
    } catch (e) {}
  }

  dispatchForegroundNotification(payload) {
    if (!payload) return;
    this.notifyListeners(payload);

    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ payload });
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fcm_notification_received', { detail: payload }));
      }
    } catch (e) {}

    if (typeof document !== 'undefined' && (document.visibilityState === 'hidden' || payload.forceWebPush)) {
      this.showWebNotification({
        title: payload.title,
        body: payload.body || payload.message,
        data: payload.data || payload
      });
    }
  }
}

export const fcmNotificationService = new FCMNotificationService();
export default fcmNotificationService;
