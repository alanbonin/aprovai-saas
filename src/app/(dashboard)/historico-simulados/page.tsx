"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy, Clock, Target, TrendingUp, TrendingDown,
  Play, BarChart2, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Simulado {
  id: number;
  total: number;
  correct: number;
  accuracy: number;
  timeSecs: number;
  timeLabel: string;
  subjectIds: string[];
  subjectNames: string[];
  createdAt: string;
}

interface Meta {
  totalSimulados: number;
  mediaAcerto: number;
  melhorAcerto: number;
  tempoMedio: number;
}

interface Evolucao {
  accuracy: number;
  date: string;
}

function AccuracyBadge({ pct }: { pct: number }) {
  const color = pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const bg    = pct >= 70 ? "rgba(16,185,129,0.1)" : pct >= 50 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)";
  const border= pct >= 70 ? "rgba(16,185,129,0.3)" : pct >= 50 ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)";
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full border"
      style={{ color, background: bg, borderColor: border }}>
      {pct}%
    </span>
  );
}

function MiniTrend({ evolucao }: { evolucao: Evolucao[] }) {
  if (evolucao.length < 2) return null;
  const last  = evolucao[evolucao.length - 1].accuracy;
  const prev  = evolucao[evolucao.length - 2].accuracy;
  const delta = last - prev;
  if (delta === 0) return null;
  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-medium",
      delta > 0 ? "text-green-400" : "text-red-400"
    )}>
      {delta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {delta > 0 ? "+" : ""}{delta}pp
    </span>
  );
}

function SparkLine({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const w = 80, h = 28, pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const last = data[data.length - 1];
  const color = last >= 70 ? "#10b981" : last >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.split(" ").pop()!.split(",")[0]} cy={pts.split(" ").pop()!.split(",")[1]}
        r="2.5" fill={color} />
    </svg>
  );
}

export default function HistoricoSimuladosPage() {
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [meta, setMeta]           = useState<Meta | null>(null);
  const [evolucao, setEvolucao]   = useState<Evolucao[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/simulado/historico")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setSimulados(d.simulados ?? []);
          setMeta(d.meta ?? null);
          setEvolucao(d.evolucao ?? []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${String(s).padStart(2, "0")}s`;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  if (!meta || meta.totalSimulados === 0) {
    return (
      <div className="min-h-screen text-white p-6 max-w-2xl mx-auto flex flex-col items-center justify-center">
        <Target className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-xl font-bold mb-2">Nenhum simulado realizado</h2>
        <p className="text-gray-500 text-sm text-center mb-6">
          Complete simulados para acompanhar sua evolução ao longo do tempo.
        </p>
        <Link
          href="/simulado"
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-medium transition-colors"
        >
          <Play className="w-4 h-4" />
          Fazer primeiro simulado
        </Link>
      </div>
    );
  }

  const sparkData = evolucao.map(e => e.accuracy);

  return (
    <div className="min-h-screen text-white p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-400" />
            Histórico de Simulados
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {meta.totalSimulados} simulado{meta.totalSimulados !== 1 ? "s" : ""} realizados
          </p>
        </div>
        <Link
          href="/simulado"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold transition-colors"
        >
          <Play className="w-4 h-4" />
          Novo simulado
        </Link>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl bg-white/5 border border-white/[0.06] p-4 text-center">
          <p className="text-2xl font-black text-indigo-400">{meta.totalSimulados}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total</p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/[0.06] p-4 text-center">
          <p className={cn("text-2xl font-black",
            meta.mediaAcerto >= 70 ? "text-green-400" : meta.mediaAcerto >= 50 ? "text-amber-400" : "text-red-400"
          )}>
            {meta.mediaAcerto}%
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Média</p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/[0.06] p-4 text-center">
          <p className="text-2xl font-black text-yellow-400">{meta.melhorAcerto}%</p>
          <p className="text-xs text-gray-500 mt-0.5">Melhor</p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/[0.06] p-4 text-center">
          <p className="text-2xl font-black text-blue-400">{formatTime(meta.tempoMedio)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Tempo médio</p>
        </div>
      </div>

      {/* Trend chart */}
      {sparkData.length >= 2 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-300">Evolução recente</span>
            <MiniTrend evolucao={evolucao} />
          </div>
          <div className="flex items-end gap-1.5 h-20">
            {sparkData.map((val, i) => {
              const height = Math.max(8, (val / 100) * 80);
              const color = val >= 70 ? "#10b981" : val >= 50 ? "#f59e0b" : "#ef4444";
              const isLast = i === sparkData.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className={cn(
                    "absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    "bg-gray-900 text-white border border-white/10"
                  )}>
                    {val}%
                  </div>
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${height}px`,
                      background: isLast ? color : `${color}60`,
                      boxShadow: isLast ? `0 0 8px ${color}60` : "none",
                    }}
                  />
                  {evolucao[i] && (
                    <span className="text-[9px] text-gray-600 truncate w-full text-center">
                      {new Date(evolucao[i].date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Simulados list */}
      <div className="space-y-3">
        {simulados.map((s, i) => {
          const isExpanded = expanded === s.id;
          const rank = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
          return (
            <div
              key={s.id}
              className="rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/10 transition-all"
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : s.id)}
                className="w-full text-left p-4"
              >
                <div className="flex items-center gap-4">
                  {/* Date + rank */}
                  <div className="flex-shrink-0 text-center w-14">
                    {rank ? (
                      <span className="text-2xl">{rank}</span>
                    ) : (
                      <span className="text-xs text-gray-600 font-mono">#{i + 1}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <AccuracyBadge pct={s.accuracy} />
                      <span className="text-xs text-gray-500">
                        {s.correct}/{s.total} corretas
                      </span>
                      <span className="text-xs text-gray-600 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {s.timeLabel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{formatDate(s.createdAt)}</p>
                  </div>

                  {/* Spark + expand */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {sparkData.length >= 2 && i < sparkData.length && (
                      <SparkLine data={sparkData.slice(Math.max(0, i - 4), i + 1)} />
                    )}
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-500" />
                      : <ChevronDown className="w-4 h-4 text-gray-500" />
                    }
                  </div>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/[0.04] pt-4">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg bg-white/5 p-3 text-center">
                      <p className="text-lg font-black text-white">{s.correct}</p>
                      <p className="text-[10px] text-gray-500">Corretas</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3 text-center">
                      <p className="text-lg font-black text-red-400">{s.total - s.correct}</p>
                      <p className="text-[10px] text-gray-500">Erradas</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3 text-center">
                      <p className="text-lg font-black text-blue-400">{s.timeLabel}</p>
                      <p className="text-[10px] text-gray-500">Tempo</p>
                    </div>
                  </div>

                  {/* Subject tags */}
                  {s.subjectNames.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-600 mb-2 uppercase tracking-wide">Matérias</p>
                      <div className="flex flex-wrap gap-1.5">
                        {s.subjectNames.map((name, j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                      <span>Aproveitamento</span>
                      <span>{s.accuracy}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${s.accuracy}%`,
                          background: s.accuracy >= 70 ? "#10b981" : s.accuracy >= 50 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                    {s.accuracy >= 70 && (
                      <p className="text-[10px] text-green-400 mt-1 flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        Aprovado! Acima de 70%
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/simulado"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-bold transition-colors"
        >
          <Play className="w-4 h-4" />
          Fazer novo simulado
        </Link>
      </div>
    </div>
  );
}
