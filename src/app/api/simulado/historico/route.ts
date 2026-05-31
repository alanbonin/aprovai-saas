import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";

/**
 * GET /api/simulado/historico
 * Retorna o histórico de simulados do aluno com:
 * - Dados brutos de cada simulado (id, total, correct, timeSecs, subjectIds, createdAt)
 * - Nome das matérias por ID
 * - Métricas agregadas: totalSimulados, mediaAcerto, melhorAcerto, tempoMedio
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  let histQuery = db.from("SimuladoHistory").select("id, total, correct, timeSecs, subjectIds, createdAt")
    .eq("userId", dbUser.id).order("createdAt", { ascending: false }).limit(50);
  if (profileId) histQuery = histQuery.eq("profileId", profileId);
  const { data: history, error } = await histQuery;

  if (error) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  const rows = history ?? [];

  // Collect all unique subjectIds across all simulados
  const allSubjectIds = [...new Set(rows.flatMap(r => (r.subjectIds as string[]) ?? []))];

  // Fetch subject names
  const subjectMap: Record<string, string> = {};
  if (allSubjectIds.length > 0) {
    const { data: subjects } = await db
      .from("Subject")
      .select("id, name")
      .in("id", allSubjectIds);
    for (const s of subjects ?? []) {
      subjectMap[s.id] = s.name;
    }
  }

  // Enrich each simulado
  const simulados = rows.map(r => {
    const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0;
    const mins = Math.floor((r.timeSecs ?? 0) / 60);
    const secs = (r.timeSecs ?? 0) % 60;
    return {
      id: r.id,
      total: r.total,
      correct: r.correct,
      accuracy: pct,
      timeSecs: r.timeSecs ?? 0,
      timeLabel: `${mins}m ${String(secs).padStart(2, "0")}s`,
      subjectIds: (r.subjectIds as string[]) ?? [],
      subjectNames: ((r.subjectIds as string[]) ?? []).map(id => subjectMap[id] ?? id),
      createdAt: r.createdAt,
    };
  });

  // Aggregate metrics
  const totalSimulados = simulados.length;
  const mediaAcerto = totalSimulados > 0
    ? Math.round(simulados.reduce((s, r) => s + r.accuracy, 0) / totalSimulados)
    : 0;
  const melhorAcerto = totalSimulados > 0
    ? Math.max(...simulados.map(r => r.accuracy))
    : 0;
  const tempoMedio = totalSimulados > 0
    ? Math.round(simulados.reduce((s, r) => s + r.timeSecs, 0) / totalSimulados)
    : 0;

  // Evolution: last 10 simulados in chronological order for trend
  const evolucao = simulados.slice(0, 10).reverse().map(r => ({
    accuracy: r.accuracy,
    date: r.createdAt,
  }));

  return NextResponse.json({
    simulados,
    meta: { totalSimulados, mediaAcerto, melhorAcerto, tempoMedio },
    evolucao,
  });
}
