/* Macrohard Doors OS — Service Worker (offline cache) */
const CACHE='macrohard-v1';
const ASSETS=['./','./index.html','./assets/site.css','./assets/app.js','./manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{if(resp&&resp.status===200&&e.request.method==='GET'){const c=resp.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));}return resp;}).catch(()=>caches.match(e.request))));});