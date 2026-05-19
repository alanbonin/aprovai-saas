import { db } from "@/lib/db";
import { ModeracaoClient } from "./moderacao-client";

export interface PendingQuestion {
  id: number;
  statement: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  optionE: string | null;
  answer: string | null;
  explanation: string | null;
  analysis: string | null; // JSON: { banca: string|null, questao: string|null }
  banca: string | null;
  year: number | null;
  level: string | null;
  source: string | null;
  createdAt: string;
  subjectId: string | null;
}

async function fetchPendingQuestions(): Promise<{
  questions: PendingQuestion[];
  subjectMap: Record<string, string>;
}> {
  try {
    const { data, error } = await db
      .from("Question")
      .select("id, statement, optionA, optionB, optionC, optionD, optionE, answer, explanation, analysis, banca, year, level, source, createdAt, subjectId")
      .eq("aprovado", false)
      .order("createdAt", { ascending: false })
      .limit(200);

    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "42703") return { questions: [], subjectMap: {} };
      throw error;
    }

    const questions = (data ?? []) as PendingQuestion[];

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
    <div className="p-6 max-w-6xl mx-auto">
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
