/**
 * Service Worker for Push Notifications
 *
 * Handles:
 * - Push notification display
 * - Notification click actions
 * - Background sync (optional)
 */

// Reserved for future asset caching
const _CACHE_NAME = 'soul-lab-v1';

// ============================================
// Install Event
// ============================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

// ============================================
// Activate Event
// ============================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(clients.claim());
});

// ============================================
// Push Event
// ============================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'Soul Lab',
    body: '새로운 메시지가 있습니다.',
    icon: '/icon-192.svg',
    badge: '/badge-72.svg',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error('[SW] Push data parse error:', e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: data.data,
    actions: data.actions || [],
    requireInteraction: true,
    tag: data.type || 'default',
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ============================================
// Notification Click Event
// ============================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  // Handle different actions
  if (action === 'dismiss') {
    return;
  }

  // Default: open the app
  const urlToOpen = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }

      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ============================================
// Notification Close Event
// ============================================

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
  // Could track analytics here
});
