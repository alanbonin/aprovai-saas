import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getMateriasPlanoHoje } from "@/lib/plano-hoje";
import { getActiveProfile } from "@/lib/get-active-profile";

/**
 * GET /api/questoes/do-dia
 *
 * Retorna a "Questão do Dia" — seleção determinística baseada no dia do ano
 * no fuso horário de Brasília (America/Sao_Paulo), filtrada pelas matérias
 * do aluno quando disponíveis.
 */

/** Retorna YYYY-MM-DD no horário de Brasília */
function todayBRT(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** Calcula o dia do ano em BRT (1–366) */
function dayOfYearBRT(): number {
  const todayStr = todayBRT(); // YYYY-MM-DD
  const [year, month, day] = todayStr.split("-").map(Number);
  const start = new Date(year, 0, 0);
  const today = new Date(year, (month ?? 1) - 1, day ?? 1);
  return Math.floor((today.getTime() - start.getTime()) / 86400000);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Índice baseado no dia do ano em BRT (corrige bug UTC)
  const dayOfYear = dayOfYearBRT();

  // Matérias do plano IA de hoje
  const activeProfile = await getActiveProfile(dbUser.id);
  const materiasHoje = await getMateriasPlanoHoje(dbUser.id, activeProfile?.id ?? null);

  // Busca matérias do aluno (filtradas pelo perfil ativo)
  const profileId = activeProfile?.id ?? null;
  let ssQ = db.from("StudentSubject").select("subjectId, Subject(name)").eq("userId", dbUser.id);
  if (profileId) ssQ = ssQ.eq("profileId", profileId);
  else ssQ = ssQ.is("profileId", null);
  const { data: studentSubjects } = await ssQ;

  let subjectIds: string[];
  if (materiasHoje && materiasHoje.length > 0) {
    const nomesPlano = materiasHoje.map(n => n.toLowerCase());
    const filtrados = (studentSubjects ?? []).filter(s => {
      const nome = ((s.Subject as { name?: string } | null)?.name ?? "").toLowerCase();
      return nomesPlano.some(p => nome.includes(p.slice(0, 6)) || p.includes(nome.slice(0, 6)));
    });
    subjectIds = filtrados.length > 0 ? filtrados.map(s => s.subjectId as string) : (studentSubjects ?? []).map(s => s.subjectId as string);
  } else {
    subjectIds = (studentSubjects ?? []).map(s => s.subjectId as string);
  }

  // Conta questões (das matérias do aluno se disponíveis, senão todas)
  let countQuery = db.from("Question").select("id", { count: "exact", head: true }).eq("aprovado", true);
  if (subjectIds.length > 0) countQuery = countQuery.in("subjectId", subjectIds);

  let countResult = await countQuery;
  // Fallback se coluna não existe ainda (PostgREST error code 42703)
  if (countResult.error && (countResult.error as { code?: string }).code === "42703") {
    let fallbackCountQ = db.from("Question").select("id", { count: "exact", head: true });
    if (subjectIds.length > 0) fallbackCountQ = fallbackCountQ.in("subjectId", subjectIds);
    countResult = await fallbackCountQ;
  }
  const { count } = countResult;
  if (!count || count === 0) return NextResponse.json({ question: null });

  // Seleciona pelo offset determinístico
  const offset = dayOfYear % count;
  let rowQuery = db.from("Question")
    .select("id, subjectId, level, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation, banca, year")
    .eq("aprovado", true)
    .order("id")
    .range(offset, offset);
  if (subjectIds.length > 0) rowQuery = rowQuery.in("subjectId", subjectIds);

  let rowResult = await rowQuery;
  if (rowResult.error && (rowResult.error as { code?: string }).code === "42703") {
    let fallbackRowQ = db.from("Question")
      .select("id, subjectId, level, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation, banca, year")
      .order("id")
      .range(offset, offset);
    if (subjectIds.length > 0) fallbackRowQ = fallbackRowQ.in("subjectId", subjectIds);
    rowResult = await fallbackRowQ;
  }
  const rows = rowResult.data;
  const question = rows?.[0] ?? null;
  if (!question) return NextResponse.json({ question: null });

  // Nome da matéria
  let subjectName: string | null = null;
  if (question.subjectId) {
    const { data: subj } = await db.from("Subject").select("name").eq("id", question.subjectId).maybeSingle();
    subjectName = subj?.name ?? null;
  }

  // Verifica se o aluno já respondeu hoje (usando BRT para o boundary de meia-noite)
  const todayStr = todayBRT(); // YYYY-MM-DD em BRT
  const todayStart = new Date(`${todayStr}T00:00:00-03:00`).toISOString();
  const { data: answered } = await db
    .from("Progress")
    .select("correct")
    .eq("userId", dbUser.id)
    .eq("questionId", question.id)
    .gte("createdAt", todayStart)
    .maybeSingle();

  return NextResponse.json({
    question: { ...question, subjectName },
    answeredToday: !!answered,
    answeredCorrect: answered?.correct ?? null,
  });
}
