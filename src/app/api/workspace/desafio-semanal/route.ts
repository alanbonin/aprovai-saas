import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

const PREFIX = "__DESAFIO_SEMANAL__";

interface WeeklySave {
  weekKey: string;
  questions: number[];       // IDs na ordem
  answers: Record<number, string>; // questionId → resposta dada
  completed: boolean;
  score: number;
  startedAt: string;
  completedAt: string | null;
}

function getWeekKey(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // domingo
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/workspace/desafio-semanal
 * Retorna o desafio semanal atual (10 questões difíceis, fixas para a semana).
 * Se não existir um save para a semana atual, gera automaticamente.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const weekKey = getWeekKey();

  // Load save
  const { data: note } = await db
    .from("Note")
    .select("id, content")
    .eq("userId", dbUser.id)
    .eq("subjectId", PREFIX)
    .single();

  let save: WeeklySave | null = null;
  try { save = JSON.parse(note?.content ?? "null"); } catch { /* ignore */ }

  // If no save for this week, generate
  if (!save || save.weekKey !== weekKey) {
    // Seed from weekKey to get deterministic questions platform-wide
    const weekNum = Math.floor(new Date(weekKey).getTime() / (7 * 86400000));

    // Fetch random hard questions (platform-wide, not personalized)
    const { data: hardQs } = await db
      .from("Question")
      .select("id")
      .eq("level", "dificil")
      .limit(200);

    if (!hardQs || hardQs.length === 0) {
      // Fallback: any questions
      const { data: anyQs } = await db.from("Question").select("id").limit(200);
      if (!anyQs?.length) return NextResponse.json({ error: "Sem questões disponíveis" }, { status: 404 });
      hardQs?.push(...(anyQs ?? []));
    }

    // Deterministic shuffle using weekNum seed
    const ids = hardQs!.map(q => q.id as number);
    const seeded = ids.map((id, i) => ({
      id,
      sort: ((id * 2654435761 + weekNum * 982451653) >>> 0) / 4294967296 + i * 0.0001,
    })).sort((a, b) => a.sort - b.sort).slice(0, 10).map(x => x.id);

    save = {
      weekKey,
      questions: seeded,
      answers: {},
      completed: false,
      score: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
  }

  // Fetch full question data
  const { data: qs } = await db
    .from("Question")
    .select("id, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation, banca, year, level, subjectId")
    .in("id", save.questions);

  const qMap: Record<number, unknown> = {};
  for (const q of qs ?? []) qMap[(q as { id: number }).id] = q;

  const questions = save.questions
    .map(id => qMap[id])
    .filter(Boolean)
    .map(q => {
      const qData = q as {
        id: number; answer: string; [key: string]: unknown;
      };
      const userAnswer = save!.answers[qData.id];
      return {
        ...qData,
        userAnswer: userAnswer ?? null,
        revealed: userAnswer !== undefined || save!.completed,
      };
    });

  const answeredCount = Object.keys(save.answers).length;
  const nextUnanswered = save.questions.findIndex(id => !save!.answers[id]);

  return NextResponse.json({
    weekKey,
    questions,
    answeredCount,
    total: save.questions.length,
    completed: save.completed,
    score: save.score,
    nextUnanswered: nextUnanswered === -1 ? null : nextUnanswered,
    startedAt: save.startedAt,
    completedAt: save.completedAt,
  });
}

/**
 * PATCH /api/workspace/desafio-semanal
 * Registra resposta para uma questão do desafio.
 * Body: { questionId: number; answer: string }
 */
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { questionId, answer } = await req.json() as { questionId: number; answer: string };
  const weekKey = getWeekKey();

  const { data: note } = await db
    .from("Note")
    .select("id, content")
    .eq("userId", dbUser.id)
    .eq("subjectId", PREFIX)
    .single();

  let save: WeeklySave | null = null;
  try { save = JSON.parse(note?.content ?? "null"); } catch { /* ignore */ }

  if (!save || save.weekKey !== weekKey) {
    return NextResponse.json({ error: "Desafio não iniciado" }, { status: 400 });
  }
  if (save.completed) {
    return NextResponse.json({ error: "Desafio já concluído" }, { status: 400 });
  }
  if (save.answers[questionId] !== undefined) {
    return NextResponse.json({ error: "Já respondida" }, { status: 400 });
  }

  save.answers[questionId] = answer;

  // Check if completed
  const allAnswered = save.questions.every(id => save!.answers[id] !== undefined);
  if (allAnswered) {
    // Compute score
    const { data: qs } = await db
      .from("Question")
      .select("id, answer")
      .in("id", save.questions);
    const correctMap: Record<number, string> = {};
    for (const q of qs ?? []) correctMap[q.id as number] = q.answer as string;
    const correct = save.questions.filter(id => save!.answers[id] === correctMap[id]).length;
    save.score = Math.round((correct / save.questions.length) * 100);
    save.completed = true;
    save.completedAt = new Date().toISOString();
  }

  const content = JSON.stringify(save);
  if (note?.id) {
    await db.from("Note").update({ content, updatedAt: new Date().toISOString() }).eq("id", note.id);
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

  return NextResponse.json({
    ok: true,
    completed: save.completed,
    score: save.score,
    answeredCount: Object.keys(save.answers).length,
  });
}
