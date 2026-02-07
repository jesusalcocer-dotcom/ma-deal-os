/**
 * Service Worker for Push Notifications
 * M&A Deal OS — Mobile Approval Interface
 */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle push notification events
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'New approval required',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'approval-notification',
    data: {
      url: data.url || '/approval-queue',
      chainId: data.chainId,
    },
    actions: data.actions || [
      { action: 'review', title: 'Review' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'M&A Deal OS',
      options
    )
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/approval-queue';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window or open new
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
