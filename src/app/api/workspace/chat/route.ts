import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, getWeeklyAiUsage, db } from "@/lib/db";
import { streamWithCache, MODELS } from "@/lib/anthropic";
import { chatLimiter } from "@/lib/rate-limit";
import { getWeekStart } from "@/lib/utils";
import { buildAgentSystemPrompt } from "@/lib/agents";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const dbUser = await getUserWithPlan(user.id);
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const weekStart = getWeekStart().toISOString();
  const weeklyLimit = dbUser.subscription?.plan?.aiCreditsPerWeek ?? 5;
  const totalUsed = await getWeeklyAiUsage(dbUser.id, weekStart);

      // Burst protection: 20 msgs/min
    const rl = await chatLimiter.check(dbUser.id);
    if (!rl.ok) return NextResponse.json({ error: "cota_excedida", message: rl.error }, { status: 429 });

    if (totalUsed >= weeklyLimit) {
    return NextResponse.json({
      error: "cota_excedida",
      message: `Você atingiu o limite de ${weeklyLimit} perguntas por semana do seu plano.`,
    }, { status: 429 });
  }

  const { message, agentIds, subjectId, history, profileContext } = await req.json();

  const { data: agents } = await db.from("Agent").select("*").in("id", agentIds);
  const { data: subject } = subjectId
    ? await db.from("Subject").select("name, description").eq("id", subjectId).single()
    : { data: null };

  const agentList = (agents ?? []) as { name: string; categoria: string | null; banca: string | null; systemPrompt: string; description: string }[];

  // Contexto do aluno (anexado ao system prompt de qualquer configuração)
  const alunoCtx = [
    profileContext?.cargo  ? `- Cargo alvo: ${profileContext.cargo}`  : "",
    profileContext?.orgao  ? `- Órgão: ${profileContext.orgao}`        : "",
    profileContext?.dataProva ? `- Data da prova: ${profileContext.dataProva}` : "",
  ].filter(Boolean).join("\n");

  const materiaCtx = subject
    ? `\nMATÉRIA EM ESTUDO: ${subject.name}${subject.description ? ` — ${subject.description}` : ""}`
    : "";

  let systemPrompt: string;

  if (agentList.length === 1) {
    // Agente único: usa o systemPrompt configurado direto — sem diluição
    const a = agentList[0];
    const base = a.systemPrompt || buildAgentSystemPrompt(a.categoria, a.banca);
    systemPrompt = `${base}

CONTEXTO DO ALUNO:
${alunoCtx}${materiaCtx}
${subject ? "Sempre relacione sua resposta a essa matéria quando pertinente." : ""}

Responda sempre em português brasileiro. Seja direto, prático e focado no que cai em prova.`;
  } else {
    // Múltiplos agentes: cada um mantém sua especialidade configurada
    const agentContexts = agentList.map(a => {
      const base = a.systemPrompt || buildAgentSystemPrompt(a.categoria, a.banca);
      return `--- ${a.name} ---\n${base}`;
    }).join("\n\n");

    systemPrompt = `Você representa uma equipe de mentores especializados. Cada mentor tem seu domínio próprio — responda SOMENTE dentro da especialidade de cada um, conforme configurado abaixo.

${agentContexts}

CONTEXTO DO ALUNO:
${alunoCtx}${materiaCtx}

REGRAS:
- Cada mentor responde apenas dentro da sua especialidade configurada acima
- Quando relevante, identifique qual mentor está falando (ex: "Como especialista em CESPE...")
- Não extrapole para áreas fora da especialidade de cada agente
- Sempre em português brasileiro. Direto ao ponto. Foque no que cai em prova.`;
  }

  // Registrar uso
  const mainAgentId = agentIds[0];
  const { data: existing } = await db.from("AiUsage").select("id, count").eq("userId", dbUser.id).eq("agentId", mainAgentId).eq("weekStart", weekStart).single();
  if (existing) {
    await db.from("AiUsage").update({ count: existing.count + 1, updatedAt: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await db.from("AiUsage").insert({ id: crypto.randomUUID(), userId: dbUser.id, agentId: mainAgentId, weekStart, count: 1, updatedAt: new Date().toISOString() });
  }

  // Anthropic exige que a primeira mensagem seja "user" — remove assistants iniciais
  const rawHistory = history.map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  const firstUserIdx = rawHistory.findIndex((m: { role: string }) => m.role === "user");
  const filteredHistory = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : [];

  const stream = streamWithCache({
    model: MODELS.sonnet,
    maxTokens: 2048,
    systemPrompt,
    messages: [
      ...filteredHistory,
      { role: "user", content: message },
    ],
    cacheSystem: true, // system prompt cacheado por 5 min → ~80% economia em tokens
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
