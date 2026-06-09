"use client";
/**
 * PushAutoPrompt — solicita permissão de push automaticamente no primeiro acesso.
 * - Só roda uma vez por dispositivo (salva flag em localStorage)
 * - Aguarda 3 segundos após o mount para não interferir com o carregamento
 * - Se o usuário aceitar, já registra a subscription no servidor
 * - Se negar, não fica perguntando de novo
 */
import { useEffect } from "react";

const STORAGE_KEY = "aprovai_push_prompted";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export function PushAutoPrompt() {
  useEffect(() => {
    // Suporte necessário
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!("Notification" in window)) return;

    // Já perguntamos antes ou usuário já decidiu
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (Notification.permission !== "default") {
      // Se já foi concedido mas sem subscription, tenta registrar silenciosamente
      if (Notification.permission === "granted") {
        void autoSubscribe();
      }
      localStorage.setItem(STORAGE_KEY, "1");
      return;
    }

    // Aguarda 3s para não atrapalhar o carregamento inicial
    const timer = setTimeout(() => {
      void askAndSubscribe();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}

async function autoSubscribe() {
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    // Verifica se já tem subscription
    const existing = await reg.pushManager.getSubscription();
    if (existing) return; // já inscrito

    const res = await fetch("/api/push/subscribe");
    const { publicKey } = await res.json() as { publicKey: string };
    if (!publicKey) return;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
  } catch {
    // silencioso — pode falhar em iOS sem PWA instalado
  }
}

async function askAndSubscribe() {
  try {
    // Registra SW primeiro
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    // Busca chave pública VAPID
    const res = await fetch("/api/push/subscribe");
    const { publicKey } = await res.json() as { publicKey: string };
    if (!publicKey) return;

    // Solicita permissão ao usuário
    const permission = await Notification.requestPermission();
    localStorage.setItem(STORAGE_KEY, "1"); // não perguntar de novo

    if (permission !== "granted") return;

    // Cria subscription
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // Salva no servidor
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
  } catch {
    localStorage.setItem(STORAGE_KEY, "1"); // evita loop em caso de erro
  }
}
