import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, getWeeklyAiUsage } from "@/lib/db";
import { db } from "@/lib/db";
import { getWeekStart } from "@/lib/utils";
import { buildAgentSystemPrompt } from "@/lib/agents";
import { streamWithCache, MODELS } from "@/lib/anthropic";
import { buildStudentContext } from "@/lib/student-context";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const { message, agentId, history = [] } = await req.json();
  if (!message || !agentId) return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });

  const { data: agent } = await db.from("Agent").select("*").eq("id", agentId).single();
  if (!agent?.active) return NextResponse.json({ error: "Mentor não encontrado" }, { status: 404 });

  const weekStart = getWeekStart().toISOString();
  const weeklyLimit = dbUser.subscription?.plan?.aiCreditsPerWeek ?? 5;
  const totalUsed = await getWeeklyAiUsage(dbUser.id, weekStart);

  if (totalUsed >= weeklyLimit) {
    return NextResponse.json({
      error: "cota_excedida",
      message: `Você atingiu o limite de ${weeklyLimit} perguntas por semana do seu plano. Faça upgrade para continuar.`,
    }, { status: 429 });
  }

  // Incrementa uso
  const { data: existing } = await db
    .from("AiUsage").select("id, count")
    .eq("userId", dbUser.id).eq("agentId", agentId).eq("weekStart", weekStart).single();
  if (existing) {
    await db.from("AiUsage").update({ count: existing.count + 1, updatedAt: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await db.from("AiUsage").insert({ id: crypto.randomUUID(), userId: dbUser.id, agentId, weekStart, count: 1, updatedAt: new Date().toISOString() });
  }

  // ── Contexto completo do aluno (perfil + desempenho + memória) ─────────────
  const studentCtx = await buildStudentContext(dbUser.id, agentId);

  const basePrompt = agent.systemPrompt || buildAgentSystemPrompt(agent.categoria);

  const systemPrompt = `${basePrompt}

${studentCtx}

REGRA ABSOLUTA: NUNCA crie questões, exercícios ou testes no chat. Redirecione usando marcadores:
[[IR:questoes]] → resolver questões | [[IR:flashcards]] → revisão/flashcards | [[IR:simulado]] → simulado completo
[[IR:redacao]] → treinar redação | [[IR:relatorio]] → ver desempenho | [[IR:plano]] → plano de estudos
[[IR:edital]] → analisar edital | [[IR:desafio]] → desafio diário
O app converte [[IR:X]] em botão clicável — use sempre que sugerir uma atividade.`;

  const stream = streamWithCache({
    model: MODELS.sonnet,
    maxTokens: 1024,
    systemPrompt,
    messages: [
      ...history.map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: message },
    ],
    cacheSystem: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
