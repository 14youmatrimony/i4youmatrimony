/**
 * Service Worker for Web Push Notifications (sw.js)
 * Listens for incoming 'push' events and displays notifications using self.registration.showNotification
 */

// Install immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Claim clients immediately upon activation
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for incoming Web Push events
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
  const title = data.title || notification.title || 'I 4 You Matrimony';
  const options = {
    body: data.body || notification.body || 'You have received a new notification.',
    icon: data.icon || notification.icon || '/favicon.png',
    badge: data.badge || notification.badge || '/favicon.png',
    image: data.image || notification.image || undefined,
    tag: data.tag || notification.tag || 'web-push-notification',
    data: {
      url: data.url || notification.url || '/',
      ...data
    },
    vibrate: [200, 100, 200],
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification tap / click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
