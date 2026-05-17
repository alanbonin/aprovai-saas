"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, RefreshCw, Bell, BellOff, Info, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface EditalAlerta {
  orgao: string;
  status: "provavelmente_aberto" | "previsto" | "em_andamento" | "sem_info";
  titulo: string;
  descricao: string;
  banca?: string | null;
  vagas?: string | null;
  prazo?: string | null;
  salario?: string | null;
  fonte: "ia_conhecimento";
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; icon: string }> = {
  em_andamento:        { label: "Em andamento",   color: "text-green-400 bg-green-500/10 border-green-500/20",  dot: "bg-green-400",  icon: "🟢" },
  provavelmente_aberto:{ label: "Provavelmente aberto", color: "text-blue-400 bg-blue-500/10 border-blue-500/20",   dot: "bg-blue-400",   icon: "🔵" },
  previsto:            { label: "Previsto",        color: "text-amber-400 bg-amber-500/10 border-amber-500/20", dot: "bg-amber-400",  icon: "🟡" },
  sem_info:            { label: "Sem informação",  color: "text-gray-500 bg-white/5 border-white/10",           dot: "bg-gray-600",   icon: "⚫" },
};

// ── Sugestões populares ───────────────────────────────────────────────────────
const SUGESTOES = [
  "TCU", "STJ", "STF", "TST", "TSE",
  "Receita Federal", "IBGE", "INSS", "ANATEL", "BACEN",
  "Polícia Federal", "PRF", "PCDF", "PCRJ", "PMSP",
  "TRF", "TRT", "TJ-SP", "MP-SP", "DPU",
  "Petrobras", "BNDES", "CEF", "Banco do Brasil", "Correios",
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  userId: string;
}

