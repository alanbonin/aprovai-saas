import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";

const LEVELS = [
  { name: "Calouro",   min: 0,    max: 200,  color: "text-gray-400" },
  { name: "Estudioso", min: 201,  max: 500,  color: "text-blue-400" },
  { name: "Focado",    min: 501,  max: 1000, color: "text-indigo-400" },
  { name: "Avançado",  min: 1001, max: 2000, color: "text-purple-400" },
  { name: "Expert",    min: 2001, max: 4000, color: "text-amber-400" },
  { name: "Elite",     min: 4001, max: Infinity, color: "text-yellow-400" },
];

function getLevel(xp: number) {
  return LEVELS.find(l => xp >= l.min && xp <= l.max) ?? LEVELS[0];
}

function getNextLevel(xp: number) {
  const idx = LEVELS.findIndex(l => xp >= l.min && xp <= l.max);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

// Semana ISO: YYYY-Www
function weekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const since = new Date();
  since.setDate(since.getDate() - 112);

  // Perfil ativo (suporta multi-perfil)
  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  // Filtro de perfil: registros do perfil ativo OU legados (null)
  const pf = profileId
    ? `profileId.eq.${profileId},profileId.is.null`
    : "profileId.is.null";

  // Busca paralela de todos os dados
  const [progressRes, subjectProgressRes, simuladosRes, flashcardSetsRes] = await Promise.all([
    db.from("Progress").select("correct, createdAt, questionId")
      .eq("userId", dbUser.id)
      .gte("createdAt", since.toISOString())
      .or(pf),
    db.from("Progress").select("correct, questionId, createdAt")
      .eq("userId", dbUser.id)
      .or(pf),
    db.from("SimuladoHistory").select("id, total, correct, timeSecs, createdAt")
      .eq("userId", dbUser.id)
      .order("createdAt", { ascending: false })
      .limit(50)
      .or(pf),
    db.from("FlashcardSet").select("id, subjectId, cards, updatedAt")
      .eq("userId", dbUser.id),
  ]);

  const profileRes = { data: activeProfile };

  const records = progressRes.data ?? [];
  const allRecords = subjectProgressRes.data ?? [];
  const simulados = simuladosRes.data ?? [];
  const flashcardSets = flashcardSetsRes.data ?? [];
  const profile = profileRes.data;

  // ── Heatmap ────────────────────────────────────────────────────────────────
  const heatmapMap: Record<string, number> = {};
  for (const r of records) {
    const day = r.createdAt.slice(0, 10);
    heatmapMap[day] = (heatmapMap[day] ?? 0) + 1;
  }
  const heatmap: { date: string; count: number }[] = [];
  for (let i = 111; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    heatmap.push({ date: key, count: heatmapMap[key] ?? 0 });
  }

  // ── XP e Level ─────────────────────────────────────────────────────────────
  const xp = allRecords.reduce((sum, r) => sum + (r.correct ? 15 : 5), 0);
  const level = getLevel(xp);
  const nextLevel = getNextLevel(xp);
  const nextLevelXp = nextLevel?.min ?? xp;
  const progress = nextLevel
    ? Math.min(100, Math.round(((xp - level.min) / (nextLevelXp - level.min)) * 100))
    : 100;

  // ── Streak ─────────────────────────────────────────────────────────────────
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = heatmapMap[todayKey] ?? 0;
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if ((heatmapMap[key] ?? 0) > 0) streak++;
    else break;
  }

  // ── Subject stats ──────────────────────────────────────────────────────────
  const allQuestionIds = allRecords.map(r => r.questionId).filter(Boolean);
  const uniqueQIds = [...new Set(allQuestionIds)];
  let subjectStats: { name: string; correct: number; total: number; accuracy: number; subjectId: string }[] = [];

  if (uniqueQIds.length > 0) {
    const { data: questions } = await db.from("Question").select("id, subjectId").in("id", uniqueQIds);
    const { data: subjects } = await db.from("Subject").select("id, name");

    if (questions && subjects) {
      const subjectNameMap: Record<string, string> = {};
      for (const s of subjects) subjectNameMap[s.id] = s.name;
      const qSubjectMap: Record<number, string> = {};
      for (const q of questions) qSubjectMap[q.id] = q.subjectId;

      const statsMap: Record<string, { correct: number; total: number; subjectId: string }> = {};
      for (const r of allRecords) {
        const sid = qSubjectMap[r.questionId] ?? "outra";
        const name = subjectNameMap[sid] ?? "Outra";
        if (!statsMap[name]) statsMap[name] = { correct: 0, total: 0, subjectId: sid };
        statsMap[name].total++;
        if (r.correct) statsMap[name].correct++;
      }

      subjectStats = Object.entries(statsMap)
        .map(([name, { correct, total, subjectId }]) => ({
          name, correct, total, subjectId,
          accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    }
  }

  // ── Stats gerais ───────────────────────────────────────────────────────────
  const totalAnswered = allRecords.length;
  const totalCorrect = allRecords.filter(r => r.correct).length;
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  // ── Evolução semanal (últimas 8 semanas, questões) ──────────────────────────
  const weeklyMap: Record<string, { correct: number; total: number }> = {};
  for (const r of allRecords) {
    const wk = weekKey(r.createdAt);
    if (!weeklyMap[wk]) weeklyMap[wk] = { correct: 0, total: 0 };
    weeklyMap[wk].total++;
    if (r.correct) weeklyMap[wk].correct++;
  }
  const weeklyEvolution: { week: string; accuracy: number; total: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const wk = weekKey(d.toISOString());
    const stat = weeklyMap[wk];
    weeklyEvolution.push({
      week: wk,
      accuracy: stat && stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
      total: stat?.total ?? 0,
    });
  }

  // ── Simulados stats ─────────────────────────────────────────────────────────
  const simuladoStats = {
    total: simulados.length,
    recentAccuracy: simulados.length > 0
      ? Math.round(simulados.slice(0, 5).reduce((sum, s) => sum + (s.total > 0 ? s.correct / s.total : 0), 0)
          / Math.min(5, simulados.length) * 100)
      : 0,
    trend: simulados.slice(0, 8).reverse().map(s => ({
      date: (s.createdAt as string).slice(0, 10),
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      total: s.total,
    })),
  };

  // ── Flashcard stats ─────────────────────────────────────────────────────────
  const now = new Date();
  let flashcardTotal = 0;
  let flashcardDueToday = 0;
  let flashcardStudiedThisWeek = 0;
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);

  for (const set of flashcardSets) {
    const cards = Array.isArray(set.cards) ? set.cards : [];
    flashcardTotal += cards.length;
    for (const card of cards as { nextReview?: string; updatedAt?: string }[]) {
      if (!card.nextReview || new Date(card.nextReview) <= now) flashcardDueToday++;
      if (set.updatedAt && new Date(set.updatedAt) >= oneWeekAgo) flashcardStudiedThisWeek++;
    }
  }

  // ── Ponto crítico (matérias com < 50% + prova próxima) ─────────────────────
  const daysToProva = profile?.dataProva
    ? Math.max(0, Math.ceil((new Date(profile.dataProva).getTime() - now.getTime()) / 86400000))
    : null;

  const pontoCritico: { subjectName: string; subjectId: string; accuracy: number; urgencia: "alta" | "media" | "baixa" }[] = subjectStats
    .filter(s => s.accuracy < 60 && s.total >= 5)
    .map(s => ({
      subjectName: s.name,
      subjectId: s.subjectId,
      accuracy: s.accuracy,
      urgencia: (s.accuracy < 40 ? "alta" : s.accuracy < 50 ? "media" : "baixa") as "alta" | "media" | "baixa",
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  // ── Prontidão estimada ──────────────────────────────────────────────────────
  // Score composto: 50% accuracy geral + 30% simulados recentes + 20% consistência (streak)
  const prontidao = totalAnswered < 10 ? null : Math.round(
    overallAccuracy * 0.5 +
    simuladoStats.recentAccuracy * 0.3 +
    Math.min(100, streak * 5) * 0.2
  );

  // ── Badges ──────────────────────────────────────────────────────────────────
  const badges = [
    { id: "centuriao",  label: "Centurião",    desc: "100 questões respondidas",      icon: "🎯", unlocked: totalAnswered >= 100 },
    { id: "sequencia",  label: "Sequência 7",  desc: "7 dias seguidos estudando",     icon: "🔥", unlocked: streak >= 7 },
    { id: "velocista",  label: "Velocista",    desc: "5 simulados concluídos",        icon: "⚡", unlocked: simulados.length >= 5 },
    { id: "mestre",     label: "Mestre",       desc: "90%+ de aproveitamento",        icon: "👑", unlocked: overallAccuracy >= 90 && totalAnswered >= 20 },
    { id: "dedicado",   label: "Dedicado",     desc: "500 questões respondidas",      icon: "💎", unlocked: totalAnswered >= 500 },
    { id: "flashmaster",label: "Flash Master", desc: "50 flashcards revisados",       icon: "🃏", unlocked: flashcardTotal >= 50 },
    { id: "invicto",    label: "Invicto",      desc: "30 dias de streak",             icon: "🏆", unlocked: streak >= 30 },
  ];

  return NextResponse.json({
    // XP e level
    xp, level, progress, nextLevel,
    // Atividade
    heatmap, streak, todayCount,
    // Questões
    totalAnswered, totalCorrect, overallAccuracy,
    subjectStats,
    weeklyEvolution,
    // Simulados
    simuladoStats,
    // Flashcards
    flashcardStats: { total: flashcardTotal, dueToday: flashcardDueToday, studiedThisWeek: flashcardStudiedThisWeek },
    // Diagnóstico
    pontoCritico,
    prontidao,
    daysToProva,
    cargoAlvo: profile?.cargo ?? null,
    // Badges
    badges,
  });
}
