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

  const weekStart = getWeekStart().toISOString();
  const weeklyLimit = dbUser.subscription?.plan?.aiCreditsPerWeek ?? 5;
  const totalUsed = await getWeeklyAiUsage(dbUser.id, weekStart);

  if (totalUsed >= weeklyLimit) {
    return NextResponse.json({
      error: "cota_excedida",
      message: `Você atingiu o limite de ${weeklyLimit} perguntas por semana do seu plano.`,
    }, { status: 429 });
  }

  const { message, agentIds, subjectId, history, profileContext } = await req.json();

  // Buscar agentes e contexto
  const { data: agents } = await db.from("Agent").select("*").in("id", agentIds);
  const { data: subject } = subjectId
    ? await db.from("Subject").select("name, description").eq("id", subjectId).single()
    : { data: null };

  // Montar system prompt combinando os agentes
  const agentContexts = (agents ?? []).map((a: { name: string; categoria: string | null; banca: string | null; systemPrompt: string }) => {
    const base = a.systemPrompt || buildAgentSystemPrompt(a.categoria, a.banca);
    return `=== ${a.name} ===\n${base}`;
  }).join("\n\n");

  const systemPrompt = `Você é uma equipe de mentores especializados trabalhando juntos para ajudar o aluno.

${agentContexts}

CONTEXTO DO ALUNO:
${profileContext?.cargo ? `- Cargo alvo: ${profileContext.cargo}` : ""}
${profileContext?.orgao ? `- Órgão: ${profileContext.orgao}` : ""}
${profileContext?.dataProva ? `- Data da prova: ${profileContext.dataProva}` : ""}
${subject ? `\nMATÉRIA ATUAL: ${subject.name}${subject.description ? ` — ${subject.description}` : ""}` : ""}

Responda como uma equipe coesa, referenciando sua especialidade quando relevante. Seja direto, prático e foque no que cai em prova. Sempre em português brasileiro.`;

  // Registrar uso
  const mainAgentId = agentIds[0];
  const { data: existing } = await db.from("AiUsage").select("id, count").eq("userId", dbUser.id).eq("agentId", mainAgentId).eq("weekStart", weekStart).single();
  if (existing) {
    await db.from("AiUsage").update({ count: existing.count + 1, updatedAt: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await db.from("AiUsage").insert({ userId: dbUser.id, agentId: mainAgentId, weekStart, count: 1, updatedAt: new Date().toISOString() });
  }

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
