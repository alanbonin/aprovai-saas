import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";
import { log } from "@/lib/logger";

const PREFIX = "__CADERNO_APRENDIDO__";

/**
 * GET /api/workspace/caderno
 * Retorna todas as questões que o aluno já errou pelo menos uma vez,
 * agrupadas por matéria, com flag "aprendido" (marcado pelo aluno).
 *
 * Resposta:
 *   subjects: { id, name, questions: QuestionError[] }[]
 *   total: number
 *   aprendidos: number
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  // Fetch progress do perfil ativo
  let progressQuery = db.from("Progress").select("questionId, correct, reviewedAt")
    .eq("userId", dbUser.id).order("reviewedAt", { ascending: false });
  // BUG FIX: inclui dados legados (profileId null)
  if (profileId) progressQuery = progressQuery.or(`profileId.eq.${profileId},profileId.is.null`);
  const { data: progressAll, error: progressErr } = await progressQuery;

  if (progressErr) {
    log.error("db.caderno_progress_error", { table: "Progress" }, progressErr);
    return NextResponse.json({ subjects: [], total: 0, aprendidos: 0 });
  }

  const progress = progressAll ?? [];

  // Group: for each questionId, compute wrong count
  const stats: Record<number, { wrong: number; total: number; lastWrong: string }> = {};
  for (const p of progress) {
    const qid = p.questionId as number;
    if (!stats[qid]) stats[qid] = { wrong: 0, total: 0, lastWrong: "" };
    stats[qid].total++;
    if (!(p.correct as boolean)) {
      stats[qid].wrong++;
      if (!stats[qid].lastWrong) stats[qid].lastWrong = (p.reviewedAt ?? "") as string;
    }
  }

  const errorIds = Object.entries(stats)
    .filter(([, s]) => s.wrong > 0)
    .map(([id]) => Number(id));

  if (errorIds.length === 0) {
    return NextResponse.json({ subjects: [], total: 0, aprendidos: 0 });
  }

  // Fetch "aprendido" marks from Note KV store
  const { data: cadNote } = await db
    .from("Note")
    .select("content")
    .eq("userId", dbUser.id)
    .eq("subjectId", PREFIX)
    .single();

  let aprendidoSet: Set<number> = new Set();
  try {
    const list: number[] = JSON.parse(cadNote?.content ?? "[]");
    aprendidoSet = new Set(list);
  } catch { /* ignore */ }

  // Fetch question data in chunks
  const questionsData: Record<number, {
    id: number; subjectId: string | null; statement: string; answer: string;
    level: string; banca: string | null; year: number | null;
    optionA: string | null; optionB: string | null; optionC: string | null;
    optionD: string | null; optionE: string | null; explanation: string | null;
  }> = {};
  for (let i = 0; i < errorIds.length; i += 200) {
    const chunk = errorIds.slice(i, i + 200);
    let result = await db.from("Question")
      .select("id, subjectId, statement, answer, level, banca, year, optionA, optionB, optionC, optionD, optionE, explanation")
      .in("id", chunk).eq("aprovado", true);
    if (result.error && (result.error as { code?: string }).code === "42703") {
      result = await db.from("Question")
        .select("id, subjectId, statement, answer, level, banca, year, optionA, optionB, optionC, optionD, optionE, explanation")
        .in("id", chunk);
    }
    for (const q of result.data ?? []) questionsData[(q as { id: number }).id] = q as typeof questionsData[number];
  }

  // Group by subject
  const bySubject: Record<string, {
    id: string | null;
    questions: {
      id: number; statement: string; answer: string; level: string;
      banca: string | null; year: number | null;
      optionA: string | null; optionB: string | null; optionC: string | null;
      optionD: string | null; optionE: string | null; explanation: string | null;
      wrongCount: number; aprendido: boolean; lastWrong: string;
    }[]
  }> = {};

  for (const qid of errorIds) {
    const q = questionsData[qid];
    if (!q) continue;
    const sid = q.subjectId ?? "__sem_materia__";
    if (!bySubject[sid]) bySubject[sid] = { id: q.subjectId, questions: [] };
    bySubject[sid].questions.push({
      id: q.id,
      statement: q.statement,
      answer: q.answer,
      level: q.level,
      banca: q.banca,
      year: q.year,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      optionE: q.optionE,
      explanation: q.explanation,
      wrongCount: stats[qid].wrong,
      aprendido: aprendidoSet.has(qid),
      lastWrong: stats[qid].lastWrong,
    });
  }

  // Fetch subject names
  const subjectIds = Object.keys(bySubject).filter(id => id !== "__sem_materia__");
  const subjectMap: Record<string, string> = {};
  if (subjectIds.length > 0) {
    const { data: subjects } = await db.from("Subject").select("id, name").in("id", subjectIds);
    for (const s of subjects ?? []) subjectMap[s.id as string] = s.name as string;
  }

  // Build sorted result
  const subjects = Object.entries(bySubject)
    .map(([sid, data]) => ({
      id: sid === "__sem_materia__" ? null : sid,
      name: sid === "__sem_materia__" ? "Sem matéria" : (subjectMap[sid] ?? sid),
      questions: data.questions.sort((a, b) => b.wrongCount - a.wrongCount),
      total: data.questions.length,
      aprendidos: data.questions.filter(q => q.aprendido).length,
    }))
    .sort((a, b) => (b.total - b.aprendidos) - (a.total - a.aprendidos));

  const total      = errorIds.length;
  const aprendidos = [...aprendidoSet].filter(id => errorIds.includes(id)).length;

  return NextResponse.json({ subjects, total, aprendidos });
}

/**
 * PATCH /api/workspace/caderno
 * Marca/desmarca um questionId como aprendido.
 * Body: { questionId: number; aprendido: boolean }
 */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { questionId, aprendido } = await req.json() as { questionId: number; aprendido: boolean };

  // Load current list
  const { data: cadNote } = await db
    .from("Note")
    .select("id, content")
    .eq("userId", dbUser.id)
    .eq("subjectId", PREFIX)
    .single();

  let list: number[] = [];
  try { list = JSON.parse(cadNote?.content ?? "[]"); } catch { /* ignore */ }

  if (aprendido) {
    if (!list.includes(questionId)) list.push(questionId);
  } else {
    list = list.filter(id => id !== questionId);
  }

  const content = JSON.stringify(list);

  if (cadNote?.id) {
    await db.from("Note").update({ content, updatedAt: new Date().toISOString() }).eq("id", cadNote.id);
  } else {
    await db.from("Note").insert({
      id: crypto.randomUUID(),
      userId: dbUser.id,
      subjectId: PREFIX,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true, total: list.length });
}
