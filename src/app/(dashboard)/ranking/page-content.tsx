"use client";
import { useState, useEffect } from "react";
import { Trophy, Flame, Zap, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "all" | "week" | "month";

interface Entry {
  rank: number;
  name: string;
  score: number;
  isMe: boolean;
}

interface RankingData {
  period: Period;
  leaderboard: Entry[];
  me: Entry | null;
  total: number;
}

const PERIODS: { id: Period; label: string }[] = [
  { id: "week",  label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "all",   label: "Geral" },
];

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function scoreLabel(period: Period, score: number) {
  if (period === "all")   return `${score} XP`;
  return `${score} questões`;
}

export function RankingInner() {
  const [period, setPeriod]     = useState<Period>("week");
  const [data, setData]         = useState<RankingData | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ranking?period=${period}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  const board = data?.leaderboard ?? [];

  return (
    <div className="min-h-screen text-white p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h1 className="text-2xl font-bold">Ranking</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Concorra com outros alunos e veja onde você está no ranking
        </p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mb-6">
        {PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
              period === p.id
                ? "bg-indigo-600 text-white shadow"
                : "text-gray-400 hover:text-white"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      {!loading && board.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-8">
          {[board[1], board[0], board[2]].map((entry, i) => {
            const heights = ["h-24", "h-32", "h-20"];
            const sizes   = ["w-14", "w-16", "w-14"];
            const actualRank = i === 0 ? 2 : i === 1 ? 1 : 3;
            return (
              <div key={entry.rank} className="flex flex-col items-center gap-2">
                <span className="text-2xl">{MEDAL[actualRank]}</span>
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center font-black text-lg border-2",
                  entry.isMe
                    ? "bg-indigo-600 border-indigo-400 text-white"
                    : "bg-white/10 border-white/20 text-gray-300"
                )}>
                  {entry.name.charAt(0).toUpperCase()}
                </div>
                <p className={cn(
                  "text-xs font-medium max-w-[72px] text-center truncate",
                  entry.isMe ? "text-indigo-300" : "text-gray-300"
                )}>{entry.name}</p>
                <div className={cn(
                  "rounded-t-lg flex items-end justify-center pb-2 w-full",
                  heights[i], sizes[i],
                  i === 1
                    ? "bg-gradient-to-t from-yellow-600/40 to-yellow-600/10 border-t border-x border-yellow-500/30"
                    : i === 0
                    ? "bg-gradient-to-t from-gray-500/40 to-gray-500/10 border-t border-x border-gray-500/30"
                    : "bg-gradient-to-t from-amber-700/40 to-amber-700/10 border-t border-x border-amber-700/30"
                )}>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {scoreLabel(period, entry.score)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : board.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p>Nenhum aluno ainda neste período.</p>
          <p className="text-sm mt-1">Responda questões para entrar no ranking!</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          {board.map((entry, idx) => (
            <div
              key={entry.rank}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors",
                idx < board.length - 1 && "border-b border-white/5",
                entry.isMe
                  ? "bg-indigo-600/10 border-l-2 border-l-indigo-500"
                  : "hover:bg-white/3"
              )}
            >
              {/* Rank */}
              <div className={cn(
                "w-8 text-center font-black text-sm flex-shrink-0",
                entry.rank === 1 ? "text-yellow-400" :
                entry.rank === 2 ? "text-gray-300" :
                entry.rank === 3 ? "text-amber-600" :
                "text-gray-600"
              )}>
                {MEDAL[entry.rank] ?? `#${entry.rank}`}
              </div>

              {/* Avatar */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                entry.isMe ? "bg-indigo-600 text-white" : "bg-white/10 text-gray-400"
              )}>
                {entry.name.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  entry.isMe ? "text-indigo-300" : "text-gray-200"
                )}>
                  {entry.name} {entry.isMe && <span className="text-xs text-indigo-400">(você)</span>}
                </p>
              </div>

              {/* Score */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {period === "all"
                  ? <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  : <Flame className="w-3.5 h-3.5 text-amber-400" />}
                <span className={cn(
                  "text-sm font-bold font-mono tabular-nums",
                  entry.isMe ? "text-indigo-300" : "text-gray-300"
                )}>
                  {scoreLabel(period, entry.score)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My rank (if outside top 50) */}
      {!loading && data?.me && data.me.rank > 50 && (
        <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-600/10 px-4 py-3 flex items-center gap-3">
          <div className="w-8 text-center font-black text-sm text-gray-500">
            #{data.me.rank}
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {data.me.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-indigo-300 truncate">
              {data.me.name} <span className="text-xs text-indigo-400">(você)</span>
            </p>
            <p className="text-xs text-gray-500">Fora do top 50</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {period === "all"
              ? <Zap className="w-3.5 h-3.5 text-indigo-400" />
              : <Flame className="w-3.5 h-3.5 text-amber-400" />}
            <span className="text-sm font-bold font-mono text-indigo-300">
              {scoreLabel(period, data.me.score)}
            </span>
          </div>
        </div>
      )}

      {/* Total participants */}
      {!loading && data && data.total > 0 && (
        <p className="text-center text-xs text-gray-600 mt-4">
          {data.total} alunos no ranking
        </p>
      )}
    </div>
  );
}
