const CACHE_NAME = "pulseshift-v1-cache";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match("./index.html"))));
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "PulseShift", {
    body: data.body || "You have a new PulseShift update.",
    icon: "./icon.svg",
    badge: "./icon.svg",
    data: data.url || "./"
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data || "./"));
});
