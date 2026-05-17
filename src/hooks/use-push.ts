"use client";
import { useState, useEffect, useCallback } from "react";

export type PushState = "unsupported" | "default" | "granted" | "denied" | "loading";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export function usePush() {
  const [state, setState] = useState<PushState>("loading");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Detect support and current state
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    const perm = Notification.permission;
    if (perm === "denied") { setState("denied"); return; }

    // Check if already subscribed
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setSubscription(sub);
        setState(sub ? "granted" : perm === "granted" ? "granted" : "default");
      })
      .catch(() => setState("default"));
  }, []);

  // Register service worker
  const registerSW = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      return reg;
    } catch {
      return null;
    }
  }, []);

  // Request permission + subscribe
  const subscribe = useCallback(async (): Promise<boolean> => {
    setState("loading");
    try {
      // Fetch public VAPID key
      const res = await fetch("/api/push/subscribe");
      const { publicKey } = await res.json() as { publicKey: string };
      if (!publicKey) throw new Error("Chave VAPID não configurada");

      const reg = await registerSW();
      if (!reg) throw new Error("Service Worker não disponível");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return false;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Save subscription on server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      setSubscription(sub);
      setState("granted");
      return true;
    } catch (err) {
      console.error("[push] subscribe error:", err);
      setState("default");
      return false;
    }
  }, [registerSW]);

  // Unsubscribe
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;
    try {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
      setSubscription(null);
      setState("default");
      return true;
    } catch {
      return false;
    }
  }, [subscription]);

  return { state, subscription, subscribe, unsubscribe };
}
