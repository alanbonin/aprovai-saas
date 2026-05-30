import { db } from "@/lib/db";
import {
  Users, Brain, BookOpen, CreditCard, TrendingUp, Target,
  UserCheck, Activity, TrendingDown, ArrowRight, Calendar,
} from "lucide-react";
import { AdminPushButton } from "./push-button";
import { AdminAnuncioButton } from "./anuncio-button";

// ── Spark bar chart (pure SVG, no deps) ─────────────────────────────────────
function SparkBar({ data, color = "#6366f1" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const barW = 5;
  const gap = 2;
  const h = 48;
  const totalW = data.length * (barW + gap) - gap;
  return (
    <svg width={totalW} height={h}>
      {data.map((v, i) => {
        const barH = Math.max(2, (v / max) * h);
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={h - barH}
            width={barW}
            height={barH}
            rx={1}
            fill={color}
            fillOpacity={v > 0 ? 0.85 : 0.15}
          />
        );
      })}
    </svg>
  );
}

// ── Funil step ───────────────────────────────────────────────────────────────
function FunnelStep({
  label, value, total, color,
}: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{label}</span>
          <span className="font-semibold">{value.toLocaleString("pt-BR")} <span className="text-gray-500">({pct}%)</span></span>
        </div>
        <div className="h-2 rounded-full bg-white/5">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 7);
  const weekIso = weekStart.toISOString();

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  const [
    { count: totalAlunos },
    { count: totalAgentes },
    { count: totalQuestoes },
    { count: totalMaterias },
    { data: assinaturas },
    { count: questoesHoje },
    { count: novosAlunosEstaSemana },
    { count: simuladosEsteMes },
    { data: subsRecentes },
    { data: churnedSubs },
    { data: recentUsers },
    { count: totalComSub },
  ] = await Promise.all([
    db.from("User").select("*", { count: "exact", head: true }).eq("role", "STUDENT"),
    db.from("Agent").select("*", { count: "exact", head: true }).eq("active", true),
    db.from("Question").select("*", { count: "exact", head: true }),
    db.from("Subject").select("*", { count: "exact", head: true }),
    db.from("Subscription").select("planId, Plan(price, name)").eq("status", "ACTIVE"),
    db.from("Progress").select("*", { count: "exact", head: true }).gte("createdAt", todayIso),
    db.from("User").select("*", { count: "exact", head: true }).eq("role", "STUDENT").gte("createdAt", weekIso),
    db.from("SimuladoHistory").select("*", { count: "exact", head: true }).gte("createdAt", monthStart),
    // Novas assinaturas nos últimos 30 dias para gráfico de receita
    db.from("Subscription")
      .select("startDate, Plan(price)")
      .gte("startDate", thirtyDaysAgoIso)
      .order("startDate", { ascending: true }),
    // Churned this month
    db.from("Subscription")
      .select("id")
      .eq("status", "CANCELLED")
      .gte("updatedAt", monthStart),
    // Recent signups
    db.from("User")
      .select("id, email, name, createdAt")
      .eq("role", "STUDENT")
      .order("createdAt", { ascending: false })
      .limit(8),
    // Total users que alguma vez tiveram assinatura (funil)
    db.from("Subscription").select("*", { count: "exact", head: true }),
  ]);

  // ── MRR ──────────────────────────────────────────────────────────────────
  type SubRow = { Plan: { price?: number; name?: string } | { price?: number; name?: string }[] | null };
  const mrr = (assinaturas ?? []).reduce((sum: number, s: SubRow) => {
    const plan = Array.isArray(s.Plan) ? s.Plan[0] : s.Plan;
    return sum + (plan?.price ?? 0);
  }, 0);
  const assinaturasAtivas = (assinaturas ?? []).length;
  const churnCount = (churnedSubs ?? []).length;
  const conversionRate = (totalAlunos ?? 0) > 0
    ? ((assinaturasAtivas / (totalAlunos ?? 1)) * 100).toFixed(1)
    : "0.0";

  // ── Receita diária (30 dias) ─────────────────────────────────────────────
  type SubRecenteRow = { startDate: string; Plan: { price?: number } | { price?: number }[] | null };
  const revenueByDay: Record<string, number> = {};
  const daysLabels: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    daysLabels.push(key);
    revenueByDay[key] = 0;
  }
  (subsRecentes ?? []).forEach((s: SubRecenteRow) => {
    const day = (s.startDate ?? "").slice(0, 10);
    const plan = Array.isArray(s.Plan) ? s.Plan[0] : s.Plan;
    const price = plan?.price ?? 0;
    if (day in revenueByDay) revenueByDay[day] += price;
  });
  const revenueData = daysLabels.map(d => revenueByDay[d]);
  const newSubsData = daysLabels.map(d =>
    (subsRecentes ?? []).filter((s: SubRecenteRow) => (s.startDate ?? "").slice(0, 10) === d).length
  );
  const revenueTotal30 = revenueData.reduce((a, b) => a + b, 0);

  // ── Planos ────────────────────────────────────────────────────────────────
  const planCount: Record<string, { name: string; count: number; price: number }> = {};
  (assinaturas ?? []).forEach((s: SubRow) => {
    const plan = Array.isArray(s.Plan) ? s.Plan[0] : s.Plan;
    const name = plan?.name ?? "Desconhecido";
    const price = plan?.price ?? 0;
    if (!planCount[name]) planCount[name] = { name, count: 0, price };
    planCount[name].count++;
  });
  const planRanking = Object.values(planCount).sort((a, b) => b.count - a.count);

  const kpis = [
    { label: "Total de alunos",           value: (totalAlunos ?? 0).toLocaleString("pt-BR"), icon: Users,       color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { label: "Assinaturas ativas",         value: assinaturasAtivas.toLocaleString("pt-BR"),   icon: UserCheck,   color: "text-green-400",  bg: "bg-green-500/10" },
    { label: "MRR",                        value: mrr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),    icon: TrendingUp,  color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Questões respondidas hoje",  value: (questoesHoje ?? 0).toLocaleString("pt-BR"), icon: Target,      color: "text-blue-400",   bg: "bg-blue-500/10" },
    { label: "Novos alunos (7 dias)",      value: (novosAlunosEstaSemana ?? 0).toLocaleString("pt-BR"), icon: Activity, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Simulados este mês",         value: (simuladosEsteMes ?? 0).toLocaleString("pt-BR"), icon: Brain,   color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Agentes ativos",             value: (totalAgentes ?? 0).toLocaleString("pt-BR"), icon: Brain,       color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Questões no banco",          value: (totalQuestoes ?? 0).toLocaleString("pt-BR"), icon: BookOpen,   color: "text-sky-400",    bg: "bg-sky-500/10" },
    { label: "Matérias cadastradas",       value: (totalMaterias ?? 0).toLocaleString("pt-BR"), icon: BookOpen,   color: "text-teal-400",   bg: "bg-teal-500/10" },
  ];

  type RecentUser = { id: string; email?: string | null; name?: string | null; createdAt?: string | null };

  return (
    <div className="p-8 text-white space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        <p className="text-gray-500 text-sm mt-1">Métricas de negócio em tempo real</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-white/5 bg-white/3 p-5">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-gray-500 text-sm mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Funil de conversão + Churn */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funil */}
        <div className="rounded-xl border border-white/5 bg-white/3 p-6">
          <h2 className="text-base font-semibold mb-5 flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-indigo-400" /> Funil de conversão
          </h2>
          <div className="space-y-4">
            <FunnelStep
              label="Cadastros"
              value={totalAlunos ?? 0}
              total={totalAlunos ?? 0}
              color="bg-indigo-500"
            />
            <FunnelStep
              label="Alguma vez assinaram"
              value={totalComSub ?? 0}
              total={totalAlunos ?? 0}
              color="bg-blue-500"
            />
            <FunnelStep
              label="Assinaturas ativas agora"
              value={assinaturasAtivas}
              total={totalAlunos ?? 0}
              color="bg-green-500"
            />
          </div>
          <div className="mt-5 pt-4 border-t border-white/5 flex justify-between text-sm">
            <span className="text-gray-400">Taxa de conversão paga</span>
            <span className="font-bold text-green-400">{conversionRate}%</span>
          </div>
        </div>

        {/* Churn + métricas rápidas */}
        <div className="rounded-xl border border-white/5 bg-white/3 p-6">
          <h2 className="text-base font-semibold mb-5 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" /> Churn & saúde
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">Cancelamentos este mês</span>
              <span className={`text-lg font-bold ${churnCount > 0 ? "text-red-400" : "text-green-400"}`}>
                {churnCount}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">Taxa de churn mensal</span>
              <span className="text-lg font-bold text-orange-400">
                {assinaturasAtivas > 0 ? ((churnCount / (assinaturasAtivas + churnCount)) * 100).toFixed(1) : "0.0"}%
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">Novas assinaturas (30 dias)</span>
              <span className="text-lg font-bold text-indigo-400">
                {(subsRecentes ?? []).length}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-400">Receita nova (30 dias)</span>
              <span className="text-lg font-bold text-emerald-400">
                R$ {revenueTotal30.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de receita 30 dias + novas assinaturas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Receita diária */}
        <div className="rounded-xl border border-white/5 bg-white/3 p-6">
          <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Receita diária — 30 dias
          </h2>
          <p className="text-gray-500 text-xs mb-4">Por data de ativação de assinatura</p>
          <SparkBar data={revenueData} color="#10b981" />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{daysLabels[0]?.slice(5)}</span>
            <span>{daysLabels[daysLabels.length - 1]?.slice(5)}</span>
          </div>
        </div>

        {/* Novas assinaturas */}
        <div className="rounded-xl border border-white/5 bg-white/3 p-6">
          <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-400" /> Novas assinaturas — 30 dias
          </h2>
          <p className="text-gray-500 text-xs mb-4">Contagem diária de novas ativações</p>
          <SparkBar data={newSubsData} color="#6366f1" />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{daysLabels[0]?.slice(5)}</span>
            <span>{daysLabels[daysLabels.length - 1]?.slice(5)}</span>
          </div>
        </div>
      </div>

      {/* Distribuição de planos + Cadastros recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {planRanking.length > 0 && (
          <div className="rounded-xl border border-white/5 bg-white/3 p-6">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-green-400" /> Distribuição de planos
            </h2>
            <div className="space-y-3">
              {planRanking.map(({ name, count, price }) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{name}</span>
                    <span className="text-xs text-gray-500">R$ {price.toFixed(2).replace(".", ",")}/mês</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 rounded-full bg-white/5 w-32">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${assinaturasAtivas > 0 ? (count / assinaturasAtivas) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-right w-8">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cadastros recentes */}
        <div className="rounded-xl border border-white/5 bg-white/3 p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-yellow-400" /> Cadastros recentes
          </h2>
          <div className="space-y-2">
            {(recentUsers ?? []).length === 0 && (
              <p className="text-gray-500 text-sm">Nenhum cadastro ainda.</p>
            )}
            {(recentUsers as RecentUser[] ?? []).map((u: RecentUser) => {
              const name = u.name ?? u.email?.split("@")[0] ?? "—";
              const domain = u.email?.split("@")[1] ?? "";
              const when = u.createdAt
                ? new Date(u.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                : "—";
              return (
                <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    {domain && <p className="text-xs text-gray-500">@{domain}</p>}
                  </div>
                  <span className="text-xs text-gray-500">{when}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Ferramentas operacionais ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <AdminPushButton />
        <AdminAnuncioButton />
      </div>
    </div>
  );
}
