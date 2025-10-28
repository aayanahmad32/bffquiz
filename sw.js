// Service Worker for BFF Quiz PWA
const CACHE_NAME = 'bff-quiz-v1.0.0';
const RUNTIME_CACHE = 'bff-quiz-runtime-v1';

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sitemap.xml',
  '/robots.txt',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiw7p4ddixu5QjJ3yDAgIvAkrzFGNk2h_KOeDn9TzsljOPRHnPyRSmDZu4VoYPOwi1lr24VikemKzvNUveFGlhB8ersbf3FSCSjYZ7YxMU7d9AuEtMqbUS3exY19hcFQ0SSSJBstOIy3yGUGwKF9i51TSlu677sZuapKQhNGOkFg2J4uF8PoRuau5_YJwRx/s1080/Picsart_25-10-05_22-20-31-071.jpg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests (except for specific domains)
  if (url.origin !== location.origin && 
      !url.hostname.includes('googleapis.com') && 
      !url.hostname.includes('gstatic.com') &&
      !url.hostname.includes('blogger.googleusercontent.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          // For HTML files, always try network first
          if (request.destination === 'document') {
            return fetch(request)
              .then((networkResponse) => {
                // Cache the new response
                if (networkResponse.ok) {
                  const responseClone = networkResponse.clone();
                  caches.open(RUNTIME_CACHE)
                    .then((cache) => cache.put(request, responseClone));
                }
                return networkResponse;
              })
              .catch(() => cachedResponse);
          }
          return cachedResponse;
        }
        
        // Try network
        return fetch(request)
          .then((networkResponse) => {
            // Cache successful responses
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              
              // Cache strategy based on content type
              if (request.destination === 'script' || 
                  request.destination === 'style' ||
                  request.destination === 'image') {
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(request, responseClone));
              } else {
                caches.open(RUNTIME_CACHE)
                  .then((cache) => cache.put(request, responseClone));
              }
            }
            
            return networkResponse;
          })
          .catch(() => {
            // Offline fallback for HTML pages
            if (request.destination === 'document') {
              return caches.match('/') || 
                     new Response('Offline - Please check your connection', {
                       status: 503,
                       statusText: 'Service Unavailable'
                     });
            }
            
            // Return offline image placeholder
            if (request.destination === 'image') {
              return new Response(
                '<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#252548"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#ff6bcb" font-size="14">🔥</text></svg>',
                {
                  headers: { 'Content-Type': 'image/svg+xml' }
                }
              );
            }
          });
      })
  );
});

// Background sync for quiz data
self.addEventListener('sync', (event) => {
  if (event.tag === 'quiz-sync') {
    event.waitUntil(syncQuizData());
  }
});

// Sync quiz data when online
async function syncQuizData() {
  try {
    // Get all pending quiz data from IndexedDB
    const pendingData = await getPendingQuizData();
    
    // Send to server
    for (const data of pendingData) {
      await sendQuizData(data);
    }
    
    console.log('[SW] Quiz data synced successfully');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New quiz challenge awaits!',
    icon: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiw7p4ddixu5QjJ3yDAgIvAkrzFGNk2h_KOeDn9TzsljOPRHnPyRSmDZu4VoYPOwi1lr24VikemKzvNUveFGlhB8ersbf3FSCSjYZ7YxMU7d9AuEtMqbUS3exY19hcFQ0SSSJBstOIy3yGUGwKF9i51TSlu677sZuapKQhNGOkFg2J4uF8PoRuau5_YJwRx/s1080/Picsart_25-10-05_22-20-31-071.jpg',
    badge: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23ff6bcb%22/%3E%3Ctext y=%22.9em%22 font-size=%2290%22 text-anchor=%22middle%22 fill=%22white%22%3E🔥%3C/text%3E%3C/svg%3E',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open Quiz',
        icon: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22white%22%3E%3Cpath d=%22M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z%22/%3E%3C/svg%3E'
      },
      {
        action: 'close',
        title: 'Close',
        icon: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22white%22%3E%3Cpath d=%22M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z%22/%3E%3C/svg%3E'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('BFF Quiz', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions for IndexedDB
async function getPendingQuizData() {
  // Implementation for getting pending data from IndexedDB
  return [];
}

async function sendQuizData(data) {
  // Implementation for sending data to server
  return true;
}