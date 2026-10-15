/* Campfire service worker: keeps the app's own files on the device so it opens without a signal.
   Firebase sign-in and sync go straight to the network (and Firestore keeps its own offline copy). */
const VERSION = 'campfire-0936bc5cb0';
const SHELL = ['snd-bell-0.mp3', 'snd-chain-0.mp3', 'snd-chain-1.mp3', 'snd-chain-2.mp3', 'snd-coins-0.mp3', 'snd-coins-1.mp3', 'snd-creak-0.mp3', 'snd-creak-1.mp3', 'snd-dice-0.mp3', 'snd-dice-1.mp3', 'snd-dice-2.mp3', 'snd-dice-3.mp3', 'snd-dooropen-0.mp3', 'snd-drip-0.mp3', 'snd-drip-1.mp3', 'snd-drip-2.mp3', 'snd-drum-0.mp3', 'snd-drum-1.mp3', 'snd-drum-2.mp3', 'snd-explosion-0.mp3', 'snd-explosion-1.mp3', 'snd-firewhoosh-0.mp3', 'snd-firewhoosh-1.mp3', 'snd-glass-0.mp3', 'snd-glass-1.mp3', 'snd-glass-2.mp3', 'snd-growl-0.mp3', 'snd-hit-0.mp3', 'snd-hit-1.mp3', 'snd-hit-2.mp3', 'snd-howl-0.mp3', 'snd-knock-0.mp3', 'snd-knock-1.mp3', 'snd-loop-crickets.mp3', 'snd-loop-fire.mp3', 'snd-loop-rain.mp3', 'snd-loop-wind.mp3', 'snd-metalhit-0.mp3', 'snd-metalhit-1.mp3', 'snd-owl-0.mp3', 'snd-roar-0.mp3', 'snd-roar-1.mp3', 'snd-roar-2.mp3', 'snd-spell-0.mp3', 'snd-spell-1.mp3', 'snd-step-0.mp3', 'snd-step-1.mp3', 'snd-step-2.mp3', 'snd-step-3.mp3', 'snd-sting-0.mp3', 'snd-swell-0.mp3', 'snd-swish-0.mp3', 'snd-swish-1.mp3', 'snd-swish-2.mp3', 'snd-sword-0.mp3', 'snd-sword-1.mp3', 'snd-sword-2.mp3', 'snd-sword-3.mp3', 'snd-thunder-0.mp3', 'snd-thunk-0.mp3', 'snd-thunk-1.mp3', 'snd-victory-0.mp3', 'snd-wail-0.mp3', 'snd-wail-1.mp3', 'snd-whoosh-0.mp3', 'snd-whoosh-1.mp3', './', 'index.html', 'firebase.js', 'firebase-config.js', 'manifest.webmanifest',
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
