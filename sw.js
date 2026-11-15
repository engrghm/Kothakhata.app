// কথাখাতা service worker: offline cache + notification clicks.
const CACHE = 'kothakhata-v1';
const FILES = ['./', 'index.html', 'app.html', 'css/tokens.css', 'css/site.css', 'js/site.js', 'privacy.html', 'manifest.webmanifest', 'css/app.css', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/app.js', 'js/i18n.js', 'js/db.js', 'js/model.js', 'js/util.js', 'js/ui.js', 'js/voice.js', 'js/reminders.js', 'js/router.js',
  'js/screens/money.js', 'js/screens/plans.js', 'js/screens/life.js', 'js/screens/settings.js', 'js/screens/voicepad.js'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });

// network first for app files (so updates show), cache fallback offline
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
  } else if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com') || (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/potasiyam/Kalpurush@'))) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })));
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => { for (const c of cs) if ('focus' in c) return c.focus(); return self.clients.openWindow('./app.html#/alarms'); }));
});
