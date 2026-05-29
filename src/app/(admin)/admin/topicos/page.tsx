import { db } from "@/lib/db";
import { TopicosAdmin } from "./topicos-client";

export const dynamic = "force-dynamic";

export default async function TopicosAdminPage() {
  const [{ data: subjects }, { data: topics, count }, { data: questoesCounts }] = await Promise.all([
    db.from("Subject").select("id, name, slug, categoria").order("categoria").order("name"),
    db.from("Topic").select("*", { count: "exact" }).order("subjectId").order("ordem").range(0, 9999),
    db.rpc("get_question_counts_by_topic"),
  ]);

  const qPorTopico: Record<string, number> = {};
  for (const row of (questoesCounts ?? []) as { topic_id: string; question_count: number }[]) {
    if (row.topic_id) qPorTopico[row.topic_id] = Number(row.question_count);
  }

  // Soma questões por matéria a partir dos tópicos vinculados
  const qPorMateria: Record<string, number> = {};
  for (const topic of (topics ?? [])) {
    const q = qPorTopico[topic.id] ?? 0;
    qPorMateria[topic.subjectId] = (qPorMateria[topic.subjectId] ?? 0) + q;
  }

  const totalQuestoes = Object.values(qPorMateria).reduce((a, b) => a + b, 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tópicos / Assuntos</h1>
        <p className="text-gray-500 text-sm mt-1">
          {count ?? 0} tópicos cadastrados em {subjects?.length ?? 0} matérias · {totalQuestoes.toLocaleString("pt-BR")} questões no total
        </p>
      </div>
      <TopicosAdmin
        subjects={subjects ?? []}
        topics={topics ?? []}
        questoesPorTopico={qPorTopico}
        questoesPorMateria={qPorMateria}
      />
    </div>
  );
}
