/* PWA Book de vente : seulement les ressources statiques publiques sont mises en cache.
   Le catalogue Supabase, les sessions et les réponses d'API ne sont jamais interceptés. */
'use strict';
const CACHE_NAME = 'book-vente-calais-shell-20261109-v6';
const CACHE_PREFIX = 'book-vente-calais-shell-';
const ROOT = self.registration.scope;
const STATIC_PATHS = [
  './offline.html',
  './styles.css',
  './app.js',
  './auth.js',
  './donnees_catalogue.js',
  './nuanciers-data.js',
  './croquis-editor.js',
  './sketch-atelier.js',
  './sketch-cliparts.js',
  './product-finder.js',
  './supabase.config.js',
  './pwa.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
const assetURL = path => new URL(path, ROOT).href;
const OFFLINE_URL = assetURL('./offline.html');
const allowedAssets = new Set(STATIC_PATHS.map(assetURL));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(STATIC_PATHS.map(assetURL));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith(CACHE_PREFIX) && n !== CACHE_NAME).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(ROOT)) return;

  // Navigation réseau d'abord : ne pas afficher un catalogue périmé ou une session fictive hors ligne.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch (_) {
        return (await caches.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  // Cache limité au code statique ; aucun appel Supabase, aucune photo personnelle/API.
  if (!allowedAssets.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, {ignoreSearch:true});
    const update = fetch(request).then(response => {
      if (response.ok && response.type === 'basic') {
        void cache.put(request, response.clone());
      }
      return response;
    });
    if (cached) {
      event.waitUntil(update.catch(() => undefined));
      return cached;
    }
    try {
      return await update;
    } catch (_) {
      return Response.error();
    }
  })());
});
