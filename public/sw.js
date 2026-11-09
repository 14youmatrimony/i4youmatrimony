/**
 * I 4 You Matrimony - Standalone Web Push & Background Service Worker
 * Handles background push notifications, incoming call wakeups, and tap actions
 * when the application is closed or running in background.
 */

// Install & activate service worker immediately without waiting
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Background Web Push Notification Event
self.addEventListener('push', (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { body: event.data.text() };
    }
  }

  // Support nested notification object or flat payload
  const notification = payload.notification || payload;
  const type = payload.type || notification.type || 'message';
  const url = payload.url || notification.url || '/';
  const callerName = payload.callerName || notification.callerName || 'A candidate';
  const roomId = payload.roomId || notification.roomId || '';

  let title = payload.title || notification.title || 'I 4 You Matrimony';
  let body = payload.body || notification.body || notification.message || 'You have a new matrimonial notification.';
  let options = {
    icon: payload.icon || notification.icon || '/brand-logo.png',
    badge: payload.badge || notification.badge || '/favicon.png',
    data: {
      url,
      type,
      callerName,
      roomId,
      ...payload
    },
    renotify: true
  };

  // Differentiate notification behavior based on type
  if (type === 'call') {
    title = title || `Incoming Call: ${callerName}`;
    body = body || `${callerName} is calling you...`;
    options = {
      ...options,
      body,
      tag: 'incoming-call',
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300],
      actions: [
        {
          action: 'accept',
          title: 'Accept Call',
          icon: '/favicon.png'
        },
        {
          action: 'decline',
          title: 'Decline',
          icon: '/favicon.png'
        }
      ]
    };
  } else {
    // Standard message or alert notification
    options = {
      ...options,
      body,
      tag: payload.tag || 'chat-message',
      vibrate: [200, 100, 200]
    };
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification Click Handler: Focus existing tab or open application
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action; // 'accept' | 'decline' | '' (body click)
  const notifData = event.notification.data || {};
  let targetUrl = notifData.url || '/';

  // If user declined the call, notify open clients and dismiss
  if (action === 'decline') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({
            type: 'CALL_DECLINED_NOTIFICATION',
            payload: notifData
          });
        }
      })
    );
    return;
  }

  // If user accepted the call, customize destination url if roomId exists
  if (action === 'accept' && notifData.roomId) {
    const separator = targetUrl.includes('?') ? '&' : '?';
    targetUrl = `${targetUrl}${separator}callAction=accept&roomId=${encodeURIComponent(notifData.roomId)}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window tab is already open, focus it and broadcast event
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'PUSH_NOTIFICATION_CLICKED',
            action,
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

// Handle notification dismissal
self.addEventListener('notificationclose', (event) => {
  const notifData = event.notification.data || {};
  if (notifData.type === 'call') {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        client.postMessage({
          type: 'CALL_NOTIFICATION_DISMISSED',
          payload: notifData
        });
      }
    });
  }
});
