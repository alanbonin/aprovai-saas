import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";

const PREFIX = "__REPORTE_QUESTAO__";

export type ReporteMotivo =
  | "gabarito_errado"
  | "enunciado_desatualizado"
  | "alternativas_incorretas"
  | "questao_duplicada"
  | "outro";

interface ReportePayload {
  questionId: number;
  motivo: ReporteMotivo;
  descricao?: string;
}

/**
 * POST /api/questoes/reportar
 * Aluno reporta uma questão com problema.
 * Armazenado na tabela Note com prefix __REPORTE_QUESTAO__ no userId do admin "system".
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { questionId, motivo, descricao } = await req.json() as ReportePayload;
  if (!questionId || !motivo) {
    return NextResponse.json({ error: "questionId e motivo são obrigatórios" }, { status: 400 });
  }

  const MOTIVOS_VALIDOS: ReporteMotivo[] = [
    "gabarito_errado", "enunciado_desatualizado",
    "alternativas_incorretas", "questao_duplicada", "outro",
  ];
  if (!MOTIVOS_VALIDOS.includes(motivo)) {
    return NextResponse.json({ error: "Motivo inválido" }, { status: 400 });
  }

  // Verifica se a questão existe
  const { data: questao } = await db
    .from("Question")
    .select("id, statement")
    .eq("id", questionId)
    .single();
  if (!questao) return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 });

  const reporte = {
    questionId,
    motivo,
    descricao: descricao?.trim().slice(0, 500) || null,
    userId: dbUser.id,
    userName: dbUser.name,
    userEmail: dbUser.email,
    status: "pendente" as const,
    createdAt: new Date().toISOString(),
  };

  // Salva como nota com chave composta (evita duplicatas do mesmo usuário para a mesma questão)
  const subjectId = `${PREFIX}${questionId}:${dbUser.id}`;

  const { data: existing } = await db
    .from("Note")
    .select("id")
    .eq("subjectId", subjectId)
    .single();

  if (existing) {
    await db.from("Note").update({ content: JSON.stringify(reporte) }).eq("id", existing.id);
  } else {
    await db.from("Note").insert({
      userId: dbUser.id,
      subjectId,
      content: JSON.stringify(reporte),
    });
  }

  return NextResponse.json({ ok: true });
}
