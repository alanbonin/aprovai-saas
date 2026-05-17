"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, CheckCircle2,
  Target, Flame, Zap, Award, ChevronRight, Loader2,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface WeeklyDigest {
  weekKey: string;
  generatedAt: string;
  questoesRespondidas: number;
  questoesCorretas: number;
  aproveitamento: number;
  streakAtual: number;
  xpGanho: number;
  melhorMateria: string | null;
  piorMateria: string | null;
  tendencia: "subindo" | "estavel" | "caindo";
  titulo: string;
  paragrafo: string;
  destaques: string[];
  proximasSemana: string[];
  emoji: string;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 overflow-hidden">
      <div
        className="absolute inset-0 opacity-5"
        style={{ background: `radial-gradient(circle at top left, ${color}, transparent 70%)` }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span style={{ color }} className="opacity-80">{icon}</span>
          <span className="text-xs text-white/40 uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Tendência badge ───────────────────────────────────────────────────────────
function TendenciaBadge({ tendencia }: { tendencia: WeeklyDigest["tendencia"] }) {
  if (tendencia === "subindo") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <TrendingUp className="w-3 h-3" /> Subindo
      </span>
    );
  }
  if (tendencia === "caindo") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
        <TrendingDown className="w-3 h-3" /> Caindo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-white/5 text-white/50 border border-white/10">
      <Minus className="w-3 h-3" /> Estável
    </span>
  );
}

// ── Barra de aproveitamento ───────────────────────────────────────────────────
function AproveitamentoBar({ value }: { value: number }) {
  const color =
    value >= 70 ? "#10b981"
    : value >= 50 ? "#f59e0b"
    : "#ef4444";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-white/50">
        <span>Aproveitamento</span>
        <span style={{ color }} className="font-semibold">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-white/[0.06]", className)} />
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ResumoSemanalPage() {
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDigest = useCallback(async (force = false) => {
    try {
      if (force) setRegenerating(true);
      else setLoading(true);
      setError(null);

      const res = await fetch("/api/relatorio/semanal", {
        method: force ? "POST" : "GET",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Erro ao carregar resumo");
      const data = (await res.json()) as { digest: WeeklyDigest; cached: boolean };
      setDigest(data.digest);
      setCached(data.cached);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }, []);

  useEffect(() => { void fetchDigest(false); }, [fetchDigest]);

  // ── Estado de loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c18] p-6 md:p-10">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // ── Estado de erro ─────────────────────────────────────────────────────────
  if (error || !digest) {
    return (
      <div className="min-h-screen bg-[#080c18] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-4xl">😕</p>
          <p className="text-white/60">{error ?? "Resumo indisponível"}</p>
          <button
            onClick={() => fetchDigest(false)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const cacheAge = cached
    ? `Gerado há ${Math.round((Date.now() - new Date(digest.generatedAt).getTime()) / 60000)} min`
    : "Gerado agora";

  return (
    <div className="min-h-screen bg-[#080c18] text-white">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">

        {/* ── Cabeçalho ───────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest mb-1">
              Semana de {digest.weekKey}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              <span className="text-3xl">{digest.emoji}</span>
              {digest.titulo}
            </h1>
          </div>
          <button
            onClick={() => fetchDigest(true)}
            disabled={regenerating}
            title="Regenerar com IA"
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-xs text-white/50 hover:text-white hover:bg-white/[0.08] transition-all",
              regenerating && "opacity-50 cursor-not-allowed"
            )}
          >
            {regenerating
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            {regenerating ? "Gerando…" : "Atualizar"}
          </button>
        </div>

        {/* ── Cache info ───────────────────────────────────────────────────── */}
        <p className="text-xs text-white/25">{cacheAge}</p>

        {/* ── Parágrafo IA ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
          <p className="text-sm text-white/80 leading-relaxed">{digest.paragrafo}</p>
          <div className="mt-3 flex items-center gap-2">
            <TendenciaBadge tendencia={digest.tendencia} />
          </div>
        </div>

        {/* ── Stats grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Target className="w-4 h-4" />}
            label="Questões"
            value={digest.questoesRespondidas}
            sub={`${digest.questoesCorretas} corretas`}
            color="#6366f1"
          />
          <StatCard
            icon={<Award className="w-4 h-4" />}
            label="Aproveitamento"
            value={`${digest.aproveitamento}%`}
            color={digest.aproveitamento >= 70 ? "#10b981" : digest.aproveitamento >= 50 ? "#f59e0b" : "#ef4444"}
          />
          <StatCard
            icon={<Flame className="w-4 h-4" />}
            label="Streak"
            value={`${digest.streakAtual}d`}
            sub="sequência"
            color="#f97316"
          />
          <StatCard
            icon={<Zap className="w-4 h-4" />}
            label="XP ganho"
            value={`+${digest.xpGanho}`}
            sub="esta semana"
            color="#f59e0b"
          />
        </div>

        {/* ── Barra de aproveitamento ──────────────────────────────────────── */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
          <AproveitamentoBar value={digest.aproveitamento} />

          {(digest.melhorMateria || digest.piorMateria) && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {digest.melhorMateria && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-3">
                  <p className="text-[10px] text-emerald-400/70 uppercase tracking-wide mb-1">Melhor matéria</p>
                  <p className="text-sm font-medium text-emerald-300">{digest.melhorMateria}</p>
                </div>
              )}
              {digest.piorMateria && digest.piorMateria !== digest.melhorMateria && (
                <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-3">
                  <p className="text-[10px] text-red-400/70 uppercase tracking-wide mb-1">Precisa de reforço</p>
                  <p className="text-sm font-medium text-red-300">{digest.piorMateria}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Destaques da semana ───────────────────────────────────────────── */}
        {digest.destaques.length > 0 && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
            <h2 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Destaques da semana
            </h2>
            <ul className="space-y-2.5">
              {digest.destaques.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                  <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Recomendações para próxima semana ────────────────────────────── */}
        {digest.proximasSemana.length > 0 && (
          <div className="rounded-xl border border-indigo-500/20 bg-white/[0.02] p-5">
            <h2 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-indigo-400" />
              Foco para a próxima semana
            </h2>
            <ul className="space-y-2.5">
              {digest.proximasSemana.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                  <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] text-indigo-400 font-bold">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── CTA questões ─────────────────────────────────────────────────── */}
        <a
          href="/workspace"
          className="flex items-center justify-between w-full rounded-xl border border-indigo-500/30 bg-indigo-600/10 hover:bg-indigo-600/20 transition-colors p-4 group"
        >
          <div>
            <p className="text-sm font-semibold text-indigo-300">Continuar estudando</p>
            <p className="text-xs text-white/40 mt-0.5">Pratique questões para a próxima semana</p>
          </div>
          <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
        </a>

      </div>
    </div>
  );
}