// ── Card de alerta ────────────────────────────────────────────────────────────
function AlertaCard({ alerta, onRemove }: { alerta: EditalAlerta; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[alerta.status] ?? STATUS_CONFIG.sem_info;

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      alerta.status === "em_andamento"
        ? "border-green-500/20 bg-green-500/5"
        : alerta.status === "provavelmente_aberto"
        ? "border-blue-500/15 bg-blue-500/5"
        : "border-white/10 bg-white/3"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0 animate-pulse", cfg.dot)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-white text-sm">{alerta.orgao}</p>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{alerta.titulo}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={cn("text-xs px-2 py-0.5 rounded-full border whitespace-nowrap", cfg.color)}>
                {cfg.icon} {cfg.label}
              </span>
              <button onClick={onRemove}
                className="p-1 text-gray-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-2 leading-relaxed">{alerta.descricao}</p>

          {(alerta.banca || alerta.vagas || alerta.prazo || alerta.salario) && (
            <div className="flex flex-wrap gap-3 mt-3">
              {alerta.banca && (
                <span className="text-xs text-gray-500">
                  <span className="text-gray-600">Banca:</span> {alerta.banca}
                </span>
              )}
              {alerta.vagas && (
                <span className="text-xs text-gray-500">
                  <span className="text-gray-600">Vagas:</span> {alerta.vagas}
                </span>
              )}
              {alerta.prazo && (
                <span className="text-xs text-gray-500">
                  <span className="text-gray-600">Período:</span> {alerta.prazo}
                </span>
              )}
              {alerta.salario && (
                <span className="text-xs text-gray-500">
                  <span className="text-gray-600">Salário:</span> {alerta.salario}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Card de órgão sem alerta (só watchlist) ───────────────────────────────────
function OrgaoCard({ orgao, onRemove }: { orgao: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
      <div className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
      <span className="flex-1 text-sm text-gray-300">{orgao}</span>
      <button onClick={onRemove}
        className="p-1 text-gray-600 hover:text-red-400 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function EditalWatch({ userId }: Props) {
  const [orgaos, setOrgaos] = useState<string[]>([]);
  const [alertas, setAlertas] = useState<EditalAlerta[] | null>(null);
  const [verificadoEm, setVerificadoEm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [input, setInput] = useState("");
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Carregar watchlist ─────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetch("/api/workspace/edital-watch")
      .then(r => r.json())
      .then(d => { if (d.orgaos) setOrgaos(d.orgaos); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Adicionar órgão ────────────────────────────────────────────────────────
  async function addOrgao(nome: string) {
    const n = nome.trim();
    if (!n || orgaos.includes(n)) { setInput(""); return; }
    const res = await fetch("/api/workspace/edital-watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", orgao: n }),
    });
    const d = await res.json();
    if (d.orgaos) { setOrgaos(d.orgaos); setAlertas(null); }
    setInput("");
    setShowSugestoes(false);
  }

  // ── Remover órgão ─────────────────────────────────────────────────────────
  async function removeOrgao(nome: string) {
    const res = await fetch("/api/workspace/edital-watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", orgao: nome }),
    });
    const d = await res.json();
    if (d.orgaos) { setOrgaos(d.orgaos); setAlertas(prev => prev?.filter(a => a.orgao !== nome) ?? null); }
  }

  // ── Verificar alertas ──────────────────────────────────────────────────────
  async function verificar() {
    if (orgaos.length === 0 || verificando) return;
    setVerificando(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/edital-watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verificar" }),
      });
      const d = await res.json();
      if (d.alertas) { setAlertas(d.alertas); setVerificadoEm(d.verificadoEm ?? null); }
      else setError("Não foi possível verificar os alertas.");
    } catch {
      setError("Erro ao verificar. Tente novamente.");
    } finally {
      setVerificando(false);
    }
  }

  const sugestoesFiltradas = SUGESTOES.filter(s =>
    !orgaos.includes(s) && (!input || s.toLowerCase().includes(input.toLowerCase()))
  ).slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            Edital Watch
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitore órgãos e receba alertas de novos editais com IA
          </p>
        </div>
        {orgaos.length > 0 && (
          <button
            onClick={verificar}
            disabled={verificando}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">
            {verificando
              ? <><Loader2 className="w-4 h-4 animate-spin" />Verificando...</>
              : <><RefreshCw className="w-4 h-4" />Verificar agora</>
            }
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex gap-2 rounded-xl bg-amber-500/8 border border-amber-500/15 p-3 mb-5">
        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/80">
          As informações são geradas pela IA com base em seu conhecimento de treinamento e podem não refletir o estado atual dos concursos. Sempre confirme em fontes oficiais.
        </p>
      </div>

      {/* Input */}
      <div className="relative mb-5">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => { setInput(e.target.value); setShowSugestoes(true); }}
            onFocus={() => setShowSugestoes(true)}
            onBlur={() => setTimeout(() => setShowSugestoes(false), 200)}
            onKeyDown={e => { if (e.key === "Enter") addOrgao(input); }}
            placeholder="Adicionar órgão ou entidade (ex: TCU, Polícia Federal...)"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
          />
          <button
            onClick={() => addOrgao(input)}
            disabled={!input.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium transition-colors flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>

        {/* Sugestões dropdown */}
        {showSugestoes && sugestoesFiltradas.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f1523] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden">
            <p className="text-xs text-gray-600 px-3 pt-2 pb-1">Sugestões</p>
            <div className="flex flex-wrap gap-1.5 px-3 pb-3">
              {sugestoesFiltradas.map(s => (
                <button key={s}
                  onMouseDown={() => addOrgao(s)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-indigo-500/15 hover:border-indigo-500/20 hover:text-indigo-300 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {orgaos.length === 0 && (
        <div className="text-center py-12">
          <BellOff className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium mb-1">Nenhum órgão monitorado</p>
          <p className="text-sm text-gray-600">
            Adicione órgãos e entidades para monitorar novos editais
          </p>
        </div>
      )}

      {/* Alertas (pós verificação) */}
      {alertas && alertas.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Resultado da verificação</h3>
            {verificadoEm && (
              <span className="text-xs text-gray-600">
                {new Date(verificadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {alertas
              .sort((a, b) => {
                const order = { em_andamento: 0, provavelmente_aberto: 1, previsto: 2, sem_info: 3 };
                return (order[a.status] ?? 4) - (order[b.status] ?? 4);
              })
              .map(alerta => (
                <AlertaCard
                  key={alerta.orgao}
                  alerta={alerta}
                  onRemove={() => removeOrgao(alerta.orgao)}
                />
              ))
            }
          </div>
        </div>
      )}

      {/* Watchlist (sem verificação ou órgãos sem alerta) */}
      {orgaos.length > 0 && !alertas && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">
            Monitorando {orgaos.length} {orgaos.length === 1 ? "órgão" : "órgãos"}
          </h3>
          <div className="space-y-2">
            {orgaos.map(orgao => (
              <OrgaoCard key={orgao} orgao={orgao} onRemove={() => removeOrgao(orgao)} />
            ))}
          </div>
          <p className="text-center text-xs text-gray-600 mt-4">
            Clique em &ldquo;Verificar agora&rdquo; para checar editais com IA
          </p>
        </div>
      )}

      {/* Órgãos da watchlist que não aparecem nos alertas */}
      {alertas && orgaos.filter(o => !alertas.find(a => a.orgao === o)).length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs text-gray-600 mb-2">Outros órgãos monitorados</h3>
          <div className="space-y-2">
            {orgaos
              .filter(o => !alertas.find(a => a.orgao === o))
              .map(orgao => (
                <OrgaoCard key={orgao} orgao={orgao} onRemove={() => removeOrgao(orgao)} />
              ))
            }
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
