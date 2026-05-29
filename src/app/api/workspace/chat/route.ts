import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserWithPlan, getWeeklyAiUsage, db } from "@/lib/db";
import { streamWithCache, MODELS } from "@/lib/anthropic";
import { chatLimiter } from "@/lib/rate-limit";
import { getWeekStart } from "@/lib/utils";
import { buildAgentSystemPrompt } from "@/lib/agents";
import { buildStudentContext } from "@/lib/student-context";

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

  const { message, agentIds, subjectId, history } = await req.json();

  const { data: agents } = await db.from("Agent").select("*").in("id", agentIds);
  const { data: subject } = subjectId
    ? await db.from("Subject").select("name, description").eq("id", subjectId).single()
    : { data: null };

  const agentList = (agents ?? []) as { name: string; categoria: string | null; banca: string | null; systemPrompt: string; description: string }[];

  // Contexto completo do aluno — buscado no servidor, não depende do cliente
  const studentCtx = await buildStudentContext(dbUser.id, agentIds[0]);

  const materiaCtx = subject
    ? `\nMATÉRIA EM ESTUDO: ${subject.name}${subject.description ? ` — ${subject.description}` : ""}`
    : "";

  let systemPrompt: string;

  if (agentList.length === 1) {
    const a = agentList[0];
    const base = a.systemPrompt || buildAgentSystemPrompt(a.categoria);
    systemPrompt = `${base}

${studentCtx}
${materiaCtx ? `\nMATÉRIA EM FOCO: ${materiaCtx.trim()}${subject ? "\nSempre relacione sua resposta a essa matéria quando pertinente." : ""}` : ""}

REGRA ABSOLUTA: NUNCA crie questões, exercícios ou testes no chat. Use os marcadores [[IR:X]] para direcionar o aluno às seções do app:
[[IR:questoes]] → resolver questões | [[IR:flashcards]] → revisão espaçada | [[IR:simulado]] → simulado completo
[[IR:redacao]] → treinar redação | [[IR:relatorio]] → ver desempenho | [[IR:plano]] → plano de estudos
[[IR:edital]] → analisar edital | [[IR:desafio]] → desafio diário`;
  } else {
    const agentContexts = agentList.map(a => {
      const base = a.systemPrompt || buildAgentSystemPrompt(a.categoria);
      return `--- ${a.name} ---\n${base}`;
    }).join("\n\n");

    systemPrompt = `Você representa uma equipe de mentores especializados. Cada mentor tem seu domínio próprio — responda SOMENTE dentro da especialidade de cada um, conforme configurado abaixo.

${agentContexts}

${studentCtx}
${materiaCtx ? `\nMATÉRIA EM FOCO:${materiaCtx}` : ""}

REGRAS:
- Cada mentor responde apenas dentro da sua especialidade configurada acima
- Quando relevante, identifique qual mentor está falando (ex: "Como especialista em CESPE...")
- Não extrapole para áreas fora da especialidade de cada agente
- Sempre em português brasileiro. Direto ao ponto. Foque no que cai em prova.
- NUNCA crie questões ou exercícios no chat. Use marcadores [[IR:X]] para direcionar ao app:
  [[IR:questoes]] | [[IR:flashcards]] | [[IR:simulado]] | [[IR:redacao]] | [[IR:relatorio]] | [[IR:plano]] | [[IR:edital]] | [[IR:desafio]]`;
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
