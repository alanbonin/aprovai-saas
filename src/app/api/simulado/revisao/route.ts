import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

/**
 * GET /api/simulado/revisao?count=10
 * Monta um simulado de revisão com as questões onde o aluno teve pior desempenho.
 *
 * Estratégia:
 * 1. Pega todas as questões respondidas com `correct = false`
 * 2. Agrupa por questionId e conta número de erros
 * 3. Prioriza questões erradas mais vezes (e nunca acertadas)
 * 4. Retorna as top `count` questões com mais erros
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const count = Math.min(30, Math.max(5, parseInt(searchParams.get("count") ?? "10", 10)));

  // Fetch all progress for this user
  const { data: progressAll } = await db
    .from("Progress")
    .select("questionId, correct, createdAt")
    .eq("userId", dbUser.id)
    .order("createdAt", { ascending: false });

  const progress = progressAll ?? [];

  if (progress.length === 0) {
    return NextResponse.json({ questions: [], total: 0, message: "Nenhuma questão respondida ainda." });
  }

  // Count wrong vs total per question
  const stats: Record<number, { wrong: number; total: number; lastWrong: string }> = {};
  for (const p of progress) {
    const qid = p.questionId as number;
    if (!stats[qid]) stats[qid] = { wrong: 0, total: 0, lastWrong: "" };
    stats[qid].total++;
    if (!(p.correct as boolean)) {
      stats[qid].wrong++;
      if (!stats[qid].lastWrong || (p.createdAt as string) > stats[qid].lastWrong) {
        stats[qid].lastWrong = p.createdAt as string;
      }
    }
  }

  // Score: wrong count + penalty for never having gotten it right
  const candidates = Object.entries(stats)
    .filter(([, s]) => s.wrong > 0)
    .map(([qid, s]) => ({
      questionId: Number(qid),
      wrong: s.wrong,
      total: s.total,
      accuracy: Math.round(((s.total - s.wrong) / s.total) * 100),
      neverRight: s.total === s.wrong,
      lastWrong: s.lastWrong,
    }))
    .sort((a, b) => {
      // Primary: never right (those first)
      if (a.neverRight !== b.neverRight) return a.neverRight ? -1 : 1;
      // Secondary: more wrong attempts
      if (b.wrong !== a.wrong) return b.wrong - a.wrong;
      // Tertiary: lower accuracy
      return a.accuracy - b.accuracy;
    })
    .slice(0, count);

  if (candidates.length === 0) {
    return NextResponse.json({ questions: [], total: 0, message: "Parabéns! Você não tem questões com erros pendentes." });
  }

  const questionIds = candidates.map(c => c.questionId);

  // Fetch full question data in batches
  const questionsData: Record<number, unknown> = {};
  for (let i = 0; i < questionIds.length; i += 100) {
    const chunk = questionIds.slice(i, i + 100);
    let result = await db
      .from("Question")
      .select("id, subjectId, banca, year, level, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation")
      .in("id", chunk)
      .eq("aprovado", true);
    // Fallback se coluna aprovado não existe ainda
    if (result.error && (result.error as { code?: string }).code === "42703") {
      result = await db
        .from("Question")
        .select("id, subjectId, banca, year, level, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation")
        .in("id", chunk);
    }
    for (const q of result.data ?? []) questionsData[(q as { id: number }).id] = q;
  }

  // Fetch subject names
  const subjectIds = [...new Set(
    Object.values(questionsData)
      .map(q => (q as { subjectId?: string }).subjectId)
      .filter(Boolean) as string[]
  )];
  const subjectMap: Record<string, string> = {};
  if (subjectIds.length > 0) {
    const { data: subjects } = await db.from("Subject").select("id, name").in("id", subjectIds);
    for (const s of subjects ?? []) subjectMap[s.id as string] = s.name as string;
  }

  // Assemble final result
  const questions = candidates
    .filter(c => questionsData[c.questionId])
    .map(c => {
      const q = questionsData[c.questionId] as {
        id: number; subjectId: string; banca: string | null; year: number | null;
        level: string; statement: string;
        optionA: string | null; optionB: string | null; optionC: string | null;
        optionD: string | null; optionE: string | null;
        answer: string; explanation: string | null;
      };
      return {
        ...q,
        subjectName: subjectMap[q.subjectId] ?? null,
        _wrongCount: c.wrong,
        _accuracy: c.accuracy,
        _neverRight: c.neverRight,
      };
    });

  return NextResponse.json({ questions, total: questions.length });
}
