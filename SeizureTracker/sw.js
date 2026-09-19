'use strict';
const CACHE = 'still-shell-v2';
const SHELL = ['./','./index.html','./style.css','./app.js','./storage.js','./pwa.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  // Updates wait until old app windows close so an in-progress entry is safe.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('still-shell-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const allowed = SHELL.some(path => new URL(path, self.registration.scope).pathname === url.pathname);
  if (!allowed) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Serve a coherent version of the app shell, including offline launches.
    const response = await cache.match(event.request, {ignoreSearch:true});
    if (response) return response;
    if (event.request.mode === 'navigate') return cache.match('./index.html');
    return fetch(event.request);
  })());
});
