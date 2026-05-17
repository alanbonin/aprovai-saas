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
 * GET /api/admin/materias/stats
 * Retorna para cada matéria:
 *  - totalQuestoes
 *  - totalRespostas (progresso de todos os alunos)
 *  - totalAcertos
 *  - accuracyGeral (%)
 *  - totalAlunos (alunos distintos que responderam)
 */
export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Contagem de questões por matéria
  const { data: questoes } = await db
    .from("Question")
    .select("subjectId");

  const questoesPorMateria: Record<string, number> = {};
  for (const q of questoes ?? []) {
    if (q.subjectId) questoesPorMateria[q.subjectId] = (questoesPorMateria[q.subjectId] ?? 0) + 1;
  }

  // Progresso dos alunos por matéria
  const { data: progresso } = await db
    .from("Progress")
    .select("userId, questionId, correct, Question:questionId(subjectId)");

  const statsPorMateria: Record<string, { total: number; correct: number; alunos: Set<string> }> = {};

  for (const p of progresso ?? []) {
    const subjectId = Array.isArray(p.Question)
      ? (p.Question[0] as { subjectId: string } | null)?.subjectId
      : (p.Question as { subjectId: string } | null)?.subjectId;

    if (!subjectId) continue;
    if (!statsPorMateria[subjectId]) {
      statsPorMateria[subjectId] = { total: 0, correct: 0, alunos: new Set() };
    }
    statsPorMateria[subjectId].total++;
    if (p.correct) statsPorMateria[subjectId].correct++;
    statsPorMateria[subjectId].alunos.add(p.userId);
  }

  // Monta resultado
  const stats: Record<string, {
    totalQuestoes: number;
    totalRespostas: number;
    totalAcertos: number;
    accuracy: number;
    totalAlunos: number;
  }> = {};

  const allSubjectIds = new Set([
    ...Object.keys(questoesPorMateria),
    ...Object.keys(statsPorMateria),
  ]);

  for (const id of allSubjectIds) {
    const s = statsPorMateria[id];
    const totalRespostas = s?.total ?? 0;
    const totalAcertos   = s?.correct ?? 0;
    stats[id] = {
      totalQuestoes: questoesPorMateria[id] ?? 0,
      totalRespostas,
      totalAcertos,
      accuracy: totalRespostas > 0 ? Math.round((totalAcertos / totalRespostas) * 100) : 0,
      totalAlunos: s?.alunos.size ?? 0,
    };
  }

  return NextResponse.json(stats);
}
