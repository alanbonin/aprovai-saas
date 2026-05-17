"use client";
import { useState, useEffect } from "react";
import { BarChart2, Trophy, AlertTriangle, RefreshCw, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface BancaStat {
  banca: string;
  total: number;
  correct: number;
  accuracy: number;
  subjectCount: number;
  subjects: string[];
}

interface BancasData {
  bancas: BancaStat[];
  totalBancas: number;
  melhorBanca: { banca: string; accuracy: number } | null;
  piorBanca: { banca: string; accuracy: number } | null;
}

function AccuracyColor(acc: number) {
  if (acc >= 75) return "text-emerald-400";
  if (acc >= 60) return "text-yellow-400";
  if (acc >= 40) return "text-orange-400";
  return "text-red-400";
}

function AccuracyBg(acc: number) {
  if (acc >= 75) return "bg-emerald-500";
  if (acc >= 60) return "bg-yellow-500";
  if (acc >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export default function BancasPage() {
  const [data, setData]         = useState<BancasData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort]         = useState<"total" | "accuracy">("total");

  async function load(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    const res = await fetch("/api/workspace/bancas");
    if (res.ok) setData(await res.json());
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded-xl w-48" />
          <div className="grid grid-cols-3 gap-3">
            {[0,1,2].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl" />)}
          </div>
          <div className="h-64 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  const d = data!;
  const sorted = [...(d?.bancas ?? [])].sort((a, b) =>
    sort === "total" ? b.total - a.total : b.accuracy - a.accuracy
  );
  const maxTotal = sorted.length > 0 ? sorted[0].total : 1;

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-400" />
            Desempenho por Banca
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Veja em quais bancas você vai melhor e onde precisa focar mais
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

      {d.bancas.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-10 text-center">
          <Target className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            Nenhuma questão respondida ainda. Comece praticando para ver suas estatísticas por banca.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
              <p className="text-2xl font-black text-indigo-400">{d.totalBancas}</p>
              <p className="text-xs text-gray-500 mt-0.5">Bancas praticadas</p>
            </div>
            {d.melhorBanca && (
              <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">Melhor</span>
                </div>
                <p className="text-sm font-bold text-white truncate">{d.melhorBanca.banca}</p>
                <p className="text-lg font-black text-emerald-400">{d.melhorBanca.accuracy}%</p>
              </div>
            )}
            {d.piorBanca && (
              <div className="rounded-xl bg-rose-500/[0.06] border border-rose-500/20 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-[10px] text-rose-500 font-medium uppercase tracking-wider">Foco</span>
                </div>
                <p className="text-sm font-bold text-white truncate">{d.piorBanca.banca}</p>
                <p className="text-lg font-black text-rose-400">{d.piorBanca.accuracy}%</p>
              </div>
            )}
          </div>

          {/* Sort toggle */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">
              {sorted.length} bancas
            </p>
            <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
              {[
                { id: "total" as const, label: "Qtd." },
                { id: "accuracy" as const, label: "Acerto" },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors",
                    sort === s.id
                      ? "bg-indigo-600 text-white"
                      : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Banca list */}
          <div className="space-y-2">
            {sorted.map((b, i) => (
              <div
                key={b.banca}
                className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-gray-600 font-mono w-4 flex-shrink-0">{i + 1}.</span>
                    <p className="text-sm font-semibold text-white truncate">{b.banca}</p>
                    {b.subjects.length > 0 && (
                      <p className="text-xs text-gray-600 truncate hidden sm:block">
                        · {b.subjects.slice(0, 2).join(", ")}{b.subjectCount > 2 ? ` +${b.subjectCount - 2}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-600">{b.total} questões</span>
                    <span className={cn("text-sm font-black w-12 text-right", AccuracyColor(b.accuracy))}>
                      {b.accuracy}%
                    </span>
                  </div>
                </div>

                {/* Dual bars: volume + accuracy */}
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500/60 transition-all"
                      style={{ width: `${Math.min(100, (b.total / maxTotal) * 100)}%` }}
                    />
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", AccuracyBg(b.accuracy))}
                      style={{ width: `${b.accuracy}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-1.5">
                  <span className="text-[9px] text-gray-700">■ Volume</span>
                  <span className="text-[9px] text-gray-700">■ Acerto</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
