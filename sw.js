/* Campfire service worker: keeps the app's files on the device so it opens without a signal.
   The app itself always comes from the internet when there is a signal (so nobody is left on an old copy);
   the saved copy is used only offline. Sounds and icons come from the device and refresh in the background.
   Firebase sign-in and sync go straight to the network (and Firestore keeps its own offline copy). */
const VERSION = 'campfire-40a9fcbbd5';
const SHELL = ['snd-bell-0.mp3', 'snd-chain-0.mp3', 'snd-chain-1.mp3', 'snd-chain-2.mp3', 'snd-coins-0.mp3', 'snd-coins-1.mp3', 'snd-creak-0.mp3', 'snd-creak-1.mp3', 'snd-dice-0.mp3', 'snd-dice-1.mp3', 'snd-dice-2.mp3', 'snd-dice-3.mp3', 'snd-dooropen-0.mp3', 'snd-drip-0.mp3', 'snd-drip-1.mp3', 'snd-drip-2.mp3', 'snd-drum-0.mp3', 'snd-drum-1.mp3', 'snd-drum-2.mp3', 'snd-explosion-0.mp3', 'snd-explosion-1.mp3', 'snd-firewhoosh-0.mp3', 'snd-firewhoosh-1.mp3', 'snd-glass-0.mp3', 'snd-glass-1.mp3', 'snd-glass-2.mp3', 'snd-growl-0.mp3', 'snd-hit-0.mp3', 'snd-hit-1.mp3', 'snd-hit-2.mp3', 'snd-howl-0.mp3', 'snd-knock-0.mp3', 'snd-knock-1.mp3', 'snd-loop-crickets.mp3', 'snd-loop-fire.mp3', 'snd-loop-rain.mp3', 'snd-loop-wind.mp3', 'snd-metalhit-0.mp3', 'snd-metalhit-1.mp3', 'snd-owl-0.mp3', 'snd-roar-0.mp3', 'snd-roar-1.mp3', 'snd-roar-2.mp3', 'snd-spell-0.mp3', 'snd-spell-1.mp3', 'snd-step-0.mp3', 'snd-step-1.mp3', 'snd-step-2.mp3', 'snd-step-3.mp3', 'snd-sting-0.mp3', 'snd-swell-0.mp3', 'snd-swish-0.mp3', 'snd-swish-1.mp3', 'snd-swish-2.mp3', 'snd-sword-0.mp3', 'snd-sword-1.mp3', 'snd-sword-2.mp3', 'snd-sword-3.mp3', 'snd-thunder-0.mp3', 'snd-thunk-0.mp3', 'snd-thunk-1.mp3', 'snd-victory-0.mp3', 'snd-wail-0.mp3', 'snd-wail-1.mp3', 'snd-whoosh-0.mp3', 'snd-whoosh-1.mp3', './', 'index.html', 'firebase.js', 'firebase-config.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
/* on an update: drop old copies, take over open pages, and reload any page that didn't start (an old broken copy) */
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => {
    const old = keys.filter(k => k !== VERSION);
    return Promise.all(old.map(k => caches.delete(k))).then(() => self.clients.claim()).then(() => old.length ? rescue() : null);
  }));
});
function rescue() {
  return self.clients.matchAll({ type: 'window' }).then(cs => Promise.all(cs.map(c => new Promise(done => {
    const ch = new MessageChannel(); let alive = false;
    ch.port1.onmessage = () => { alive = true; };
    try { c.postMessage({ t: 'cf-ping' }, [ch.port2]); } catch (x) { }
    setTimeout(() => { if (!alive && c.navigate) c.navigate(c.url).catch(() => { }); done(); }, 2500);
  }))));
}
const isApp = (req, url) => req.mode === 'navigate' || /\.(html|js|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/');
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const key = req.mode === 'navigate' ? new Request('index.html') : req;
  const save = res => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(key, copy)); } return res; };
  if (isApp(req, url)) {
    /* the internet first (checked with the server, never a stale copy), the saved copy only when offline */
    const net = fetch(req.mode === 'navigate' ? new Request(url.href, { cache: 'no-cache', credentials: 'same-origin' }) : new Request(req, { cache: 'no-cache' }));
    const slow = new Promise(r => setTimeout(r, 8000)).then(() => caches.match(key, { ignoreSearch: true }));
    e.respondWith(Promise.race([net.then(save), slow.then(hit => hit || net)]).catch(() => caches.match(key, { ignoreSearch: true }))
      .then(res => res || new Response('Campfire is offline and hasn’t been saved on this device yet. Connect once to install it.',
        { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })));
    return;
  }
  /* sounds and icons: from the device straight away, refreshed in the background */
  const fresh = fetch(req).then(save).catch(() => null);
  e.waitUntil(fresh.then(() => undefined));
  e.respondWith(caches.match(key, { ignoreSearch: true }).then(hit => hit || fresh.then(res => res || new Response('', { status: 504 }))));
});
/* notifications from Campfire's Cloud Function, sent only to players who switched them on in the menu */
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    /* the app is open and in front: it shows this itself */
    if (cs.some(c => c.visibilityState === 'visible' && c.focused)) return;
    return self.registration.showNotification(d.title || 'Campfire', { body: d.body || '', tag: d.tag || 'campfire', renotify: !d.quiet, silent: !!d.quiet,
      icon: 'icon-192.png', data: { url: d.url || self.registration.scope } });
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.startsWith(self.registration.scope));
    return c ? c.focus() : self.clients.openWindow(url);
  }));
});
