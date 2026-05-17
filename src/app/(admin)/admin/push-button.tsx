"use client";
import { useState } from "react";
import { Bell, Loader2, CheckCircle2, XCircle } from "lucide-react";

export function AdminPushButton() {
  const [loading, setLoading]   = useState(false);
  const [result,  setResult]    = useState<{ sent: number; failed: number } | null>(null);
  const [error,   setError]     = useState<string | null>(null);
  const [title,   setTitle]     = useState("Aprovai — Hora de Estudar! 📚");
  const [body,    setBody]       = useState("Seu mentor IA está esperando. Acesse agora e mantenha sua sequência de estudos!");
  const [open,    setOpen]       = useState(false);

  async function send() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, url: "/workspace" }),
      });
      const data = await res.json() as { sent?: number; failed?: number; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Erro ao enviar push");
      } else {
        setResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 });
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-400" />
            Push Manual
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Enviar notificação push para todos os assinantes</p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
        >
          {open ? "Fechar" : "Configurar"}
        </button>
      </div>

      {open && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Título</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Mensagem</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={2}
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 resize-none"
            />
          </div>

          {result && (
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {result.sent} enviados · {result.failed} falhas
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={send}
            disabled={loading || !title || !body}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
              : <><Bell className="w-4 h-4" /> Enviar Push para Todos</>
            }
          </button>
        </div>
      )}
    </div>
  );
}
