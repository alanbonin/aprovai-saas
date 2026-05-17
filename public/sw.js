// ── Aprovai Service Worker — Push Notifications ──────────────────────────────
const CACHE_NAME = "aprovai-v1";

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Push event ───────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {
    title: "Aprovai",
    body:  "Hora de estudar! 📚",
    icon:  "/api/icon?size=192",
    badge: "/api/icon?size=192",
    url:   "/workspace",
    tag:   "aprovai-lembrete",
  };

  try {
    const payload = event.data?.json();
    if (payload) data = { ...data, ...payload };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:   data.body,
      icon:   data.icon,
      badge:  data.badge,
      tag:    data.tag,
      data:   { url: data.url },
      vibrate: [100, 50, 100],
      requireInteraction: false,
    })
  );
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/workspace";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Se já tem aba aberta, foca nela
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Senão abre nova aba
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});
