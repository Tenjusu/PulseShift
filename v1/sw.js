const CACHE_NAME = "pulseshift-v1-liquid-glass-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./liquid-glass.css",
  "./runtime-patch.js"
];
const PATCH_HEAD = '<link rel="stylesheet" href="./liquid-glass.css?v=3" />\n<script src="./runtime-patch.js?v=3"></script>';

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.all(APP_SHELL.map((asset) => cache.add(asset).catch(() => null))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

function isHtmlRequest(request) {
  const url = new URL(request.url);
  return request.mode === "navigate" || url.pathname.endsWith("/v1/") || url.pathname.endsWith("/v1/index.html");
}

async function patchedHtmlResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  let response;
  try {
    response = await fetch(request);
    cache.put(request, response.clone());
  } catch (_) {
    response = await caches.match(request) || await caches.match("./index.html");
  }

  if (!response) return fetch(request);
  let html = await response.text();
  if (!html.includes("runtime-patch.js")) {
    html = html.replace("</head>", `${PATCH_HEAD}\n</head>`);
  }

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" }
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (isHtmlRequest(event.request)) {
    event.respondWith(patchedHtmlResponse(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match("./index.html")))
  );
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
