// ── AprovAI360 Service Worker v3 — Push + Offline Cache ─────────────────────
const STATIC_CACHE  = "aprovai-v3-static";
const DYNAMIC_CACHE = "aprovai-v3-dynamic";
const ALL_CACHES    = [STATIC_CACHE, DYNAMIC_CACHE];

const PRECACHE_ASSETS = ["/offline", "/manifest.json"];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_ASSETS).catch(() => {/* offline page pode não existir ainda */})
    )
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch — Network First + Offline fallback ─────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // API — nunca cachear dados dinâmicos
  if (url.pathname.startsWith("/api/")) return;

  // _next/static — cache-first (hash imutável)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetchAndStore(request, STATIC_CACHE))
    );
    return;
  }

  // Páginas — network-first, depois cache, depois /offline
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) caches.open(DYNAMIC_CACHE).then((c) => c.put(request, res.clone()));
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const offline = await caches.match("/offline");
          if (offline) return offline;
        }
        return new Response("Sem conexão", { status: 503 });
      })
  );
});

async function fetchAndStore(request, cacheName) {
  const res = await fetch(request);
  if (res.ok) caches.open(cacheName).then((c) => c.put(request, res.clone()));
  return res;
}

// ── Push event ───────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {
    title: "AprovAI360",
    body:  "Hora de estudar! 📚",
    icon:  "/api/icon?size=192",
    badge: "/api/icon?size=96",
    url:   "/hoje",
    tag:   "aprovai-lembrete",
  };

  try {
    const payload = event.data?.json();
    if (payload) data = { ...data, ...payload };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon,
      badge:   data.badge,
      tag:     data.tag,
      data:    { url: data.url },
      vibrate: [100, 50, 100],
      requireInteraction: false,
      actions: [
        { action: "open",    title: "Estudar agora" },
        { action: "dismiss", title: "Mais tarde"    },
      ],
    })
  );
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const url = event.notification.data?.url ?? "/hoje";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
