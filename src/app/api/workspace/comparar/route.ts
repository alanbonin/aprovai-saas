import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

/**
 * GET /api/workspace/comparar
 * Retorna comparação anônima do aluno com a média da plataforma.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // ── Dados do aluno ──────────────────────────────────────────────────────────

  const [myProgressAll, myProgress7d, mySimulados, myProfile] = await Promise.all([
    db.from("Progress").select("correct", { count: "exact" }).eq("userId", dbUser.id),
    db.from("Progress").select("correct").eq("userId", dbUser.id).gte("createdAt", sevenDaysAgo),
    db.from("SimuladoHistory").select("total, correct").eq("userId", dbUser.id),
    db.from("StudentProfile").select("streak, xp").eq("userId", dbUser.id).single(),
  ]);

  const myTotal     = myProgressAll.count ?? 0;
  const myCorrect   = (myProgressAll.data ?? []).filter(p => p.correct).length;
  const myAccuracy  = myTotal > 0 ? Math.round((myCorrect / myTotal) * 100) : 0;
  const myQ7d       = myProgress7d.data?.length ?? 0;
  const myStreak    = myProfile.data?.streak ?? 0;
  const myXp        = myProfile.data?.xp ?? 0;
  const mySimCount  = mySimulados.data?.length ?? 0;
  const mySimAccuracy = mySimCount > 0
    ? Math.round(
        (mySimulados.data ?? []).reduce((s, r) => s + (r.total > 0 ? r.correct / r.total : 0), 0)
        / mySimCount * 100
      )
    : 0;

  // ── Médias da plataforma (amostra: até 2000 perfis ativos) ───────────────────

  // Get active users with progress in last 30d
  const { data: activeUserProgress } = await db
    .from("Progress")
    .select("userId, correct")
    .gte("createdAt", thirtyDaysAgo)
    .limit(5000);

  const userStats: Record<string, { total: number; correct: number }> = {};
  for (const p of activeUserProgress ?? []) {
    if (!userStats[p.userId as string]) userStats[p.userId as string] = { total: 0, correct: 0 };
    userStats[p.userId as string].total++;
    if (p.correct) userStats[p.userId as string].correct++;
  }

  const activeUserIds = Object.keys(userStats);
  const platformUserCount = activeUserIds.length;

  // Platform averages
  const platformTotals = Object.values(userStats);
  const platformAvgQ30 = platformUserCount > 0
    ? Math.round(platformTotals.reduce((s, u) => s + u.total, 0) / platformUserCount)
    : 0;
  const platformAvgAccuracy = platformUserCount > 0
    ? Math.round(
        platformTotals
          .filter(u => u.total >= 5)
          .reduce((s, u) => s + (u.correct / u.total) * 100, 0)
        / Math.max(1, platformTotals.filter(u => u.total >= 5).length)
      )
    : 0;

  // Streak and XP averages from profiles
  const { data: profiles } = await db
    .from("StudentProfile")
    .select("streak, xp")
    .not("streak", "is", null)
    .limit(2000);

  const profList = profiles ?? [];
  const platformAvgStreak = profList.length > 0
    ? Math.round(profList.reduce((s, p) => s + (p.streak ?? 0), 0) / profList.length)
    : 0;
  const platformAvgXp = profList.length > 0
    ? Math.round(profList.reduce((s, p) => s + (p.xp ?? 0), 0) / profList.length)
    : 0;

  // Simulado averages
  const { data: allSimulados } = await db
    .from("SimuladoHistory")
    .select("userId, total, correct")
    .limit(5000);

  const simByUser: Record<string, { count: number; accuracy: number[] }> = {};
  for (const s of allSimulados ?? []) {
    const uid = s.userId as string;
    if (!simByUser[uid]) simByUser[uid] = { count: 0, accuracy: [] };
    simByUser[uid].count++;
    if (s.total > 0) simByUser[uid].accuracy.push((s.correct / s.total) * 100);
  }
  const simUsers = Object.values(simByUser);
  const platformAvgSimCount = simUsers.length > 0
    ? Math.round(simUsers.reduce((s, u) => s + u.count, 0) / simUsers.length)
    : 0;
  const platformAvgSimAccuracy = simUsers.length > 0
    ? Math.round(
        simUsers
          .filter(u => u.accuracy.length > 0)
          .reduce((s, u) => s + u.accuracy.reduce((a, b) => a + b, 0) / u.accuracy.length, 0)
        / Math.max(1, simUsers.filter(u => u.accuracy.length > 0).length)
      )
    : 0;

  // ── Percentil do aluno por questões respondidas no total ────────────────────
  const allTotals = Object.values(userStats).map(u => u.total).sort((a, b) => a - b);
  const rank = allTotals.filter(t => t < myQ7d).length;
  const percentile = allTotals.length > 0 ? Math.round((rank / allTotals.length) * 100) : 50;

  return NextResponse.json({
    meu: {
      questoesTotal: myTotal,
      questoes7d: myQ7d,
      accuracy: myAccuracy,
      streak: myStreak,
      xp: myXp,
      simulados: mySimCount,
      simuladoAccuracy: mySimAccuracy,
    },
    media: {
      questoes30d: platformAvgQ30,
      accuracy: platformAvgAccuracy,
      streak: platformAvgStreak,
      xp: platformAvgXp,
      simulados: platformAvgSimCount,
      simuladoAccuracy: platformAvgSimAccuracy,
    },
    percentil7d: percentile,
    platformUserCount,
  });
}
