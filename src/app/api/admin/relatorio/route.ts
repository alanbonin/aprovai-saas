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

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * GET /api/admin/relatorio
 * Gera relatório geral da plataforma ou por aluno.
 *
 * ?format=json (default) — dados estruturados
 * ?format=csv — exportação CSV de alunos com métricas
 * ?period=30d|7d|all — período de referência
 */
export async function GET(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "json";
  const period = searchParams.get("period") ?? "30d";

  const now = new Date();
  let cutoff: string | null = null;
  if (period === "7d")  cutoff = new Date(now.getTime() - 7 * 86400000).toISOString();
  if (period === "30d") cutoff = new Date(now.getTime() - 30 * 86400000).toISOString();

  // All users
  const { data: users } = await db
    .from("User")
    .select("id, name, email, createdAt")
    .eq("role", "STUDENT")
    .order("createdAt", { ascending: false });

  if (!users || users.length === 0) {
    if (format === "csv") return new Response("id,name,email,questoes,acerto,streak\n", { headers: { "Content-Type": "text/csv" } });
    return NextResponse.json({ users: [], kpis: { totalUsers: 0, activeUsers: 0, totalAnswered: 0, avgAccuracy: 0 } });
  }

  const userIds = users.map(u => u.id as string);

  // Fetch profiles (cargo, dataProva)
  const { data: profiles } = await db
    .from("StudentProfile")
    .select("userId, cargo, dataProva")
    .in("userId", userIds);
  const profileMap: Record<string, { cargo: string | null; dataProva: string | null }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.userId as string] = { cargo: p.cargo as string | null, dataProva: p.dataProva as string | null };
  }

  // Fetch progress aggregated per user
  let progressQuery = db.from("Progress").select("userId, correct", { count: "exact" }).in("userId", userIds);
  if (cutoff) progressQuery = progressQuery.gte("createdAt", cutoff);
  const { data: progressAll } = await progressQuery;

  const progressMap: Record<string, { total: number; correct: number }> = {};
  for (const p of progressAll ?? []) {
    const uid = p.userId as string;
    if (!progressMap[uid]) progressMap[uid] = { total: 0, correct: 0 };
    progressMap[uid].total++;
    if (p.correct as boolean) progressMap[uid].correct++;
  }

  // Fetch active subscriptions
  const { data: subs } = await db
    .from("Subscription")
    .select("userId, status, planId, Plan:planId(name, price)")
    .eq("status", "ACTIVE")
    .in("userId", userIds);
  const subsMap: Record<string, { planName: string | null }> = {};
  for (const s of subs ?? []) {
    const plan = Array.isArray(s.Plan) ? (s.Plan[0] as { name: string } | null) : (s.Plan as { name: string } | null);
    subsMap[s.userId as string] = { planName: plan?.name ?? null };
  }

  // Build enriched user list
  const enriched = users.map(u => {
    const uid = u.id as string;
    const prog = progressMap[uid] ?? { total: 0, correct: 0 };
    const accuracy = prog.total > 0 ? Math.round((prog.correct / prog.total) * 100) : 0;
    return {
      id: uid,
      name: u.name as string,
      email: u.email as string,
      createdAt: u.createdAt as string,
      questoes: prog.total,
      acerto: accuracy,
      cargo: profileMap[uid]?.cargo ?? null,
      dataProva: profileMap[uid]?.dataProva ?? null,
      planName: subsMap[uid]?.planName ?? "Gratuito",
    };
  });

  if (format === "csv") {
    const rows = [
      ["ID", "Nome", "Email", "Plano", "Questões", "Acerto (%)", "Cargo", "Data da Prova", "Cadastro"],
      ...enriched.map(u => [
        u.id, u.name, u.email, u.planName,
        u.questoes, u.acerto,
        u.cargo ?? "",
        u.dataProva ?? "",
        (u.createdAt as string)?.slice(0, 10) ?? "",
      ].map(escapeCsv)),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="aprovai-alunos-${period}-${now.toISOString().slice(0,10)}.csv"`,
      },
    });
  }

  // JSON: platform KPIs
  const totalAnswered = enriched.reduce((s, u) => s + u.questoes, 0);
  const activeUsers = enriched.filter(u => u.questoes > 0).length;
  const avgAccuracy = activeUsers > 0
    ? Math.round(enriched.filter(u => u.questoes > 0).reduce((s, u) => s + u.acerto, 0) / activeUsers)
    : 0;
  const premiumUsers = Object.keys(subsMap).length;

  return NextResponse.json({
    users: enriched.slice(0, 200),
    kpis: {
      totalUsers: users.length,
      activeUsers,
      totalAnswered,
      avgAccuracy,
      premiumUsers,
      period,
    },
  });
}
