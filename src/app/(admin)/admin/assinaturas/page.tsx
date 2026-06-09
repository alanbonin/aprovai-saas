"use client";
import { useEffect, useState } from "react";
import { CreditCard, AlertTriangle, TrendingUp, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planName: string;
  planPrice: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
}

interface Summary {
  totalAtivas: number;
  totalAtivasComCortesia?: number;
  totalExpiradas: number;
  novas30d: number;
  mrr: number;
  byPlan: Record<string, number>;
}

interface Data {
  summary: Summary;
  expirandoEm7d: SubEntry[];
  expiradas7d: SubEntry[];
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function SubTable({ title, subs, icon: Icon, emptyMsg, colorClass }: {
  title: string;
  subs: SubEntry[];
  icon: React.ElementType;
  emptyMsg: string;
  colorClass: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden mb-6">
      <div className={cn("p-4 border-b border-white/[0.04] flex items-center gap-2", colorClass)}>
        <Icon className="w-4 h-4" />
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="ml-auto text-xs text-gray-500">{subs.length} registro{subs.length !== 1 ? "s" : ""}</span>
      </div>
      {subs.length === 0 ? (
        <p className="text-center text-sm text-gray-600 py-8">{emptyMsg}</p>
      ) : (
        <div className="divide-y divide-white/[0.03]">
          {subs.map(s => {
            const days = daysUntil(s.endDate);
            return (
              <div key={s.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{s.userName}</p>
                  <p className="text-xs text-gray-600 truncate">{s.userEmail}</p>
                </div>
                <div className="text-center hidden sm:block">
                  <p className="text-xs text-gray-300 font-medium">{s.planName}</p>
                  <p className="text-[10px] text-gray-600">
                    R$ {(s.planPrice / 100).toFixed(2).replace(".", ",")}
                  </p>
                </div>
                <div className="text-right">
                  {s.endDate && (
                    <>
                      <p className="text-xs text-gray-400">{fmtDate(s.endDate)}</p>
                      {days !== null && days >= 0 && (
                        <p className={cn("text-[10px] font-bold",
                          days <= 3 ? "text-red-400" : days <= 7 ? "text-amber-400" : "text-gray-500"
                        )}>
                          em {days}d
                        </p>
                      )}
                      {days !== null && days < 0 && (
                        <p className="text-[10px] text-red-400 font-bold">há {Math.abs(days)}d</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AssinaturasAdminPage() {
  const [data, setData]     = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/assinaturas")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-white flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Carregando assinaturas...</p>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-gray-500">Sem dados.</div>;

  const { summary } = data;
  const totalPlanUsers = Object.values(summary.byPlan).reduce((a, b) => a + b, 0);

  return (
    <div className="p-8 text-white max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-indigo-400" />
          Painel de Assinaturas
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Monitoramento de assinaturas ativas, expirando e recém-expiradas
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Pagas ativas",  value: `${summary.totalAtivas} / ${summary.totalAtivasComCortesia ?? summary.totalAtivas}`, icon: Users, color: "text-emerald-400" },
          { label: "MRR (pagas)",  value: summary.mrr.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }), icon: TrendingUp, color: "text-indigo-400" },
          { label: "Novas (30d)",  value: summary.novas30d,                         icon: Clock,        color: "text-blue-400" },
          { label: "Expiradas",    value: summary.totalExpiradas,                   icon: AlertTriangle, color: "text-amber-400" },
        ].map(k => (
          <div key={k.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5">
            <k.icon className={cn("w-5 h-5 mb-2", k.color)} />
            <p className={cn("text-2xl font-black", k.color)}>{k.value}</p>
            <p className="text-xs text-gray-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Plan distribution */}
      {totalPlanUsers > 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-400" /> Distribuição por plano (ativos)
          </h2>
          <div className="space-y-3">
            {Object.entries(summary.byPlan).sort(([, a], [, b]) => b - a).map(([name, count]) => {
              const pct = Math.round((count / totalPlanUsers) * 100);
              return (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{name}</span>
                    <span className="text-gray-500 font-mono">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500/60" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expiring soon */}
      <SubTable
        title="Expirando nos próximos 7 dias"
        subs={data.expirandoEm7d}
        icon={AlertTriangle}
        emptyMsg="Nenhuma assinatura expirando em breve 🎉"
        colorClass="text-amber-400"
      />

      {/* Recently expired */}
      <SubTable
        title="Expiradas nos últimos 7 dias"
        subs={data.expiradas7d}
        icon={Clock}
        emptyMsg="Nenhuma assinatura expirou nos últimos 7 dias"
        colorClass="text-red-400"
      />
    </div>
  );
}
