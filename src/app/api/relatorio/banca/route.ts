import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { getActiveProfile } from "@/lib/get-active-profile";

/**
 * GET /api/relatorio/banca
 * Retorna desempenho do aluno agrupado por banca examinadora.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const activeProfile = await getActiveProfile(dbUser.id);
  const profileId = activeProfile?.id ?? null;

  // Progresso isolado por perfil ativo
  let progressQuery = db.from("Progress").select("correct, questionId").eq("userId", dbUser.id);
  if (profileId) progressQuery = progressQuery.eq("profileId", profileId);
  const { data: progress } = await progressQuery;

  if (!progress || progress.length === 0) {
    return NextResponse.json({ bancas: [] });
  }

  const questionIds = [...new Set(progress.map(p => p.questionId))];

  // Busca bancas das questões em lotes (Supabase permite .in() com até ~5000 ids)
  const { data: questions } = await db
    .from("Question")
    .select("id, banca")
    .in("id", questionIds);

  const bancaMap: Record<number, string | null> = {};
  for (const q of questions ?? []) {
    bancaMap[q.id] = q.banca;
  }

  // Agrupa por banca
  const stats: Record<string, { correct: number; total: number }> = {};
  for (const p of progress) {
    const banca = bancaMap[p.questionId] ?? "Sem banca";
    if (!stats[banca]) stats[banca] = { correct: 0, total: 0 };
    stats[banca].total++;
    if (p.correct) stats[banca].correct++;
  }

  const bancas = Object.entries(stats)
    .map(([banca, s]) => ({
      banca,
      total: s.total,
      correct: s.correct,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({ bancas });
}
