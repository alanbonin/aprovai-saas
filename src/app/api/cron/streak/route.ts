import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/cron/streak
 * Cron diário às 7h UTC: zera o streak de alunos que não estudaram ontem.
 *
 * Lógica:
 * - Se lastStudyDate < ontem → streak vai para 0
 * - Se lastStudyDate = ontem ou hoje → mantém o streak
 * - Não toca em quem nunca estudou (streak já é 0)
 */
function checkAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function runCron() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  // Busca perfis com streak > 0 e lastStudyDate antes de ontem
  const { data: perfis, error } = await db
    .from("StudentProfile")
    .select("id, userId, streak, lastStudyDate")
    .gt("streak", 0)
    .not("lastStudyDate", "is", null);

  if (error) return { error: error.message };

  const toReset = (perfis ?? []).filter(p => {
    const last = p.lastStudyDate as string | null;
    if (!last) return false;
    // Zera se última atividade foi antes de ontem
    return last < yesterdayStr && last !== todayStr;
  });

  if (toReset.length === 0) return { reset: 0 };

  const ids = toReset.map(p => p.id);
  const { error: updateErr } = await db
    .from("StudentProfile")
    .update({ streak: 0 })
    .in("id", ids);

  if (updateErr) return { error: updateErr.message };

  return { reset: toReset.length };
}

export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const result = await runCron();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
