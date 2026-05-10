import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { getWeekStart } from "@/lib/utils";
import { buildAgentSystemPrompt } from "@/lib/agents";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { subscription: { include: { plan: true } } },
  });
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const { message, agentId, history = [] } = await req.json();
  if (!message || !agentId) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  // Verifica agente
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent || !agent.active) {
    return NextResponse.json({ error: "Mentor não encontrado" }, { status: 404 });
  }

  // Verifica cota semanal
  const weekStart = getWeekStart();
  const weeklyLimit = dbUser.subscription?.plan.aiCreditsPerWeek ?? 5;

  const usage = await prisma.aiUsage.upsert({
    where: { userId_agentId_weekStart: { userId: dbUser.id, agentId, weekStart } },
    create: { userId: dbUser.id, agentId, weekStart, count: 0 },
    update: {},
  });

  // Soma total da semana (todos os agentes)
  const totalWeek = await prisma.aiUsage.aggregate({
    where: { userId: dbUser.id, weekStart },
    _sum: { count: true },
  });

  if ((totalWeek._sum.count ?? 0) >= weeklyLimit) {
    return NextResponse.json({
      error: "cota_excedida",
      message: `Você atingiu o limite de ${weeklyLimit} perguntas por semana do seu plano. Faça upgrade para continuar.`,
    }, { status: 429 });
  }

  // Monta system prompt
  const systemPrompt = agent.systemPrompt || buildAgentSystemPrompt(agent.area ?? undefined, agent.banca ?? undefined);

  // Chama Claude com streaming
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ],
  });

  // Incrementa uso
  await prisma.aiUsage.update({
    where: { id: usage.id },
    data: { count: { increment: 1 } },
  });

  // Retorna stream
  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
