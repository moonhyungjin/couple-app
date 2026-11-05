const CACHE_NAME = 'couple-app-v9';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './auth.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // 인증이 필요한 사진은 캐시에 저장하지 않는다.
  if (event.request.method === 'GET' && event.request.url.includes('/api/photo')) {
    event.respondWith(fetch(event.request));
    return;
  }
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

