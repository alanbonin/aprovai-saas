import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

/**
 * GET /api/workspace/bancas
 * Estatísticas de desempenho do aluno agrupadas por banca.
 *
 * Retorna:
 * - bancas: lista com { banca, total, correct, accuracy, subjects[] }
 * - totalBancas: número de bancas distintas praticadas
 * - melhorBanca: banca com maior taxa de acerto (mínimo 5 questões)
 * - piorBanca: banca com menor taxa de acerto (mínimo 5 questões)
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Fetch all progress with joined question data
  const { data: progressData } = await db
    .from("Progress")
    .select("correct, questionId")
    .eq("userId", dbUser.id);

  const progress = progressData ?? [];
  if (progress.length === 0) {
    return NextResponse.json({ bancas: [], totalBancas: 0, melhorBanca: null, piorBanca: null });
  }

  // Get unique question IDs
  const questionIds = [...new Set(progress.map(p => p.questionId as number))];

  // Fetch question banca + subject in chunks
  const questionMap: Record<number, { banca: string | null; subjectId: string | null }> = {};
  for (let i = 0; i < questionIds.length; i += 200) {
    const chunk = questionIds.slice(i, i + 200);
    let result = await db.from("Question").select("id, banca, subjectId").in("id", chunk).eq("aprovado", true);
    if (result.error && (result.error as { code?: string }).code === "42703") {
      result = await db.from("Question").select("id, banca, subjectId").in("id", chunk);
    }
    for (const q of result.data ?? []) {
      questionMap[q.id as number] = { banca: q.banca as string | null, subjectId: q.subjectId as string | null };
    }
  }

  // Aggregate by banca
  const bancaStats: Record<string, { total: number; correct: number; subjects: Set<string> }> = {};

  for (const p of progress) {
    const qInfo = questionMap[p.questionId as number];
    if (!qInfo) continue;
    const banca = qInfo.banca ?? "Sem banca";
    if (!bancaStats[banca]) bancaStats[banca] = { total: 0, correct: 0, subjects: new Set() };
    bancaStats[banca].total++;
    if (p.correct as boolean) bancaStats[banca].correct++;
    if (qInfo.subjectId) bancaStats[banca].subjects.add(qInfo.subjectId);
  }

  // Fetch subject names for subject IDs
  const allSubjectIds = [...new Set(
    Object.values(bancaStats).flatMap(b => [...b.subjects])
  )];
  const subjectMap: Record<string, string> = {};
  if (allSubjectIds.length > 0) {
    const { data: subjects } = await db.from("Subject").select("id, name").in("id", allSubjectIds);
    for (const s of subjects ?? []) subjectMap[s.id as string] = s.name as string;
  }

  // Build sorted list
  const bancas = Object.entries(bancaStats)
    .map(([banca, s]) => ({
      banca,
      total: s.total,
      correct: s.correct,
      accuracy: Math.round((s.correct / s.total) * 100),
      subjectCount: s.subjects.size,
      subjects: [...s.subjects].slice(0, 3).map(id => subjectMap[id] ?? id),
    }))
    .sort((a, b) => b.total - a.total);

  // Best/worst (min 5 questions)
  const qualified = bancas.filter(b => b.total >= 5);
  const melhorBanca = qualified.length > 0
    ? qualified.reduce((best, b) => b.accuracy > best.accuracy ? b : best, qualified[0])
    : null;
  const piorBanca = qualified.length > 0
    ? qualified.reduce((worst, b) => b.accuracy < worst.accuracy ? b : worst, qualified[0])
    : null;

  return NextResponse.json({
    bancas,
    totalBancas: bancas.length,
    melhorBanca: melhorBanca ? { banca: melhorBanca.banca, accuracy: melhorBanca.accuracy } : null,
    piorBanca: piorBanca ? { banca: piorBanca.banca, accuracy: piorBanca.accuracy } : null,
  });
}
