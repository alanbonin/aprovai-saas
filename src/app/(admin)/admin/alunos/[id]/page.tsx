"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft, User, BookOpen, Target, Flame, Trophy, Brain,
  CreditCard, Calendar, Loader2, RefreshCw, BarChart2, CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AlunoStats {
  totalQuestoes: number;
  accuracy: number;
  q30: number;
  acc30: number;
  q7: number;
  streak: number;
  xp: number;
  cargo: string | null;
  dataProva: string | null;
  totalFlashcards: number;
  flashcardsDueHoje: number;
  totalSimulados: number;
  mediaSimulados: number;
  plan: {
    name: string | null;
    status: string;
    startDate: string | null;
    endDate: string | null;
    aiCreditsPerWeek?: number;
  } | null;
  topSubjects: { name: string; correct: number; total: number; accuracy: number }[];
  aiThisWeek: number;
  aiThisMonth: number;
  aiWeekLimit: number;
  aiWeeklyTrend: { week: string; count: number }[];
}

interface AlunoBasic {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function KpiCard({ label, value, sub, icon, color = "text-indigo-400" }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color?: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <span className={cn("opacity-60", color)}>{icon}</span>
      </div>
      <p className={cn("text-2xl font-black", color)}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminAlunoDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [aluno, setAluno]   = useState<AlunoBasic | null>(null);
  const [stats, setStats]   = useState<AlunoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]   = useState("");

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    const [alunoRes, statsRes] = await Promise.all([
      fetch(`/api/admin/alunos?id=${id}`),
      fetch(`/api/admin/alunos/${id}/stats`),
    ]);

    if (statsRes.ok) {
      setStats(await statsRes.json());
    } else {
      setError("Não foi possível carregar os dados do aluno.");
    }

