/* Campfire service worker: keeps the app's own files on the device so it opens without a signal.
   Firebase sign-in and sync go straight to the network (and Firestore keeps its own offline copy). */
const VERSION = 'campfire-92726f5c1a';
const SHELL = ['./', 'index.html', 'firebase.js', 'firebase-config.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const key = req.mode === 'navigate' ? new Request('index.html') : req;
  // Answer from the device straight away, and refresh the copy in the background for next time.
  const fresh = fetch(req).then(res => {
    if (res && res.ok) return caches.open(VERSION).then(c => c.put(key, res.clone())).then(() => res);
    return res;
  }).catch(() => null);
  e.waitUntil(fresh.then(() => undefined));
  e.respondWith(caches.match(key, { ignoreSearch: true }).then(hit => hit || fresh.then(res => res ||
    new Response('Campfire is offline and hasn’t been saved on this device yet. Connect once to install it.',
      { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))));
});
