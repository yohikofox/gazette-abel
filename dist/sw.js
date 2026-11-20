const CACHE='gazette-abel-a902d3800d9d';
const SHELL=["./", "./index.html", "./articles_temporaires.html", "./manifest.webmanifest", "./icons/gazette-192.png", "./icons/gazette-512.png", "./icons/gazette-180.png"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('gazette-abel-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin||request.headers.has('range'))return;
 if(request.mode==='navigate'){event.respondWith((async()=>{try{const response=await fetch(request);if(response.ok)(await caches.open(CACHE)).put('./index.html',response.clone());return response}catch{return(await caches.match('./index.html'))||Response.error()}})());return}
 if(request.destination==='image'||request.destination==='video')return;
 event.respondWith((async()=>{const cached=await caches.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok)(await caches.open(CACHE)).put(request,response.clone());return response})());
});
