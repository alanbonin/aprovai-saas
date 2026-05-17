import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? user : null;
}

/**
 * GET /api/admin/ia-uso
 * Retorna estatísticas de uso de IA para o painel admin.
 */
export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const now = new Date();

  // Current week start (Monday)
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);

  // 30 days ago
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch AiUsage for current week
  const { data: weekUsage } = await db
    .from("AiUsage")
    .select("userId, agentId, count, weekStart")
    .gte("weekStart", weekStart.toISOString());

  // Fetch AiUsage for last 30 days (for trend)
  const { data: monthUsage } = await db
    .from("AiUsage")
    .select("userId, agentId, count, weekStart")
    .gte("weekStart", thirtyDaysAgo.toISOString());

  const weekData  = weekUsage  ?? [];
  const monthData = monthUsage ?? [];

  // Total calls this week
  const totalThisWeek = weekData.reduce((s, r) => s + (r.count as number), 0);

  // Total calls last 30 days
  const totalThisMonth = monthData.reduce((s, r) => s + (r.count as number), 0);

  // By user this week
  const byUser: Record<string, number> = {};
  for (const r of weekData) {
    const uid = r.userId as string;
    byUser[uid] = (byUser[uid] ?? 0) + (r.count as number);
  }

  // Top users by usage this week
  const userIds = Object.keys(byUser);
  let topUsers: { userId: string; name: string; email: string; count: number; limit: number }[] = [];

  if (userIds.length > 0) {
    const [{ data: users }, { data: subs }] = await Promise.all([
      db.from("User").select("id, name, email").in("id", userIds),
      db.from("Subscription")
        .select("userId, planId, Plan:planId(aiCreditsPerWeek)")
        .in("userId", userIds)
        .eq("status", "ACTIVE"),
    ]);

    const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]));
    const subMap: Record<string, number> = {};
    for (const s of subs ?? []) {
      const plan = Array.isArray(s.Plan) ? s.Plan[0] : s.Plan;
      subMap[s.userId as string] = (plan as { aiCreditsPerWeek?: number } | null)?.aiCreditsPerWeek ?? 5;
    }

    topUsers = userIds
      .map(uid => ({
        userId: uid,
        name: (userMap[uid] as { name: string } | undefined)?.name ?? "—",
        email: (userMap[uid] as { email: string } | undefined)?.email ?? "—",
        count: byUser[uid],
        limit: subMap[uid] ?? 5,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  // By agent this week
  const byAgent: Record<string, number> = {};
  for (const r of weekData) {
    const aid = r.agentId as string;
    byAgent[aid] = (byAgent[aid] ?? 0) + (r.count as number);
  }

  const agentIds = Object.keys(byAgent);
  let topAgents: { agentId: string; name: string; count: number }[] = [];

  if (agentIds.length > 0) {
    const { data: agents } = await db.from("Agent").select("id, name").in("id", agentIds);
    const agentMap = Object.fromEntries((agents ?? []).map(a => [a.id, a.name as string]));
    topAgents = agentIds
      .map(id => ({ agentId: id, name: agentMap[id] ?? id, count: byAgent[id] }))
      .sort((a, b) => b.count - a.count);
  }

  // Weekly trend — group by weekStart
  const byWeek: Record<string, number> = {};
  for (const r of monthData) {
    const w = (r.weekStart as string).slice(0, 10);
    byWeek[w] = (byWeek[w] ?? 0) + (r.count as number);
  }
  const weeklyTrend = Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  // Active users (at least 1 call this week)
  const activeUsersCount = Object.keys(byUser).length;

  return NextResponse.json({
    totalThisWeek,
    totalThisMonth,
    activeUsersCount,
    topUsers,
    topAgents,
    weeklyTrend,
  });
}
