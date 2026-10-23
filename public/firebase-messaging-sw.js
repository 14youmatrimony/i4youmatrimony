/**
 * Service Worker for Firebase Cloud Messaging & Web Push Notifications
 * Handles background push delivery and notification click navigation.
 * All comments and logs strictly adhere to English-only guidelines.
 */

// Install & activate service worker immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Background Push Notification Event
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const notification = data.notification || data;
  const title = notification.title || 'I 4 You Matrimony';
  const options = {
    body: notification.body || notification.message || 'You have a new matrimonial notification.',
    icon: notification.icon || '/brand-logo.png',
    badge: '/favicon.png',
    tag: data.tag || data.id || `notif_${Date.now()}`,
    data: data.data || data,
    renotify: true,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification Click Handler: Focus existing tab or open application
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and post event to route to active chat / sheet
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'FCM_NOTIFICATION_OPENED',
            payload: notifData
          });
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
