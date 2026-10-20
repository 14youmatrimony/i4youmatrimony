/**
 * Firebase Cloud Messaging (FCM) Foreground Notification Service
 * 
 * Provides real-time stream subscription for foreground push notifications.
 * Automatically triggers UI re-renders and data refreshes in chat and conversation lists.
 */

class FCMNotificationService {
  constructor() {
    this.listeners = new Set();
    this.broadcastChannel = null;

    if (typeof window !== 'undefined') {
      // 1. Cross-tab synchronization via BroadcastChannel
      try {
        if (window.BroadcastChannel) {
          this.broadcastChannel = new BroadcastChannel('i4u_fcm_notifications');
          this.broadcastChannel.onmessage = (event) => {
            if (event?.data?.payload) {
              this.notifyListeners(event.data.payload);
            }
          };
        }
      } catch (e) {
        console.warn('[FCMService] BroadcastChannel init note:', e);
      }

      // 2. Custom window event listener for FCM foreground notifications
      window.addEventListener('fcm_notification_received', (event) => {
        if (event?.detail) {
          this.notifyListeners(event.detail);
        }
      });

      // 3. Fallback standard push event listener
      window.addEventListener('push_notification', (event) => {
        if (event?.detail) {
          this.notifyListeners(event.detail);
        }
      });

      // 4. Capacitor Native PushNotification listener if available
      this.initCapacitorPushListeners();
    }
  }

  initCapacitorPushListeners() {
    if (typeof window === 'undefined') return;
    try {
      const PushNotifications = window.Capacitor?.Plugins?.PushNotifications;
      if (PushNotifications && typeof PushNotifications.addListener === 'function') {
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          this.dispatchForegroundNotification({
            type: 'fcm_foreground_push',
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
            timestamp: new Date().toISOString()
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
