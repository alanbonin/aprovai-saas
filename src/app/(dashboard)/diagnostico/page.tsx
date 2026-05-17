"use client";
import { useState, useEffect } from "react";
import { Activity, RefreshCw, TrendingUp, TrendingDown, Target, Clock, BookOpen, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Diagnostico {
  titulo: string;
  resumo: string;
  pontoForte: string | null;
  pontoFraco: string | null;
  recomendacao: string;
  emoji: string;
  nivel: "excelente" | "bom" | "regular" | "atencao" | "inicio";
}

interface MateriaStat {
  nome: string;
  total: number;
  acertos: number;
  pct: number;
}

interface Stats {
  totalQuestoes: number;
  accuracy: number;
  horasEstudo: number;
  simulados: number;
}

interface DiagData {
  diagnostico: Diagnostico | null;
  stats?: Stats;
  materiaStats?: MateriaStat[];
  generatedAt?: string;
  cached?: boolean;
}

const NIVEL_STYLE: Record<string, { border: string; bg: string; text: string; label: string }> = {
  excelente: { border: "border-yellow-500/30", bg: "bg-yellow-500/[0.06]", text: "text-yellow-400", label: "Excelente 🏆" },
  bom:       { border: "border-emerald-500/30", bg: "bg-emerald-500/[0.06]", text: "text-emerald-400", label: "Bom 📈" },
  regular:   { border: "border-blue-500/30", bg: "bg-blue-500/[0.06]", text: "text-blue-400", label: "Regular 💪" },
  atencao:   { border: "border-amber-500/30", bg: "bg-amber-500/[0.06]", text: "text-amber-400", label: "Atenção ⚠️" },
  inicio:    { border: "border-gray-500/20", bg: "bg-white/[0.03]", text: "text-gray-400", label: "Início 🎯" },
};

function AccuracyBar({ pct, nome }: { pct: number; nome: string }) {
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-300 truncate">{nome}</span>
        <span className={cn(
          "font-mono font-bold ml-2",
          pct >= 70 ? "text-emerald-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"
        )}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DiagnosticoPage() {
  const [data, setData]         = useState<DiagData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);

  async function loadCached() {
    setLoading(true);
    const res = await fetch("/api/workspace/diagnostico");
    if (res.ok) {
      const d: DiagData = await res.json();
      if (d.diagnostico) { setData(d); setLoading(false); return; }
    }
    setLoading(false);
  }

  async function generate() {
    setGenerating(true);
    const res = await fetch("/api/workspace/diagnostico", { method: "POST" });
    if (res.ok) {
      const d: DiagData = await res.json();
      setData(d);
    }
    setGenerating(false);
  }

  useEffect(() => { loadCached(); }, []);

  const diag = data?.diagnostico;
  const stats = data?.stats;
  const nivel = diag?.nivel ?? "inicio";
  const style = NIVEL_STYLE[nivel] ?? NIVEL_STYLE.inicio;

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-400" />
            Diagnóstico Semanal
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Análise personalizada do seu desempenho — gerada por IA, renovada toda semana
          </p>
        </div>
        <button
          onClick={generate}
          disabled={generating || loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
        >
          <RefreshCw className={cn("w-4 h-4", generating && "animate-spin")} />
          {diag ? "Reanalisar" : "Gerar diagnóstico"}
        </button>
      </div>

      {/* Loading */}
      {(loading || generating) && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">
            {generating ? "Analisando seu desempenho com IA..." : "Carregando..."}
          </p>
          {generating && <p className="text-gray-600 text-xs mt-1">Pode levar alguns segundos</p>}
        </div>
      )}

      {/* No data yet */}
      {!loading && !generating && !diag && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-300 mb-2">Sem diagnóstico desta semana</h2>
          <p className="text-gray-600 text-sm max-w-sm mx-auto mb-6">
            Gere sua análise semanal personalizada. A IA examina suas questões respondidas, taxa de acerto por matéria e horas de estudo.
          </p>
          <button
            onClick={generate}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 mx-auto"
          >
            <Activity className="w-4 h-4" />
            Analisar minha semana
          </button>
        </div>
      )}

      {/* Diagnóstico */}
      {!loading && !generating && diag && (
        <>
          {/* Main card */}
          <div className={cn("rounded-2xl border p-6 mb-5", style.bg, style.border)}>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center flex-shrink-0 text-3xl">
                {diag.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <h2 className="text-lg font-bold text-white">{diag.titulo}</h2>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", style.text, style.border, style.bg)}>
                    {style.label}
                  </span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{diag.resumo}</p>
              </div>
            </div>
          </div>

          {/* Stats row */}
          {stats && (
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: "Questões", value: stats.totalQuestoes, icon: Target, color: "text-blue-400" },
                { label: "Acerto", value: `${stats.accuracy}%`, icon: TrendingUp, color: "text-emerald-400" },
                { label: "Horas", value: `${stats.horasEstudo}h`, icon: Clock, color: "text-indigo-400" },
                { label: "Simulados", value: stats.simulados, icon: BookOpen, color: "text-purple-400" },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                  <s.icon className={cn("w-4 h-4 mx-auto mb-1", s.color)} />
                  <p className={cn("text-lg font-black", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-gray-600">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Ponto forte / fraco */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {diag.pontoForte && (
              <div className="rounded-xl bg-emerald-500/[0.05] border border-emerald-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs font-semibold text-emerald-400">Ponto forte</p>
                </div>
                <p className="text-sm text-gray-300">{diag.pontoForte}</p>
              </div>
            )}
            {diag.pontoFraco && (
              <div className="rounded-xl bg-amber-500/[0.05] border border-amber-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <p className="text-xs font-semibold text-amber-400">Ponto fraco</p>
                </div>
                <p className="text-sm text-gray-300">{diag.pontoFraco}</p>
              </div>
            )}
          </div>

          {/* Recomendação */}
          <div className="rounded-xl bg-indigo-600/[0.06] border border-indigo-500/20 p-4 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <p className="text-xs font-semibold text-indigo-400">Recomendação para a próxima semana</p>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed">{diag.recomendacao}</p>
          </div>

          {/* Desempenho por matéria */}
          {data?.materiaStats && data.materiaStats.length > 0 && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-500" />
                Desempenho por matéria esta semana
              </h3>
              <div className="space-y-3">
                {/* Show worst first (already sorted) */}
                {[...data.materiaStats].reverse().map(m => (
                  <AccuracyBar key={m.nome} nome={m.nome} pct={m.pct} />
                ))}
              </div>
            </div>
          )}

          {data?.generatedAt && (
            <p className="text-center text-[10px] text-gray-700 mt-5">
              {data.cached ? "Diagnóstico desta semana (em cache)" : "Gerado agora"} · {new Date(data.generatedAt).toLocaleString("pt-BR")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
