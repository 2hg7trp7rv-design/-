const CACHE_NAME = 'mogumogu-smack-v13';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './pwa-icon.svg',
  './pwa-icon-192.png',
  './pwa-icon-512.png',
  './pwa-maskable-512.png',
  './apple-touch-icon.png',
  './game-assets/mogumogu_transparent_01.png',
  './game-assets/mogumogu_transparent_02.png',
  './game-assets/mogumogu_transparent_03.png',
  './game-assets/mogumogu_transparent_04.png',
  './game-assets/mogumogu_transparent_05.png',
  './game-assets/mogumogu_transparent_06.png',
  './game-assets/mogumogu_transparent_07.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) => cacheName.startsWith('mogumogu-smack-') && cacheName !== CACHE_NAME,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/__/auth/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html').then((cached) => cached ?? Response.error())),
    );
    return;
  }

  const isStaticAsset =
    url.pathname.includes('/assets/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css');

  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }

          return response;
        })
        .catch(() => cached);

      return cached ?? networkFetch;
    }),
  );
});
