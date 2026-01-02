// sw.js - Service Worker for Testament Trustee PWA
const CACHE_NAME = 'testament-trustee-v2.0.0';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful API responses
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache for GET requests
          if (request.method === 'GET') {
            return caches.match(request);
          }
          return new Response(JSON.stringify({
            error: 'Offline - API unavailable'
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Static assets - cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) {
          console.log('[SW] Serving from cache:', request.url);
          return cached;
        }

        console.log('[SW] Fetching:', request.url);
        return fetch(request).then(response => {
          // Cache successful responses
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
      .catch(err => {
        console.error('[SW] Fetch failed:', err);

        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/');
        }

        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

// Background sync for offline verification
self.addEventListener('sync', event => {
  if (event.tag === 'verify-records') {
    console.log('[SW] Background sync: verify-records');
    event.waitUntil(syncVerifications());
  }
});

async function syncVerifications() {
  // Get pending verifications from IndexedDB
  const db = await openDB();
  const tx = db.transaction('verifications', 'readonly');
  const store = tx.objectStore('verifications');
  const pending = await store.getAll();

  // Process each verification
  for (const verification of pending) {
    try {
      const response = await fetch(`/api/record/${verification.rid}`);
      const bytes = await response.arrayBuffer();
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      const hashHex = Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Store result
      const resultTx = db.transaction('verifications', 'readwrite');
      const resultStore = resultTx.objectStore('verifications');
      await resultStore.put({
        ...verification,
        verified: hashHex === verification.rid,
        timestamp: Date.now()
      });

      console.log('[SW] Verified:', verification.rid);
    } catch (err) {
      console.error('[SW] Verification failed:', err);
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('testament-trustee', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('verifications')) {
        db.createObjectStore('verifications', { keyPath: 'rid' });
      }
    };
  });
}

// Push notifications (future feature)
self.addEventListener('push', event => {
  console.log('[SW] Push received');

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Testament Trustee';
  const options = {
    body: data.body || 'New ULP record available',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    data: data
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

console.log('[SW] Service Worker loaded');
