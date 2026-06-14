// CoachPro Service Worker — network-first
// Завжди тягне свіже з мережі, кеш — лише як офлайн-резерв
const CACHE = 'coachpro-v3'

self.addEventListener('install', (event) => {
  // Новий SW активується одразу, не чекаючи закриття вкладок
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Зберігаємо свіжу копію у кеш (для офлайну)
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
        return response
      })
      .catch(() => caches.match(request)) // немає мережі → віддаємо з кешу
  )
})
