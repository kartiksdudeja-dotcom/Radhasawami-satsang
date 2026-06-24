// Service Worker Version: 1.0.6 (Background Push Fix)
const CACHE_NAME = 'rs-root-v23';

self.addEventListener('install', event => {
  console.log('👷 SW Root 1.0.6: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('🚀 SW Root 1.0.6: Activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 🔔 PUSH NOTIFICATION HANDLER - WORKS IN BACKGROUND
self.addEventListener('push', event => {
  console.log('📬 SW 1.0.6: Push event received at:', new Date().toISOString());

  let data = { title: 'Radha Swami Portal', body: 'New update available' };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
      console.log('📬 Push data parsed:', data.title, '-', data.body);
    }
  } catch (e) {
    console.log('📬 Push used text mode');
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body || data.message || 'New update from Radha Swami Portal',
    icon: 'https://cdn-icons-png.flaticon.com/512/1827/1827347.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/1827/1827347.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'rs-notif-' + (data.id || Date.now()),
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  const promiseChain = self.registration.showNotification(
    data.title || 'Radha Swami Portal',
    options
  ).catch(err => {
    console.error('❌ Notification popup failed:', err);
    return self.registration.showNotification('New Message', {
      body: 'You have a new update from RS Portal.',
      icon: 'https://cdn-icons-png.flaticon.com/512/1827/1827347.png',
      requireInteraction: true
    });
  });

  event.waitUntil(promiseChain);
});

// Notification Click Handler
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification Clicked');
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(urlToOpen);
      })
  );
});
