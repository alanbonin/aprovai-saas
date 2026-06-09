import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, db } from "@/lib/db";
import { z } from "zod";
import { verificarLimiter } from "@/lib/rate-limit";

/**
 * POST /api/questoes/verificar
 * Recebe a resposta do aluno e retorna se está correta + gabarito + explicação.
 * Gabarito NUNCA é enviado antes desta chamada — evita exposição via F12/Network.
 * Rate-limited: 60/min por usuário para impedir brute-force do banco de gabaritos.
 */
const VerificarSchema = z.object({
  questionId: z.number().int().positive(),
  resposta: z.enum(["A", "B", "C", "D", "E"]),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // ── Rate limit por userId (não IP — já autenticado) ──────────────────────────
  const rl = await verificarLimiter.check(user.id);
  if (!rl.ok) {
    return NextResponse.json({ error: rl.error }, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    });
  }

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = VerificarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { questionId, resposta } = parsed.data;

  // Busca gabarito e explicação do banco
  const { data: question } = await db
    .from("Question")
    .select("id, answer, explanation")
    .eq("id", questionId)
    .maybeSingle();

  if (!question) {
    return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 });
  }

  const correto = resposta === question.answer;

  return NextResponse.json({
    correto,
    gabarito: question.answer,
    explicacao: question.explanation ?? null,
  });
}
