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
 * GET /api/admin/assinaturas
 * Retorna painel de assinaturas: ativas, expiradas recentemente, trial expirando.
 */
export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const sevenDaysAgo   = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAhead = new Date(Date.now() + 7  * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all subscriptions
  const [
    { data: allSubs },
    { data: plans },
  ] = await Promise.all([
    db.from("Subscription")
      .select("id, userId, status, planId, startDate, endDate, createdAt")
      .order("createdAt", { ascending: false })
      .limit(500),
    db.from("Plan").select("id, name, slug, price"),
  ]);

  const subs = allSubs ?? [];
  const planMap = Object.fromEntries((plans ?? []).map(p => [p.id as string, p]));

  // Categorize
  const ativas      = subs.filter(s => s.status === "ACTIVE"   && (!s.endDate || (s.endDate as string) > now));
  const expiradas7d = subs.filter(s => s.status === "EXPIRED"  && (s.endDate as string) >= sevenDaysAgo && (s.endDate as string) <= now);
  const expirandoEm7d = subs.filter(s => s.status === "ACTIVE" && s.endDate && (s.endDate as string) >= now && (s.endDate as string) <= sevenDaysAhead);
  const novas30d    = subs.filter(s => (s.createdAt as string) >= thirtyDaysAgo);

  // Fetch user info for interesting subscriptions
  const relevantUserIds = [
    ...expiradas7d.map(s => s.userId as string),
    ...expirandoEm7d.map(s => s.userId as string),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 100);

  const userMap: Record<string, { name: string; email: string }> = {};
  if (relevantUserIds.length > 0) {
    const { data: users } = await db.from("User").select("id, name, email").in("id", relevantUserIds);
    for (const u of users ?? []) userMap[u.id as string] = { name: u.name as string, email: u.email as string };
  }

  // Revenue summary: MRR from active subs
  const mrr = ativas.reduce((sum, s) => {
    const plan = planMap[s.planId as string];
    return sum + ((plan as { price?: number } | undefined)?.price ?? 0);
  }, 0);

  // Plan distribution
  const byPlan: Record<string, number> = {};
  for (const s of ativas) {
    const pname = (planMap[s.planId as string] as { name?: string } | undefined)?.name ?? "—";
    byPlan[pname] = (byPlan[pname] ?? 0) + 1;
  }

  // Format interesting subs with user info
  function enrichSub(s: typeof subs[0]) {
    const plan = planMap[s.planId as string] as { name?: string; price?: number } | undefined;
    const u = userMap[s.userId as string];
    return {
      id: s.id,
      userId: s.userId,
      userName: u?.name ?? "—",
      userEmail: u?.email ?? "—",
      planName: plan?.name ?? "—",
      planPrice: plan?.price ?? 0,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
    };
  }

  return NextResponse.json({
    summary: {
      totalAtivas: ativas.length,
      totalExpiradas: subs.filter(s => s.status === "EXPIRED").length,
      novas30d: novas30d.length,
      mrr,
      byPlan,
    },
    expirandoEm7d: expirandoEm7d.map(enrichSub),
    expiradas7d: expiradas7d.map(enrichSub),
  });
}
