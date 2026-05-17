import { db } from "@/lib/db";
import { MateriasAdmin } from "./materias-client";
import { CATEGORIAS } from "@/lib/agents";

interface SubjectStats {
  totalQuestoes: number;
  totalRespostas: number;
  totalAcertos: number;
  accuracy: number;
  totalAlunos: number;
}

export default async function MateriasAdminPage() {
  const [{ data: subjects, count }, questoesPorMateria, progressData] = await Promise.all([
    db.from("Subject").select("*", { count: "exact" }).order("categoria").order("ordem"),
    db.from("Question").select("subjectId"),
    db.from("Progress").select("userId, questionId, correct, Question:questionId(subjectId)"),
  ]);

  // Mapa subjectId → nº questões
  const qMap: Record<string, number> = {};
  for (const q of questoesPorMateria.data ?? []) {
    if (q.subjectId) qMap[q.subjectId] = (qMap[q.subjectId] ?? 0) + 1;
  }

  // Calcula stats por matéria a partir do progresso
  const statsPorMateria: Record<string, { total: number; correct: number; alunos: Set<string> }> = {};
  for (const p of progressData.data ?? []) {
    const subjectId = Array.isArray(p.Question)
      ? (p.Question[0] as { subjectId: string } | null)?.subjectId
      : (p.Question as { subjectId: string } | null)?.subjectId;
    if (!subjectId) continue;
    if (!statsPorMateria[subjectId]) statsPorMateria[subjectId] = { total: 0, correct: 0, alunos: new Set() };
    statsPorMateria[subjectId].total++;
    if (p.correct) statsPorMateria[subjectId].correct++;
    statsPorMateria[subjectId].alunos.add(p.userId);
  }

  const statsMap: Record<string, SubjectStats> = {};
  for (const [id, s] of Object.entries(statsPorMateria)) {
    statsMap[id] = {
      totalQuestoes: qMap[id] ?? 0,
      totalRespostas: s.total,
      totalAcertos: s.correct,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      totalAlunos: s.alunos.size,
    };
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Matérias</h1>
        <p className="text-gray-500 text-sm mt-1">{count ?? 0} matérias cadastradas</p>
      </div>
      <MateriasAdmin subjects={subjects ?? []} categorias={CATEGORIAS} questoesPorMateria={qMap} statsMap={statsMap} />
    </div>
  );
}
