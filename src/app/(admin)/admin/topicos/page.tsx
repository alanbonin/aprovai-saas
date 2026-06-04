import { db } from "@/lib/db";
import { TopicosAdmin } from "./topicos-client";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TopicRow = any;

// Busca todos os tópicos paginando (Supabase limita 1000 linhas por query)
async function fetchAllTopics() {
  const PAGE = 1000;
  let all: TopicRow[] = [];
  let from = 0;
  let totalCount = 0;
  while (true) {
    const { data, count, error } = await db
      .from("Topic")
      .select("*", { count: "exact" })
      .order("subjectId")
      .order("ordem")
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    if (from === 0) totalCount = count ?? 0;
    all = all.concat(data as TopicRow[]);
    if (all.length >= totalCount || data.length < PAGE) break;
    from += PAGE;
  }
  return { data: all, count: totalCount };
}

// Busca contagem de questões por tópico via RPC
async function fetchQuestionCounts(): Promise<Record<string, number>> {
  const { data, error } = await db.rpc("get_question_counts_by_topic");
  if (error) console.error("fetchQuestionCounts error:", error.message);
  const result: Record<string, number> = {};
  for (const row of (data ?? []) as { topic_id: string; question_count: number }[]) {
    if (row.topic_id) result[row.topic_id] = Number(row.question_count);
  }
  return result;
}

export default async function TopicosAdminPage() {
  const [{ data: subjects }, { data: topics, count }] = await Promise.all([
    db.from("Subject").select("id, name, slug, categoria").order("categoria").order("name"),
    fetchAllTopics(),
  ]);
  const qPorTopico = await fetchQuestionCounts();

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
