"use client";
import { useState, useEffect } from "react";
import { Users, TrendingUp, BarChart2, Flame, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface MeuData {
  questoesTotal: number;
  questoes7d: number;
  accuracy: number;
  streak: number;
  xp: number;
  simulados: number;
  simuladoAccuracy: number;
}

interface MediaData {
  questoes30d: number;
  accuracy: number;
  streak: number;
  xp: number;
  simulados: number;
  simuladoAccuracy: number;
}

interface CompararData {
  meu: MeuData;
  media: MediaData;
  percentil7d: number;
  platformUserCount: number;
}

interface Metric {
  label: string;
  myValue: number;
  avgValue: number;
  unit?: string;
  icon: React.ElementType;
  color: string;
  higherIsBetter?: boolean;
}

function BarComparison({ label, myValue, avgValue, unit = "", icon: Icon, color }: Metric) {
  const max = Math.max(myValue, avgValue, 1);
  const myPct = Math.min(100, (myValue / max) * 100);
  const avgPct = Math.min(100, (avgValue / max) * 100);
  const better = myValue >= avgValue;

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={cn("w-4 h-4", color)} />
        <p className="text-sm font-semibold text-gray-300">{label}</p>
      </div>

      {/* Você */}
      <div className="mb-2.5">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Você</span>
          <span className={cn("font-bold font-mono", better ? "text-indigo-400" : "text-gray-400")}>
            {myValue}{unit}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${myPct}%`, background: better ? "#6366f1" : "#4b5563" }}
          />
        </div>
      </div>

      {/* Média */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Média da plataforma</span>
          <span className="font-mono text-gray-500">{avgValue}{unit}</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gray-600 transition-all duration-700"
            style={{ width: `${avgPct}%` }}
          />
        </div>
      </div>

      <p className={cn(
        "text-[10px] mt-2.5 font-medium",
        better ? "text-indigo-400" : "text-amber-400"
      )}>
        {better
          ? myValue === avgValue ? "Na média" : `+${myValue - avgValue}${unit} acima da média 🎉`
          : `${avgValue - myValue}${unit} abaixo da média — continue! 💪`}
      </p>
    </div>
  );
}

function percentilLabel(p: number) {
  if (p >= 90) return { label: "Top 10%", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" };
  if (p >= 75) return { label: "Top 25%", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" };
  if (p >= 50) return { label: "Acima da média", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
  if (p >= 25) return { label: "Abaixo da média", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
  return { label: "Iniciando", color: "text-gray-400", bg: "bg-white/[0.03] border-white/[0.06]" };
}

export default function CompararPage() {
  const [data, setData]     = useState<CompararData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workspace/comparar")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Calculando comparação...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { meu, media, percentil7d, platformUserCount } = data;
  const pLabel = percentilLabel(percentil7d);

  const metrics: Metric[] = [
    {
      label: "Questões respondidas (total)",
      myValue: meu.questoesTotal,
      avgValue: media.questoes30d,
      unit: "",
      icon: Target,
      color: "text-blue-400",
    },
    {
      label: "Taxa de acerto geral",
      myValue: meu.accuracy,
      avgValue: media.accuracy,
      unit: "%",
      icon: TrendingUp,
      color: "text-emerald-400",
    },
    {
      label: "Sequência de estudos",
      myValue: meu.streak,
      avgValue: media.streak,
      unit: " dias",
      icon: Flame,
      color: "text-orange-400",
    },
    {
      label: "XP acumulado",
      myValue: meu.xp,
      avgValue: media.xp,
      unit: "",
      icon: Zap,
      color: "text-yellow-400",
    },
    {
      label: "Simulados realizados",
      myValue: meu.simulados,
      avgValue: media.simulados,
      unit: "",
      icon: BarChart2,
      color: "text-purple-400",
    },
    {
      label: "Acerto médio em simulados",
      myValue: meu.simuladoAccuracy,
      avgValue: media.simuladoAccuracy,
      unit: "%",
      icon: Target,
      color: "text-rose-400",
    },
  ];

  // SVG ring for percentile
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (percentil7d / 100) * circ;

  return (
    <div className="min-h-screen text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Comparação com a Média
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Como você se posiciona entre {platformUserCount.toLocaleString("pt-BR")} estudantes ativos
          </p>
        </div>
      </div>

      {/* Percentile highlight */}
      <div className={cn("rounded-2xl border p-6 mb-6 flex items-center gap-6", pLabel.bg)}>
        {/* SVG ring */}
        <div className="flex-shrink-0 relative w-28 h-28">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <circle
              cx="60" cy="60" r={r} fill="none"
              stroke={percentil7d >= 75 ? "#6366f1" : percentil7d >= 50 ? "#34d399" : "#f59e0b"}
              strokeWidth="10"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-2xl font-black", pLabel.color)}>{percentil7d}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">percentil</span>
          </div>
        </div>

        <div>
          <p className={cn("text-xl font-bold mb-1", pLabel.color)}>{pLabel.label}</p>
          <p className="text-sm text-gray-400 leading-relaxed">
            Você estuda mais do que <span className={cn("font-bold", pLabel.color)}>{percentil7d}%</span> dos alunos ativos nos últimos 7 dias.{" "}
            {percentil7d >= 75
              ? "Excelente dedicação! 🚀"
              : percentil7d >= 50
              ? "Acima da média — continue assim! 💪"
              : "Aumente a frequência para superar mais alunos!"}
          </p>
        </div>
      </div>

      {/* Metric comparisons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metrics.map(m => (
          <BarComparison key={m.label} {...m} />
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-[11px] text-gray-700 mt-6">
        Dados comparativos baseados em médias anônimas da plataforma. Atualizado diariamente.
      </p>
    </div>
  );
}
