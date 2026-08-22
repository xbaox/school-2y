/* ============================================================
   sw.js — service worker, offline-first (раздел 3 ТЗ).
   VERSION поднимается при каждом деплое: старый кэш стирается,
   новый набирается заново.
   Пути относительные — приложение живёт в подпапке GitHub Pages.
   ============================================================ */

var VERSION = 'v2.2.0';
var SHELL = 'shell-' + VERSION;
var FONTS = 'fonts-v1';

/* Оболочка приложения. Файлы контента лежат тут же — фазы приезжают
   заменой файла и подъёмом VERSION. */
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles.css',
  './util.js',
  './doctrine.js',
  './pace.js',
  './steps.js',
  './state.js',
  './prompts.js',
  './ui.js',
  './sync.js',
  './waterfall.js',
  './stepsflow.js',
  './app.js',
  './lesson.js',
  './program.js',
  './radar.js',
  './journal.js',
  './settings.js',
  './onboarding.js',
  './content/registry.js',
  './content/phase0.js',
  './content/phase1.js',
  './content/phase2.js',
  './content/phase3.js',
  './content/phase4.js',
  './content/phase5.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (cache) {
      // addAll падает целиком, если хоть один файл не отдался, — кладём по одному
      return Promise.all(ASSETS.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function (err) {
          console.warn('[sw] не закэшировал', url, err);
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL && k !== FONTS) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data === 'version' && e.source) e.source.postMessage({ version: VERSION });
  if (e.data === 'skip-waiting') self.skipWaiting();
});

function isFont(url) {
  return url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com';
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // шрифты: отдаём из кэша, в фоне освежаем
  if (isFont(url)) {
    e.respondWith(
      caches.open(FONTS).then(function (cache) {
        return cache.match(req).then(function (hit) {
          var net = fetch(req).then(function (res) {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
    return;
  }

  // всё остальное чужое (Supabase) — только сеть, без кэша
  if (url.origin !== self.location.origin) return;

  // переходы: оболочка из кэша, иначе сеть
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(function (hit) {
        return hit || fetch(req);
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(SHELL).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
