// Service worker — met l'app en cache pour qu'elle s'ouvre et fonctionne
// hors-ligne une fois installée (tirage, poules, résultats, grille, PV,
// affiches restent utilisables sans connexion ; seuls le téléchargement PDF
// et les mises à jour ont besoin d'internet).
const CACHE_NAME = 'tirage-13c-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=> cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event)=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=> k !== CACHE_NAME).map(k=> caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stratégie : réseau d'abord pour l'app shell (pour récupérer les mises à
// jour), puis repli sur le cache si hors-ligne. Les librairies externes
// (jsPDF, html2canvas, polices) suivent le réseau normalement et ne sont
// pas mises en cache ici : elles ne sont chargées qu'à la demande et
// nécessitent déjà une connexion.
self.addEventListener('fetch', (event)=>{
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return; // laisse passer les CDN externes

  event.respondWith(
    fetch(req).then(res=>{
      const resClone = res.clone();
      caches.open(CACHE_NAME).then(cache=> cache.put(req, resClone));
      return res;
    }).catch(()=> caches.match(req).then(cached=> cached || caches.match('./index.html')))
  );
});
