import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

/**
 * GET /api/admin/alunos/[id]/stats
 * Retorna snapshot de métricas de um aluno para o painel admin.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { id: userId } = await params;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000).toISOString();

  // Início da semana atual (segunda-feira)
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);

  // Busca em paralelo
  const [
    progressoAll,
    progresso30d,
    progresso7d,
    simulados,
    flashcardSets,
    profile,
    subscription,
    aiUsageWeek,
    aiUsageMonth,
    aiPlanLimit,
  ] = await Promise.all([
    db.from("Progress").select("correct, subjectId", { count: "exact" }).eq("userId", userId),
    db.from("Progress").select("correct").eq("userId", userId).gte("createdAt", thirtyDaysAgo),
    db.from("Progress").select("correct").eq("userId", userId).gte("createdAt", sevenDaysAgo),
    db.from("SimuladoHistory").select("total, correct, createdAt").eq("userId", userId).order("createdAt", { ascending: false }).limit(10),
    db.from("FlashcardSet").select("cards, updatedAt").eq("userId", userId),
    db.from("StudentProfile").select("streak, dataProva, cargo, xp").eq("userId", userId).single(),
    db.from("Subscription")
      .select("status, startDate, endDate, planId, Plan:planId(name, price, aiCreditsPerWeek)")
      .eq("userId", userId)
      .eq("status", "ACTIVE")
      .single(),
    // Uso de IA esta semana
    db.from("AiUsage").select("count").eq("userId", userId).gte("weekStart", weekStart.toISOString()),
    // Uso de IA últimos 30 dias
    db.from("AiUsage").select("count, weekStart").eq("userId", userId).gte("weekStart", thirtyDaysAgo),
    // Limite do plano
    Promise.resolve(null),
  ]);

  // Total de questões
  const totalQuestoes = progressoAll.count ?? 0;
  const totalCorreto  = (progressoAll.data ?? []).filter(p => p.correct).length;
  const accuracy      = totalQuestoes > 0 ? Math.round((totalCorreto / totalQuestoes) * 100) : 0;

  // Últimos 30 dias
  const q30     = progresso30d.data?.length ?? 0;
  const acc30   = q30 > 0
    ? Math.round(((progresso30d.data ?? []).filter(p => p.correct).length / q30) * 100)
    : 0;

  // Últimos 7 dias
  const q7      = progresso7d.data?.length ?? 0;

  // Distribuição por matéria
  const bySubject: Record<string, { correct: number; total: number }> = {};
  for (const p of progressoAll.data ?? []) {
    if (!p.subjectId) continue;
    if (!bySubject[p.subjectId]) bySubject[p.subjectId] = { correct: 0, total: 0 };
    bySubject[p.subjectId].total++;
    if (p.correct) bySubject[p.subjectId].correct++;
  }

  const subjectIds = Object.keys(bySubject);
  let subjectStats: { name: string; correct: number; total: number; accuracy: number }[] = [];
  if (subjectIds.length > 0) {
    const { data: subjs } = await db.from("Subject").select("id, name").in("id", subjectIds);
    subjectStats = (subjs ?? [])
      .map(s => ({
        name: s.name,
        correct: bySubject[s.id]?.correct ?? 0,
        total: bySubject[s.id]?.total ?? 0,
        accuracy: bySubject[s.id]?.total
          ? Math.round((bySubject[s.id].correct / bySubject[s.id].total) * 100)
          : 0,
      }))
      .filter(s => s.total >= 1)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }

  // Flashcards
  let totalFlashcards = 0;
  let flashcardsDueHoje = 0;
  for (const s of flashcardSets.data ?? []) {
    const cards = Array.isArray(s.cards) ? s.cards : [];
    totalFlashcards += cards.length;
    for (const c of cards as { nextReview?: string }[]) {
      if (!c.nextReview || new Date(c.nextReview) <= now) flashcardsDueHoje++;
    }
  }

  // Simulados (usa SimuladoHistory com total/correct)
  const totalSimulados = simulados.data?.length ?? 0;
  const mediaSimulados = totalSimulados > 0
    ? Math.round(
        (simulados.data ?? []).reduce((s, r) => {
          const acc = r.total > 0 ? (r.correct / r.total) * 100 : 0;
          return s + acc;
        }, 0) / totalSimulados
      )
    : 0;

  // Assinatura
  const sub = subscription.data;
  type PlanInfo = { name: string; price?: number; aiCreditsPerWeek?: number };
  const planInfo: PlanInfo | null = sub?.Plan
    ? (Array.isArray(sub.Plan) ? (sub.Plan[0] as PlanInfo) : (sub.Plan as unknown as PlanInfo))
    : null;
  const plan = sub
    ? { name: planInfo?.name, status: sub.status, startDate: sub.startDate, endDate: sub.endDate, aiCreditsPerWeek: planInfo?.aiCreditsPerWeek ?? 5 }
    : null;

  // Uso de IA
  const aiThisWeek = (aiUsageWeek.data ?? []).reduce((s, r) => s + (r.count as number), 0);
  const aiThisMonth = (aiUsageMonth.data ?? []).reduce((s, r) => s + (r.count as number), 0);
  const aiWeekLimit = plan?.aiCreditsPerWeek ?? 5;

  // Tendência de IA — últimas semanas
  const aiByWeek: Record<string, number> = {};
  for (const r of aiUsageMonth.data ?? []) {
    const w = (r.weekStart as string).slice(0, 10);
    aiByWeek[w] = (aiByWeek[w] ?? 0) + (r.count as number);
  }
  const aiWeeklyTrend = Object.entries(aiByWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  void aiPlanLimit; // unused

  return NextResponse.json({
    totalQuestoes,
    accuracy,
    q30,
    acc30,
    q7,
    streak: profile.data?.streak ?? 0,
    xp: profile.data?.xp ?? 0,
    cargo: profile.data?.cargo ?? null,
    dataProva: profile.data?.dataProva ?? null,
    totalFlashcards,
    flashcardsDueHoje,
    totalSimulados,
    mediaSimulados,
    plan,
    topSubjects: subjectStats,
    aiThisWeek,
    aiThisMonth,
    aiWeekLimit,
    aiWeeklyTrend,
  });
}
