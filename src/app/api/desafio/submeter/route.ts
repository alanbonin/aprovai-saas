import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { updateXP } from "@/lib/xp";

/**
 * POST /api/desafio/submeter
 * Registra o resultado do desafio diário.
 * Body: { score, total, timeSecs, answers: [{ questionId, correct }] }
 *
 * - Salva o resultado em Note __DESAFIO__
 * - Registra Progress para cada questão
 * - Atribui XP base (2 por acerto) + bônus de 20 XP ao finalizar
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { score, total, timeSecs, answers } = await req.json() as {
    score: number;
    total: number;
    timeSecs: number;
    answers: { questionId: number; correct: boolean }[];
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
    .single();

  try {
    const prev = existing?.content ? JSON.parse(existing.content) as { date: string } : null;
    if (prev?.date === todayKey) {
      return NextResponse.json({ error: "Desafio já concluído hoje" }, { status: 400 });
    }
  } catch { /* ignore */ }

  // XP: 2 per correct + 20 bonus for completing
  const xpBase  = score * 2;
  const xpBonus = 20;
  const xpTotal = xpBase + xpBonus;

  // Save desafio record
  const record = JSON.stringify({ date: todayKey, score, total, timeSecs, xpEarned: xpTotal });
  if (existing?.id) {
    await db.from("Note").update({ content: record }).eq("id", existing.id);
  } else {
    await db.from("Note").insert({ userId: dbUser.id, subjectId: "__DESAFIO__", content: record });
  }

  // Register Progress for each answer
  if (Array.isArray(answers) && answers.length > 0) {
    const progressRows = answers.map(a => ({
      id: crypto.randomUUID(),
      userId: dbUser.id,
      questionId: a.questionId,
      correct: a.correct,
      createdAt: new Date().toISOString(),
    }));
    await db.from("Progress").upsert(progressRows, {
      onConflict: "userId,questionId",
      ignoreDuplicates: false,
    });
  }

  // Award XP
  const xpResult = await updateXP(dbUser.id, xpTotal).catch(() => null);

  return NextResponse.json({
    ok: true,
    score,
    total,
    timeSecs,
    xpEarned: xpTotal,
    xpResult,
  });
}
