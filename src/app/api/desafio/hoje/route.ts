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
  const brtOffset = 3 * 60;
  const brtNow = new Date(now.getTime() - brtOffset * 60000);
  const todayKey = brtNow.toISOString().slice(0, 10); // YYYY-MM-DD

  // Paraleliza: nota do desafio + perfil ativo + matérias do aluno (eram 4 queries sequenciais)
  const [{ data: desafioNote }, activeProfile, { data: studentSubs }] = await Promise.all([
    db.from("Note").select("content").eq("userId", dbUser.id).eq("subjectId", "__DESAFIO__").maybeSingle(),
    getActiveProfile(dbUser.id),
    db.from("StudentSubject").select("subjectId, Subject(name)").eq("userId", dbUser.id),
  ]);

  // Plano semanal IA (depende do profileId — roda depois do Promise.all acima)
  const materiasHoje = await getMateriasPlanoHoje(dbUser.id, activeProfile?.id ?? null);

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

  // Estratégia 2 queries em vez de 10:
  // 1. Busca até 1000 IDs (leve) para sampling determinístico
  // 2. Busca as 10 questões de uma vez com IN()
  let idQuery = db.from("Question").select("id").eq("aprovado", true).order("id").limit(1000);
  if (subjectIds.length > 0) idQuery = idQuery.in("subjectId", subjectIds);
  let idResult = await idQuery;

  // Fallback se coluna aprovado não existe
  if (idResult.error && (idResult.error as { code?: string }).code === "42703") {
    let fallbackIdQ = db.from("Question").select("id").order("id").limit(1000);
    if (subjectIds.length > 0) fallbackIdQ = fallbackIdQ.in("subjectId", subjectIds);
    idResult = await fallbackIdQ;
  }

  const allIds = (idResult.data ?? []).map(r => r.id as string);
  const total = allIds.length;

  if (total < 10) {
    return NextResponse.json({ error: "Questões insuficientes", questions: [] });
  }

  // Sampling determinístico: seed por dia + userId
  const dayOfYear = Math.floor(
    (brtNow.getTime() - new Date(brtNow.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const userHash = dbUser.id.split("").reduce((a: number, c: string) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
  const seed = (dayOfYear * 31 + userHash) % total;

  const selectedIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const idx = (seed + i * Math.ceil(total / 10)) % total;
    const id = allIds[idx];
    if (id && !selectedIds.includes(id)) selectedIds.push(id);
  }
  // Garante exatamente 10 (preenche com IDs adjacentes se necessário)
  for (let i = 0; selectedIds.length < 10 && i < total; i++) {
    const id = allIds[(seed + i) % total];
    if (!selectedIds.includes(id)) selectedIds.push(id);
  }

  // Uma única query para buscar as 10 questões
  const { data: questionsData } = await db.from("Question")
    .select("id, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation, level, banca, year, subjectId")
    .in("id", selectedIds);

  const questions = (questionsData ?? []).slice(0, 10);

  return NextResponse.json({
    questions,
    todayKey,
    completedToday,
    timeLimit: 600, // 10 minutes in seconds
    xpBonus: 20,    // bonus XP for completing the challenge
  });
}
