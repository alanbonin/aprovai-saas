import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, getWeeklyAiUsage, db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { getWeekStart } from "@/lib/utils";
import { buildAgentSystemPrompt } from "@/lib/agents";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  const { data: existing } = await db.from("AiUsage").select("id, count").eq("userId", dbUser.id).eq("agentId", agentId).eq("weekStart", weekStart).single();
  if (existing) {
    await db.from("AiUsage").update({ count: existing.count + 1, updatedAt: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await db.from("AiUsage").insert({ userId: dbUser.id, agentId, weekStart, count: 1, updatedAt: new Date().toISOString() });
  }

  const systemPrompt = agent.systemPrompt || buildAgentSystemPrompt(agent.categoria, agent.banca);

  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...history.map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: message },
    ],
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
