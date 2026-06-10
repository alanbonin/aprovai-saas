import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { updateXP } from "@/lib/xp";
import { desafioSubmeterLimiter } from "@/lib/rate-limit";

/**
 * POST /api/desafio/submeter
 * Registra o resultado do desafio diário.
 * Body: { total, timeSecs, answers: [{ questionId, resposta }] }
 *
 * - score é computado SERVER-SIDE comparando respostas com gabarito no banco
 * - Salva o resultado em Note __DESAFIO__
 * - Registra Progress para cada questão
 * - Atribui XP base (2 por acerto) + bônus de 20 XP ao finalizar
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // ── Rate limit: evita race-condition e duplo XP (3/hora) ────────────────────
  const rl = await desafioSubmeterLimiter.check(user.id);
  if (!rl.ok) {
    return NextResponse.json({ error: rl.error }, { status: 429 });
  }

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { total, timeSecs, answers } = await req.json() as {
    total: number;
    timeSecs: number;
    answers: { questionId: number; resposta?: string }[];
  };

  // Today in BRT
  const brtNow = new Date(Date.now() - 3 * 60 * 60000);
  const todayKey = brtNow.toISOString().slice(0, 10);

  // Check not already submitted today
  const { data: existing } = await db
    .from("Note")
    .select("id, content")
    .eq("userId", dbUser.id)
    .eq("subjectId", "__DESAFIO__")
    .maybeSingle();

  try {
    const prev = existing?.content ? JSON.parse(existing.content) as { date: string } : null;
    if (prev?.date === todayKey) {
      return NextResponse.json({ error: "Desafio já concluído hoje" }, { status: 400 });
    }
  } catch { /* ignore */ }

  // ── Verifica gabaritos SERVER-SIDE ────────────────────────────────────────────
  const validAnswers = Array.isArray(answers) ? answers : [];
  const safeTotal = Math.min(Math.max(0, total ?? validAnswers.length), 50);

  let serverScore = 0;
  const answersWithResult: { questionId: number; isCorrect: boolean }[] = [];

  if (validAnswers.length > 0) {
    const qIds = validAnswers.map(a => a.questionId);
    const { data: gabaritos } = await db
      .from("Question")
      .select("id, answer")
      .in("id", qIds);

    const gabMap = new Map((gabaritos ?? []).map(g => [g.id as number, g.answer as string]));

    for (const a of validAnswers) {
      const isCorrect = gabMap.has(a.questionId) && (a.resposta ?? "").toUpperCase() === gabMap.get(a.questionId);
      if (isCorrect) serverScore++;
      answersWithResult.push({ questionId: a.questionId, isCorrect });
    }
  }

  // ── XP: 2 por acerto (server-computed) + 20 bônus por completar ─────────────
  const xpBase  = serverScore * 2;
  const xpBonus = 20;
  const xpTotal = xpBase + xpBonus;

  // ── Salva registro do desafio ────────────────────────────────────────────────
  const record = JSON.stringify({ date: todayKey, score: serverScore, total: safeTotal, timeSecs, xpEarned: xpTotal });
  const now = new Date().toISOString();
  if (existing?.id) {
    await db.from("Note").update({ content: record, updatedAt: now }).eq("id", existing.id);
  } else {
    await db.from("Note").insert({
      id: crypto.randomUUID(), userId: dbUser.id, subjectId: "__DESAFIO__",
      content: record, createdAt: now, updatedAt: now,
    });
  }

  // ── Registra Progress para cada questão (server-computed) ────────────────────
  if (answersWithResult.length > 0) {
    const progressRows = answersWithResult.map(a => ({
      id: crypto.randomUUID(),
      userId: dbUser.id,
      questionId: a.questionId,
      correct: a.isCorrect,
      createdAt: now,
    }));
    await db.from("Progress").upsert(progressRows, {
      onConflict: "userId,questionId",
      ignoreDuplicates: false,
    });
  }

  // ── Concede XP ───────────────────────────────────────────────────────────────
  const xpResult = await updateXP(dbUser.id, xpTotal).catch(() => null);

  return NextResponse.json({
    ok: true,
    score: serverScore,
    total: safeTotal,
    timeSecs,
    xpEarned: xpTotal,
    xpResult,
  });
}
