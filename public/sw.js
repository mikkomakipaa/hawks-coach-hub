/**
 * Service Worker for Hawks Coach Hub
 * Provides offline functionality and intelligent caching
 */

const CACHE_NAME = 'hawks-coach-hub-v1.0.0';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const GOOGLE_DRIVE_CACHE = `${CACHE_NAME}-drive`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles-minimal.css',
  '/dist/index.js',
  '/manifest.json',
  // Add other critical static assets
];

// Google Drive API patterns to cache
const DRIVE_API_PATTERNS = [
  /\/api\/drive/,
  /drive\.googleapis\.com/,
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

/**
 * Install event - cache static assets
 */
self.addEventListener('install', event => {
  console.log('🔧 Service Worker installing...');

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),

      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', event => {
  console.log('✅ Service Worker activating...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.includes('hawks-coach-hub') && cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE && cacheName !== GOOGLE_DRIVE_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),

      // Take control of all pages
      self.clients.claim()
    ])
  );
});

/**
 * Fetch event - handle all network requests
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Determine cache strategy based on request
  let strategy = getCacheStrategy(request, url);

  event.respondWith(
    handleRequest(request, url, strategy)
  );
});

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', event => {
  console.log('🔄 Background sync:', event.tag);

  if (event.tag === 'drive-sync') {
    event.waitUntil(syncDriveData());
  }
});

/**
 * Push notification handling
 */
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: data.tag || 'default',
      requireInteraction: false,
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

/**
 * Determine appropriate cache strategy for request
 */
function getCacheStrategy(request, url) {
  // Static assets - cache first
  if (STATIC_ASSETS.includes(url.pathname) ||
      url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff2|woff)$/)) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }

  // Google Drive API - stale while revalidate with longer TTL
  if (DRIVE_API_PATTERNS.some(pattern => pattern.test(url.href))) {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }

  // HTML pages - network first with fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }

  // Default - network first
  return CACHE_STRATEGIES.NETWORK_FIRST;
}

/**
 * Handle request with specified strategy
 */
async function handleRequest(request, url, strategy) {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);

    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);

    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, url);

    default:
      return fetch(request);
  }
}

/**
 * Cache first strategy
 */
async function cacheFirst(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network first strategy
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);

    if (response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('Network failed, trying cache:', error);

    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // Return offline page for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Hawks Coach Hub - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              text-align: center;
              padding: 2rem;
              background: #0f172a;
              color: white;
            }
            .offline-message {
              max-width: 400px;
              margin: 0 auto;
            }
            .hawks-logo {
              font-size: 3rem;
              margin-bottom: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <div class="hawks-logo">🏒</div>
            <h1>Hawks Coach Hub</h1>
            <p>You're currently offline. Please check your connection and try again.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response('Offline', { status: 503 });
  }
}

/**
 * Stale while revalidate strategy
 */
async function staleWhileRevalidate(request, url) {
  const cacheName = DRIVE_API_PATTERNS.some(pattern => pattern.test(url.href))
    ? GOOGLE_DRIVE_CACHE
    : DYNAMIC_CACHE;

  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Start fetch in background
  const fetchPromise = fetch(request).then(response => {
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // Return cached version immediately if available
  if (cached) {
    // Don't wait for background fetch
    fetchPromise;
    return cached;
  }

  // If no cache, wait for network
  return fetchPromise || new Response('Offline', { status: 503 });
}

/**
 * Sync Google Drive data in background
 */
async function syncDriveData() {
  try {
    const response = await fetch('/api/drive?type=both');
    if (response.ok) {
      const cache = await caches.open(GOOGLE_DRIVE_CACHE);
      cache.put('/api/drive?type=both', response.clone());
      console.log('🔄 Drive data synced in background');
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

/**
 * Periodic background sync (if supported)
 */
self.addEventListener('periodicsync', event => {
  if (event.tag === 'drive-update') {
    event.waitUntil(syncDriveData());
  }
});

/**
 * Message handling from main thread
 */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0].postMessage(stats);
    });
  }
});

/**
 * Get cache statistics
 */
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    stats[cacheName] = requests.length;
  }

  return {
    totalCaches: cacheNames.length,
    cacheDetails: stats,
    timestamp: Date.now()
  };
}