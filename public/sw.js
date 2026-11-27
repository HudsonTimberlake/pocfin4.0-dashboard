// PocFin dashboard service worker. It exists only so browsers offer "Install PocFin" (a desktop
// window from the Dock, Start menu or taskbar). It caches nothing and never answers a request
// itself: every page and every amount comes from the network, as in a browser tab, and the
// server's no-store and idle lock work exactly as before.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
