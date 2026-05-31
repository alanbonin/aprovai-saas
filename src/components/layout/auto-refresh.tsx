"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * AutoRefresh — monta uma única vez no layout do dashboard.
 * Chama router.refresh() em dois momentos:
 *   1. Quando a janela ganha foco (usuário volta de outra aba/app)
 *   2. Quando a rota muda (navegação entre páginas)
 *
 * Isso garante que os dados do servidor (questões respondidas, metas,
 * plano, etc.) estejam sempre atualizados sem precisar recarregar a página.
 */
export function AutoRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const lastRefreshRef = useRef<number>(0);

  // Atualiza quando a janela ganha foco (volta de outra aba / app)
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      // Throttle: no máximo 1 refresh a cada 5 segundos
      if (now - lastRefreshRef.current < 5000) return;
      lastRefreshRef.current = now;
      router.refresh();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  // Atualiza quando muda de rota (chega em uma nova página)
  useEffect(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 1000) return; // evita double-refresh
    lastRefreshRef.current = now;
    router.refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
