import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

/**
 * GET /api/relatorio/materias
 * Retorna desempenho por matéria do aluno (total respostas, acertos, % aproveitamento).
 * Ordenado por aproveitamento crescente (piores primeiro) para priorização de estudo.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  // Busca todo o progresso do aluno
  const { data: progress } = await db
    .from("Progress")
    .select("questionId, correct")
    .eq("userId", dbUser.id);

  if (!progress?.length) {
    return NextResponse.json({ materias: [] });
  }

  // Busca subjectId de cada questão respondida
  const qIds = [...new Set(progress.map(p => p.questionId))];
  const { data: questions } = await db
    .from("Question")
    .select("id, subjectId")
    .in("id", qIds);

  const qSubjectMap: Record<number, string> = {};
  for (const q of questions ?? []) {
    if (q.subjectId) qSubjectMap[q.id] = q.subjectId;
  }

  // Agrega por matéria
  const statsMap: Record<string, { total: number; correct: number }> = {};
  for (const p of progress) {
    const sid = qSubjectMap[p.questionId];
    if (!sid) continue;
    if (!statsMap[sid]) statsMap[sid] = { total: 0, correct: 0 };
    statsMap[sid].total++;
    if (p.correct) statsMap[sid].correct++;
  }

  // Busca nomes das matérias
  const subjectIds = Object.keys(statsMap);
  if (!subjectIds.length) return NextResponse.json({ materias: [] });

  const { data: subjects } = await db
    .from("Subject")
    .select("id, name, categoria")
    .in("id", subjectIds);

  const subjectMeta: Record<string, { name: string; categoria: string | null }> = {};
  for (const s of subjects ?? []) {
    subjectMeta[s.id] = { name: s.name, categoria: s.categoria };
  }

  // Monta resultado
  const materias = subjectIds.map(id => {
    const s = statsMap[id];
    const accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    return {
      id,
      name: subjectMeta[id]?.name ?? id,
      categoria: subjectMeta[id]?.categoria ?? null,
      total: s.total,
      correct: s.correct,
      accuracy,
    };
  });

  // Ordena por aproveitamento crescente (piores primeiro), depois por total desc
  materias.sort((a, b) => {
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    return b.total - a.total;
  });

  return NextResponse.json({ materias });
}
