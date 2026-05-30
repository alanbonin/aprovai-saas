import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { z } from "zod";
import { reportarLimiter } from "@/lib/rate-limit";

const ReportarSchema = z.object({
  questionId: z.number().int(),
  motivo: z.string().max(500).optional(),
});

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

  // Rate limit: 10 reportes/hora por usuário
  const rl = await reportarLimiter.check(`reportar:${dbUser.id}`);
  if (!rl.ok) return NextResponse.json({ error: rl.error }, { status: 429 });

  const rawBody = await req.json();
  const parseResult = ReportarSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parseResult.error.flatten() }, { status: 400 });
  }
  const { questionId } = parseResult.data;
  const { motivo, descricao } = rawBody as ReportePayload;
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
    .maybeSingle();
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
    .maybeSingle();

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
