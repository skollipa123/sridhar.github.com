// Service Worker for performance optimization and caching
const CACHE_NAME = 'sridhar-portfolio-v1';
const CACHE_VERSION = '1.0.0';

// Files to cache for offline functionality
const STATIC_CACHE_FILES = [
  '/',
  '/index.html',
  '/styles.min.css',
  '/script.min.js',
  // Add other static assets here
];

// Files that should be cached but updated from network when available
const DYNAMIC_CACHE_FILES = [
  // API endpoints, external resources, etc.
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static files...');
        return cache.addAll(STATIC_CACHE_FILES);
      })
      .then(() => {
        // Force the SW to become active immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external URLs (different origin)
  if (url.origin !== location.origin) {
    return;
  }
  
  event.respondWith(
    cacheFirst(request)
  );
});

// Cache-first strategy with network fallback
async function cacheFirst(request) {
  try {
    // Try to get from cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Return cached version and update in background
      updateCacheInBackground(request);
      return cachedResponse;
    }
    
    // If not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    // Cache the response for future use
    if (networkResponse.ok) {
      await updateCache(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.warn('Fetch failed for', request.url, error);
    
    // Return a fallback response for HTML requests
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }
    
    // For other requests, return a minimal response
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Update cache in background
async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await updateCache(request, networkResponse);
    }
  } catch (error) {
    // Silently handle background update failures
    console.log('Background cache update failed for', request.url);
  }
}

// Update cache with new response
async function updateCache(request, response) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response);
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'GET_VERSION':
        event.ports[0].postMessage({
          type: 'VERSION',
          version: CACHE_VERSION
        });
        break;
      case 'CLEAN_CACHE':
        cleanOldCaches();
        break;
    }
  }
});

// Clean old caches manually
async function cleanOldCaches() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => name !== CACHE_NAME);
  
  await Promise.all(
    oldCaches.map(name => caches.delete(name))
  );
  
  console.log('Cleaned old caches:', oldCaches);
}

// Performance monitoring
self.addEventListener('fetch', (event) => {
  // Monitor cache hit rates
  const startTime = performance.now();
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (response) {
          console.log(`Cache HIT for ${event.request.url} (${duration.toFixed(2)}ms)`);
        } else {
          console.log(`Cache MISS for ${event.request.url} (${duration.toFixed(2)}ms)`);
        }
        
        return response || fetch(event.request);
      })
  );
});