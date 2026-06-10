"use client";
/**
 * ThemeWelcome — Modal de escolha de tema exibido na primeira vez que o aluno entra.
 * Usa localStorage para controlar se já foi exibido.
 */
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeWelcome() {
  const [show, setShow] = useState(false);
  const { setTheme } = useTheme();

  useEffect(() => {
    try {
      const done = localStorage.getItem("aprovai_theme_chosen");
      if (!done) setShow(true);
    } catch { /* ignore */ }
  }, []);

  function choose(t: "light" | "dark") {
    setTheme(t);
    try { localStorage.setItem("aprovai_theme_chosen", t); } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: "#0f111a", border: "1px solid rgba(255,255,255,0.1)" }}>

        {/* Header */}
        <div className="px-6 pt-7 pb-4 text-center">
          <div className="text-4xl mb-3">🎨</div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "#ffffff" }}>Escolha sua aparência</h2>
          <p className="text-sm" style={{ color: "#94a3b8" }}>Você pode mudar isso depois no menu lateral.</p>
        </div>

        {/* Opções */}
        <div className="px-6 pb-7 grid grid-cols-2 gap-3">
          {/* Modo Escuro */}
          <button
            onClick={() => choose("dark")}
            className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all"
            style={{ borderColor: "#6366f1", background: "rgba(99,102,241,0.25)" }}
          >
            <span className="text-4xl">🌙</span>
            <div className="text-center">
              <p className="text-base font-bold" style={{ color: "#ffffff" }}>Escuro</p>
              <p className="text-xs mt-1" style={{ color: "#c7d2fe" }}>Cansa menos os olhos</p>
            </div>
          </button>

          {/* Modo Claro */}
          <button
            onClick={() => choose("light")}
            className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all"
            style={{ borderColor: "#f59e0b", background: "rgba(245,158,11,0.25)" }}
          >
            <span className="text-4xl">☀️</span>
            <div className="text-center">
              <p className="text-base font-bold" style={{ color: "#ffffff" }}>Claro</p>
              <p className="text-xs mt-1" style={{ color: "#fde68a" }}>Ideal para ambientes claros</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
