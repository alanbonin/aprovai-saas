"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * AutoRefresh — monta uma única vez no layout do dashboard.
 *
 * Atualiza os dados do servidor em 3 situações:
 * 1. Mudança de rota (navegação entre páginas)
 * 2. Janela ganha foco (volta de outra aba/app)
 * 3. Evento customizado "aprovai:progress" (disparado após salvar progresso)
 */
export function AutoRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const lastRefreshRef = useRef<number>(0);

  function doRefresh() {
    const now = Date.now();
    if (now - lastRefreshRef.current < 2000) return; // throttle 2s
    lastRefreshRef.current = now;
    router.refresh();
  }

  // 1. Mudança de rota
  useEffect(() => {
    doRefresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // 2. Janela ganha foco
  useEffect(() => {
    const onFocus = () => doRefresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Evento após salvar progresso de questão
  useEffect(() => {
    const onProgress = () => {
      setTimeout(() => doRefresh(), 500);
    };
    window.addEventListener("aprovai:progress", onProgress);

    // Intercepta fetch para /api/questoes/progresso automaticamente
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      const result = await origFetch(...args);
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url ?? "";
      if (url.includes("/api/questoes/progresso") && result.ok) {
        setTimeout(() => doRefresh(), 500);
      }
      return result;
    };

    return () => {
      window.removeEventListener("aprovai:progress", onProgress);
      window.fetch = origFetch;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/**
 * Dispara o evento de refresh após salvar progresso.
 * Chamar isso em qualquer componente que salva questões respondidas.
 */
export function triggerProgressRefresh() {
  window.dispatchEvent(new CustomEvent("aprovai:progress"));
}
