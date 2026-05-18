import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

/**
 * GET /api/questoes/adaptativa?subjectId=xxx&qtd=10
 *
 * Seleciona questões inteligentemente:
 * 1. Questões vencidas (nextReview <= now) ordenadas por urgência (mais atrasadas primeiro)
 * 2. Questões com menor easeFactor (mais difíceis para o usuário)
 * 3. Questões novas (sem progresso) das matérias prioritárias
 *
 * Prioriza matérias do usuário (StudentSubject) e com pior desempenho (Progress).
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  const qtd = Math.min(20, Math.max(5, parseInt(searchParams.get("qtd") ?? "10")));

  const now = new Date().toISOString();

  // 1. Busca progresso do usuário (questões já respondidas)
  const progressQuery = db.from("Progress")
    .select("questionId, correct, nextReview, interval, easeFactor")
    .eq("userId", dbUser.id);
  const { data: progressData } = await progressQuery;
  const progressMap = new Map<number, { correct: boolean; nextReview: string | null; interval: number; easeFactor: number }>();
  for (const p of progressData ?? []) {
    progressMap.set(p.questionId, {
      correct: p.correct,
      nextReview: p.nextReview,
      interval: p.interval,
      easeFactor: p.easeFactor,
    });
  }

  // 2. Busca matérias do aluno (para priorizar)
  const { data: studentSubjects } = await db.from("StudentSubject")
    .select("subjectId").eq("userId", dbUser.id);
  const mySubjectIds = new Set((studentSubjects ?? []).map(s => s.subjectId));

  // 3. Busca questões disponíveis
  let questoesQuery = db.from("Question")
    .select("id, subjectId, level, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation, banca, year")
    .eq("aprovado", true)
    .limit(200);

  if (subjectId) {
    questoesQuery = questoesQuery.eq("subjectId", subjectId);
  } else if (mySubjectIds.size > 0) {
    questoesQuery = questoesQuery.in("subjectId", [...mySubjectIds]);
  }

  let questoesResult = await questoesQuery;
  // Fallback se coluna aprovado não existe ainda
  if (questoesResult.error && (questoesResult.error as { code?: string }).code === "42703") {
    let fallbackQ = db.from("Question")
      .select("id, subjectId, level, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation, banca, year")
      .limit(200);
    if (subjectId) {
      fallbackQ = fallbackQ.eq("subjectId", subjectId);
    } else if (mySubjectIds.size > 0) {
      fallbackQ = fallbackQ.in("subjectId", [...mySubjectIds]);
    }
    questoesResult = await fallbackQ;
  }
  const allQuestions = questoesResult.data;
  if (!allQuestions?.length) return NextResponse.json({ questoes: [], modo: "sem_questoes" });

  // 4. Score de prioridade para cada questão
  interface ScoredQ {
    q: typeof allQuestions[number];
    score: number;
    tipo: "vencida" | "nova" | "reforco";
  }

  const scored: ScoredQ[] = allQuestions.map(q => {
    const prog = progressMap.get(q.id);
    let score = 0;
    let tipo: ScoredQ["tipo"] = "nova";

    if (!prog) {
      // Nova: pontuação base + bônus se matéria prioritária
      score = 50 + (mySubjectIds.has(q.subjectId) ? 20 : 0);
      tipo = "nova";
    } else if (prog.nextReview && prog.nextReview <= now) {
      // Vencida: quanto mais atrasada, maior a prioridade
      const daysLate = Math.ceil((Date.now() - new Date(prog.nextReview).getTime()) / 86400000);
      score = 100 + daysLate * 10 + (3.0 - prog.easeFactor) * 30;
      tipo = "vencida";
    } else {
      // Respondida mas não vencida: reforço se easeFactor baixo
      score = (3.0 - prog.easeFactor) * 20;
      tipo = "reforco";
    }

    // Penaliza questões respondidas recentemente (evitar repetição imediata)
    if (prog && (!prog.nextReview || prog.nextReview > now)) score -= 20;

    return { q, score, tipo };
  });

  // 5. Ordena por score e pega as melhores
  const selecionadas = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, qtd * 3) // pega 3x para embaralhar um pouco
    .sort(() => Math.random() - 0.5) // shuffle parcial
    .slice(0, qtd);

  // 6. Busca nomes das matérias
  const subjectIds = [...new Set(selecionadas.map(s => s.q.subjectId).filter(Boolean))];
  const { data: subjects } = await db.from("Subject").select("id, name").in("id", subjectIds);
  const subjectNameMap: Record<string, string> = {};
  for (const s of subjects ?? []) subjectNameMap[s.id] = s.name;

  const questoes = selecionadas.map(({ q, tipo }) => ({
    id: q.id,
    subjectId: q.subjectId,
    subjectName: subjectNameMap[q.subjectId] ?? "Matéria",
    level: q.level,
    statement: q.statement,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    optionE: q.optionE,
    answer: q.answer,
    explanation: q.explanation,
    banca: q.banca,
    year: q.year,
    tipo,
    progresso: progressMap.get(q.id) ?? null,
  }));

  const vencidas = questoes.filter(q => q.tipo === "vencida").length;
  const novas = questoes.filter(q => q.tipo === "nova").length;

  return NextResponse.json({
    questoes,
    modo: vencidas > 0 ? "revisao_urgente" : novas > qtd / 2 ? "aprendizado" : "reforco",
    stats: { vencidas, novas, reforco: questoes.length - vencidas - novas },
  });
}
