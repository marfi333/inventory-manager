/// <reference lib="WebWorker" />

import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
self.addEventListener('activate', () => {
  void self.clients.claim()
})

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//],
  })
)

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') && url.pathname !== '/api/',
  new NetworkFirst({
    cacheName: 'api-get-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
  'GET'
)

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
)

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
