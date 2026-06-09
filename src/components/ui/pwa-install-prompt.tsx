"use client";
import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "aprovai-pwa-prompt-dismissed";

export function PWAInstallPrompt() {
  const [prompt, setPrompt]     = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible]   = useState(false);
  const [isIOS, setIsIOS]       = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Já está instalado como PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Já dispensou recentemente (7 dias)
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - Number(dismissed) < 7 * 86_400_000) return;

    // iOS — não tem BeforeInstallPrompt; mostra instrução manual
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !("MSStream" in window);
    if (ios) {
      // Mostra em qualquer browser do iOS (Safari, Chrome, Firefox)
      setIsIOS(true);
      setTimeout(() => setVisible(true), 3000);
      return;
    }

    // Android / Desktop — aguarda BeforeInstallPromptEvent
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  }

  async function install() {
    if (!prompt) { dismiss(); return; }
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    dismiss();
  }

  if (installed || !visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar AprovAI360"
      className="fixed bottom-4 left-4 right-4 z-[300] md:left-auto md:right-6 md:w-80 animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div
        className="rounded-2xl border border-white/10 shadow-2xl p-4"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "var(--color-teal)" }}
          >
            <Smartphone className="w-5 h-5 text-white" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">
              Instalar AprovAI360
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">
              {isIOS ? "Adicione à tela de início em 2 toques:" : "Acesse mais rápido e estude offline."}
            </p>
          </div>

          {/* Close */}
          <button
            onClick={dismiss}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-colors flex-shrink-0 -mr-1 -mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* iOS: steps visuais claros */}
        {isIOS && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white/[0.05]">
              <span className="w-6 h-6 rounded-full bg-[#0ab5bd]/20 text-[#0ab5bd] text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <p className="text-xs text-gray-300">Toque no ícone <strong className="text-white">Compartilhar ⬆️</strong> na barra do navegador</p>
            </div>
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white/[0.05]">
              <span className="w-6 h-6 rounded-full bg-[#0ab5bd]/20 text-[#0ab5bd] text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <p className="text-xs text-gray-300">Role e toque em <strong className="text-white">Adicionar à Tela de Início ➕</strong></p>
            </div>
            <button onClick={dismiss} className="w-full mt-1 py-1.5 rounded-lg text-xs text-gray-600 hover:text-gray-400 transition-colors text-center">
              Entendido, fechar
            </button>
          </div>
        )}

        {!isIOS && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={dismiss}
              className="flex-1 py-2 px-3 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
            >
              Agora não
            </button>
            <button
              onClick={install}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-all"
              style={{ backgroundColor: "var(--color-teal)" }}
            >
              <Download className="w-3.5 h-3.5" />
              Instalar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
