import { db } from "@/lib/db";
import { ModeracaoClient } from "./moderacao-client";

interface PendingQuestion {
  id: number;
  statement: string;
  banca: string | null;
  year: number | null;
  source: string | null;
  createdAt: string;
  subjectId: string | null;
}

async function fetchPendingQuestions(): Promise<{ questions: PendingQuestion[]; subjectMap: Record<string, string> }> {
  try {
    const { data, error } = await db
      .from("Question")
      .select("id, statement, banca, year, source, createdAt, subjectId")
      .eq("aprovado", false)
      .order("createdAt", { ascending: false })
      .limit(100);

    // PostgREST returns code "42703" if column doesn't exist yet
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "42703") return { questions: [], subjectMap: {} };
      throw error;
    }

    const questions = (data ?? []) as PendingQuestion[];

    // Fetch subject names
    const subjectIds = [...new Set(questions.map(q => q.subjectId).filter(Boolean) as string[])];
    const subjectMap: Record<string, string> = {};
    if (subjectIds.length > 0) {
      const { data: subjects } = await db.from("Subject").select("id, name").in("id", subjectIds);
      for (const s of subjects ?? []) subjectMap[s.id as string] = s.name as string;
    }

    return { questions, subjectMap };
  } catch {
    return { questions: [], subjectMap: {} };
  }
}

export default async function ModeracaoPage() {
  const { questions, subjectMap } = await fetchPendingQuestions();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Moderação de Questões</h1>
        <p className="text-gray-400 text-sm mt-1">
          {questions.length} questão{questions.length !== 1 ? "ões" : ""} aguardando aprovação
        </p>
      </div>
      <ModeracaoClient questions={questions} subjectMap={subjectMap} />
    </div>
  );
}
