"use client";
import { useState, useEffect, useCallback } from "react";
import { FileBarChart, Download, RefreshCw, Users, Target, CheckCircle2, CreditCard } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string; name: string; email: string; planName: string;
  questoes: number; acerto: number; streak: number; xp: number;
  lastStudy: string | null; createdAt: string;
}

interface Kpis {
  totalUsers: number; activeUsers: number; totalAnswered: number;
  avgAccuracy: number; premiumUsers: number; period: string;
}

type Period = "7d" | "30d" | "all";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function AdminRelatorioPage() {
  const [period, setPeriod]   = useState<Period>("30d");
  const [users, setUsers]     = useState<UserRow[]>([]);
  const [kpis, setKpis]       = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]   = useState("");

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    const res = await fetch(`/api/admin/relatorio?period=${period}`);
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users ?? []);
      setKpis(d.kpis ?? null);
    }
    setLoading(false);
    setRefreshing(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen text-white p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-orange-400" />
            Relatório de Alunos
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Métricas de atividade e desempenho por aluno
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/relatorio?format=csv&period=${period}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </a>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:text-gray-300 transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 mb-5 rounded-xl bg-white/[0.03] border border-white/[0.06] p-1 w-fit">
        {[
          { id: "7d" as Period, label: "7 dias" },
          { id: "30d" as Period, label: "30 dias" },
          { id: "all" as Period, label: "Geral" },
        ].map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
              period === p.id
                ? "bg-orange-600 text-white"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total alunos", value: kpis.totalUsers, icon: <Users className="w-4 h-4" />, color: "text-orange-400" },
            { label: "Ativos no período", value: kpis.activeUsers, icon: <Target className="w-4 h-4" />, color: "text-blue-400" },
            { label: "Questões respondidas", value: kpis.totalAnswered.toLocaleString("pt-BR"), icon: <CheckCircle2 className="w-4 h-4" />, color: "text-indigo-400" },
            { label: "Acerto médio", value: `${kpis.avgAccuracy}%`, icon: <Target className="w-4 h-4" />, color: kpis.avgAccuracy >= 70 ? "text-emerald-400" : "text-yellow-400" },
            { label: "Alunos premium", value: kpis.premiumUsers, icon: <CreditCard className="w-4 h-4" />, color: "text-purple-400" },
          ].map(k => (
            <div key={k.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{k.label}</span>
                <span className={cn("opacity-50", k.color)}>{k.icon}</span>
              </div>
              <p className={cn("text-xl font-black", k.color)}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou email..."
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/40"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[0,1,2,3,4].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  {["Nome", "Plano", "Questões", "Acerto", "Streak", "XP", "Último estudo", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white truncate max-w-[140px]">{u.name}</p>
                      <p className="text-gray-600 truncate max-w-[140px]">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] border font-medium",
                        u.planName !== "Gratuito"
                          ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                          : "bg-white/5 border-white/10 text-gray-500"
                      )}>
                        {u.planName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-indigo-400 font-bold">{u.questoes.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "font-bold",
                        u.acerto >= 70 ? "text-emerald-400" : u.acerto >= 50 ? "text-yellow-400" : u.questoes > 0 ? "text-red-400" : "text-gray-600"
                      )}>
                        {u.questoes > 0 ? `${u.acerto}%` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-amber-400 font-bold">{u.streak > 0 ? `${u.streak}d` : "—"}</td>
                    <td className="px-4 py-3 text-yellow-400 font-mono">{u.xp.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(u.lastStudy)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/alunos/${u.id}`}
                        className="text-orange-400 hover:text-orange-300 transition-colors"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-white/[0.04]">
            <p className="text-[10px] text-gray-700">
              {filtered.length} aluno{filtered.length !== 1 ? "s" : ""} exibido{filtered.length !== 1 ? "s" : ""}
              {search && ` (filtrado de ${users.length})`}
              {" · "}<a href={`/api/admin/relatorio?format=csv&period=${period}`} className="text-orange-400 hover:text-orange-300">Exportar CSV</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
