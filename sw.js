const CACHE_NAME = 'bff-quiz-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiw7p4ddixu5QjJ3yDAgIvAkrzFGNk2h_KOeDn9TzsljOPRHnPyRSmDZu4VoYPOwi1lr24VikemKzvNUveFGlhB8ersbf3FSCSjYZ7YxMU7d9AuEtMqbUS3exY19hcFQ0SSSJBstOIy3yGUGwKF9i51TSlu677sZuapKQhNGOkFg2J4uF8PoRuau5_YJwRx/s1080/Picsart_25-10-05_22-20-31-071.jpg"
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
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
        return fetch(event.request);
      }
    )
  );
});