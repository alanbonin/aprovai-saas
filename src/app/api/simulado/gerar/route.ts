import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const { total = 20, subjectIds, banca, level } = await req.json().catch(() => ({} as Record<string, unknown>)) as { total?: number; subjectIds?: string[]; banca?: string; level?: string };

  // Busca matérias do aluno se não fornecidas
  let sIds: string[] = subjectIds ?? [];
  if (sIds.length === 0) {
    const { data: ss } = await db
      .from("StudentSubject")
      .select("subjectId")
      .eq("userId", dbUser.id);
    sIds = (ss ?? []).map((s: { subjectId: string }) => s.subjectId);
  }

  if (sIds.length === 0) {
    return NextResponse.json({ error: "Nenhuma matéria cadastrada" }, { status: 400 });
  }

  // Busca questões já respondidas pelo aluno
  const { data: answered } = await db
    .from("Progress")
    .select("questionId")
    .eq("userId", dbUser.id);
  const answeredIds = (answered ?? []).map((p: { questionId: number }) => p.questionId);

  // Busca questões das matérias do aluno
  let query = db
    .from("Question")
    .select("id, subjectId, banca, year, level, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation")
    .in("subjectId", sIds)
    .eq("aprovado", true);

  if (banca)  query = query.eq("banca", banca);
  if (level)  query = query.eq("level", level);

  if (answeredIds.length > 0) {
    query = query.not("id", "in", `(${answeredIds.join(",")})`);
  }

  let mainResult = await query.limit(total * 3);
  // Fallback se coluna aprovado não existe ainda
  if (mainResult.error && (mainResult.error as { code?: string }).code === "42703") {
    let fallbackMain = db.from("Question")
      .select("id, subjectId, banca, year, level, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation")
      .in("subjectId", sIds);
    if (banca) fallbackMain = fallbackMain.eq("banca", banca);
    if (level) fallbackMain = fallbackMain.eq("level", level);
    if (answeredIds.length > 0) fallbackMain = fallbackMain.not("id", "in", `(${answeredIds.join(",")})`);
    mainResult = await fallbackMain.limit(total * 3);
  }
  const questions = mainResult.data;

  if (!questions || questions.length === 0) {
    // Fallback: busca qualquer questão das matérias, ignorando histórico
    let fallbackQ = db
      .from("Question")
      .select("id, subjectId, banca, year, level, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation")
      .in("subjectId", sIds)
      .eq("aprovado", true);
    if (banca) fallbackQ = fallbackQ.eq("banca", banca);
    if (level) fallbackQ = fallbackQ.eq("level", level);
    let fallbackResult = await fallbackQ.limit(total);
    if (fallbackResult.error && (fallbackResult.error as { code?: string }).code === "42703") {
      let fallbackQ2 = db.from("Question")
        .select("id, subjectId, banca, year, level, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation")
        .in("subjectId", sIds);
      if (banca) fallbackQ2 = fallbackQ2.eq("banca", banca);
      if (level) fallbackQ2 = fallbackQ2.eq("level", level);
      fallbackResult = await fallbackQ2.limit(total);
    }
    const allQs = fallbackResult.data;

    if (!allQs || allQs.length === 0) {
      return NextResponse.json({ error: "Nenhuma questão disponível" }, { status: 400 });
    }

    const shuffled = allQs.sort(() => Math.random() - 0.5).slice(0, total);
    return NextResponse.json({ questions: shuffled });
  }

  // Embaralha e limita
  const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, total);
  return NextResponse.json({ questions: shuffled });
}
