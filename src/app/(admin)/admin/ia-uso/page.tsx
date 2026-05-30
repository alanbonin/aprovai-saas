"use client";
import { useEffect, useState } from "react";
import { Brain, Users, TrendingUp, Bot, AlertTriangle, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserUsage {
  userId: string;
  name: string;
  email: string;
  count: number;
  limit: number;
}

interface AgentUsage {
  agentId: string;
  name: string;
  count: number;
}

interface WeeklyPoint {
  week: string;
  count: number;
}

interface IaUsoData {
  totalThisWeek: number;
  totalThisMonth: number;
  activeUsersCount: number;
  topUsers: UserUsage[];
  topAgents: AgentUsage[];
  weeklyTrend: WeeklyPoint[];
}

function fmtWeek(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export default function IaUsoPage() {
  const [data, setData] = useState<IaUsoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/ia-uso")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-white flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Carregando dados de uso de IA...</p>
      </div>
    );
  }

  if (!data) return (
    <div className="p-8 text-white">
      <p className="text-gray-500">Sem dados disponíveis.</p>
    </div>
  );

  const maxWeek = Math.max(...data.weeklyTrend.map(w => w.count), 1);
  const maxAgent = Math.max(...data.topAgents.map(a => a.count), 1);

  // Custo estimado: média ponderada ~$0.002/chamada
  const COST_PER_CALL = 0.002;
  const estimatedWeek = data.totalThisWeek * COST_PER_CALL;
  const estimatedMonth = data.totalThisMonth * COST_PER_CALL;
  const fmtUSD = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-8 text-white max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-indigo-400" />
          Uso de IA — Monitoramento
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Rastreamento de chamadas à IA pelo sistema de mentoria e workspace
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Chamadas esta semana", value: data.totalThisWeek, icon: Brain, color: "text-indigo-400" },
          { label: "Chamadas (30 dias)", value: data.totalThisMonth, icon: TrendingUp, color: "text-emerald-400" },
          { label: "Usuários ativos", value: data.activeUsersCount, icon: Users, color: "text-blue-400" },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
            <kpi.icon className={cn("w-5 h-5 mb-2", kpi.color)} />
            <p className={cn("text-3xl font-black", kpi.color)}>
              {kpi.value.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Custo estimado */}
      <div className="mb-6 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 p-5">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-amber-300">Custo estimado de IA</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Esta semana</p>
            <p className="text-2xl font-black text-amber-400">{fmtUSD(estimatedWeek)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Este mês (30 dias)</p>
            <p className="text-2xl font-black text-amber-400">{fmtUSD(estimatedMonth)}</p>
          </div>
        </div>
        <p className="text-[10px] text-gray-600 mt-3 leading-relaxed">
          Estimativa baseada em uso médio de tokens por tipo de requisição:
          Mentor/Chat (Sonnet ~$0.0045/chamada) · Diagnóstico/Glossário/Artigos (Haiku ~$0.00025/chamada) · média ponderada ~$0.002/chamada.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Weekly trend chart */}
        <div className="col-span-3 rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" /> Tendência semanal
          </h2>

          {data.weeklyTrend.length === 0 ? (
            <p className="text-sm text-gray-600 py-8 text-center">Sem dados suficientes</p>
          ) : (
            <div className="flex items-end gap-2 h-28">
              {data.weeklyTrend.map(w => {
                const pct = (w.count / maxWeek) * 100;
                return (
                  <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-gray-600 font-mono">{w.count}</span>
                    <div className="w-full rounded-t overflow-hidden" style={{ height: `${Math.max(4, pct)}%`, maxHeight: "80px", minHeight: "4px" }}>
                      <div className="w-full h-full bg-indigo-500/60 rounded-t" />
                    </div>
                    <span className="text-[9px] text-gray-600">{fmtWeek(w.week)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top agents */}
        <div className="col-span-2 rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-400" /> Agentes mais usados
          </h2>
          {data.topAgents.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-4">Sem uso registrado</p>
          ) : (
            <div className="space-y-3">
              {data.topAgents.map(a => {
                const pct = (a.count / maxAgent) * 100;
                return (
                  <div key={a.agentId}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300 truncate">{a.name}</span>
                      <span className="text-gray-500 font-mono ml-2">{a.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500/60 transition-all"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top users table */}
      <div className="mt-6 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="p-4 border-b border-white/[0.04] flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-300">Usuários com mais uso esta semana</h2>
        </div>

        {data.topUsers.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-8">Nenhum uso registrado esta semana</p>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {data.topUsers.map(u => {
              const pct = Math.min(100, (u.count / u.limit) * 100);
              const overLimit = u.count >= u.limit;
              return (
                <div key={u.userId} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{u.name}</p>
                    <p className="text-xs text-gray-600 truncate">{u.email}</p>
                  </div>
                  <div className="w-32">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className={cn(overLimit ? "text-red-400" : "text-gray-500")}>
                        {u.count}/{u.limit}
                      </span>
                      {overLimit && (
                        <span className="flex items-center gap-0.5 text-red-400">
                          <AlertTriangle className="w-2.5 h-2.5" /> Limite
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", overLimit ? "bg-red-500" : "bg-indigo-500")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs font-bold font-mono w-8 text-right",
                    overLimit ? "text-red-400" : pct >= 80 ? "text-amber-400" : "text-gray-400"
                  )}>
                    {Math.round(pct)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
