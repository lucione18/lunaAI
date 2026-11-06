// sw.js - lets Luna open with no internet (songs are kept on the phone already)
const CACHE = "luna-v1";
const FILES = ["./", "index.html", "manifest.webmanifest", "css/app.css", "icons/icon-192.png", "icons/icon-512.png",
  "js/app.js", "js/pix.js", "js/wear.js", "js/scene.js", "js/scene1.js", "js/scene2.js", "js/body.js", "js/behavior.js", "js/player.js", "js/store.js", "js/tags.js", "js/brain.js", "js/brain_data.js", "js/icons.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
