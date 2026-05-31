import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getMateriasPlanoHoje } from "@/lib/plano-hoje";
import { getActiveProfile } from "@/lib/get-active-profile";

/**
 * GET /api/desafio/hoje
 * Retorna o desafio diário do aluno:
 * - 10 questões selecionadas deterministicamente pelo dia + userId
 * - Verifica se o aluno já completou o desafio hoje
 * - Indica pontuação já obtida (se concluído)
 *
 * O desafio reseta à meia-noite (UTC-3, horário de Brasília).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Today in BRT (UTC-3)
  const now = new Date();
  const brtOffset = 3 * 60; // 3 hours in minutes
  const brtNow = new Date(now.getTime() - brtOffset * 60000);
  const todayKey = brtNow.toISOString().slice(0, 10); // YYYY-MM-DD

  // Check if already completed today — stored in Note with prefix __DESAFIO__
  const { data: desafioNote } = await db
    .from("Note")
    .select("content")
    .eq("userId", dbUser.id)
    .eq("subjectId", "__DESAFIO__")
    .maybeSingle();

  interface DesafioRecord {
    date: string;
    score: number;
    total: number;
    timeSecs: number;
    xpEarned: number;
  }

  let completedToday: DesafioRecord | null = null;
  try {
    const record = desafioNote?.content ? JSON.parse(desafioNote.content) as DesafioRecord : null;
    if (record?.date === todayKey) completedToday = record;
  } catch { /* ignore */ }

  // Matérias do plano IA de hoje (se existir) — prioriza sobre matérias do aluno
  const activeProfile = await getActiveProfile(dbUser.id);
  const materiasHoje = await getMateriasPlanoHoje(dbUser.id, activeProfile?.id ?? null);

  // Get student subjects for filtering
  const { data: studentSubs } = await db
    .from("StudentSubject")
    .select("subjectId, Subject(name)")
    .eq("userId", dbUser.id);

  let subjectIds: string[];

  if (materiasHoje && materiasHoje.length > 0) {
    // Filtra pelas matérias do plano de hoje
    const nomesPlano = materiasHoje.map(n => n.toLowerCase());
    const filtrados = (studentSubs ?? []).filter(s => {
      const nome = ((s.Subject as { name?: string } | null)?.name ?? "").toLowerCase();
      return nomesPlano.some(p => nome.includes(p.slice(0, 6)) || p.includes(nome.slice(0, 6)));
    });
    // Se encontrou matérias do plano, usa elas; senão cai para todas do aluno
    subjectIds = filtrados.length > 0
      ? filtrados.map(s => s.subjectId as string)
      : (studentSubs ?? []).map(s => s.subjectId as string);
  } else {
    subjectIds = (studentSubs ?? []).map(s => s.subjectId as string);
  }

  // Count available questions
  let countQuery = db.from("Question").select("id", { count: "exact", head: true }).eq("aprovado", true);
  if (subjectIds.length > 0) countQuery = countQuery.in("subjectId", subjectIds);
  let countResult = await countQuery;
  // Fallback se coluna aprovado não existe ainda
  if (countResult.error && (countResult.error as { code?: string }).code === "42703") {
    let fallbackCQ = db.from("Question").select("id", { count: "exact", head: true });
    if (subjectIds.length > 0) fallbackCQ = fallbackCQ.in("subjectId", subjectIds);
    countResult = await fallbackCQ;
  }
  const { count } = countResult;
  const total = count ?? 0;

  if (total < 10) {
    return NextResponse.json({ error: "Questões insuficientes", questions: [] });
  }

  // Deterministic seed: dayOfYear * 31 + userId hash
  const dayOfYear = Math.floor(
    (brtNow.getTime() - new Date(brtNow.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const userHash = dbUser.id.split("").reduce((a: number, c: string) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
  const seed = (dayOfYear * 31 + userHash) % total;

  // Pick 10 questions starting from seed (wrap around)
  const indices: number[] = [];
  for (let i = 0; i < 10; i++) {
    indices.push((seed + i * Math.ceil(total / 10)) % total);
  }
  const uniqueIndices = [...new Set(indices)];

  const questionFetches = uniqueIndices.map(offset => {
    let q = db.from("Question")
      .select("id, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation, level, banca, year, subjectId")
      .eq("aprovado", true)
      .order("id")
      .range(offset, offset);
    if (subjectIds.length > 0) q = q.in("subjectId", subjectIds);
    return q;
  });

  const rawResults = await Promise.all(questionFetches);
  // Fallback se coluna aprovado não existe ainda (verifica o primeiro erro)
  const hasAprovadoError = rawResults.some(r => r.error && (r.error as { code?: string }).code === "42703");
  let results = rawResults;
  if (hasAprovadoError) {
    const fallbackFetches = uniqueIndices.map(offset => {
      let q = db.from("Question")
        .select("id, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation, level, banca, year, subjectId")
        .order("id")
        .range(offset, offset);
      if (subjectIds.length > 0) q = q.in("subjectId", subjectIds);
      return q;
    });
    results = await Promise.all(fallbackFetches);
  }

  const questions = results
    .flatMap(r => r.data ?? [])
    .filter((q, i, arr) => arr.findIndex(x => x.id === q.id) === i) // deduplicate
    .slice(0, 10);

  return NextResponse.json({
    questions,
    todayKey,
    completedToday,
    timeLimit: 600, // 10 minutes in seconds
    xpBonus: 20,    // bonus XP for completing the challenge
  });
}
