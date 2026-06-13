const CACHE_NAME = 'coachpro-v1'

// Встановлення
self.addEventListener('install', (e) => {
  self.skipWaiting()
})

// Активація — видаляємо старі кеші
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — стратегія: Network First для API, Cache First для статики
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Supabase запити — тільки мережа (не кешуємо дані)
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(fetch(e.request))
    return
  }

  // Google Fonts — Cache First
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached
        return fetch(e.request).then(res => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
          return res
        })
      })
    )
    return
  }

  // JS/CSS/assets — Cache First, fallback to network
  if (
    url.pathname.match(/\.(js|css|png|svg|ico|webp|jpg|jpeg|woff2?)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached
        return fetch(e.request).then(res => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
          return res
        })
      })
    )
    return
  }

  // HTML — Network First, fallback to cache (офлайн підтримка)
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
