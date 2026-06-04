"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Megaphone, Plus, Trash2, Send, AlertCircle, CheckCircle2, Loader2, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Anuncio {
  id: string;
  title: string;
  message: string;
  updatedAt: string;
}

const TYPE_OPTS = [
  { id: "announcement", label: "📢 Anúncio",    icon: "📢" },
  { id: "reminder",     label: "🔔 Lembrete",   icon: "🔔" },
  { id: "prova",        label: "📅 Prova",      icon: "📅" },
  { id: "streak",       label: "🔥 Streak",     icon: "🔥" },
  { id: "level",        label: "⭐ Nível",       icon: "⭐" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminAnuncioPage() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast]       = useState<{ ok: boolean; msg: string } | null>(null);

  // Form
  const [title, setTitle]     = useState("");
  const [message, setMessage] = useState("");
  const [type, setType]       = useState("announcement");
  const [sendPush, setSendPush] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/anuncio");
    if (res.ok) {
      const d = await res.json();
      setAnuncios(d.anuncios ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSending(true);

    // Publish announcement
    const res = await fetch("/api/admin/anuncio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), message: message.trim(), type }),
    });

    if (!res.ok) {
      const d = await res.json();
      showToast(false, d.error ?? "Erro ao publicar anúncio");
      setSending(false);
      return;
    }

    // Optionally send push notification
    let pushMsg = "";
    if (sendPush) {
      const pushRes = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: message.slice(0, 100) || title.trim(),
          url: "/notificacoes",
        }),
      });
      if (pushRes.ok) {
        const pushData = await pushRes.json() as { sent?: number; failed?: number; total?: number };
        pushMsg = ` Push: ${pushData.sent ?? 0}/${pushData.total ?? 0} enviados.`;
      } else {
        const pushErr = await pushRes.json().catch(() => ({})) as { error?: string };
        pushMsg = ` Push falhou: ${pushErr.error ?? "erro desconhecido"}.`;
      }
    }

    showToast(true, sendPush ? `Anúncio publicado!${pushMsg}` : "Anúncio publicado com sucesso!");
    setTitle("");
    setMessage("");
    setType("announcement");
    setSendPush(false);
    await load();
    setSending(false);
  }

  async function deleteAnuncio(id: string) {
    setDeleting(id);
    const res = await fetch("/api/admin/anuncio", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setAnuncios(prev => prev.filter(a => a.id !== id));
      showToast(true, "Anúncio removido.");
    } else {
      showToast(false, "Erro ao remover anúncio.");
    }
    setDeleting(null);
  }

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-orange-400" />
          Central de Anúncios
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Publique comunicados e notificações para todos os alunos da plataforma
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-xl border text-sm mb-4 transition-all",
          toast.ok
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        )}>
          {toast.ok
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Compose form */}
      <form onSubmit={submit} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-semibold">Novo anúncio</h2>
        </div>

        {/* Type selector */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-2 block">Tipo</label>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  type === t.id
                    ? "bg-orange-500/20 border-orange-500/40 text-orange-300"
                    : "bg-white/[0.02] border-white/[0.06] text-gray-500 hover:text-gray-300"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1.5 block">Título <span className="text-red-400">*</span></label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Nova funcionalidade disponível!"
            maxLength={100}
            required
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40"
          />
          <p className="text-[10px] text-gray-700 mt-0.5 text-right">{title.length}/100</p>
        </div>

        {/* Message */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1.5 block">Mensagem (opcional)</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Detalhes adicionais sobre o anúncio..."
            rows={3}
            maxLength={500}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-orange-500/40"
          />
          <p className="text-[10px] text-gray-700 mt-0.5 text-right">{message.length}/500</p>
        </div>

        {/* Push toggle */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <button
            type="button"
            onClick={() => setSendPush(p => !p)}
            className={cn(
              "w-10 h-5 rounded-full border-2 transition-all relative flex-shrink-0",
              sendPush ? "bg-orange-600 border-orange-500" : "bg-white/10 border-white/20"
            )}
          >
            <span className={cn(
              "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
              sendPush ? "left-4" : "left-0.5"
            )} />
          </button>
          <div>
            <p className="text-xs font-medium text-gray-300">Enviar push notification</p>
            <p className="text-[10px] text-gray-600">Notificação instantânea nos dispositivos dos alunos</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={sending || !title.trim()}
          className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {sending ? "Publicando..." : "Publicar anúncio"}
        </button>
      </form>

      {/* Anúncios publicados */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Histórico ({anuncios.length})
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
          </div>
        ) : anuncios.length === 0 ? (
          <div className="text-center py-10 text-gray-600 text-sm">
            Nenhum anúncio publicado ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {anuncios.map(a => (
              <div
                key={a.id}
                className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 flex items-start gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{a.title}</p>
                  {a.message && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.message}</p>
                  )}
                  <p className="text-[10px] text-gray-700 mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {fmtDate(a.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={() => deleteAnuncio(a.id)}
                  disabled={deleting === a.id}
                  className="p-1.5 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                  title="Remover anúncio"
                >
                  {deleting === a.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
