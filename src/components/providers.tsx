"use client";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { PWAInstallPrompt } from "@/components/ui/pwa-install-prompt";

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // SW registrado com sucesso
        // Verifica atualizações a cada 1h
        setInterval(() => reg.update(), 3_600_000);
      })
      .catch((err) => console.warn("[SW] Falha no registro:", err));
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ServiceWorkerRegistrar />
      {children}
      <PWAInstallPrompt />
    </ThemeProvider>
  );
}
