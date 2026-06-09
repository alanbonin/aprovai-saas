"use client";
/**
 * SessionGuard — detecta sessão inválida (conta usada em outro dispositivo)
 * e redireciona para login com aviso.
 *
 * Supabase emite SIGNED_OUT quando a sessão é revogada remotamente.
 * Verificação adicional a cada 5 minutos como fallback.
 */
import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function SessionGuard() {
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    function kickOut() {
      // Salva flag no localStorage antes de redirecionar — persiste após redirect do servidor
      try { localStorage.setItem("kicked_out", "1"); } catch {}
      window.location.href = "/login";
    }

    // Marca que o usuário está logado (para detectar logout forçado)
    try { localStorage.setItem("was_logged_in", "1"); } catch {}

    // Listener de eventos de auth — reage em tempo real quando sessão é revogada
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        kickOut();
      }
    });

    // Verificação periódica a cada 3 minutos como fallback
    const interval = setInterval(async () => {
      const { error } = await supabase.auth.getUser();
      if (error) {
        kickOut();
      }
    }, 3 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return null;
}
