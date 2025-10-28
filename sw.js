const CACHE_NAME = 'bff-quiz-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiw7p4ddixu5QjJ3yDAgIvAkrzFGNk2h_KOeDn9TzsljOPRHnPyRSmDZu4VoYPOwi1lr24VikemKzvNUveFGlhB8ersbf3FSCSjYZ7YxMU7d9AuEtMqbUS3exY19hcFQ0SSSJBstOIy3yGUGwKF9i51TSlu677sZuapKQhNGOkFg2J4uF8PoRuau5_YJwRx/s1080/Picsart_25-10-05_22-20-31-071.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
    .then(response => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      
      // Clone the request because it's a stream
      const fetchRequest = event.request.clone();
      
      return fetch(fetchRequest).then(
        response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response because it's a stream
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }
      );
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});