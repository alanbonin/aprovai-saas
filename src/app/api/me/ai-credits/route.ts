import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, getWeeklyAiUsage, db } from "@/lib/db";

function getWeekStartMonday(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Dom
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

/**
 * GET /api/me/ai-credits
 * Retorna créditos de IA restantes e uso da semana para o aluno logado.
 * Usado pela sidebar e pelo layout para exibir indicador de uso.
 *
 * Response: { used: number; total: number; remaining: number; weekStart: string; atLimit: boolean }
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const weekStart = getWeekStartMonday();
  const used = await getWeeklyAiUsage(dbUser.id, weekStart);

  // Limite do plano ativo
  let total = 5; // padrão free
  if (dbUser.subscription?.plan) {
    const plan = dbUser.subscription.plan as { aiCreditsPerWeek?: number };
    total = plan.aiCreditsPerWeek ?? 5;
  }

  // Busca detalhes dos agentes usados esta semana (para exibir breakdown)
  const { data: usageRows } = await db
    .from("AiUsage")
    .select("agentId, count")
    .eq("userId", dbUser.id)
    .eq("weekStart", weekStart);

  // Agrupa por agente
  const byAgent: Record<string, number> = {};
  for (const r of usageRows ?? []) {
    const aid = r.agentId as string;
    byAgent[aid] = (byAgent[aid] ?? 0) + (r.count as number);
  }

  // Nomes dos agentes
  const agentIds = Object.keys(byAgent);
  const agentNames: Record<string, string> = {};
  if (agentIds.length > 0) {
    const { data: agents } = await db.from("Agent").select("id, name").in("id", agentIds);
    for (const a of agents ?? []) agentNames[a.id] = a.name as string;
  }

  const breakdown = agentIds.map(id => ({
    agentId: id,
    name: agentNames[id] ?? id,
    count: byAgent[id],
  })).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    used,
    total,
    remaining: Math.max(0, total - used),
    weekStart,
    atLimit: used >= total,
    breakdown,
  });
}
