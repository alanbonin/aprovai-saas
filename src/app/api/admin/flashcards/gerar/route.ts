import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { createWithCache, MODELS, extractJSON } from "@/lib/anthropic";


async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("User").select("id, role").eq("supabaseId", user.id).single();
  return data?.role === "ADMIN" ? data : null;
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { subjectId, subjectName, qty = 10, agentId, topico } = await req.json();
  if (!subjectId || !subjectName) return NextResponse.json({ error: "subjectId e subjectName são obrigatórios" }, { status: 400 });

  const count = Math.min(30, Math.max(1, qty));

  // Busca contexto do agente se informado
  let agentContext = "";
  let agentLabel = "";
  let resolvedBanca = "";

  if (agentId) {
    const { data: agent } = await db.from("Agent").select("name, systemPrompt, banca, area, description").eq("id", agentId).single();
    if (agent) {
      agentLabel = ` · ${agent.name}`;
      if (agent.banca) resolvedBanca = agent.banca;
      agentContext = agent.systemPrompt
        ? `\n\nCONTEXTO DO ESPECIALISTA (${agent.name}):\n${agent.systemPrompt.slice(0, 600)}`
        : "";
    }
  }

  const bancaLine = resolvedBanca ? `\nBanca de referência: ${resolvedBanca} (adapte exemplos e estilo ao perfil dessa banca)` : "";
  const topicoLine = topico ? `\nFoco específico neste tópico: ${topico}` : "";

  const prompt = `Você é um especialista em didática para concursos públicos brasileiros.${agentContext}${bancaLine}

Gere EXATAMENTE ${count} flashcards sobre: ${subjectName}${topicoLine}

Regras:
- Frente: pergunta objetiva, clara e direta, no estilo de concurso
- Verso: resposta completa em 1-3 linhas, citando artigo/lei/súmula quando aplicável
- Cubra tópicos variados dentro da matéria
- Foco no que cai mais em provas do perfil do especialista acima
- Quando houver banca de referência, priorize o que ela mais cobra nessa matéria

Retorne APENAS JSON válido, sem markdown:
{"cards":[{"frente":"pergunta clara","verso":"resposta com artigo se aplicável"}]}`;

  let generated;
  try {
    const FLASH_SYSTEM = "Você é um especialista em didática e elaboração de flashcards para concursos públicos brasileiros.";
    // Tenta Haiku primeiro; cai para Sonnet se falhar (modelo indisponível, limite, etc.)
    let msg;
    try {
      msg = await createWithCache({
        model: MODELS.haiku,
        maxTokens: 6000,
        systemPrompt: FLASH_SYSTEM,
        cacheSystem: false,
        messages: [{ role: "user", content: prompt }],
      });
    } catch (haikuErr) {
      console.error("[flashcards/gerar] Haiku falhou, tentando Sonnet:", haikuErr);
      msg = await createWithCache({
        model: MODELS.sonnet,
        maxTokens: 6000,
        systemPrompt: FLASH_SYSTEM,
        cacheSystem: false,
        messages: [{ role: "user", content: prompt }],
      });
    }
    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    generated = extractJSON<{ cards: { frente: string; verso: string }[] }>(raw);
  } catch (err) {
    console.error("[flashcards/gerar] Erro completo:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Erro ao gerar flashcards com IA: ${msg}` }, { status: 500 });
  }

  const cards = (generated.cards ?? []).map((c: { frente: string; verso: string }, i: number) => ({
    id: `${Date.now()}-${i}`, front: c.frente, back: c.verso,
  }));

  if (cards.length === 0) return NextResponse.json({ error: "IA não retornou cards" }, { status: 500 });

  const { data, error } = await db.from("FlashcardSet").insert({
    id: crypto.randomUUID(),
    userId: admin.id,
    subjectId,
    name: topico ? `${subjectName} — ${topico}${agentLabel}` : `${subjectName}${agentLabel} — IA ${new Date().toLocaleDateString("pt-BR")}`,
    cards,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
