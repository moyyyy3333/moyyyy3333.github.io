/* WarmBody Work — scoped to /work. Handles offline fallback, push, and notification clicks. */
const CACHE = "warmbody-work-v1";
const PRECACHE = ["/work", "/work/manifest.webmanifest", "/work/icons/icon-192.png", "/work/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).then((res) => {
      if (res.ok && url.pathname.startsWith("/work")) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => undefined);
      }
      return res;
    }).catch(() => caches.match(event.request).then((hit) => hit || caches.match("/work"))),
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "New WarmBody gig", body: "A gig just posted. First to accept gets it.", url: "/work" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch { /* keep defaults */ }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/work/icons/icon-192.png",
    badge: "/work/icons/icon-192.png",
    data: { url: data.url || "/work" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/work";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      if (client.url.includes("/work") && "focus" in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  }));
});
