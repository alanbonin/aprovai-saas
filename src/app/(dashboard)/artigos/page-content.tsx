"use client";
import { useState, useEffect, useCallback } from "react";
import {
  BookMarked, Sparkles, RefreshCw, AlertCircle,
  ChevronDown, ChevronUp, AlertTriangle, Tag, FileText,
  ClipboardList, History, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Artigo {
  referencia: string;
  topico: string;
  frequencia: "muito alta" | "alta" | "media";
  dica: string;
  definicao?: string;
  palavras_chave?: string[];
  pegadinha?: string;
  exemplo_prova?: string;
}

interface HistoryEntry {
  id: string;
  generatedAt: string;
  subjectName: string;
  artigos: Artigo[];
}

interface Subject { id: string; name: string; }

const FREQ_CONFIG = {
  "muito alta": { label: "Muito Alta", color: "text-red-400",   bg: "bg-red-500/10 border-red-500/20",     bar: "bg-red-500",   pct: 100 },
  alta:         { label: "Alta",       color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", bar: "bg-amber-500", pct: 67  },
  media:        { label: "Média",      color: "text-blue-400",  bg: "bg-blue-500/10 border-blue-500/20",   bar: "bg-blue-500",  pct: 40  },
};

function ArtigoCard({ artigo, index }: { artigo: Artigo; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const freq = FREQ_CONFIG[artigo.frequencia] ?? FREQ_CONFIG.media;
  const hasDetails = artigo.definicao || artigo.palavras_chave?.length || artigo.pegadinha || artigo.exemplo_prova;

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
      <button
        onClick={() => hasDetails && setExpanded(v => !v)}
        className={cn(
          "w-full text-left p-4 flex items-start gap-3",
          hasDetails ? "cursor-pointer hover:bg-white/[0.03] transition-colors" : "cursor-default"
        )}
      >
        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[11px] font-bold text-gray-500 flex-shrink-0 mt-0.5">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap mb-1">
            <span className="text-sm font-bold text-indigo-300 font-mono">{artigo.referencia}</span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0", freq.bg, freq.color)}>
              {freq.label}
            </span>
          </div>
          <p className="text-sm text-gray-200 mb-1">{artigo.topico}</p>
          <p className="text-xs text-gray-500 italic">💡 {artigo.dica}</p>
          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden w-full">
            <div className={cn("h-full rounded-full transition-all duration-500", freq.bar)} style={{ width: `${freq.pct}%`, opacity: 0.6 }} />
          </div>
        </div>

        {hasDetails && (
          <div className="flex-shrink-0 mt-0.5">
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
          </div>
        )}
      </button>

      {expanded && hasDetails && (
        <div className="px-4 pb-4 border-t border-white/[0.06] pt-3 space-y-3 ml-9">
          {artigo.definicao && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wide">Definição</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{artigo.definicao}</p>
            </div>
          )}

          {artigo.palavras_chave && artigo.palavras_chave.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">Palavras-chave</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {artigo.palavras_chave.map((kw, i) => (
                  <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {artigo.pegadinha && (
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wide">Pegadinha de prova</span>
              </div>
              <p className="text-sm text-amber-200/80">{artigo.pegadinha}</p>
            </div>
          )}

          {artigo.exemplo_prova && (
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Como já foi cobrado</span>
              </div>
              <p className="text-sm text-gray-400 italic">{artigo.exemplo_prova}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryPanel({
  history,
  activeId,
  onSelect,
}: {
  history: HistoryEntry[];
  activeId: string;
  onSelect: (entry: HistoryEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  if (history.length <= 1) return null;

  return (
    <div className="mt-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        <History className="w-4 h-4" />
        Histórico de gerações ({history.length})
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="mt-2 space-y-1">
          {history.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelect(entry)}
              className={cn(
                "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                activeId === entry.id
                  ? "bg-indigo-600/20 border border-indigo-500/30 text-indigo-300"
                  : "bg-white/[0.02] border border-white/[0.05] text-gray-400 hover:bg-white/[0.05] hover:text-gray-200"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{entry.subjectName}</span>
                  {activeId === entry.id && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 flex-shrink-0">atual</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  {new Date(entry.generatedAt).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                  {" · "}{entry.artigos.length} artigos
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-40" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ArtigosInner() {
  const [subjects, setSubjects]       = useState<Subject[]>([]);
  const [selectedId, setSelectedId]   = useState("");
  const [history, setHistory]         = useState<HistoryEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<HistoryEntry | null>(null);
  const [loading, setLoading]         = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Matérias do aluno
  useEffect(() => {
    fetch("/api/subjects?mine=true")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const list: Subject[] = d?.subjects ?? d ?? [];
        setSubjects(list);
        if (list.length > 0) setSelectedId(list[0].id);
      });
  }, []);

  // Carrega histórico ao trocar matéria
  const loadHistory = useCallback((subjectId: string) => {
    if (!subjectId) return;
    setHistory([]);
    setActiveEntry(null);
    setError(null);
    setLoading(true);
    fetch(`/api/workspace/artigos?subjectId=${subjectId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const h: HistoryEntry[] = d?.history ?? [];
        setHistory(h);
        setActiveEntry(h.length > 0 ? h[0] : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadHistory(selectedId); }, [selectedId, loadHistory]);

  async function generate() {
    const subject = subjects.find(s => s.id === selectedId);
    if (!subject) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/artigos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: subject.id, subjectName: subject.name }),
      });
      if (res.ok) {
        const d = await res.json() as { entry: HistoryEntry; history: HistoryEntry[] };
        setHistory(d.history ?? []);
        setActiveEntry(d.entry);
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Erro ao gerar");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    }
    setGenerating(false);
  }

  const selectedName = subjects.find(s => s.id === selectedId)?.name ?? "";

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookMarked className="w-6 h-6 text-indigo-400" />
          Artigos Mais Cobrados
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Os 10 artigos, leis e súmulas que mais caem — com definição, pegadinhas e exemplos de prova
        </p>
      </div>

      {/* Seletor + botão */}
      <div className="flex gap-3 mb-6">
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
        >
          {subjects.length === 0 && <option value="">Nenhuma matéria cadastrada</option>}
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button
          onClick={generate}
          disabled={generating || loading || !selectedId}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
        >
          {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {history.length > 0 ? "Gerar novo" : "Gerar"}
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Carregando */}
      {(loading || generating) && (
        <div className="text-center py-14">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {generating ? `Analisando artigos de ${selectedName}...` : "Carregando..."}
          </p>
        </div>
      )}

      {/* Vazio — sem geração ainda */}
      {!loading && !generating && !activeEntry && !error && selectedId && subjects.length > 0 && (
        <div className="text-center py-14">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <BookMarked className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-300 mb-2">Nenhum dado para {selectedName}</h2>
          <p className="text-gray-600 text-sm mb-5 max-w-xs mx-auto">
            Clique em &quot;Gerar&quot; para a IA listar os artigos mais cobrados, com definições e pegadinhas.
          </p>
          <button onClick={generate} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 mx-auto">
            <Sparkles className="w-4 h-4" />
            Gerar lista para {selectedName}
          </button>
        </div>
      )}

      {/* Sem matérias */}
      {!loading && !generating && subjects.length === 0 && (
        <div className="text-center py-14">
          <p className="text-gray-500 text-sm">Adicione matérias à sua lista de estudo para usar os artigos IA.</p>
        </div>
      )}

      {/* Resultados */}
      {!loading && !generating && activeEntry && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">
              {activeEntry.artigos.length} itens para <span className="text-white">{activeEntry.subjectName}</span>
            </h2>
            <span className="text-[10px] text-gray-600">
              {new Date(activeEntry.generatedAt).toLocaleString("pt-BR", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>

          {/* Legenda */}
          <div className="flex gap-4 mb-4 flex-wrap">
            {Object.entries(FREQ_CONFIG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <div className={cn("w-2 h-2 rounded-full", v.bar)} />
                {v.label}
              </div>
            ))}
            <span className="text-[11px] text-gray-600 ml-auto">Toque no card para ver detalhes</span>
          </div>

          <div className="space-y-2">
            {activeEntry.artigos.map((a, i) => (
              <ArtigoCard key={i} artigo={a} index={i} />
            ))}
          </div>

          {/* Histórico */}
          <HistoryPanel
            history={history}
            activeId={activeEntry.id}
            onSelect={setActiveEntry}
          />

          <p className="text-[10px] text-gray-700 text-center mt-5">
            Dados baseados no conhecimento da IA sobre padrões históricos de provas de concursos.
          </p>
        </>
      )}
    </div>
  );
}
