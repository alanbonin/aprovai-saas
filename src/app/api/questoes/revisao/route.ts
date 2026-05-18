import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

/**
 * GET /api/questoes/revisao
 *
 * Retorna questões que o aluno errou para revisão.
 * Lógica: questões onde correct=false na última tentativa,
 * ordenadas pelas mais recentemente erradas.
 *
 * ?subjectId=xxx  — filtra por matéria
 * ?limit=20       — quantidade
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

  // Pega todas as respostas erradas mais recentes por questionId
  // (usando a última tentativa por questão)
  const { data: progress } = await db
    .from("Progress")
    .select("questionId, correct, createdAt")
    .eq("userId", dbUser.id)
    .eq("correct", false)
    .order("createdAt", { ascending: false });

  if (!progress || progress.length === 0) {
    return NextResponse.json({ questions: [], total: 0 });
  }

  // Deduplica: pega apenas a mais recente por questionId
  const seen = new Set<number>();
  const wrongIds: number[] = [];
  for (const p of progress) {
    if (!seen.has(p.questionId)) {
      seen.add(p.questionId);
      wrongIds.push(p.questionId);
    }
  }

  // Busca as questões
  let query = db.from("Question").select("*").in("id", wrongIds.slice(0, limit)).eq("aprovado", true);
  if (subjectId) query = query.eq("subjectId", subjectId);

  let queryResult = await query;
  // Fallback se coluna aprovado não existe ainda
  if (queryResult.error && (queryResult.error as { code?: string }).code === "42703") {
    let fallbackQ = db.from("Question").select("*").in("id", wrongIds.slice(0, limit));
    if (subjectId) fallbackQ = fallbackQ.eq("subjectId", subjectId);
    queryResult = await fallbackQ;
  }
  const questions = queryResult.data;

  // Reordena na mesma ordem dos erros (mais recente primeiro)
  const qMap = new Map((questions ?? []).map(q => [q.id, q]));
  const ordered = wrongIds
    .filter(id => qMap.has(id))
    .map(id => qMap.get(id)!)
    .slice(0, limit);

  return NextResponse.json({
    questions: ordered,
    total: wrongIds.length,
  });
}
