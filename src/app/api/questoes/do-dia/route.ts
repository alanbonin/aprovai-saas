import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

/**
 * GET /api/questoes/do-dia
 *
 * Retorna a "Questão do Dia" — seleção determinística baseada no dia do ano,
 * filtrada pelas matérias do aluno quando disponíveis.
 * Cada aluno pode receber uma questão diferente (baseada em suas matérias + dayOfYear).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Índice baseado no dia do ano
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);

  // Busca matérias do aluno
  const { data: studentSubjects } = await db
    .from("StudentSubject")
    .select("subjectId")
    .eq("userId", dbUser.id);
  const subjectIds = (studentSubjects ?? []).map(s => s.subjectId);

  // Conta questões (das matérias do aluno se disponíveis, senão todas)
  let countQuery = db.from("Question").select("id", { count: "exact", head: true });
  if (subjectIds.length > 0) countQuery = countQuery.in("subjectId", subjectIds);

  const { count } = await countQuery;
  if (!count || count === 0) return NextResponse.json({ question: null });

  // Seleciona pelo offset determinístico
  const offset = dayOfYear % count;
  let rowQuery = db.from("Question")
    .select("id, subjectId, level, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation, banca, year")
    .order("id")
    .range(offset, offset);
  if (subjectIds.length > 0) rowQuery = rowQuery.in("subjectId", subjectIds);

  const { data: rows } = await rowQuery;
  const question = rows?.[0] ?? null;
  if (!question) return NextResponse.json({ question: null });

  // Nome da matéria
  let subjectName: string | null = null;
  if (question.subjectId) {
    const { data: subj } = await db.from("Subject").select("name").eq("id", question.subjectId).single();
    subjectName = subj?.name ?? null;
  }

  // Verifica se o aluno já respondeu hoje
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const { data: answered } = await db
    .from("Progress")
    .select("correct")
    .eq("userId", dbUser.id)
    .eq("questionId", question.id)
    .gte("createdAt", todayStart)
    .single();

  return NextResponse.json({
    question: { ...question, subjectName },
    answeredToday: !!answered,
    answeredCorrect: answered?.correct ?? null,
  });
}
