/* Macrohard Doors OS — Service Worker
 * v2 — stale-while-revalidate, network-first for AMI BIOS,
 * offline fallback, quota check, cache versioning
 */
const CACHE='macrohard-v2-11-46';
const STATIC_ASSETS=['./','./index.html','./assets/site.css','./assets/app.js','./manifest.json','./assets/ami-bios-setup.html'];
const FALLBACK='<html><head><meta charset="utf-8"/><title>Offline — MakerOS</title><style>body{background:#0d0e0f;color:#e3e2e2;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}</style></head><body><div><h1>⬢ OFFLINE</h1><p>Keine Verbindung. Check deine Netzwerkverbindung.</p><p style="font-size:10px;color:#849493">Refresh zum Retry</p></div></body></html>';

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(STATIC_ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())
  );
});

async function quotaOk(){
  try{
    const est=await navigator.storage.estimate();
    if(est&&est.quota&&est.usage){
      const pct=est.usage/est.quota;
      if(pct>0.8){self.registration.showNotification('MakerOS',{body:'Speicher fast voll — Cache wird nicht erweitert'});return false;}
    }
  }catch(e){}
  return true;
}

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  const isAMI=url.pathname.endsWith('ami-bios-setup.html');
  const isStatic=/assets\/site\.css|assets\/app\.js|manifest\.json/.test(url.pathname);

  if(isStatic){
    /* Stale-While-Revalidate: cache first, update in background */
    e.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const cached=await cache.match(e.request);
      const fetchPromise=fetch(e.request).then(resp=>{
        if(resp&&resp.status===200){cache.put(e.request,resp.clone());}
        return resp;
      }).catch(()=>cached);
      return cached||fetchPromise;
    })());
  }else if(isAMI){
    /* Network-first: always fresh BIOS setup page */
    e.respondWith((async()=>{
      try{
        const net=await fetch(e.request);
        if(net&&net.status===200){
          const cache=await caches.open(CACHE);
          cache.put(e.request,net.clone());
          return net;
        }
      }catch(e){}
      const cache=await caches.open(CACHE);
      return cache.match(e.request)||new Response(FALLBACK,{headers:{'Content-Type':'text/html'}});
    })());
  }else{
    /* Generic: cache-first, offline fallback */
    e.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const cached=await cache.match(e.request);
      if(cached)return cached;
      try{
        const net=await fetch(e.request);
        if(net&&net.status===200&&e.request.method==='GET'){
          quotaOk().then(ok=>{if(ok)cache.put(e.request,net.clone());});
        }
        return net;
      }catch(e){
        if(e.request.destination==='document')return new Response(FALLBACK,{headers:{'Content-Type':'text/html'}});
        return new Response('',{status:503});
      }
    })());
  }
});