    // Tenta extrair aluno dos dados de listagem (API retorna array)
    if (alunoRes.ok) {
      const d = await alunoRes.json();
      const found = (d.users ?? []).find((u: AlunoBasic) => u.id === id);
      if (found) setAluno(found);
    }

    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen text-white p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/admin/alunos" className="text-orange-400 hover:text-orange-300 text-sm">
          ← Voltar para alunos
        </Link>
      </div>
    );
  }

  const s = stats!;
  const planDays = daysUntil(s.plan?.endDate ?? null);

  return (
    <div className="min-h-screen text-white p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/alunos"
            className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{aluno?.name ?? `Aluno ${id.slice(0, 8)}`}</h1>
              <p className="text-xs text-gray-600">
                {aluno?.email ?? "—"} · desde {fmtDate(aluno?.createdAt ?? null)}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-2 text-gray-600 hover:text-gray-300 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
        </button>
      </div>

      {/* Plano */}
      <div className={cn(
        "rounded-xl border p-4 mb-6 flex items-center justify-between",
        s.plan
          ? "bg-indigo-500/[0.06] border-indigo-500/20"
          : "bg-white/[0.02] border-white/[0.06]"
      )}>
        <div className="flex items-center gap-3">
          <CreditCard className={cn("w-5 h-5", s.plan ? "text-indigo-400" : "text-gray-600")} />
          <div>
            <p className="text-sm font-semibold">
              {s.plan?.name ?? "Sem plano ativo"}
            </p>
            {s.plan && (
              <p className="text-xs text-gray-500 mt-0.5">
                Desde {fmtDate(s.plan.startDate)} · vence {fmtDate(s.plan.endDate)}
              </p>
            )}
          </div>
        </div>
        {planDays !== null && (
          <span className={cn(
            "text-xs font-bold px-2 py-1 rounded-full border",
            planDays <= 7
              ? "text-red-400 bg-red-500/10 border-red-500/20"
              : planDays <= 30
              ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
              : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
          )}>
            {planDays > 0 ? `${planDays}d restantes` : "Vencido"}
          </span>
        )}
      </div>

      {/* Cargo e data da prova */}
      {(s.cargo || s.dataProva) && (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 mb-6 flex items-center gap-6">
          {s.cargo && (
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Cargo/Concurso</p>
              <p className="text-sm font-semibold text-white">{s.cargo}</p>
            </div>
          )}
          {s.dataProva && (
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Data da prova</p>
              <p className="text-sm font-semibold text-white">{fmtDate(s.dataProva)}</p>
            </div>
          )}
        </div>
      )}

      {/* KPIs principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Total de questões"
          value={s.totalQuestoes.toLocaleString("pt-BR")}
          sub={`${s.accuracy}% de acerto geral`}
          icon={<BookOpen className="w-4 h-4" />}
          color="text-indigo-400"
        />
        <KpiCard
          label="Últimos 7 dias"
          value={s.q7}
          sub={`${s.q30} nos últimos 30d`}
          icon={<Target className="w-4 h-4" />}
          color="text-blue-400"
        />
        <KpiCard
          label="Sequência"
          value={`${s.streak ?? 0}d`}
          sub="dias consecutivos"
          icon={<Flame className="w-4 h-4" />}
          color={(s.streak ?? 0) >= 7 ? "text-amber-400" : "text-gray-400"}
        />
        <KpiCard
          label="XP Total"
          value={(s.xp ?? 0).toLocaleString("pt-BR")}
          sub="pontos de experiência"
          icon={<Trophy className="w-4 h-4" />}
          color="text-yellow-400"
        />
      </div>

      {/* Segunda linha de KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <KpiCard
          label="Acerto (30 dias)"
          value={`${s.acc30}%`}
          sub={`em ${s.q30} questões`}
          icon={<CheckCircle2 className="w-4 h-4" />}
          color={s.acc30 >= 70 ? "text-emerald-400" : s.acc30 >= 50 ? "text-yellow-400" : "text-red-400"}
        />
        <KpiCard
          label="Simulados"
          value={s.totalSimulados}
          sub={`${s.mediaSimulados}% de média`}
          icon={<BarChart2 className="w-4 h-4" />}
          color="text-purple-400"
        />
        <KpiCard
          label="Flashcards"
          value={s.totalFlashcards}
          sub={`${s.flashcardsDueHoje} vencidos hoje`}
          icon={<Brain className="w-4 h-4" />}
          color={s.flashcardsDueHoje > 0 ? "text-rose-400" : "text-teal-400"}
        />
      </div>

      {/* Uso de IA */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold">Uso de IA</h2>
          {s.aiThisWeek >= s.aiWeekLimit && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-semibold">
              Limite atingido
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className={cn(
              "text-2xl font-black",
              s.aiThisWeek >= s.aiWeekLimit ? "text-red-400" : s.aiThisWeek >= s.aiWeekLimit * 0.8 ? "text-amber-400" : "text-indigo-400"
            )}>{s.aiThisWeek}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">Esta semana</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-gray-300">{s.aiWeekLimit}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">Limite/semana</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-purple-400">{s.aiThisMonth}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">Últimos 30 dias</p>
          </div>
        </div>
        {/* Barra de uso */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>Uso desta semana</span>
            <span>{Math.round((s.aiThisWeek / Math.max(s.aiWeekLimit, 1)) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                s.aiThisWeek >= s.aiWeekLimit ? "bg-red-500" : s.aiThisWeek >= s.aiWeekLimit * 0.8 ? "bg-amber-500" : "bg-indigo-500"
              )}
              style={{ width: `${Math.min(100, (s.aiThisWeek / Math.max(s.aiWeekLimit, 1)) * 100)}%` }}
            />
          </div>
        </div>
        {/* Mini trend */}
        {s.aiWeeklyTrend.length > 1 && (
          <div className="mt-4 flex items-end gap-1 h-10">
            {s.aiWeeklyTrend.map(w => {
              const max = Math.max(...s.aiWeeklyTrend.map(x => x.count), 1);
              const pct = (w.count / max) * 100;
              return (
                <div key={w.week} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-t bg-indigo-500/50 min-h-[2px]"
                    style={{ height: `${Math.max(4, pct * 0.36)}px` }}
                    title={`Semana de ${w.week}: ${w.count}`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top matérias */}
      {s.topSubjects.length > 0 && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-semibold">Top matérias estudadas</h2>
          </div>
          <div className="space-y-3">
            {s.topSubjects.map((subj, i) => (
              <div key={subj.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 font-mono w-4">{i + 1}.</span>
                    <span className="text-sm text-gray-200 font-medium">{subj.name}</span>
                    <span className="text-xs text-gray-600">{subj.total} questões</span>
                  </div>
                  <span className={cn(
                    "text-xs font-bold",
                    subj.accuracy >= 70 ? "text-emerald-400" : subj.accuracy >= 50 ? "text-yellow-400" : "text-red-400"
                  )}>
                    {subj.accuracy}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      subj.accuracy >= 70 ? "bg-emerald-500" : subj.accuracy >= 50 ? "bg-yellow-500" : "bg-red-500"
                    )}
                    style={{ width: `${subj.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link para questões do aluno */}
      <div className="mt-6 flex gap-3">
        <Link
          href={`/admin/questoes?userId=${id}`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm transition-all"
        >
          <BookOpen className="w-4 h-4" />
          Ver questões deste aluno
        </Link>
        <Link
          href={`/admin/alunos`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-500/20 text-orange-400 hover:bg-orange-500/10 text-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para lista
        </Link>
      </div>
    </div>
  );
}
