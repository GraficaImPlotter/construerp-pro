const CACHE_NAME = 'construerp-v3';

const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch Handler
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 🚫 Não interceptar requests não-GET
  if (request.method !== 'GET') return;

  // 🚫 Não interceptar caminhos internos do Vercel/Vite
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/@vite/') ||
    url.hostname.includes('vercel') ||
    url.hostname.includes('localhost')
  ) {
    return;
  }

  // 🚫 Não cachear index.html (evita versões antigas presas no cache)
  if (url.pathname === '/' || url.pathname.endsWith('index.html')) {
    return event.respondWith(fetch(request));
  }

  // 🚫 Não cachear Supabase
  if (url.hostname.includes('supabase.co')) {
    return event.respondWith(fetch(request).catch(() => caches.match(request)));
  }

  // ✔ Static Assets — Stale While Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
          return res;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
