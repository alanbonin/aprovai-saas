import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

/**
 * GET /api/workspace/hoje
 * Briefing de estudo do dia: o que o aluno deve focar hoje.
 *
 * Retorna:
 * - questoesVencidas: questões com nextReview ≤ hoje (SM-2)
 * - flashcardsVencidos: quantidade de flashcards vencidos nas decks do aluno
 * - questoesHoje: quantidade já respondidas hoje
 * - streakAtRisk: true se o aluno não estudou nada ainda hoje
 * - streak: sequência atual
 * - prioridade: matéria prioritária (pior desempenho recente)
 * - metaQuestoesHoje: meta diária derivada da meta semanal (÷ 5)
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [
    profileRes,
    progressTodayRes,
    progressDueRes,
    flashcardSetsRes,
    metasRes,
  ] = await Promise.all([
    db.from("StudentProfile")
      .select("streak, lastStudyDate, xp")
      .eq("userId", dbUser.id)
      .single(),
    // Questões respondidas hoje
    db.from("Progress")
      .select("correct", { count: "exact" })
      .eq("userId", dbUser.id)
      .gte("createdAt", todayStart),
    // Questões vencidas para revisão (SM-2)
    db.from("Progress")
      .select("questionId, nextReview")
      .eq("userId", dbUser.id)
      .lte("nextReview", now.toISOString())
      .not("nextReview", "is", null),
    // Flashcard sets do aluno
    db.from("FlashcardSet")
      .select("id, cards, subjectId")
      .eq("userId", dbUser.id),
    // Metas semanais
    db.from("Note")
      .select("content")
      .eq("userId", dbUser.id)
      .eq("subjectId", "__METAS_SEMANAIS__")
      .single(),
  ]);

  const profile = profileRes.data;
  const questoesHoje = progressTodayRes.count ?? 0;
  const questoesVencidas = (progressDueRes.data ?? []).length;
  const streak = (profile?.streak as number) ?? 0;
  const lastStudy = (profile?.lastStudyDate as string | null)?.slice(0, 10);
  const streakAtRisk = lastStudy !== todayStr && streak > 0;

  // Flashcards vencidos (cards com nextReview ≤ hoje nos sets do aluno)
  let flashcardsVencidos = 0;
  for (const set of flashcardSetsRes.data ?? []) {
    try {
      const cards = JSON.parse(set.cards as string) as { nextReview?: string }[];
      flashcardsVencidos += cards.filter(c => c.nextReview && c.nextReview <= now.toISOString()).length;
    } catch { /* ignore */ }
  }

  // Meta diária derivada da meta semanal
  let metaQuestoesHoje = 10; // default
  try {
    const metasContent = metasRes.data?.content;
    if (metasContent) {
      const metas = JSON.parse(metasContent) as { questoesMeta?: number };
      if (metas.questoesMeta) metaQuestoesHoje = Math.ceil(metas.questoesMeta / 5);
    }
  } catch { /* ignore */ }

  // Matéria prioritária: última com mais erros recentes (last 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const { data: recentProgress } = await db
    .from("Progress")
    .select("questionId, correct")
    .eq("userId", dbUser.id)
    .eq("correct", false)
    .gte("createdAt", sevenDaysAgo);

  let prioridade: { subjectName: string; erros: number } | null = null;
  if (recentProgress && recentProgress.length > 0) {
    const qIds = [...new Set(recentProgress.map(p => p.questionId))];
    const { data: questions } = await db
      .from("Question")
      .select("id, subjectId")
      .in("id", qIds);
    const subjectErros: Record<string, number> = {};
    for (const q of questions ?? []) {
      if (q.subjectId) subjectErros[q.subjectId] = (subjectErros[q.subjectId] ?? 0) + 1;
    }
    const topSubjectId = Object.entries(subjectErros).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (topSubjectId) {
      const { data: subject } = await db.from("Subject").select("name").eq("id", topSubjectId).single();
      prioridade = { subjectName: subject?.name ?? topSubjectId, erros: subjectErros[topSubjectId] };
    }
  }

  return NextResponse.json({
    questoesHoje,
    questoesVencidas,
    flashcardsVencidos,
    streak,
    streakAtRisk,
    metaQuestoesHoje,
    progressoPct: Math.min(100, Math.round((questoesHoje / metaQuestoesHoje) * 100)),
    prioridade,
    estudouHoje: lastStudy === todayStr,
  });
}
