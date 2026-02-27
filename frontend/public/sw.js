// Service worker auto-cleanup
// This file replaces a stale precache SW that was blocking page loads.
// On next production build (next build), next-pwa will regenerate this file properly.

// Unregister self and clear all caches
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
  )
})
