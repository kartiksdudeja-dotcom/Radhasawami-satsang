// Service Worker Version: FINAL FIXED
const CACHE_NAME = 'rs-portal-v-final';

// ==============================
// INSTALL
// ==============================
self.addEventListener('install', event => {
  console.log('👷 SW: Installing...');
  self.skipWaiting();
});

// ==============================
// ACTIVATE
// ==============================
self.addEventListener('activate', event => {
  console.log('🚀 SW: Activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==============================
// FETCH (optional basic)
// ==============================
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
});

// ============================================
// 🔔 PUSH NOTIFICATION (FINAL FIXED)
// ============================================
self.addEventListener('push', event => {
  console.log('📬 Push received');

  let data = {
    title: 'Radha Swami Portal',
    body: 'New update available',
    url: '/'
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'New message',
    icon: 'https://cdn-icons-png.flaticon.com/512/1827/1827347.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/1827/1827347.png',
    vibrate: [200, 100, 200],
    tag: 'rs-notification',
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || '/'
    }
  };

  // ✅ ONLY ONE waitUntil (CRITICAL FIX)
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Radha Swami Portal',
      options
    )
  );
});

// ==============================
// CLICK HANDLER
// ==============================
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (let client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      })
  );
});

// ==============================
// SUBSCRIPTION CHANGE
// ==============================
self.addEventListener('pushsubscriptionchange', event => {
  console.log('🔄 Subscription changed');
});