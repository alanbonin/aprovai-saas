"use client";
import { useState } from "react";
import {
  Smartphone, Send, CheckCircle2, AlertCircle, Loader2, Users, User
} from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_TEMPLATES = [
  { title: "🔥 Não perca sua sequência!", body: "Você ainda não estudou hoje. Mantenha sua streak!", url: "/hoje" },
  { title: "📊 Novo relatório disponível", body: "Veja seu desempenho semanal atualizado.", url: "/relatorio" },
  { title: "⚡ Desafio do dia liberado!", body: "Complete o desafio diário e ganhe XP extra.", url: "/desafio" },
  { title: "🎯 Simulado disponível", body: "Teste seus conhecimentos com um novo simulado.", url: "/simulado" },
  { title: "📅 Revisões vencidas!", body: "Você tem questões e flashcards aguardando revisão.", url: "/agenda-revisoes" },
];

type Mode = "broadcast" | "user";

export default function AdminPushPage() {
  const [mode, setMode]         = useState<Mode>("broadcast");
  const [userId, setUserId]     = useState("");
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [url, setUrl]           = useState("/workspace");
  const [sending, setSending]   = useState(false);
  const [result, setResult]     = useState<{
    ok: boolean; sent?: number; failed?: number; msg?: string;
  } | null>(null);

  function applyTemplate(t: typeof QUICK_TEMPLATES[0]) {
    setTitle(t.title);
    setBody(t.body);
    setUrl(t.url);
    setResult(null);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSending(true);
    setResult(null);

    const res = await fetch("/api/admin/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || "/workspace",
        userId: mode === "user" && userId.trim() ? userId.trim() : undefined,
      }),
    });

    const d = await res.json();
    if (res.ok) {
      setResult({ ok: true, sent: d.sent, failed: d.failed });
      setTitle(""); setBody(""); setUrl("/workspace"); setUserId("");
    } else {
      setResult({ ok: false, msg: d.error ?? "Erro ao enviar push" });
    }
    setSending(false);
  }

  return (
    <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-orange-400" />
          Push Notifications
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Envie notificações push para alunos com subscrição ativa
        </p>
      </div>

      {/* Result */}
      {result && (
        <div className={cn(
          "flex items-start gap-2 p-4 rounded-xl border text-sm mb-5",
          result.ok
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        )}>
          {result.ok
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <div>
            {result.ok
              ? <p><strong>{result.sent}</strong> enviado{result.sent !== 1 ? "s" : ""} com sucesso{result.failed ? `, ${result.failed} falho${result.failed !== 1 ? "s" : ""}` : ""}.</p>
              : <p>{result.msg}</p>}
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5">
        <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Destino</p>
        <div className="flex gap-2 mb-4">
          {[
            { id: "broadcast" as Mode, label: "Todos os alunos", icon: <Users className="w-4 h-4" /> },
            { id: "user" as Mode,      label: "Usuário específico", icon: <User className="w-4 h-4" /> },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all",
                mode === m.id
                  ? "bg-orange-500/15 border-orange-500/30 text-orange-300"
                  : "bg-white/[0.02] border-white/[0.06] text-gray-500 hover:text-gray-300"
              )}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {mode === "user" && (
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">ID do usuário</label>
            <input
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="Ex: cmc1234abcd..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40 font-mono"
            />
            <p className="text-[10px] text-gray-700 mt-1">
              Copie o ID da página de detalhes do aluno em /admin/alunos/[id]
            </p>
          </div>
        )}
      </div>

      {/* Quick templates */}
      <div className="mb-5">
        <p className="text-xs text-gray-600 mb-2 font-medium uppercase tracking-wider">Templates rápidos</p>
        <div className="space-y-1.5">
          {QUICK_TEMPLATES.map((t, i) => (
            <button
              key={i}
              onClick={() => applyTemplate(t)}
              className="w-full text-left px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/15 hover:bg-white/[0.04] transition-all"
            >
              <p className="text-xs font-medium text-gray-300">{t.title}</p>
              <p className="text-[10px] text-gray-600 mt-0.5 truncate">{t.body}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Compose form */}
      <form onSubmit={send} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        <p className="text-sm font-semibold mb-4">Compor notificação</p>

        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1.5 block">Título <span className="text-red-400">*</span></label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Hora de estudar! 📚"
            maxLength={100}
            required
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40"
          />
        </div>

        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1.5 block">Corpo da mensagem</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Texto da notificação..."
            rows={3}
            maxLength={200}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-orange-500/40"
          />
        </div>

        <div className="mb-5">
          <label className="text-xs text-gray-500 mb-1.5 block">URL de destino</label>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="/workspace"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40 font-mono"
          />
        </div>

        {/* Preview */}
        {title && (
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 mb-4">
            <p className="text-[10px] text-gray-600 mb-2 uppercase tracking-wider">Pré-visualização</p>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-sm flex-shrink-0">A</div>
              <div>
                <p className="text-xs font-bold text-white">{title}</p>
                {body && <p className="text-xs text-gray-400 mt-0.5">{body}</p>}
                <p className="text-[10px] text-gray-600 mt-1">Aprovai · agora</p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={sending || !title.trim()}
          className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {sending
            ? "Enviando..."
            : mode === "broadcast"
            ? "Enviar para todos"
            : "Enviar para usuário"}
        </button>
      </form>
    </div>
  );
}
