import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";

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

  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [
    profileRes,
    progressTodayRes,
    progressDueRes,
    flashcardSetsRes,
    metasRes,
    desafioRes,
    simuladoHojeRes,
    revisaoHojeRes,
    pdfLeituraRes,
  ] = await Promise.all([
    db.from("StudentProfile")
      .select("streak, lastStudyDate, xp, horasEstudo")
      .eq("userId", dbUser.id)
      .single(),
    profileId
      ? db.from("Progress").select("correct", { count: "exact" }).eq("userId", dbUser.id).eq("profileId", profileId).gte("createdAt", todayStart)
      : db.from("Progress").select("correct", { count: "exact" }).eq("userId", dbUser.id).gte("createdAt", todayStart),
    profileId
      ? db.from("Progress").select("questionId, nextReview").eq("userId", dbUser.id).eq("profileId", profileId).lte("nextReview", now.toISOString()).not("nextReview", "is", null)
      : db.from("Progress").select("questionId, nextReview").eq("userId", dbUser.id).lte("nextReview", now.toISOString()).not("nextReview", "is", null),
    profileId
      ? db.from("FlashcardSet").select("id, cards, subjectId").eq("userId", dbUser.id).eq("profileId", profileId)
      : db.from("FlashcardSet").select("id, cards, subjectId").eq("userId", dbUser.id),
    profileId
      ? db.from("Note").select("content").eq("userId", dbUser.id).eq("subjectId", "__METAS_SEMANAIS__").eq("profileId", profileId).maybeSingle()
      : db.from("Note").select("content").eq("userId", dbUser.id).eq("subjectId", "__METAS_SEMANAIS__").maybeSingle(),
    // Desafio concluído hoje
    db.from("Note").select("content").eq("userId", dbUser.id).eq("subjectId", "__DESAFIO__").maybeSingle(),
    // Simulado feito hoje
    db.from("SimuladoHistory").select("id", { count: "exact" }).eq("userId", dbUser.id).gte("createdAt", todayStart).limit(1),
    // Revisão SM-2 feita hoje (Progress atualizado hoje com nextReview > hoje = questão revisada)
    db.from("Progress").select("id", { count: "exact" }).eq("userId", dbUser.id).gte("reviewedAt", todayStart).gt("nextReview", now.toISOString()).limit(1),
    // Leitura de PDF hoje (minutos acumulados)
    db.from("Note").select("content").eq("userId", dbUser.id).eq("subjectId", `__PDF_LEITURA__:${todayStr}`).maybeSingle(),
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
  // Fallback: calcula com base nas horas de estudo do perfil se Note não existir
  const horasEstudo = (profile?.horasEstudo as number | null) ?? 2;
  const totalMinFallback = horasEstudo * 60;
  const fallbackQuestoesDia  = Math.round((totalMinFallback * 0.35) / 2); // ~35% do tempo, 2 min/questão
  const fallbackLeituraPdfMin = Math.round(totalMinFallback * 0.15);       // 15% para PDFs
  let metaQuestoesHoje   = Math.max(5, fallbackQuestoesDia);
  let metaLeituraPdfHoje = Math.max(5, fallbackLeituraPdfMin); // min/dia
  try {
    const metasContent = metasRes.data?.content;
    if (metasContent) {
      const metas = JSON.parse(metasContent) as { questoesMeta?: number; leituraPdfMeta?: number };
      if (metas.questoesMeta)   metaQuestoesHoje   = Math.ceil(metas.questoesMeta / 5);
      if (metas.leituraPdfMeta) metaLeituraPdfHoje = Math.ceil(metas.leituraPdfMeta / 5);
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
    let questResult = await db.from("Question").select("id, subjectId").in("id", qIds).eq("aprovado", true);
    if (questResult.error && (questResult.error as { code?: string }).code === "42703") {
      questResult = await db.from("Question").select("id, subjectId").in("id", qIds);
    }
    const questions = questResult.data;
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

  // Desafio concluído hoje
  let desafioConcluido = false;
  try {
    const desafioData = desafioRes.data?.content ? JSON.parse(desafioRes.data.content) as { date?: string } : null;
    desafioConcluido = desafioData?.date === todayStr;
  } catch { /* ignore */ }

  // PDF lido hoje (minutos)
  let pdfMinutosHoje = 0;
  try {
    pdfMinutosHoje = pdfLeituraRes.data?.content ? (JSON.parse(pdfLeituraRes.data.content) as { minutos?: number }).minutos ?? 0 : 0;
  } catch { /* ignore */ }

  return NextResponse.json({
    questoesHoje,
    questoesVencidas,
    flashcardsVencidos,
    streak,
    streakAtRisk,
    metaQuestoesHoje,
    metaLeituraPdfHoje,
    progressoPct: Math.min(100, Math.round((questoesHoje / metaQuestoesHoje) * 100)),
    prioridade,
    estudouHoje: lastStudy === todayStr,
    desafioConcluido,
    simuladoHoje: (simuladoHojeRes.count ?? 0) > 0,
    revisaoFeitaHoje: (revisaoHojeRes.count ?? 0) > 0,
    pdfMinutosHoje,
  });
}
