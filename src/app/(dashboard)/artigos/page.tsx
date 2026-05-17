"use client";
import { useState, useEffect } from "react";
import { BookMarked, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Artigo {
  referencia: string;
  topico: string;
  frequencia: "muito alta" | "alta" | "media";
  dica: string;
}

interface ArtigosData {
  artigos: Artigo[];
  subjectName: string;
  generatedAt: string;
  cached?: boolean;
}

interface Subject { id: string; name: string; }

const FREQ_CONFIG = {
  "muito alta": { label: "Muito Alta",  color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20",       bar: "bg-red-500",     pct: 100 },
  alta:         { label: "Alta",        color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",   bar: "bg-amber-500",   pct: 67  },
  media:        { label: "Média",       color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",     bar: "bg-blue-500",    pct: 40  },
};

export default function ArtigosPage() {
  const [subjects, setSubjects]       = useState<Subject[]>([]);
  const [selectedId, setSelectedId]   = useState("");
  const [data, setData]               = useState<ArtigosData | null>(null);
  const [loading, setLoading]         = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Load subjects on mount
  useEffect(() => {
    fetch("/api/subjects")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const list: Subject[] = d?.subjects ?? d ?? [];
        setSubjects(list);
        if (list.length > 0) setSelectedId(list[0].id);
      });
  }, []);

  // Load cached data whenever subject changes
  useEffect(() => {
    if (!selectedId) return;
    setData(null);
    setError(null);
    setLoading(true);
    fetch(`/api/workspace/artigos?subjectId=${selectedId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.artigos) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedId]);

  async function generate() {
    const subject = subjects.find(s => s.id === selectedId);
    if (!subject) return;
    setGenerating(true);
    setError(null);
    const res = await fetch("/api/workspace/artigos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId: subject.id, subjectName: subject.name }),
    });
    if (res.ok) {
      const d: ArtigosData = await res.json();
      setData(d);
    } else {
      const d = await res.json().catch(() => ({}));
      setError((d as { error?: string }).error ?? "Erro ao gerar");
    }
    setGenerating(false);
  }

  const selectedName = subjects.find(s => s.id === selectedId)?.name ?? "";

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-indigo-400" />
            Artigos Mais Cobrados
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Os 10 artigos, leis e súmulas que mais caem nas provas — gerados com IA
          </p>
        </div>
      </div>

      {/* Subject selector + generate */}
      <div className="flex gap-3 mb-6">
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
        >
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={generate}
          disabled={generating || loading || !selectedId}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
        >
          {generating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {data ? "Reatualizar" : "Gerar"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Loading / generating */}
      {(loading || generating) && (
        <div className="text-center py-14">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {generating ? `Analisando artigos de ${selectedName}...` : "Carregando..."}
          </p>
        </div>
      )}

      {/* Empty — no cache yet */}
      {!loading && !generating && !data && !error && (
        <div className="text-center py-14">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <BookMarked className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-300 mb-2">Nenhum dado para {selectedName}</h2>
          <p className="text-gray-600 text-sm mb-5 max-w-xs mx-auto">
            Clique em "Gerar" para a IA listar os artigos mais cobrados em provas para esta matéria.
          </p>
          <button
            onClick={generate}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 mx-auto"
          >
            <Sparkles className="w-4 h-4" />
            Gerar lista para {selectedName}
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && !generating && data && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">
              {data.artigos.length} itens para <span className="text-white">{data.subjectName}</span>
            </h2>
            {data.cached && (
              <span className="text-[10px] text-gray-600 flex items-center gap-1">
                em cache · {new Date(data.generatedAt).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mb-4 flex-wrap">
            {Object.entries(FREQ_CONFIG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <div className={cn("w-2 h-2 rounded-full", v.bar)} />
                {v.label}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {data.artigos.map((a, i) => {
              const freq = FREQ_CONFIG[a.frequencia] ?? FREQ_CONFIG.media;
              return (
                <div
                  key={i}
                  className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 flex items-start gap-3"
                >
                  {/* Rank */}
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[11px] font-bold text-gray-500 flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-indigo-300 font-mono">{a.referencia}</span>
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0",
                        freq.bg, freq.color
                      )}>
                        {freq.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 mb-1.5">{a.topico}</p>
                    <p className="text-xs text-gray-500 italic">💡 {a.dica}</p>

                    {/* Freq bar */}
                    <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden w-full">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", freq.bar)}
                        style={{ width: `${freq.pct}%`, opacity: 0.6 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-gray-700 text-center mt-5">
            Dados baseados no conhecimento da IA sobre padrões históricos de provas de concursos.
          </p>
        </>
      )}
    </div>
  );
}
