"use client";
import { useState, useEffect, useCallback } from "react";
import { Users, RefreshCw, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlunoInativo {
  id: string;
  name: string | null;
  email: string;
  plan: string;
  lastStudyDate: string | null;
  streak: number;
  diasSemEstudo: number | null;
}

export default function ReengajamentoPage() {
  const [alunos, setAlunos]       = useState<AlunoInativo[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [dias, setDias]           = useState(7);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [sending, setSending]     = useState(false);
  const [result, setResult]       = useState<{ sent: number; failed: number } | null>(null);
  const [title, setTitle]         = useState("Sua sequência está em risco! 🔥");
  const [msgBody, setMsgBody]     = useState("Você não estuda há alguns dias. Que tal retomar agora? Só 10 questões!");

  const load = useCallback(async () => {
    setLoading(true);
    setResult(null);
    const res = await fetch(`/api/admin/reengajamento?dias=${dias}`);
    if (res.ok) {
      const d = await res.json() as { alunos: AlunoInativo[]; total: number };
      setAlunos(d.alunos);
      setTotal(d.total);
      setSelected(new Set(d.alunos.map(a => a.id)));
    }
    setLoading(false);
  }, [dias]);

  useEffect(() => { void load(); }, [load]);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function sendPush() {
    setSending(true);
    setResult(null);
    const res = await fetch("/api/admin/reengajamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: [...selected], title, body: msgBody }),
    });
    if (res.ok) {
      const d = await res.json() as { sent: number; failed: number };
      setResult(d);
    }
    setSending(false);
  }

  return (
    <div className="p-6 max-w-5xl text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-orange-400" />
          Reengajamento de Alunos
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Alunos com assinatura ativa que não estudam há N dias. Envie push para reativar.
        </p>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Inativos há mais de</span>
          <select
            value={dias}
            onChange={e => setDias(Number(e.target.value))}
            className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm"
          >
            {[3, 5, 7, 10, 14, 21, 30].map(d => (
              <option key={d} value={d}>{d} dias</option>
            ))}
          </select>
          <span className="text-gray-400">com assinatura ativa</span>
        </div>
        <button onClick={load} disabled={loading} className="p-2 text-gray-500 hover:text-white transition-colors">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Resultado do envio */}
      {result && (
        <div className={cn(
          "rounded-xl border p-4 mb-5 flex items-center gap-3",
          result.sent > 0 ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
        )}>
          {result.sent > 0
            ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            : <AlertTriangle className="w-5 h-5 text-red-400" />}
          <p className="text-sm">
            <span className="font-semibold">{result.sent}</span> push enviados com sucesso
            {result.failed > 0 && `, ${result.failed} falhas (subscriptions inativas)`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Lista de alunos */}
        <div className="col-span-2">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 py-8">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              Carregando alunos inativos...
            </div>
          ) : alunos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
              <p>Nenhum aluno inativo com assinatura ativa nos últimos {dias} dias!</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400">{total} alunos inativos — {selected.size} selecionados</p>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => setSelected(new Set(alunos.map(a => a.id)))} className="text-indigo-400 hover:text-indigo-300">
                    Selecionar todos
                  </button>
                  <span className="text-gray-700">|</span>
                  <button onClick={() => setSelected(new Set())} className="text-gray-500 hover:text-gray-300">
                    Desmarcar
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                {alunos.map(a => (
                  <div
                    key={a.id}
                    onClick={() => toggleSelect(a.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      selected.has(a.id)
                        ? "border-orange-500/30 bg-orange-500/5"
                        : "border-white/[0.05] bg-white/[0.02] opacity-60"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex-shrink-0 transition-colors",
                      selected.has(a.id) ? "border-orange-400 bg-orange-500" : "border-gray-600"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{a.name ?? a.email}</p>
                      <p className="text-xs text-gray-500 truncate">{a.email} · {a.plan}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {a.diasSemEstudo !== null ? (
                        <span className={cn(
                          "text-xs font-semibold",
                          a.diasSemEstudo >= 14 ? "text-red-400" : a.diasSemEstudo >= 7 ? "text-amber-400" : "text-gray-400"
                        )}>
                          {a.diasSemEstudo}d sem estudar
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">nunca estudou</span>
                      )}
                      {a.streak > 0 && (
                        <p className="text-[10px] text-amber-500">🔥 streak era {a.streak}d</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Painel de envio */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Send className="w-4 h-4 text-orange-400" />
              Push Notification
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Título</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/40"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Mensagem</label>
                <textarea
                  value={msgBody}
                  onChange={e => setMsgBody(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/40 resize-none"
                />
              </div>
            </div>

            <button
              onClick={sendPush}
              disabled={sending || selected.size === 0}
              className={cn(
                "mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                selected.size > 0 && !sending
                  ? "bg-orange-600 hover:bg-orange-500 text-white"
                  : "bg-white/5 text-gray-500 cursor-not-allowed"
              )}
            >
              {sending ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Enviando...</>
              ) : (
                <><Send className="w-4 h-4" /> Enviar para {selected.size} aluno{selected.size !== 1 ? "s" : ""}</>
              )}
            </button>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-gray-500 leading-relaxed">
            <p className="font-semibold text-gray-400 mb-1">ℹ️ Sobre push</p>
            <p>Apenas alunos que ativaram notificações no navegador receberão o push. Os demais são ignorados silenciosamente.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
