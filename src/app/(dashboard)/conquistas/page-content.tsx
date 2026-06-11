"use client";
import { useState, useEffect } from "react";
import { Trophy, Lock, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Badge {
  id: string;
  label: string;
  desc: string;
  icon: string;
  category: string;
  unlocked: boolean;
  progress: number;
  current: number;
  target: number;
  xpReward: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  questoes:   "📝 Questões",
  streak:     "🔥 Sequência",
  simulado:   "🎯 Simulados",
  flashcard:  "🃏 Flashcards",
  desempenho: "🏅 Desempenho",
  especial:   "⭐ Especial",
};

export function ConquistasInner() {
  const [badges, setBadges]   = useState<Badge[]>([]);
  const [meta, setMeta]       = useState<{ unlockedCount: number; total: number; totalXpEarned: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<"all" | "unlocked" | "locked">("all");

  useEffect(() => {
    fetch("/api/conquistas")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setBadges(d.badges ?? []);
          setMeta({ unlockedCount: d.unlockedCount, total: d.total, totalXpEarned: d.totalXpEarned });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Carregando conquistas...</p>
        </div>
      </div>
    );
  }

  // Group by category
  const categories = [...new Set(badges.map(b => b.category))];

  const filteredBadges = (cat: string) =>
    badges
      .filter(b => b.category === cat)
      .filter(b => filter === "all" || (filter === "unlocked" ? b.unlocked : !b.unlocked));

  const pct = meta ? Math.round((meta.unlockedCount / meta.total) * 100) : 0;

  return (
    <div className="min-h-dvh text-white p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Conquistas
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {meta?.unlockedCount ?? 0} de {meta?.total ?? 0} desbloqueadas
          </p>
        </div>
        {meta && meta.totalXpEarned > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-bold text-indigo-400">+{meta.totalXpEarned} XP</span>
          </div>
        )}
      </div>

      {/* Overall progress */}
      {meta && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-400">Progresso geral</span>
            <span className="text-sm font-bold text-yellow-400">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                boxShadow: pct > 0 ? "0 0 8px rgba(251,191,36,0.4)" : "none",
              }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-black text-yellow-400">{meta.unlockedCount}</p>
              <p className="text-[10px] text-gray-600">Desbloqueadas</p>
            </div>
            <div>
              <p className="text-xl font-black text-gray-500">{meta.total - meta.unlockedCount}</p>
              <p className="text-[10px] text-gray-600">Pendentes</p>
            </div>
            <div>
              <p className="text-xl font-black text-indigo-400">{meta.totalXpEarned}</p>
              <p className="text-[10px] text-gray-600">XP conquistado</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "unlocked", "locked"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
              filter === f
                ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400"
                : "border-white/10 text-gray-500 hover:text-gray-300"
            )}
          >
            {f === "all" ? "Todas" : f === "unlocked" ? "✓ Desbloqueadas" : "🔒 Pendentes"}
          </button>
        ))}
      </div>

      {/* Badge categories */}
      <div className="space-y-8">
        {categories.map(cat => {
          const catBadges = filteredBadges(cat);
          if (catBadges.length === 0) return null;
          return (
            <div key={cat}>
              <h2 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wide">
                {CATEGORY_LABELS[cat] ?? cat}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {catBadges.map(badge => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {badges.filter(b =>
        filter === "all" || (filter === "unlocked" ? b.unlocked : !b.unlocked)
      ).length === 0 && (
        <div className="text-center py-16">
          <Star className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma conquista neste filtro</p>
        </div>
      )}
    </div>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  const isNear = !badge.unlocked && badge.progress >= 70;

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      badge.unlocked
        ? "bg-yellow-500/[0.06] border-yellow-500/25 hover:border-yellow-500/40"
        : "bg-white/[0.02] border-white/[0.06] hover:border-white/10",
    )}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl",
          badge.unlocked
            ? "bg-yellow-500/20 border border-yellow-500/30"
            : "bg-white/5 border border-white/10",
        )}>
          {badge.unlocked ? badge.icon : <Lock className="w-5 h-5 text-gray-600" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn(
              "text-sm font-bold",
              badge.unlocked ? "text-yellow-300" : "text-gray-400"
            )}>
              {badge.label}
            </span>
            {badge.unlocked && (
              <span className="text-[10px] text-yellow-500 font-semibold">✓ Desbloqueada</span>
            )}
            {isNear && !badge.unlocked && (
              <span className="text-[10px] text-orange-400 font-semibold animate-pulse">Quase lá!</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-2">{badge.desc}</p>

          {/* Progress */}
          {!badge.unlocked && (
            <>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${badge.progress}%`,
                    background: isNear
                      ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                      : "#6366f1",
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-600">
                {badge.current.toLocaleString("pt-BR")} / {badge.target.toLocaleString("pt-BR")}
                <span className="ml-2 text-gray-700">({badge.progress}%)</span>
              </p>
            </>
          )}

          {/* XP reward */}
          <div className="flex items-center gap-1 mt-2">
            <Zap className={cn("w-3 h-3", badge.unlocked ? "text-indigo-400" : "text-gray-600")} />
            <span className={cn("text-[10px] font-medium", badge.unlocked ? "text-indigo-400" : "text-gray-600")}>
              {badge.xpReward} XP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
