/**
 * Firebase Cloud Messaging (FCM) Notification Service
 * 
 * Provides real-time stream subscription for foreground push notifications
 * and notification tap handler (FCM onMessageOpenedApp) for Capacitor / Web / Native.
 * Accurately extracts exact chat_id and user_id to route directly to the active chat screen.
 */

class FCMNotificationService {
  constructor() {
    this.listeners = new Set();
    this.openedAppListeners = new Set();
    this.broadcastChannel = null;

    if (typeof window !== 'undefined') {
      // 1. Cross-tab synchronization via BroadcastChannel
      try {
        if (window.BroadcastChannel) {
          this.broadcastChannel = new BroadcastChannel('i4u_fcm_notifications');
          this.broadcastChannel.onmessage = (event) => {
            if (event?.data?.type === 'fcm_message_opened_app' && event.data.payload) {
              this.notifyOpenedAppListeners(event.data.payload);
            } else if (event?.data?.payload) {
              this.notifyListeners(event.data.payload);
            }
          };
        }
      } catch (e) {
        console.warn('[FCMService] BroadcastChannel init note:', e);
      }

      // 2. Custom window event listeners for FCM notifications
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

      // 3. Notification Tap / Open window event listeners
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

      // 4. Service Worker postMessage listener for notification clicks
      try {
        if (navigator?.serviceWorker) {
          navigator.serviceWorker.addEventListener('message', (event) => {
            const data = event.data;
            if (data?.type === 'FCM_NOTIFICATION_OPENED' || data?.type === 'NOTIFICATION_CLICK') {
              this.handleNotificationTap(data.payload || data);
            }
          });
        }
      } catch (e) {}

      // 5. Capacitor Native PushNotification listeners
      this.initCapacitorPushListeners();
    }
  }

  /**
   * Helper to robustly extract exact chat_id and user_id from any notification payload structure
   */
  extractNotificationData(payload) {
    if (!payload) return { chatId: null, userId: null, data: {} };
    
    // Resolve underlying data object (supports Capacitor, Web Push, and direct objects)
    const rawData = payload.data || payload.notification?.data || payload.detail?.data || payload.detail || payload;
    const notification = payload.notification || payload;

    // 1. Extract exact chat_id / conversation_id
    const rawChatId = rawData.chat_id || 
                      rawData.chatId || 
                      rawData.conversation_id || 
                      rawData.conversationId || 
                      payload.chat_id || 
                      payload.chatId || 
                      payload.conversation_id ||
                      null;

    // 2. Extract exact user_id / sender_id
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
   * Subscribes to push notification tap / open events (FCM onMessageOpenedApp)
   * Invoked when User taps a push notification from the system tray or lock screen.
   */
  onMessageOpenedApp(callback) {
    if (typeof callback !== 'function') return () => {};
    this.openedAppListeners.add(callback);
    return () => {
      this.openedAppListeners.delete(callback);
    };
  }

  /**
   * Triggered when a notification is tapped / clicked
   */
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

  initCapacitorPushListeners() {
    if (typeof window === 'undefined') return;
    try {
      const PushNotifications = window.Capacitor?.Plugins?.PushNotifications;
      if (PushNotifications && typeof PushNotifications.addListener === 'function') {
        // Foreground message received
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          this.dispatchForegroundNotification({
            type: 'fcm_foreground_push',
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
            timestamp: new Date().toISOString()
          });
        });

        // Background / System tray notification tapped (Push Notification Action Performed)
        PushNotifications.addListener('pushNotificationActionPerformed', (notificationAction) => {
          const notification = notificationAction?.notification;
          const data = notification?.data || {};
          this.handleNotificationTap({
            actionId: notificationAction?.actionId,
            notification,
            data,
            chat_id: data.chat_id || data.chatId || data.conversation_id,
            user_id: data.user_id || data.userId || data.sender_id || data.senderId || data.profileId
          });
        });
      }
    } catch (e) {
      // Graceful fallback for non-native / web environments
    }
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
  }
}

export const fcmNotificationService = new FCMNotificationService();
export default fcmNotificationService;
