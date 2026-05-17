import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

/**
 * GET /api/workspace/nivel
 * Desempenho do aluno por nível de dificuldade (facil/medio/dificil).
 * Para cada nível: total respondidas, acertos, accuracy, evolução 30d.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  // Fetch all progress
  const { data: progressAll } = await db
    .from("Progress")
    .select("questionId, correct, createdAt")
    .eq("userId", dbUser.id)
    .order("createdAt", { ascending: true });

  const progress = progressAll ?? [];
  if (progress.length === 0) {
    return NextResponse.json({ levels: [], totalAnswered: 0 });
  }

  // Get unique question IDs
  const qIds = [...new Set(progress.map(p => p.questionId as number))];

  // Fetch question levels in chunks
  const levelMap: Record<number, string> = {};
  for (let i = 0; i < qIds.length; i += 200) {
    const { data: qs } = await db
      .from("Question")
      .select("id, level")
      .in("id", qIds.slice(i, i + 200));
    for (const q of qs ?? []) levelMap[q.id as number] = q.level as string;
  }

  const LEVELS = ["facil", "medio", "dificil"];
  const stats: Record<string, {
    total: number; correct: number;
    recent30: { date: string; correct: boolean }[];
  }> = {};

  for (const lvl of LEVELS) {
    stats[lvl] = { total: 0, correct: 0, recent30: [] };
  }

  for (const p of progress) {
    const level = levelMap[p.questionId as number];
    if (!level || !stats[level]) continue;
    stats[level].total++;
    if (p.correct as boolean) stats[level].correct++;
    if ((p.createdAt as string) >= thirtyDaysAgo) {
      stats[level].recent30.push({ date: (p.createdAt as string).slice(0, 10), correct: p.correct as boolean });
    }
  }

  // Weekly trend per level (last 4 weeks)
  const weekMs = 7 * 86400000;
  function getWeekBucket(dateStr: string): number {
    const diff = now.getTime() - new Date(dateStr).getTime();
    return Math.floor(diff / weekMs);
  }

  const levels = LEVELS.map(lvl => {
    const s = stats[lvl];
    const accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;

    // 4-week trend
    const weeklyStats: { week: number; total: number; correct: number }[] = [0,1,2,3].map(w => ({
      week: w, total: 0, correct: 0,
    }));
    for (const p of s.recent30) {
      const w = getWeekBucket(p.date);
      if (w < 4) {
        weeklyStats[w].total++;
        if (p.correct) weeklyStats[w].correct++;
      }
    }
    const trend = weeklyStats.reverse().map(w => ({
      label: w.week === 0 ? "Esta sem." : `${w.week * 7}d atrás`,
      total: w.total,
      accuracy: w.total > 0 ? Math.round((w.correct / w.total) * 100) : null,
    }));

    return { level: lvl, total: s.total, correct: s.correct, accuracy, trend };
  });

  return NextResponse.json({
    levels,
    totalAnswered: progress.length,
    summary: {
      easiest: levels.filter(l => l.total >= 5).reduce(
        (best, l) => l.accuracy > (best?.accuracy ?? -1) ? l : best,
        null as typeof levels[0] | null
      ),
      hardest: levels.filter(l => l.total >= 5).reduce(
        (worst, l) => l.accuracy < (worst?.accuracy ?? 101) ? l : worst,
        null as typeof levels[0] | null
      ),
    },
  });
}
