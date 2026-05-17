import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { updateXP, XP_SIMULADO_PER_ACERTO } from "@/lib/xp";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const { total, correct, timeSecs, subjectIds, answers } = await req.json();

  const { error } = await db.from("SimuladoHistory").insert({
    userId: dbUser.id,
    total: total ?? 0,
    correct: correct ?? 0,
    timeSecs: timeSecs ?? 0,
    subjectIds: subjectIds ?? [],
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(answers) && answers.length > 0) {
    const progressRows = answers.map((a: { questionId: number; correct: boolean }) => ({
      id: crypto.randomUUID(),
      userId: dbUser.id,
      questionId: a.questionId,
      correct: a.correct,
      createdAt: new Date().toISOString(),
    }));
    await db.from("Progress").upsert(progressRows, { onConflict: "userId,questionId", ignoreDuplicates: false });
  }

  // XP pelo simulado: 3 XP por acerto
  const xpDelta = (correct ?? 0) * XP_SIMULADO_PER_ACERTO;
  void updateXP(dbUser.id, xpDelta).catch(() => {});

  return NextResponse.json({ ok: true });
}
