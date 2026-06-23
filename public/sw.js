// CoachPro Service Worker — network-only для коду, кеш лише офлайн-фолбек
// Версію піднято на v4 — примусово викидає старі кеші
const CACHE = 'coachpro-v4'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k)))) // видаляємо ВСІ старі кеші
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // HTML, JS, CSS — завжди тільки з мережі (без кешу), щоб оновлення було миттєвим
  const isCode = request.mode === 'navigate' ||
    /\.(js|css|html)$/.test(url.pathname) ||
    url.pathname === '/'

  if (isCode) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() => caches.match(request))
    )
    return
  }

  // Інше (картинки, шрифти) — network-first з кешуванням для офлайну
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
        return response
      })
      .catch(() => caches.match(request))
  )
})
