/* Swole Squad service worker.
   Deliberately minimal: it exists to receive push notifications, not to cache.
   Caching pages would risk showing stale leaderboards, which is worse than a
   quick network fetch. */

self.addEventListener('install', (event) => {
  // Take over immediately rather than waiting for old tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Swole Squad', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Swole Squad';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'swole-reminder',
    renotify: false,
    data: { url: data.url || '/' },
    vibrate: [60, 40, 60],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Focus an open tab if we already have one, rather than piling up windows.
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    }),
  );
});
