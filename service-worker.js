const CACHE_NAME = 'construerp-v2';

// Cache apenas assets imutáveis (NÃO colocar "/" ou "index.html")
const STATIC_ASSETS = [
  '/manifest.json'
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
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch logic
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET
  if (request.method !== 'GET') return;

  // 🚫 Não interceptar requisições internas do Vercel/Vite
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/@vite/') ||
    url.hostname.includes('vercel') ||
    url.hostname.includes('localhost')
  ) {
    return;
  }

  // 🚫 Nunca cachear index.html
  if (url.pathname === '/' || url.pathname.endsWith('index.html')) {
    return event.respondWith(fetch(request));
  }

  // 🚫 Nunca cachear Supabase
  if (url.hostname.includes('supabase.co')) {
    return event.respondWith(fetch(request).catch(() => caches.match(request)));
  }

  // ✔ Stale-While-Revalidate para assets (CSS/JS/IMAGENS)
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
