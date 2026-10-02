const CACHE = 'perc-v1.3.0';
const CORE = ['./','index.html','about.html','privacy.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, {cache:'reload'}))).catch(()=>{})));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('perc-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = /^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== self.location.origin && !fonts) return;
  if (url.pathname.endsWith('/preview.html')) return;   // review page: always fresh from the network
  e.respondWith(
    caches.open(CACHE).then(c => c.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res && (res.status === 200 || res.type === 'opaque')) c.put(req, res.clone());
        return res;
      }).catch(() => cached || (req.mode === 'navigate' ? c.match('./') : Response.error()));
      return cached || net;
    }))
  );
});
