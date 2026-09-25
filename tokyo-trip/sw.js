/* 늦가을 도쿄 — 오프라인 캐시
   shell: 설치할 때 한 번에 저장 / tiles·fonts: 본 것만 저장 */
const VER    = "v20";
const SHELL  = "tokyo-shell-" + VER;
const TILES  = "tokyo-tiles-v1";
const FONTS  = "tokyo-fonts-v1";
const PHOTOS = "tokyo-photos-v1";   // 구글 장소 사진 — 본 것만
const KEEP   = [SHELL, TILES, FONTS, PHOTOS];
const MAXTILES = 900;

const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "vendor/leaflet.css",
  "vendor/pretendard/PretendardVariable.subset.woff2",
  "vendor/leaflet.js",
  "vendor/images/marker-icon.png",
  "vendor/images/marker-icon-2x.png",
  "vendor/images/marker-shadow.png",
  "vendor/images/layers.png",
  "vendor/images/layers-2x.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/leaf.svg",
  "data/places.csv",
  "data/tokyo-trip.ics"
];

self.addEventListener("install", e=>{
  e.waitUntil((async()=>{
    const c = await caches.open(SHELL);
    // 하나가 실패해도 나머지는 저장한다
    await Promise.allSettled(ASSETS.map(u=>c.add(new Request(u,{cache:"reload"}))));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e=>{
  e.waitUntil((async()=>{
    const names = await caches.keys();
    await Promise.all(names.filter(n=>n.startsWith("tokyo-") && !KEEP.includes(n)).map(n=>caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", e=>{ if(e.data && e.data.type==="SKIP_WAITING") self.skipWaiting(); });

async function networkFirst(req){
  try{
    const res = await fetch(req);
    const c = await caches.open(SHELL);
    c.put("index.html", res.clone());
    return res;
  }catch(err){
    const c = await caches.open(SHELL);
    return (await c.match(req)) || (await c.match("index.html")) || (await c.match("./")) ||
      new Response("<h1>오프라인</h1><p>아직 저장되지 않았습니다.</p>",{headers:{"Content-Type":"text/html; charset=utf-8"},status:503});
  }
}

async function cacheFirst(req, name){
  const c = await caches.open(name);
  const hit = await c.match(req);
  if(hit) return hit;
  const res = await fetch(req);
  if(res && (res.ok || res.type==="opaque")) c.put(req, res.clone());
  return res;
}

async function tile(req){
  const c = await caches.open(TILES);
  const hit = await c.match(req);
  if(hit) return hit;
  const res = await fetch(req);
  if(res && res.ok){
    c.put(req, res.clone());
    const keys = await c.keys();
    if(keys.length > MAXTILES){
      // 오래된 것부터 정리
      await Promise.all(keys.slice(0, keys.length - MAXTILES).map(k=>c.delete(k)));
    }
  }
  return res;
}

self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method !== "GET") return;
  let url;
  try{ url = new URL(req.url); }catch(err){ return; }

  if(req.mode === "navigate"){ e.respondWith(networkFirst(req)); return; }
  if(url.hostname === "tile.openstreetmap.org"){ e.respondWith(tile(req)); return; }
  if(url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com"){
    e.respondWith(cacheFirst(req, FONTS)); return;
  }
  if(url.hostname.endsWith("googleusercontent.com")){ e.respondWith(cacheFirst(req, PHOTOS)); return; }
  if(url.origin === location.origin){ e.respondWith(cacheFirst(req, SHELL)); return; }
});
