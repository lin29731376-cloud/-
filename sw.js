// 앱 설치용 최소 서비스 워커: 화면 파일만 캐시해 두고, 서버 통신(로그인·기록·영상)은 항상 네트워크로 보냄
const CACHE = "sm-v19";
const SHELL = ["./", "./index.html", "./admin.html", "./terms.html", "./config.js", "./auth.js",
  "./icon-192.png", "./icon-512.png", "./admin-icon-192.png", "./admin-icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // 외부 서버는 건드리지 않음
  // 항상 최신 파일을 먼저 받고, 인터넷이 끊겼을 때만 저장해 둔 화면을 보여줌
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request)));
});
