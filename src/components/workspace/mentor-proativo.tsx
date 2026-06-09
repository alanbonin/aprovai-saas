"use client";

import { useState, useEffect } from "react";
import { X, MessageCircle } from "lucide-react";

// ── Chave de throttle no localStorage ────────────────────────────────────────
const STORAGE_KEY = "aprovai_proativo_last";
const THROTTLE_HOURS = 8; // Só verifica a cada 8h

interface ProativoResponse {
  message: string | null;
  diasDesdeOnboarding?: number;
  diasAteProva?: number | null;
}

export function MentorProativo() {
  const [msg, setMsg] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Throttle — não chama de novo se já chamou recentemente
    try {
      const last = localStorage.getItem(STORAGE_KEY);
      if (last) {
        const horasPassadas = (Date.now() - Number(last)) / 3_600_000;
        if (horasPassadas < THROTTLE_HOURS) return;
      }
    } catch { /* SSR ou modo privado */ }

    let cancelled = false;

    fetch("/api/mentor/proativo")
      .then(r => r.ok ? r.json() : null)
      .then((data: ProativoResponse | null) => {
        if (cancelled || !data?.message) return;
        try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ok */ }
        setMsg(data.message);
        // Aparece com pequeno delay para não conflitar com animações da página
        setTimeout(() => setVisible(true), 1500);
      })
      .catch(() => { /* silently ignore */ });

    return () => { cancelled = true; };
  }, []);

  function dismiss() {
    setDismissed(true);
    setTimeout(() => { setMsg(null); setVisible(false); }, 300);
  }

  if (!msg || !visible) return null;

  return (
    <div
      className="fixed bottom-20 right-5 z-50 max-w-sm w-full lg:bottom-5"
      style={{
        animation: dismissed ? "proativoOut 0.3s ease-in both" : "proativoIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
      }}>
      <style>{`
        @keyframes proativoIn { from{opacity:0;transform:translateY(20px) scale(0.9)} to{opacity:1;transform:none} }
        @keyframes proativoOut { from{opacity:1;transform:none} to{opacity:0;transform:translateY(10px) scale(0.95)} }
      `}</style>
      <div style={{
        background: "linear-gradient(135deg, rgba(10,181,189,0.12), rgba(5,5,17,0.95))",
        border: "1px solid rgba(10,181,189,0.35)",
        borderRadius: 16,
        backdropFilter: "blur(20px)",
        overflow: "hidden",
        boxShadow: "0 20px 40px rgba(0,0,0,0.5), 0 0 60px rgba(10,181,189,0.1)",
      }}>
        {/* Header */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(10,181,189,0.15)", display: "flex", alignItems: "center", gap: 10 }}>
          {/* Avatar orb pequeno */}
          <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "radial-gradient(circle at 35% 30%, #b0f0f5, #0ab5bd 40%, #044d52)", border: "1.5px solid rgba(10,181,189,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
            🎯
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Mentor AprovAI</p>
            <p style={{ fontSize: 10, color: "#0ab5bd" }}>Mensagem do seu coach</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MessageCircle size={13} style={{ color: "#0ab5bd", opacity: 0.7 }} />
            <button onClick={dismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563", padding: 2, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#9ca3af")}
              onMouseLeave={e => (e.currentTarget.style.color = "#4b5563")}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Mensagem */}
        <div style={{ padding: "14px 16px" }}>
          <p style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg}</p>
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 8 }}>
          <button onClick={dismiss}
            style={{ flex: 1, padding: "7px 12px", borderRadius: 10, background: "rgba(10,181,189,0.15)", border: "1px solid rgba(10,181,189,0.3)", color: "#7ae8ed", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(10,181,189,0.25)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(10,181,189,0.15)"; }}>
            Entendido! 💪
          </button>
        </div>
      </div>
    </div>
  );
}
