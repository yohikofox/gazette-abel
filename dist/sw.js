const CACHE='gazette-abel-eaa57e5ec5cd';
const SHELL=[
  './','./index.html','./articles_temporaires.html','./manifest.webmanifest',
  './icons/gazette-192.png','./icons/gazette-512.png','./icons/gazette-180.png',
  './assets/embedded/mobile_reading_css.css','./assets/embedded/mobile_reading_js.js',
  './assets/embedded/sorting_sync_js.js','./assets/embedded/genealogy_house_sync_js.js',
  './assets/embedded/qrcode.min.js','./assets/embedded/share_dynamic.js',
  './assets/embedded/share_dynamic.css','./assets/embedded/font_anton.ttf',
  './assets/embedded/font_fell.ttf','./assets/embedded/font_fell_sc.ttf',
  './assets/embedded/masthead_fr.webp','./assets/embedded/masthead_en.webp'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(SHELL.map(path=>new Request(path,{cache:'reload'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys()){
      if(key.startsWith('gazette-abel-')&&key!==CACHE)await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  if(request.destination==='video'||request.headers.has('range'))return;

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const fallback=new URL(request.url).pathname.endsWith('/articles_temporaires.html')
        ? './articles_temporaires.html':'./index.html';
      try{
        const response=await fetch(request,{cache:'no-store'});
        if(response.ok)await cache.put(fallback,response.clone()).catch(()=>{});
        return response;
      }catch{
        return await cache.match(fallback)||Response.error();
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(request);
    if(cached)return cached;
    const response=await fetch(request,{cache:'reload'});
    if(response.ok)await cache.put(request,response.clone()).catch(()=>{});
    return response;
  })());
});
