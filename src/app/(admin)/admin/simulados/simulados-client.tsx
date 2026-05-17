"use client";
import { useState } from "react";
import { Plus, X, Sparkles, Loader2, Bot, FileText, Clock, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Simulado {
  id: string; name: string; agentName: string | null; banca: string | null;
  totalQuestions: number; timeLimitMins: number; active: boolean;
  createdAt: string; subjectIds: string[];
}
interface Subject { id: string; name: string; }
interface Agent { id: string; name: string; banca: string | null; area: string | null; description: string; color: string; }

const BANCAS = ["CESPE/CEBRASPE", "FGV", "VUNESP", "FCC", "IBFC", "CESGRANRIO", "AOCP", "NC-UFPR", "FUNRIO", "IDECAN", "IADES", "ESAF"];

interface Props { simulados: Simulado[]; subjects: Subject[]; agents: Agent[]; }

export function SimuladosAdmin({ simulados: initial, subjects, agents }: Props) {
  const [simulados, setSimulados] = useState(initial);
  const [showGerarModal, setShowGerarModal] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [gerarMsg, setGerarMsg] = useState("");

  const [gerarForm, setGerarForm] = useState({
    name: "", agentId: "", banca: "",
    subjectIds: [] as string[],
    qty: 10, timeLimitMins: 60,
  });

  const selectedAgent = agents.find(a => a.id === gerarForm.agentId);

  function handleAgentSelect(agentId: string) {
    const agent = agents.find(a => a.id === agentId);
    setGerarForm(f => ({ ...f, agentId, banca: agent?.banca ?? f.banca }));
  }

  function toggleSubject(id: string) {
    setGerarForm(f => ({
      ...f,
      subjectIds: f.subjectIds.includes(id)
        ? f.subjectIds.filter(s => s !== id)
        : [...f.subjectIds, id],
    }));
  }

  async function gerar() {
    if (!gerarForm.name.trim()) { setGerarMsg("Informe um nome para o simulado"); return; }
    setGerando(true); setGerarMsg("");
    const res = await fetch("/api/admin/simulados/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: gerarForm.name,
        agentId: gerarForm.agentId || null,
        banca: gerarForm.banca || null,
        subjectIds: gerarForm.subjectIds,
        qty: gerarForm.qty,
        timeLimitMins: gerarForm.timeLimitMins,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setGerarMsg(data.error ?? "Erro ao gerar"); setGerando(false); return; }
    setSimulados(s => [data, ...s]);
    setGerarMsg(`Simulado "${data.name}" criado com ${data.totalQuestions} questões!`);
    setGerando(false);
    setGerarForm({ name: "", agentId: "", banca: "", subjectIds: [], qty: 10, timeLimitMins: 60 });
  }

  async function toggleActive(sim: Simulado) {
    const res = await fetch("/api/admin/simulados", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sim.id, active: !sim.active }),
    });
    if (res.ok) {
      setSimulados(s => s.map(x => x.id === sim.id ? { ...x, active: !sim.active } : x));
    }
  }

  async function deleteSimulado(id: string) {
    if (!confirm("Remover este simulado?")) return;
    await fetch("/api/admin/simulados", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setSimulados(s => s.filter(x => x.id !== id));
  }

  const subjectName = (id: string) => subjects.find(s => s.id === id)?.name ?? id;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs text-gray-600">{simulados.length} simulado(s)</span>
        <div className="ml-auto">
          <button onClick={() => setShowGerarModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors">
            <Sparkles className="w-4 h-4" />Gerar simulado com IA
          </button>
        </div>
      </div>

      {simulados.length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-white/5 bg-white/3">
          <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum simulado criado</p>
          <p className="text-gray-600 text-sm mt-1">Gere simulados completos com IA usando agentes especializados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {simulados.map(sim => (
            <div key={sim.id} className="rounded-xl border border-white/5 bg-white/3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{sim.name}</p>
                    {sim.banca && <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full">{sim.banca}</span>}
                    {!sim.active && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">Inativo</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    {sim.agentName && <span className="flex items-center gap-1"><Bot className="w-3 h-3" />{sim.agentName}</span>}
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{sim.totalQuestions} questões</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{sim.timeLimitMins} min</span>
                    <span>{fmtDate(sim.createdAt)}</span>
                    {sim.subjectIds?.length > 0 && (
                      <span>{sim.subjectIds.map(subjectName).join(", ")}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(sim)} className="text-gray-500 hover:text-white transition-colors" title={sim.active ? "Desativar" : "Ativar"}>
                    {sim.active ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => deleteSimulado(sim.id)} className="text-gray-700 hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal gerar simulado */}
      {showGerarModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowGerarModal(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-400" /><h2 className="font-semibold">Gerar simulado com IA</h2></div>
              <button onClick={() => setShowGerarModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Nome */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome do simulado *</label>
                <input value={gerarForm.name} onChange={e => setGerarForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Ex: Simulado CESPE — Delegado PC 2025" />
              </div>

              {/* Agente */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Agente especialista (opcional)</label>
                <select value={gerarForm.agentId} onChange={e => handleAgentSelect(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                  <option value="">Sem agente (genérico)</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}{a.banca ? ` · ${a.banca}` : ""}{a.area ? ` · ${a.area}` : ""}</option>)}
                </select>
                {selectedAgent && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-indigo-400">
                    <Bot className="w-3 h-3" /><span>{selectedAgent.description}</span>
                  </div>
                )}
              </div>

              {/* Banca */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Banca {selectedAgent?.banca ? `(do agente: ${selectedAgent.banca})` : "(opcional)"}</label>
                <select value={gerarForm.banca} onChange={e => setGerarForm(f => ({ ...f, banca: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
                  <option value="">Genérica / do agente</option>
                  {BANCAS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Matérias */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Matérias incluídas (opcional — todas se vazio)</label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {subjects.map(s => (
                    <button key={s.id} onClick={() => toggleSubject(s.id)}
                      className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors",
                        gerarForm.subjectIds.includes(s.id)
                          ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                          : "border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20")}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Número de questões */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Número de questões</label>
                <div className="flex gap-2">
                  {[10, 20, 30, 50, 80].map(n => (
                    <button key={n} onClick={() => setGerarForm(f => ({ ...f, qty: n }))}
                      className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                        gerarForm.qty === n ? "bg-emerald-600 text-white" : "bg-white/5 border border-white/10 text-gray-400 hover:text-white")}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tempo limite */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tempo limite (minutos)</label>
                <div className="flex gap-2">
                  {[30, 60, 90, 120, 180].map(n => (
                    <button key={n} onClick={() => setGerarForm(f => ({ ...f, timeLimitMins: n }))}
                      className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                        gerarForm.timeLimitMins === n ? "bg-indigo-600 text-white" : "bg-white/5 border border-white/10 text-gray-400 hover:text-white")}>
                      {n}m
                    </button>
                  ))}
                </div>
              </div>

              {gerarMsg && (
                <p className={cn("text-xs p-3 rounded-lg border", gerarMsg.startsWith("Simulado") ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                  {gerarMsg}
                </p>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-white/5">
              <button onClick={() => setShowGerarModal(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">Fechar</button>
              <button onClick={gerar} disabled={gerando || !gerarForm.name.trim()}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {gerando
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando {gerarForm.qty} questões...</>
                  : <><Sparkles className="w-4 h-4" />Gerar {gerarForm.qty} questões</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
