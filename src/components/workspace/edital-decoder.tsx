"use client";
import { useState } from "react";
import { FileText, Zap, AlertCircle, ChevronDown, ChevronUp, Plus, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface MateriaExtraida {
  nome: string;
  peso: number;
  topicos: string[];
  horas: number;
  prioridade: "alta" | "media" | "baixa";
  dicaBanca: string;
}

interface EditalResult {
  cargo: string;
  orgao: string;
  banca: string;
  dataProva: string | null;
  materias: MateriaExtraida[];
  totalHorasSemana: number;
  resumo: string;
  planoSugerido: string;
}

const PRIORIDADE_CONFIG = {
  alta:  { label: "Alta",  color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
  media: { label: "Média", color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  baixa: { label: "Baixa", color: "text-green-400",   bg: "bg-green-500/10 border-green-500/20" },
};

function PesoBar({ peso }: { peso: number }) {
  const pct = (peso / 5) * 100;
  const color = peso >= 4 ? "#ef4444" : peso >= 3 ? "#f59e0b" : "#34d399";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{peso}/5</span>
    </div>
  );
}

interface Props {
  userId: string;
  onMateriasAdded?: () => void;
}

export function EditalDecoder({ userId, onMateriasAdded }: Props) {
  void userId;
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EditalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0, 1]));
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function analisar() {
    if (!texto.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAdded(false);
    try {
      const res = await fetch("/api/workspace/edital-decoder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json() as { result?: EditalResult; error?: string };
      if (!res.ok || data.error) { setError(data.error ?? "Erro ao analisar."); return; }
      setResult(data.result ?? null);
      setExpanded(new Set([0, 1]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  async function adicionarMaterias() {
    if (!result || adding) return;
    setAdding(true);
    try {
      await fetch("/api/workspace/edital-decoder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materias: result.materias }),
      });
      setAdded(true);
      onMateriasAdded?.();
    } catch { /* silently ignore */ }
    finally { setAdding(false); }
  }

  function toggleExpanded(i: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  // ── Tela inicial / input ─────────────────────────────────────────────────────
  if (!result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center mx-auto mb-4 text-3xl">📄</div>
          <h2 className="font-bold text-xl mb-2">Decodificador de Edital</h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Cole o conteúdo programático do seu edital e a IA vai extrair as matérias, pesos e montar um plano de estudos personalizado.
          </p>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/3 p-5 mb-4">
          <label className="text-xs text-gray-500 block mb-2 font-medium">📋 Conteúdo programático do edital</label>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            rows={12}
            placeholder={`Cole aqui o conteúdo programático...

Exemplo:
DIREITO CONSTITUCIONAL — 30 questões
- Princípios fundamentais
- Direitos e garantias fundamentais
- Organização do Estado
- Administração Pública

DIREITO ADMINISTRATIVO — 20 questões
- Atos administrativos
- Licitações e contratos
...`}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-700
              focus:outline-none focus:border-indigo-500/50 resize-none leading-relaxed"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[10px] text-gray-700">{texto.length.toLocaleString()} caracteres</span>
            {texto.length > 0 && (
              <button onClick={() => setTexto("")} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">Limpar</button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <button
          onClick={analisar}
          disabled={!texto.trim() || loading}
          className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all
            bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 shadow-lg shadow-indigo-500/20"
        >
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Analisando edital...</>
          ) : (
            <><Zap className="w-4 h-4" /> Decodificar edital com IA</>
          )}
        </button>
        <p className="text-center text-xs text-gray-700 mt-2">Leva 10-20 segundos • Powered by Claude AI</p>
      </div>
    );
  }

  // ── Resultado ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header resultado */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 mb-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="font-bold text-indigo-300">
                {result.cargo !== "Não identificado" ? result.cargo : "Edital decodificado"}
              </p>
              {result.orgao !== "Não identificado" && (
                <p className="text-xs text-gray-500">{result.orgao}{result.banca !== "Não identificada" ? ` · ${result.banca}` : ""}</p>
              )}
            </div>
          </div>
          <button onClick={() => { setResult(null); setTexto(""); }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-600 hover:text-white transition-colors" title="Novo edital">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-sm text-gray-300 italic mb-2">&ldquo;{result.resumo}&rdquo;</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-gray-500">{result.materias.length} matérias extraídas</span>
          <span className="text-gray-500">·</span>
          <span className="text-gray-500">{result.totalHorasSemana}h/semana sugeridas</span>
          {result.dataProva && (
            <><span className="text-gray-500">·</span><span className="text-amber-400">Prova: {new Date(result.dataProva).toLocaleDateString("pt-BR")}</span></>
          )}
        </div>
      </div>

      {/* Plano sugerido */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 mb-5">
        <p className="text-xs text-purple-400 font-semibold mb-1.5">🎯 Estratégia sugerida</p>
        <p className="text-sm text-gray-300 leading-relaxed">{result.planoSugerido}</p>
      </div>

      {/* Lista de matérias */}
      <div className="mb-5">
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-3">Matérias extraídas • ordenadas por prioridade</p>
        <div className="space-y-2">
          {result.materias
            .sort((a, b) => b.peso - a.peso)
            .map((m, i) => {
              const pConf = PRIORIDADE_CONFIG[m.prioridade] ?? PRIORIDADE_CONFIG.media;
              const isExpanded = expanded.has(i);
              return (
                <div key={i} className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
                  <button
                    onClick={() => toggleExpanded(i)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-sm font-medium text-gray-200 truncate">{m.nome}</p>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-bold flex-shrink-0", pConf.bg, pConf.color)}>
                          {pConf.label}
                        </span>
                      </div>
                      <PesoBar peso={m.peso} />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-600 font-mono">{m.horas}h/sem</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/5 pt-3">
                      {m.topicos.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Tópicos principais</p>
                          <div className="flex flex-wrap gap-1.5">
                            {m.topicos.map((t, j) => (
                              <span key={j} className="text-xs bg-white/5 border border-white/8 px-2 py-0.5 rounded-full text-gray-400">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {m.dicaBanca && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/15">
                          <span className="text-amber-400 text-sm flex-shrink-0">⚡</span>
                          <div>
                            <p className="text-[10px] font-semibold text-amber-400 mb-0.5">Dica da banca</p>
                            <p className="text-xs text-amber-300/80 leading-relaxed">{m.dicaBanca}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-3">
        <button
          onClick={adicionarMaterias}
          disabled={adding || added}
          className={cn(
            "flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
            added
              ? "bg-green-500/15 border border-green-500/30 text-green-400"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
          )}
        >
          {adding ? (
            <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Adicionando...</>
          ) : added ? (
            <><Check className="w-4 h-4" /> Matérias adicionadas ao seu plano!</>
          ) : (
            <><Plus className="w-4 h-4" /> Adicionar matérias ao meu plano</>
          )}
        </button>
        <button onClick={() => { setResult(null); setTexto(""); }}
          className="px-4 py-3 rounded-xl border border-white/10 bg-white/3 text-gray-400 text-sm hover:text-white hover:border-white/20 transition-colors">
          Novo
        </button>
      </div>
    </div>
  );
}
