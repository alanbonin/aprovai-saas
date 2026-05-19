"use client";
import { useState, useEffect } from "react";
import { Layers, RefreshCw, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeekPoint {
  label: string;
  total: number;
  accuracy: number | null;
}

interface LevelStat {
  level: string;
  total: number;
  correct: number;
  accuracy: number;
  trend: WeekPoint[];
}

interface NivelData {
  levels: LevelStat[];
  totalAnswered: number;
  summary: {
    easiest: { level: string; accuracy: number } | null;
    hardest: { level: string; accuracy: number } | null;
  };
}

const LEVEL_META: Record<string, {
  label: string; icon: string;
  bg: string; border: string; text: string; bar: string;
}> = {
  facil: {
    label: "Fácil", icon: "🟢",
    bg: "bg-emerald-500/[0.06]", border: "border-emerald-500/20",
    text: "text-emerald-400", bar: "bg-emerald-500",
  },
  medio: {
    label: "Médio", icon: "🟡",
    bg: "bg-yellow-500/[0.06]", border: "border-yellow-500/20",
    text: "text-yellow-400", bar: "bg-yellow-500",
  },
  dificil: {
    label: "Difícil", icon: "🔴",
    bg: "bg-red-500/[0.06]", border: "border-red-500/20",
    text: "text-red-400", bar: "bg-red-500",
  },
};

function TrendBars({ trend, color }: { trend: WeekPoint[]; color: string }) {
  const maxTotal = Math.max(...trend.map(t => t.total), 1);
  return (
    <div className="mt-4">
      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Tendência (4 semanas)</p>
      <div className="flex items-end gap-1.5 h-16">
        {trend.map((t, i) => {
          const height = t.total > 0 ? Math.max(8, Math.round((t.total / maxTotal) * 56)) : 4;
          const accColor =
            t.accuracy === null ? "bg-white/20" :
            t.accuracy >= 70 ? "bg-emerald-500" :
            t.accuracy >= 50 ? "bg-yellow-500" :
            "bg-red-500";
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[8px] text-gray-700">
                {t.accuracy !== null ? `${t.accuracy}%` : "—"}
              </span>
              <div className="w-full flex items-end justify-center">
                <div
                  className={cn("w-4 rounded-t-sm transition-all", accColor)}
                  style={{ height: `${height}px` }}
                  title={`${t.total} questões · ${t.accuracy ?? "—"}%`}
                />
              </div>
              <span className="text-[8px] text-gray-700 text-center leading-tight">{t.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NivelInner() {
  const [data, setData]         = useState<NivelData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    const res = await fetch("/api/workspace/nivel");
    if (res.ok) setData(await res.json());
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded-xl w-56" />
          <div className="grid grid-cols-3 gap-4">
            {[0,1,2].map(i => <div key={i} className="h-48 bg-white/5 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const d = data!;

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-purple-400" />
            Desempenho por Dificuldade
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Veja como você performa em cada nível de dificuldade
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-2 text-gray-600 hover:text-gray-300 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
        </button>
      </div>

      {(d?.totalAnswered ?? 0) === 0 ? (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-10 text-center">
          <Layers className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            Nenhuma questão respondida ainda. Comece a praticar para ver suas estatísticas por nível.
          </p>
        </div>
      ) : (
        <>
          {/* Summary highlights */}
          {(d?.summary?.easiest || d?.summary?.hardest) && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {d.summary.easiest && (
                <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-4">
                  <p className="text-[10px] text-emerald-600 uppercase tracking-wider mb-1 font-medium">Seu ponto forte</p>
                  <p className="text-sm font-bold text-white">{LEVEL_META[d.summary.easiest.level]?.label}</p>
                  <p className="text-xl font-black text-emerald-400">{d.summary.easiest.accuracy}%</p>
                </div>
              )}
              {d.summary.hardest && (
                <div className="rounded-xl bg-red-500/[0.06] border border-red-500/20 p-4">
                  <p className="text-[10px] text-red-600 uppercase tracking-wider mb-1 font-medium">Precisa melhorar</p>
                  <p className="text-sm font-bold text-white">{LEVEL_META[d.summary.hardest.level]?.label}</p>
                  <p className="text-xl font-black text-red-400">{d.summary.hardest.accuracy}%</p>
                </div>
              )}
            </div>
          )}

          {/* Level cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(d?.levels ?? []).map(lvl => {
              const meta = LEVEL_META[lvl.level] ?? LEVEL_META.medio;
              return (
                <div key={lvl.level} className={cn("rounded-2xl border p-5", meta.bg, meta.border)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{meta.icon}</span>
                      <p className={cn("text-sm font-bold", meta.text)}>{meta.label}</p>
                    </div>
                    <TrendingUp className={cn("w-4 h-4 opacity-50", meta.text)} />
                  </div>

                  <div className="mb-3">
                    <p className={cn("text-3xl font-black mb-0.5", meta.text)}>
                      {lvl.total > 0 ? `${lvl.accuracy}%` : "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {lvl.correct}/{lvl.total} corretas
                    </p>
                  </div>

                  {/* Accuracy bar */}
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
                    <div
                      className={cn("h-full rounded-full transition-all", meta.bar)}
                      style={{ width: `${lvl.accuracy}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-600 mb-3">{lvl.total} questões respondidas</p>

                  {/* Weekly trend */}
                  {lvl.total > 0 && <TrendBars trend={lvl.trend} color={meta.bar} />}
                </div>
              );
            })}
          </div>

          {/* Tips */}
          <div className="mt-6 rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
            <p className="text-xs text-gray-500 leading-relaxed">
              💡 <strong className="text-gray-300">Dica:</strong> Questões difíceis valem mais na prova real.
              Se você domina fáceis e médias, concentre-se em elevar o desempenho em questões difíceis para
              se destacar no ranking.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
