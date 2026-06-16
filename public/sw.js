// Bump this whenever the caching logic changes. On activate, every cache whose
// name doesn't match is deleted, so bumping the version purges all stale assets
// left behind by a previous service worker.
const CACHE_NAME = 'cycle-planner-v4'

self.addEventListener('install', () => {
  // Take over as soon as the new worker is installed instead of waiting for all
  // old tabs to close — paired with clients.claim() below this makes a deploy
  // reach already-open tabs on their next request.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
      await self.clients.claim()
    })()
  )
})

// Only Next's build-output assets are safe to cache-first: their filenames are
// content-hashed, so a new build always requests a new URL and never reuses a
// stale entry. Everything else must hit the network first so a deploy shows up
// immediately instead of being shadowed by a previously cached copy.
function isImmutableAsset(url) {
  return url.pathname.startsWith('/_next/static/')
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never intercept cross-origin requests (Supabase API, third-party CDNs, ...).
  if (url.origin !== self.location.origin) return

  // App API routes (auth etc.): always go to the network, never cache.
  if (url.pathname.startsWith('/api/')) return

  // Content-hashed immutable assets: cache-first for speed/offline.
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            return response
          })
      )
    )
    return
  }

  // Everything else — HTML documents, RSC payloads, icons, fonts, the manifest:
  // network-first so the latest deploy always wins; fall back to cache offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return response
      })
      .catch(() => caches.match(request))
  )
})
