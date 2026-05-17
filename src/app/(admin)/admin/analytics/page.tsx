"use client";
import { useState, useEffect } from "react";
import {
  Users, TrendingUp, BookOpen, Target,
  BarChart2, UserCheck, UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DauPoint { date: string; users: number }
interface TopSubject { subjectId: string; name: string; categoria: string | null; count: number }
interface Conversao { total: number; paid: number; free: number; pct: number }
interface Retencao { activeWithSub: number; inactiveWithSub: number; total: number }
interface WeekPoint { week: string; count: number }

interface AnalyticsData {
  dau: DauPoint[];
  topSubjects: TopSubject[];
  conversao: Conversao;
  retencao: Retencao;
  avgQPerDay: number;
  newUsersPerWeek: WeekPoint[];
}

function BarChart({ data, valueKey, labelKey, color = "#6366f1", height = 120 }: {
  data: Record<string, number | string>[];
  valueKey: string;
  labelKey: string;
  color?: string;
  height?: number;
}) {
  const values = data.map(d => Number(d[valueKey]));
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((d, i) => {
        const val = Number(d[valueKey]);
        const barH = Math.max(2, (val / max) * (height - 20));
        const isLast = i === data.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <div className="bg-gray-900 border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-mono text-white whitespace-nowrap">
                {String(d[labelKey])}: {val}
              </div>
            </div>
            <div
              className="w-full rounded-t-sm transition-all"
              style={{
                height: `${barH}px`,
                background: isLast ? color : `${color}80`,
                minHeight: val > 0 ? 2 : 0,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData]     = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<"dau" | "subjects" | "users">("dau");

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500">
        Erro ao carregar dados de analytics.
      </div>
    );
  }

  const dauMax  = Math.max(...data.dau.map(d => d.users), 1);
  const avgDau  = Math.round(data.dau.reduce((s, d) => s + d.users, 0) / data.dau.length);
  const maxDau  = Math.max(...data.dau.map(d => d.users));
  const totalQ  = data.topSubjects.reduce((s, d) => s + d.count, 0);

  return (
    <div className="p-6 text-white max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-indigo-400" />
          Analytics da Plataforma
        </h1>
        <p className="text-gray-500 text-sm mt-1">Últimos 30 dias · Atualizado agora</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={<Users className="w-5 h-5" />} label="Alunos cadastrados"
          value={data.conversao.total} color="#6366f1" />
        <KpiCard icon={<UserCheck className="w-5 h-5" />} label="Assinaturas ativas"
          value={data.conversao.paid} color="#10b981"
          sub={`${data.conversao.pct}% conversão`} />
        <KpiCard icon={<TrendingUp className="w-5 h-5" />} label="DAU médio"
          value={avgDau} color="#f59e0b"
          sub={`Máx: ${maxDau} usuários`} />
        <KpiCard icon={<BookOpen className="w-5 h-5" />} label="Q/dia médio"
          value={data.avgQPerDay} color="#8b5cf6"
          sub="questões por dia ativo" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: "dau", label: "Usuários Ativos" },
          { key: "subjects", label: "Top Matérias" },
          { key: "users", label: "Novos Alunos" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
              tab === t.key
                ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                : "border-white/10 text-gray-500 hover:text-gray-300"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* DAU chart */}
      {tab === "dau" && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-300">Usuários ativos por dia (DAU)</span>
            <span className="text-xs text-gray-600">últimos 30 dias</span>
          </div>
          <div className="flex items-end gap-0.5 h-32 mb-2">
            {data.dau.map((d, i) => {
              const barH = Math.max(2, (d.users / dauMax) * 112);
              const isWeekend = [0, 6].includes(new Date(d.date + "T12:00:00").getDay());
              const isToday = i === data.dau.length - 1;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center group relative">
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div className="bg-gray-900 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-white whitespace-nowrap">
                      {d.date.slice(5)}: {d.users}
                    </div>
                  </div>
                  <div
                    className="w-full rounded-t-sm"
                    style={{
                      height: `${barH}px`,
                      background: isToday ? "#6366f1" : isWeekend ? "#4b5563" : "#6366f180",
                      boxShadow: isToday ? "0 0 6px #6366f180" : "none",
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>{data.dau[0]?.date.slice(5)}</span>
            <span>{data.dau[data.dau.length - 1]?.date.slice(5)} (hoje)</span>
          </div>
        </div>
      )}

      {/* Top subjects chart */}
      {tab === "subjects" && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-300">Top matérias respondidas</span>
            <span className="text-xs text-gray-600">{totalQ.toLocaleString("pt-BR")} questões no período</span>
          </div>
          <div className="space-y-2.5">
            {data.topSubjects.map((s, i) => {
              const pct = Math.round((s.count / data.topSubjects[0].count) * 100);
              const colors = ["#6366f1","#8b5cf6","#a78bfa","#c4b5fd","#818cf8"];
              const color = colors[i % colors.length];
              return (
                <div key={s.subjectId}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300 truncate max-w-48">{s.name}</span>
                    <span className="text-gray-500 ml-2 flex-shrink-0">
                      {s.count.toLocaleString("pt-BR")} ({Math.round((s.count / totalQ) * 100)}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New users per week */}
      {tab === "users" && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-300">Novos alunos por semana</span>
            <span className="text-xs text-gray-600">últimas 8 semanas</span>
          </div>
          <BarChart
            data={data.newUsersPerWeek.map(d => ({ week: d.week, count: d.count }))}
            valueKey="count"
            labelKey="week"
            color="#10b981"
            height={140}
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1">
            {data.newUsersPerWeek.filter((_, i) => i % 2 === 0).map(d => (
              <span key={d.week}>{d.week}</span>
            ))}
          </div>
        </div>
      )}

      {/* Conversion + Retenção side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Conversão */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-green-400" />
            Conversão
          </h3>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${data.conversao.pct}%` }} />
            </div>
            <span className="text-sm font-bold text-green-400 w-10 text-right">{data.conversao.pct}%</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Pagantes: {data.conversao.paid}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-600 inline-block" />
              Gratuitos: {data.conversao.free}
            </span>
          </div>
        </div>

        {/* Retenção */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            Retenção (assinantes)
          </h3>
          {data.retencao.total > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${Math.round((data.retencao.activeWithSub / data.retencao.total) * 100)}%` }} />
                </div>
                <span className="text-sm font-bold text-indigo-400 w-10 text-right">
                  {Math.round((data.retencao.activeWithSub / data.retencao.total) * 100)}%
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-indigo-400" />
                  Ativos 7d: {data.retencao.activeWithSub}
                </span>
                <span className="flex items-center gap-1">
                  <UserX className="w-3 h-3 text-red-400" />
                  Inativos: {data.retencao.inactiveWithSub}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600">Sem assinantes ativos</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color, sub }: {
  icon: React.ReactNode; label: string; value: number;
  color: string; sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-black" style={{ color }}>{value.toLocaleString("pt-BR")}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}
