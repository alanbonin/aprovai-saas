import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

/**
 * GET /api/ranking?period=all|week|month
 *
 * Retorna o top-50 de alunos e a posição do usuário atual.
 *
 * - all   → ordena por XP (StudentProfile.xp)
 * - week  → conta questões respondidas nos últimos 7 dias (Progress)
 * - month → conta questões respondidas nos últimos 30 dias (Progress)
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "all";

  const now = new Date();
  const since =
    period === "week"
      ? new Date(now.getTime() - 7  * 86400000).toISOString()
      : period === "month"
      ? new Date(now.getTime() - 30 * 86400000).toISOString()
      : null;

  let entries: { userId: string; score: number }[] = [];

  if (since) {
    // Rank by question count in period
    const { data: prog } = await db
      .from("Progress")
      .select("userId")
      .gte("createdAt", since);

    const counts: Record<string, number> = {};
    for (const p of prog ?? []) {
      counts[p.userId] = (counts[p.userId] ?? 0) + 1;
    }
    entries = Object.entries(counts)
      .map(([userId, score]) => ({ userId, score }))
      .sort((a, b) => b.score - a.score);
  } else {
    // Rank by XP
    const { data: profiles } = await db
      .from("StudentProfile")
      .select("userId, xp")
      .order("xp", { ascending: false })
      .limit(200);

    entries = (profiles ?? []).map(p => ({ userId: p.userId, score: p.xp ?? 0 }));
  }

  // Take top 50
  const top50 = entries.slice(0, 50);

  // Find current user rank
  const myRank = entries.findIndex(e => e.userId === dbUser.id) + 1;
  const myScore = entries.find(e => e.userId === dbUser.id)?.score ?? 0;

  // Enrich with user names — batch fetch
  const userIds = [...new Set(top50.map(e => e.userId))];
  const { data: users } = await db
    .from("User")
    .select("id, name")
    .in("id", userIds);

  const userMap: Record<string, string> = {};
  for (const u of users ?? []) {
    userMap[u.id] = u.name ?? "Aluno";
  }

  // Anonymize: show first name + last initial
  function anonymize(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }

  const leaderboard = top50.map((e, i) => ({
    rank:    i + 1,
    name:    anonymize(userMap[e.userId] ?? "Aluno"),
    score:   e.score,
    isMe:    e.userId === dbUser.id,
  }));

  // Current user entry (if not in top 50)
  const me = myRank > 0
    ? { rank: myRank, name: anonymize(dbUser.name ?? "Você"), score: myScore, isMe: true }
    : null;

  return NextResponse.json({
    period,
    leaderboard,
    me,
    total: entries.length,
  });
}
